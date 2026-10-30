import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "../../../../lib/supabase-server";
import { revalidatePortalAccount } from "../../../../lib/portal-data";

export const runtime = "nodejs";

const DRAFT_COOKIE = "makesb_application_draft";
const CLAIMED_MESSAGE =
  "This application has already been linked to an account. Sign in to continue.";
const EXPIRED_MESSAGE = "Your application draft has expired. Please start again.";

function draftUnavailable(request, reason) {
  // Arriving from the emailed confirmation link (?next=...) means a browser
  // navigation, so send the user to a page instead of returning JSON.
  if (request.nextUrl?.searchParams.get("next")) {
    return NextResponse.redirect(
      new URL(
        reason === "claimed"
          ? "/auth?error=draft_claimed"
          : "/auth?error=draft_expired",
        request.url,
      ),
    );
  }
  return NextResponse.json(
    { error: reason === "claimed" ? CLAIMED_MESSAGE : EXPIRED_MESSAGE },
    { status: 410 },
  );
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

  const draftId = request.cookies.get(DRAFT_COOKIE)?.value;
  if (!draftId) {
    const next = request.nextUrl?.searchParams.get("next");
    if (next) {
      return NextResponse.redirect(new URL("/auth/confirmed", request.url));
    }
    return NextResponse.json({ error: "No application draft found." }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const { data: draft, error: draftError } = await supabase
    .from("application_drafts")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    console.error("Application draft lookup failed:", draftError);
    return NextResponse.json({ error: "Couldn't load your application draft." }, { status: 500 });
  }

  if (!draft) return draftUnavailable(request, "expired");
  if (draft.claimed_at) return draftUnavailable(request, "claimed");
  if (new Date(draft.expires_at) <= new Date()) return draftUnavailable(request, "expired");

  // Check ownership BEFORE claiming, so a stranger holding someone's draft
  // cookie can't lock the real owner out of their own draft.
  if (draft.email !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "The account email must match the application email." },
      { status: 403 },
    );
  }

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
    return draftUnavailable(request, "claimed");
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
    return NextResponse.json({ error: "Something went wrong saving your application." }, { status: 500 });
  }
  if (existing) {
    await releaseClaim();
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
      return NextResponse.json(
        { error: "We couldn't finish storing your resume. Please try again." },
        { status: 500 },
      );
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
      return NextResponse.json(
        { error: "An application already exists for this account or email." },
        { status: 409 },
      );
    }
    console.error("Application claim failed:", insertError);
    return NextResponse.json(
      { error: "Something went wrong saving your application." },
      { status: 500 },
    );
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
  const next = request.nextUrl?.searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//")
    ? next
    : null;
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
