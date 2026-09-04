import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { config as appConfig, PREVIEW_COOKIE } from "@/lib/config";

// Turns `/?preview=<secret>` into a persistent preview cookie, then redirects
// to the same URL without the query string so the secret isn't left in the
// address bar or shared history. Everything else is left untouched.
export function proxy(request: NextRequest) {
  const provided = request.nextUrl.searchParams.get("preview");
  if (!provided || !appConfig.previewSecret || provided !== appConfig.previewSecret) {
    return NextResponse.next();
  }

  const cleanUrl = new URL(request.nextUrl);
  cleanUrl.searchParams.delete("preview");

  const response = NextResponse.redirect(cleanUrl);
  response.cookies.set(PREVIEW_COOKIE, appConfig.previewSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}

export const config = {
  // Run on page routes only - skip API, static assets and image optimization.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
