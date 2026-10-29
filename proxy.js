import { NextResponse } from "next/server";
import { createSupabaseProxyClient } from "./lib/supabase-proxy";

export async function proxy(request) {
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
  matcher: ["/portal/:path*"],
};
