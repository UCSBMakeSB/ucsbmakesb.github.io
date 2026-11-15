import { NextResponse } from "next/server";
import { createSupabaseProxyClient } from "./lib/supabase-proxy";

export async function proxy(request) {
  // When the address in an emailed link is not on Supabase's redirect allow
  // list, Supabase falls back to the Site URL and the one-time code arrives on
  // the homepage (/?code=...), where nothing used it and the applicant just saw
  // the landing page. Hand it to the callback. Ported from the dev branch
  // (d5f92de "move to proxy").
  if (
    request.nextUrl.pathname === "/" &&
    (request.nextUrl.searchParams.has("code") ||
      request.nextUrl.searchParams.has("error_code"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }
  // The homepage needs nothing else from the proxy; keep it independent of
  // Supabase being reachable.
  if (request.nextUrl.pathname === "/") return NextResponse.next();

  const response = NextResponse.next({ request });
  const supabase = createSupabaseProxyClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/portal")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/", "/portal/:path*"],
};
