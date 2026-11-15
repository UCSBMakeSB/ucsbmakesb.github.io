import { finishEmailLink, linkNotUsable } from "../../../lib/auth-callback";
import { getSupabaseServer } from "../../../lib/supabase-server";

// Confirmation links of the form
//   /auth/confirm?token_hash=...&type=email
// Unlike /auth/callback?code=..., these can be verified by ANY browser or
// device, because nothing has to be remembered by the browser that created the
// account. That is what makes "applied on my laptop, opened the email on my
// phone" work.
//
// Pattern and parameter names are Supabase's own server-side example:
// https://github.com/supabase/supabase/blob/master/examples/auth/nextjs-full/app/auth/confirm/route.ts
//
// This route is inert until the Supabase email templates point at it
// (Dashboard -> Authentication -> Emails). See the pull request notes.
const EMAIL_OTP_TYPES = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const recovery =
    type === "recovery" || request.nextUrl.searchParams.get("next") === "/auth/reset";

  if (!tokenHash || !EMAIL_OTP_TYPES.has(type)) {
    return linkNotUsable(request, { recovery });
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error("Auth confirm failed:", error);
    return linkNotUsable(request, { recovery });
  }

  return finishEmailLink(request, supabase, { recovery });
}
