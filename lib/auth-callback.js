import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase-server";

// Shared tail of the two emailed-link handlers (app/auth/callback for the
// `?code=` links, app/auth/confirm for `?token_hash=` links). By the time this
// runs the link has been verified and the session cookies are set.

/**
 * Where to send someone whose emailed link could not be turned into a session.
 *
 * This is NOT always a failure. The common cases are:
 *   - the link was opened in a different browser or device from the one that
 *     created the account (the `?code=` flow needs a secret stored in the
 *     original browser), and
 *   - a mail scanner (Outlook Safe Links and similar) opened the one-time link
 *     before the person did.
 * In both, Supabase has ALREADY confirmed the address, so the person only has
 * to sign in. The old behaviour sent them to the sign-up page with "We
 * couldn't confirm your email", which was wrong and left them stuck. The login
 * page explains, and offers to resend the email if it really was not confirmed.
 */
export function linkNotUsable(request, { recovery = false } = {}) {
  const url = new URL("/login", request.url);
  url.searchParams.set("notice", recovery ? "reset_link" : "confirm_link");
  return NextResponse.redirect(url);
}

/** Runs after a verified link: sync a changed email, then route the user on. */
export async function finishEmailLink(request, supabase, { recovery = false } = {}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Auth callback user lookup failed:", userError);
    return linkNotUsable(request);
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
  if (recovery || next === "/auth/reset") {
    return NextResponse.redirect(new URL("/auth/reset", request.url));
  }

  // No application on the account yet: link the pending draft. The claim route
  // finds it by the confirmed email, so this no longer depends on the draft
  // cookie being present in this particular browser.
  if (!application) {
    return NextResponse.redirect(
      new URL("/api/apply/claim-draft?next=/auth/confirmed", request.url),
    );
  }

  return NextResponse.redirect(new URL("/auth/confirmed", request.url));
}
