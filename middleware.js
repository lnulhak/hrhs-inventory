import { NextResponse } from "next/server";

// Session refresh is handled client-side via @supabase/ssr createBrowserClient.
// This middleware is a no-op placeholder for v0.9.
export function middleware(request) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
