import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

export const runtime = "nodejs";

const DRAFT_COOKIE = "makesb_application_draft";

async function claimDraft(request) {
  const supabaseServer = await getSupabaseServer();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const draftId = request.cookies.get(DRAFT_COOKIE)?.value;
  if (!draftId) {
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

  if (!draft || draft.claimed_at || new Date(draft.expires_at) <= new Date()) {
    return NextResponse.json(
      { error: "Your application draft has expired. Please start again." },
      { status: 410 },
    );
  }

  if (draft.email !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "The account email must match the application email." },
      { status: 403 },
    );
  }

  const payload = draft.payload;
  let resumePath = draft.resume_path;
  if (resumePath) {
    const extension = resumePath.split(".").pop();
    const newPath = `applications/${user.id}.${extension}`;
    const { error: moveError } = await supabase.storage
      .from("resumes")
      .move(resumePath, newPath);

    if (moveError) {
      console.error("Application resume move failed:", moveError);
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
    if (resumePath) {
      await supabase.storage.from("resumes").remove([resumePath]);
    }
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

  await supabase
    .from("application_drafts")
    .update({ claimed_at: new Date().toISOString() })
    .eq("id", draftId);

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
