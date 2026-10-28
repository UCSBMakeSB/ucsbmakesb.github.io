import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "../../../lib/supabase-server";

const DRAFT_COOKIE = "makesb_application_draft";

export async function GET(request) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", request.url));
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback failed:", error);
    return NextResponse.redirect(new URL("/auth?error=confirmation_failed", request.url));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Auth callback user lookup failed:", userError);
    return NextResponse.redirect(new URL("/auth?error=confirmation_failed", request.url));
  }

  const admin = getSupabaseAdmin();
  const { data: application, error: applicationLookupError } = await admin
    .from("applications")
    .select("id, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (applicationLookupError) {
    console.error("Auth callback application lookup failed:", applicationLookupError);
    return NextResponse.redirect(new URL("/auth?error=email_sync_failed", request.url));
  }

  if (application && user.email && application.email !== user.email) {
    const { error: applicationUpdateError } = await admin
      .from("applications")
      .update({ email: user.email })
      .eq("id", application.id);

    if (applicationUpdateError) {
      console.error("Auth callback email sync failed:", applicationUpdateError);
      return NextResponse.redirect(new URL("/auth?error=email_sync_failed", request.url));
    }
  }

  const next = request.nextUrl.searchParams.get("next");
  if (next === "/auth/reset") {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const hasDraft = Boolean(request.cookies.get(DRAFT_COOKIE)?.value);
  if (hasDraft) {
    return NextResponse.redirect(
      new URL("/api/apply/claim-draft?next=/auth/confirmed", request.url),
    );
  }

  return NextResponse.redirect(new URL("/auth/confirmed", request.url));
}
