import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { escapeLikePattern } from "../../../../lib/db-helpers";
import { DRAFT_COOKIE } from "../../../../lib/draft";
import { getSupabaseAdmin, getSupabaseServer } from "../../../../lib/supabase-server";
import { revalidatePortalAccount } from "../../../../lib/portal-data";

export const runtime = "nodejs";

const CLAIMED_MESSAGE =
  "This application has already been linked to an account. Sign in to continue.";
const EXPIRED_MESSAGE = "Your application draft has expired. Please start again.";

function safeNextPath(request) {
  const next = request.nextUrl?.searchParams.get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : null;
}

// A browser navigation (?next=...) must always end on a page, never on raw
// JSON. Every failure lands on /apply, which shows the form (or a retry link)
// to a signed-in user without an application and never redirects back here,
// so there is no way to loop.
function draftUnavailable(request, reason) {
  if (request.nextUrl?.searchParams.get("next")) {
    return NextResponse.redirect(
      new URL(
        reason === "none" ? "/apply" : `/apply?notice=${reason}`,
        request.url,
      ),
    );
  }
  if (reason === "none") {
    return NextResponse.json({ error: "No application draft found." }, { status: 404 });
  }
  if (reason === "email_mismatch") {
    return NextResponse.json(
      { error: "The account email must match the application email." },
      { status: 403 },
    );
  }
  return NextResponse.json(
    { error: reason === "draft_claimed" ? CLAIMED_MESSAGE : EXPIRED_MESSAGE },
    { status: 410 },
  );
}

function isClaimable(draft) {
  return Boolean(draft) && !draft.claimed_at && new Date(draft.expires_at) > new Date();
}

