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
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export const runtime = "nodejs";

const DRAFT_COOKIE = "makesb_application_draft";
const DRAFT_MAX_AGE = 30 * 60;
const RESUME_CONTENT_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function draftCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DRAFT_MAX_AGE,
  };
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

  const result = validateApplication(formData);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: result.errors },
      { status: 400 },
    );
  }

  const { row, resume } = result;
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
      .select("id")
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
    return NextResponse.json(
      {
        code: "application_exists",
        error: "You already have an account for this email. Please log in to continue.",
      },
      { status: 409 },
    );
  }

  const { data: existingDraft, error: draftLookupError } = await supabase
    .from("application_drafts")
    .select("id, expires_at, claimed_at, resume_path")
    .ilike("email", emailPattern)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draftLookupError) {
    console.error("Application draft email lookup failed:", draftLookupError);
    return NextResponse.json(
      { error: "Couldn't check your application status." },
      { status: 500 },
    );
  }

  if (existingDraft?.claimed_at) {
    return NextResponse.json(
      {
        code: "application_exists",
        error: "You already have an account for this email. Please log in to continue.",
      },
      { status: 409 },
    );
  }

  if (existingDraft && new Date(existingDraft.expires_at) > new Date()) {
    const response = NextResponse.json({ ok: true }, { status: 200 });
    response.cookies.set(
      DRAFT_COOKIE,
      existingDraft.id,
      draftCookieOptions(),
    );
    return response;
  }

  if (existingDraft) {
    // The expired draft is being replaced; don't leave its resume orphaned in
    // storage (it holds the applicant's personal data).
    if (existingDraft.resume_path) {
      const { error: removeError } = await supabase.storage
        .from("resumes")
        .remove([existingDraft.resume_path]);
      if (removeError) {
        console.error("Expired draft resume cleanup failed:", removeError);
      }
    }
    await supabase
      .from("application_drafts")
      .delete()
      .eq("id", existingDraft.id);
  }

  const id = randomUUID();
  const ext = resume ? getResumeExtension(resume) : null;
  const resumePath = ext ? `drafts/${id}.${ext}` : null;

  const { error: insertError } = await supabase.from("application_drafts").insert({
    id,
    email: row.email,
    payload: row,
    resume_path: resumePath,
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

  const response = NextResponse.json({ ok: true }, { status: 201 });
  response.cookies.set(DRAFT_COOKIE, id, draftCookieOptions());
  return response;
}
