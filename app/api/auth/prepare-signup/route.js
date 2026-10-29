import { NextResponse } from "next/server";
import { escapeLikePattern } from "../../../../lib/db-helpers";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import {
  getClientIp,
  getEmailIdentifier,
  getRateLimiters,
  rateLimitResponse,
} from "../../../../lib/rate-limit";

export const runtime = "nodejs";

const DRAFT_COOKIE = "makesb_application_draft";
const DRAFT_MAX_AGE = 30 * 60;

function draftCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DRAFT_MAX_AGE,
  };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Enter your email address." }, { status: 400 });
  }

  const limiters = getRateLimiters();
  const ipResult = await limiters.signupPreparationIp.limit(
    `ip:${getClientIp(request)}`,
  );
  if (!ipResult.success) {
    const body = rateLimitResponse(ipResult);
    return NextResponse.json(body, {
      status: 429,
      headers: { "Retry-After": String(body.retryAfterSeconds) },
    });
  }

  const emailResult = await limiters.signupPreparationEmail.limit(
    `email:${getEmailIdentifier(email)}`,
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
  const emailPattern = escapeLikePattern(email);
  const [{ data: applications, error: applicationError }, { data: drafts, error: draftError }] =
    await Promise.all([
      supabase.from("applications").select("id").ilike("email", emailPattern).limit(1),
      supabase
        .from("application_drafts")
        .select("id, email, expires_at, claimed_at, resume_path")
        .ilike("email", emailPattern)
        .order("created_at", { ascending: false }),
    ]);

  if (applicationError || draftError) {
    console.error("Signup preflight lookup failed:", applicationError || draftError);
    return NextResponse.json(
      { error: "Couldn't check your application status." },
      { status: 500 },
    );
  }

  const applicationExists = applications.length > 0;
  const activeDrafts = drafts.filter(
    (draft) => !draft.claimed_at && new Date(draft.expires_at) > new Date(),
  );
  const staleDrafts = drafts.filter((draft) => !activeDrafts.includes(draft));

  for (const draft of staleDrafts) {
    if (draft.resume_path) {
      const { error: removeError } = await supabase.storage
        .from("resumes")
        .remove([draft.resume_path]);
      if (removeError) {
        console.error("Stale signup draft resume cleanup failed:", removeError);
      }
    }
    const { error: deleteError } = await supabase
      .from("application_drafts")
      .delete()
      .eq("id", draft.id);
    if (deleteError) {
      console.error("Stale signup draft cleanup failed:", deleteError);
    }
  }

  if (applicationExists && drafts.length > 0) {
    console.error(
      "Inconsistent signup state: email exists in applications and application_drafts.",
      { email, draftIds: drafts.map((draft) => draft.id) },
    );

    for (const draft of drafts) {
      if (draft.resume_path) {
        const { error: removeError } = await supabase.storage
          .from("resumes")
          .remove([draft.resume_path]);
        if (removeError) {
          console.error("Duplicate signup draft resume cleanup failed:", removeError);
        }
      }
      const { error: deleteError } = await supabase
        .from("application_drafts")
        .delete()
        .eq("id", draft.id);
      if (deleteError) {
        console.error("Duplicate signup draft cleanup failed:", deleteError);
      }
    }

    return NextResponse.json({ code: "application_exists" });
  }

  if (applicationExists) {
    return NextResponse.json({ code: "application_exists" });
  }

  if (activeDrafts.length === 0) {
    return NextResponse.json({ code: "no_application" });
  }

  const response = NextResponse.json({ code: "draft_ready" });
  response.cookies.set(DRAFT_COOKIE, activeDrafts[0].id, draftCookieOptions());
  return response;
}
