import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Presence check on the signed cookie only — deliberately no database call.
  // This runs on every request, and the authoritative check already happens in
  // getCurrentUser()/requireRole() where the row is read anyway. A forged
  // cookie gets past this redirect and straight into a null session.
  const hasSession = getSessionCookie(request) !== null;

  const { pathname } = request.nextUrl;

  // Public auth pages
  const isAuthPage = pathname.startsWith("/login");

  // The splash at "/" is the threshold: public, and shown before sign-in.
  const isSplash = pathname === "/";

  // Redirect unauthenticated users to login
  if (!hasSession && !isAuthPage && !isSplash) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Staff who already have a session have no use for the threshold or the auth
  // pages — send them straight to work.
  if (hasSession && (isAuthPage || isSplash)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
