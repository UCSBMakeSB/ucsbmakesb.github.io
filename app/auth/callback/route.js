import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "../../../lib/supabase-server";

// A link that could not be turned into a session is NOT always a failure. The
// usual causes are:
//   - the link was opened in a different browser or device from the one that
//     created the account (the ?code= flow needs a secret that only the
//     original browser has), and
//   - an email scanner opened the one-time link before the person did.
// In both, Supabase has ALREADY confirmed the address, so the person only has
// to sign in. The sign-in page explains that, and signing in claims the saved
// application by confirmed email (see app/api/apply/claim-draft).
function linkNotUsable(request, { recovery = false } = {}) {
  const url = new URL("/login", request.url);
  url.searchParams.set("notice", recovery ? "reset_link" : "confirm_link");
  return NextResponse.redirect(url);
}

export async function GET(request) {
  const next = request.nextUrl.searchParams.get("next");
  const recovery = next === "/auth/reset";
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", request.url));
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback failed:", error);
    return linkNotUsable(request, { recovery });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Auth callback user lookup failed:", userError);
    return linkNotUsable(request, { recovery });
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

  if (recovery) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  // No application on the account yet: link the pending draft. The claim route
  // finds it by the confirmed email when this browser has no draft cookie.
  if (!application) {
    return NextResponse.redirect(
      new URL("/api/apply/claim-draft?next=/auth/confirmed", request.url),
    );
  }

  return NextResponse.redirect(new URL("/auth/confirmed", request.url));
}
