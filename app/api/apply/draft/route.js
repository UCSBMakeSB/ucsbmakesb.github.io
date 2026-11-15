import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getResumeExtension, validateApplication } from "../../../../lib/application-validation";
import {
  getClientIp,
  getEmailIdentifier,
  getRateLimiters,
  rateLimitResponse,
} from "../../../../lib/rate-limit";
import { escapeLikePattern } from "../../../../lib/db-helpers";
import { DRAFT_COOKIE, draftCookieOptions, draftExpiresAt } from "../../../../lib/draft";
import { getSupabaseAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

export const runtime = "nodejs";

const RESUME_CONTENT_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// Where a signed-in applicant goes after submitting: straight to the claim
// step, skipping account creation.
const SIGNED_IN_NEXT = "/api/apply/claim-draft?next=/portal/application";

// The applicant may already be signed in (their earlier draft expired, or they
// made the account first). A confirmed session proves the inbox, so the
// application is saved under that address whatever the form says.
async function getConfirmedSessionUser() {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email && user.email_confirmed_at ? user : null;
  } catch (error) {
    console.error("Application draft session lookup failed:", error);
    return null;
  }
}

export async function GET(request) {
  const draftId = request.cookies.get(DRAFT_COOKIE)?.value;
  if (!draftId) {
    return NextResponse.json({ error: "No application draft found." }, { status: 404 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("application_drafts")
    .select("email, expires_at, claimed_at")
    .eq("id", draftId)
    .maybeSingle();

  if (error) {
    console.error("Application draft lookup failed:", error);
    return NextResponse.json({ error: "Couldn't load your application draft." }, { status: 500 });
  }

  if (!data || data.claimed_at || new Date(data.expires_at) <= new Date()) {
    const message = data?.claimed_at
      ? "This application has already been linked to an account. Sign in to continue."
      : "Your application draft has expired. Please start again.";
    const response = NextResponse.json(
      { error: message },
      { status: 410 },
    );
    response.cookies.delete(DRAFT_COOKIE);
    return response;
  }

  return NextResponse.json({ email: data.email });
}

function alreadyApplied() {
  return NextResponse.json(
    {
      code: "application_exists",
      error: "You already have an account for this email. Please log in to continue.",
    },
    { status: 409 },
  );
}

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Couldn't read the submitted form." },
      { status: 400 },
    );
  }

  const sessionUser = await getConfirmedSessionUser();
  if (sessionUser) {
    formData.set("email", sessionUser.email);
  }

  const result = validateApplication(formData);
  if (!result.ok) {
    // A tab left open from before the form was shortened still posts the old
    // field set and lacks the new ones; tell that applicant what to do.
    const staleForm =
      formData.has("emergencyContactName") && !formData.has("applicationQuestion1");
    return NextResponse.json(
      {
        error: staleForm
          ? "We just made this form shorter. Please refresh the page and submit again."
          : "Please fix the highlighted fields.",
        fields: staleForm ? {} : result.errors,
      },
      { status: 400 },
    );
  }

  const { row, resume } = result;
  const okBody = sessionUser ? { ok: true, next: SIGNED_IN_NEXT } : { ok: true };
  const limiters = getRateLimiters();
  const ipResult = await limiters.draftCreationIp.limit(
    `ip:${getClientIp(request)}`,
  );
  if (!ipResult.success) {
    const body = rateLimitResponse(ipResult);
    return NextResponse.json(body, {
      status: 429,
      headers: { "Retry-After": String(body.retryAfterSeconds) },
    });
  }

  const emailResult = await limiters.draftCreationEmail.limit(
    `email:${getEmailIdentifier(row.email)}`,
  );
  if (!emailResult.success) {
    const body = rateLimitResponse(emailResult);
    return NextResponse.json(body, {
      status: 429,
      headers: { "Retry-After": String(body.retryAfterSeconds) },
    });
  }

  const supabase = getSupabaseAdmin();
  // ilike is a pattern match; escape % and _ so the address is matched literally.
  const emailPattern = escapeLikePattern(row.email);

  const { data: existingApplication, error: applicationLookupError } =
    await supabase
      .from("applications")
      .select("id, user_id")
      .ilike("email", emailPattern)
      .maybeSingle();

  if (applicationLookupError) {
    console.error("Application email lookup failed:", applicationLookupError);
    return NextResponse.json(
      { error: "Couldn't check your application status." },
      { status: 500 },
    );
  }

  if (existingApplication) {
    // Signed in with this (confirmed) address: "please log in" is a dead end.
    // The application is theirs, or it has no account on it yet and the claim
    // step links it (findOrAttachApplication in the claim route). Either way
    // they continue to the portal, where the saved application can be edited.
    if (
      sessionUser &&
      (!existingApplication.user_id || existingApplication.user_id === sessionUser.id)
    ) {
      return NextResponse.json({ ok: true, next: SIGNED_IN_NEXT }, { status: 200 });
    }
    if (sessionUser) {
      return NextResponse.json(
        {
          code: "application_linked_elsewhere",
          error:
            "An application for this email is linked to a different account. Email team@makesb.org and we'll sort it out.",
        },
        { status: 409 },
      );
    }
    return alreadyApplied();
  }

  const { data: emailDrafts, error: draftLookupError } = await supabase
    .from("application_drafts")
    .select("id, expires_at, claimed_at, resume_path")
    .ilike("email", emailPattern)
    .order("created_at", { ascending: false });

  if (draftLookupError) {
    console.error("Application draft email lookup failed:", draftLookupError);
    return NextResponse.json(
      { error: "Couldn't check your application status." },
      { status: 500 },
    );
  }

  const drafts = emailDrafts ?? [];
  const now = new Date();
  const isLive = (draft) => !draft.claimed_at && new Date(draft.expires_at) > now;
  const cookieDraftId = request.cookies.get(DRAFT_COOKIE)?.value ?? null;
  // The draft this very browser saved earlier (the cookie is only ever set to
  // a draft the browser itself created or already proved it owns).
  const cookieDraft =
    drafts.find((draft) => draft.id === cookieDraftId && isLive(draft)) ?? null;

  // Which saved draft this request may overwrite. Knowing an email address is
  // NOT enough: this used to overwrite the newest draft for the address, so
  // anyone who knew an applicant's email could replace their answers and
  // delete their resume before they confirmed. Now it takes proof:
  //   - the draft's own cookie, or
  //   - a confirmed session for the address (the form's email was replaced
  //     with the session's above).
  // Everyone else gets a separate draft and the existing one is left alone.
  let ownDraft = cookieDraft;
  if (sessionUser) {
    // A draft marked claimed while no application exists (checked above) is a
    // claim that never finished: the function died between claiming and
    // saving, or releasing the claim failed. It used to answer "you already
    // have an account, please log in" to someone who WAS logged in, with no
    // way forward. Take it back and save what they just typed into it.
    ownDraft ??=
      drafts.find(isLive) ?? drafts.find((draft) => draft.claimed_at) ?? null;
  } else if (drafts.some((draft) => draft.claimed_at)) {
    // Being linked to an account right now, or stuck as described above.
    // Signing in is the way forward in both cases.
    return alreadyApplied();
  }

  if (ownDraft) {
    // Same applicant submitting again (fixing a typo, or coming back days
    // later). Keep the draft id, but save what they just typed: this used to
    // return the OLD answers silently.
    const ext = resume ? getResumeExtension(resume) : null;
    const newResumePath = ext
      ? `drafts/${ownDraft.id}-${randomUUID()}.${ext}`
      : null;

    if (resume) {
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(newResumePath, await resume.arrayBuffer(), {
          contentType: RESUME_CONTENT_TYPES[ext],
          upsert: false,
        });
      if (uploadError) {
        console.error("Application draft resume upload failed:", uploadError);
        return NextResponse.json(
          { error: "We couldn't upload your resume. Please try again." },
          { status: 500 },
        );
      }
    }

    const update = supabase
      .from("application_drafts")
      .update({
        payload: row,
        resume_path: newResumePath ?? ownDraft.resume_path,
        expires_at: draftExpiresAt(),
        // Releases an unfinished claim; a no-op for a draft that has none.
        ...(sessionUser ? { claimed_at: null } : {}),
      })
      .eq("id", ownDraft.id);
    // Without a session, never write into a draft that was claimed meanwhile.
    const { data: updatedDraft, error: updateError } = await (
      sessionUser ? update : update.is("claimed_at", null)
    )
      .select("id")
      .maybeSingle();

    if (updateError || !updatedDraft) {
      if (updateError) console.error("Application draft update failed:", updateError);
      if (newResumePath) {
        await supabase.storage.from("resumes").remove([newResumePath]);
      }
      if (updateError) {
        return NextResponse.json(
          { error: "Something went wrong saving your application. Please try again." },
          { status: 500 },
        );
      }
      // No row updated: the draft was claimed (or, for a signed-in applicant,
      // linked and deleted) a moment ago. The claim step sends a signed-in
      // applicant on to their application.
      return sessionUser
        ? NextResponse.json(okBody, { status: 200 })
        : alreadyApplied();
    }

    if (newResumePath && ownDraft.resume_path) {
      const { error: removeError } = await supabase.storage
        .from("resumes")
        .remove([ownDraft.resume_path]);
      if (removeError) {
        console.error("Replaced draft resume cleanup failed:", removeError);
      }
    }

    const response = NextResponse.json(okBody, { status: 200 });
    response.cookies.set(DRAFT_COOKIE, ownDraft.id, draftCookieOptions());
    return response;
  }

  // Expired drafts for this address can no longer be linked to an account;
  // don't leave them or their resumes behind (they hold personal data). Live
  // drafts are never touched here: without proof of ownership (above), this
  // request only adds a draft of its own.
  for (const expired of drafts.filter(
    (draft) => !draft.claimed_at && new Date(draft.expires_at) <= now,
  )) {
    if (expired.resume_path) {
      const { error: removeError } = await supabase.storage
        .from("resumes")
        .remove([expired.resume_path]);
      if (removeError) {
        console.error("Expired draft resume cleanup failed:", removeError);
      }
    }
    await supabase.from("application_drafts").delete().eq("id", expired.id);
  }

  const id = randomUUID();
  const ext = resume ? getResumeExtension(resume) : null;
  const resumePath = ext ? `drafts/${id}.${ext}` : null;

  const { error: insertError } = await supabase.from("application_drafts").insert({
    id,
    email: row.email,
    payload: row,
    resume_path: resumePath,
    // Set explicitly: the column default is 30 minutes, which lost the
    // application of anyone who confirmed their email later than that.
    expires_at: draftExpiresAt(),
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "An application with this email already exists." },
        { status: 409 },
      );
    }
    console.error("Application draft insert failed:", insertError);
    return NextResponse.json(
      { error: "Something went wrong saving your application. Please try again." },
      { status: 500 },
    );
  }

  if (resume) {
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(resumePath, await resume.arrayBuffer(), {
        contentType: RESUME_CONTENT_TYPES[ext],
        upsert: false,
      });

    if (uploadError) {
      console.error("Application draft resume upload failed:", uploadError);
      await supabase.from("application_drafts").delete().eq("id", id);
      return NextResponse.json(
        { error: "We couldn't upload your resume. Please try again." },
        { status: 500 },
      );
    }
  }

  const response = NextResponse.json(okBody, { status: 201 });
  response.cookies.set(DRAFT_COOKIE, id, draftCookieOptions());
  return response;
}
