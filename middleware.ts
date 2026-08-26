import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * middleware.ts — Clerk route protection.
 *
 * Public:  /, /login, /register, /booking
 * Protect: /owner/*, /reception/*, /staff/* (+ any other authenticated area)
 *
 * Server-side enforcement — client-only guards are NOT the security boundary.
 * Signed-out users hitting a protected route get a 307 redirect to /login.
 */
const isProtectedRoute = createRouteMatcher([
  "/owner(.*)",
  "/reception(.*)",
  "/staff(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) return;
  // auth() is async (returns SessionAuthObject) — always await it.
  const { userId } = await auth();
  if (!userId) {
    const url = new URL("/login", req.url);
    const { pathname, search } = req.nextUrl;
    url.searchParams.set("redirect_url", pathname + search);
    return NextResponse.redirect(url);
  }
});

export const config = {
  // Run on everything except static files (in /public) and _next.
  // Include Clerk's auto-proxy once, after the API/TRPC matcher.
  matcher: ["/((?!.*\\..*|_next).*)", "/__clerk/:path*"],
};