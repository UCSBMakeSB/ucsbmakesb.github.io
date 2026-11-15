import { finishEmailLink, linkNotUsable } from "../../../lib/auth-callback";
import { getSupabaseServer } from "../../../lib/supabase-server";

// Emailed links that use Supabase's default (PKCE) flow land here with ?code=.
// A link that can't be turned into a session goes to /login with a notice, not
// to the sign-up page: see linkNotUsable in lib/auth-callback.js for why.
export async function GET(request) {
  const recovery = request.nextUrl.searchParams.get("next") === "/auth/reset";
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    // Supabase reports an expired or already-used link as
    // ?error=access_denied&error_code=otp_expired with no code.
    return linkNotUsable(request, { recovery });
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback failed:", error);
    return linkNotUsable(request, { recovery });
  }

  return finishEmailLink(request, supabase);
}
