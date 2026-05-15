import { NextResponse } from "next/server";

export function middleware(request) {
  const auth = request.headers.get("authorization");

  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const colon = decoded.indexOf(":");
    const user = decoded.slice(0, colon);
    const pass = decoded.slice(colon + 1);

    if (
      user === process.env.DEMO_USER &&
      pass === process.env.DEMO_PASS
    ) {
      return NextResponse.next({ request });
    }
  }

  return new NextResponse("Access restricted", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="HRHS Demo"' },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