async function claimDraft(request) {
  const supabaseServer = await getSupabaseServer();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  // Holding a session is not proof of owning the inbox: an account created
  // with someone else's address stays unconfirmed until that person clicks the
  // link. Never hand an application to an unconfirmed account.
  if (!user.email_confirmed_at) {
    return NextResponse.json(
      { error: "Confirm your email address before continuing your application." },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdmin();
  const userEmail = user.email?.toLowerCase() ?? "";
  const cookieDraftId = request.cookies.get(DRAFT_COOKIE)?.value;

  let cookieDraft = null;
  if (cookieDraftId) {
    const { data, error: draftError } = await supabase
      .from("application_drafts")
      .select("*")
      .eq("id", cookieDraftId)
      .maybeSingle();

    if (draftError) {
      console.error("Application draft lookup failed:", draftError);
      return NextResponse.json({ error: "Couldn't load your application draft." }, { status: 500 });
    }
    cookieDraft = data;
  }

  // The draft is found by the account's CONFIRMED email, not only by the draft
  // cookie. The cookie exists only in the browser that filled in the form, so
  // requiring it lost the application of everyone who confirmed their email
  // on another device, in another browser, or after the cookie expired. The
  // confirmed email is the same proof of ownership the cookie path relies on
  // (see the ownership check this replaces), so nothing is loosened.
  let draft = cookieDraft;
  if (!isClaimable(draft) || draft.email !== userEmail) {
    const { data: ownDrafts, error: ownDraftError } = userEmail
      ? await supabase
          .from("application_drafts")
          .select("*")
          .ilike("email", escapeLikePattern(userEmail))
          .is("claimed_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
      : { data: [], error: null };

    if (ownDraftError) {
      console.error("Application draft email lookup failed:", ownDraftError);
      return NextResponse.json({ error: "Couldn't load your application draft." }, { status: 500 });
    }
    if (ownDrafts?.[0]) draft = ownDrafts[0];
  }

  if (!isClaimable(draft) || draft.email !== userEmail) {
    // Already applied (for example a second click on the emailed link, or the
    // portal sent them here): a browser goes on to where it was heading.
    const next = safeNextPath(request);
    if (next) {
      const { data: applied } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (applied) {
        revalidatePortalAccount(user.id);
        return NextResponse.redirect(new URL(next, request.url));
      }
    }

    if (!draft) return draftUnavailable(request, cookieDraftId ? "draft_expired" : "none");
    if (draft.claimed_at) return draftUnavailable(request, "draft_claimed");
    if (new Date(draft.expires_at) <= new Date()) return draftUnavailable(request, "draft_expired");
    // Check ownership BEFORE claiming, so a stranger holding someone's draft
    // cookie can't lock the real owner out of their own draft.
    return draftUnavailable(request, "email_mismatch");
  }

  const draftId = draft.id;

  // Atomic claim: only one concurrent request can flip claimed_at from null.
  const nowIso = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("application_drafts")
    .update({ claimed_at: nowIso })
    .eq("id", draftId)
    .is("claimed_at", null)
    .gt("expires_at", nowIso)
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error("Application draft claim failed:", claimError);
    return NextResponse.json({ error: "Couldn't claim your application draft." }, { status: 500 });
  }
  if (!claimed) {
    // Lost a race with another request (or the draft expired a moment ago).
    return draftUnavailable(request, "draft_claimed");
  }

  // A failure after this point is ours, not the applicant's. Their answers are
  // still saved in the draft, so a browser is sent to /apply, which offers a
  // retry, instead of being shown a JSON error.
  function claimFailed(message, status = 500) {
    if (request.nextUrl?.searchParams.get("next")) {
      return NextResponse.redirect(new URL("/apply?notice=claim_failed", request.url));
    }
    return NextResponse.json({ error: message }, { status });
  }

  // From here on, any failure must hand the draft back so the user can retry.
  async function releaseClaim() {
    const { error } = await supabase
      .from("application_drafts")
      .update({ claimed_at: null })
      .eq("id", draftId);
    if (error) console.error("Releasing the draft claim failed:", error);
  }

  const { data: existing, error: existingError } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("Existing application lookup failed:", existingError);
    await releaseClaim();
    return claimFailed("Something went wrong saving your application.");
  }
  if (existing) {
    await releaseClaim();
    const next = safeNextPath(request);
    if (next) {
      revalidatePortalAccount(user.id);
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.json(
      { error: "An application already exists for this account or email." },
      { status: 409 },
    );
  }

  const payload = draft.payload;
  const originalResumePath = draft.resume_path;
  let resumePath = originalResumePath;
  if (originalResumePath) {
    const extension = originalResumePath.split(".").pop();
    const newPath = `applications/${user.id}.${extension}`;
    const { error: moveError } = await supabase.storage
      .from("resumes")
      .move(originalResumePath, newPath);

    if (moveError) {
      console.error("Application resume move failed:", moveError);
      await releaseClaim();
      return claimFailed("We couldn't finish storing your resume. Please try again.");
    }
    resumePath = newPath;
  }

  const { error: insertError } = await supabase.from("applications").insert({
    id: randomUUID(),
    user_id: user.id,
    ...payload,
    resume_path: resumePath,
  });

  if (insertError) {
    // Put the resume back where it was: it is the only copy the applicant has.
    if (originalResumePath && resumePath !== originalResumePath) {
      const { error: restoreError } = await supabase.storage
        .from("resumes")
        .move(resumePath, originalResumePath);
      if (restoreError) {
        console.error("Restoring the draft resume failed:", restoreError);
      }
    }
    await releaseClaim();

    if (insertError.code === "23505") {
      return claimFailed("An application already exists for this account or email.", 409);
    }
    if (insertError.code === "23502") {
      // not_null_violation: the shortened form no longer sends phone, emergency
      // contact, age or the waiver, so those columns must be nullable.
      console.error(
        "MIGRATION NOT APPLIED: run supabase/2026-11-14-apply-simplify.sql in the Supabase SQL editor. " +
          "Applications cannot be saved until then (drafts are kept and will be linked on the applicant's next visit).",
        insertError,
      );
    } else {
      console.error("Application claim failed:", insertError);
    }
    return claimFailed("Something went wrong saving your application.");
  }

  const { error: deleteDraftError } = await supabase
    .from("application_drafts")
    .delete()
    .eq("id", draftId);

  if (deleteDraftError) {
    // claimed_at is already set, so the draft can't be claimed again.
    console.error("Claimed application draft cleanup failed:", deleteDraftError);
  }

  revalidatePortalAccount(user.id);
  const safeNext = safeNextPath(request);
  const response = safeNext
    ? NextResponse.redirect(new URL(safeNext, request.url))
    : NextResponse.json({ ok: true });
  response.cookies.delete(DRAFT_COOKIE);
  return response;
}

export async function POST(request) {
  return claimDraft(request);
}

export async function GET(request) {
  return claimDraft(request);
}
