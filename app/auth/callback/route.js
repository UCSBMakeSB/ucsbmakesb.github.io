import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase-server";

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

  return NextResponse.redirect(
    new URL("/api/apply/claim-draft?next=/portal/application", request.url),
  );
}
