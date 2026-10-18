import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
import { isClientClerkConfigured } from "./app/lib/clerk-config";

const protectedPaths = ["/inspection", "/messages", "/profile"];

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function redirectToSignIn(request: NextRequest, setupRequired = false) {
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set(
    "redirect_url",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  if (setupRequired) signIn.searchParams.set("setup", "required");
  return NextResponse.redirect(signIn);
}

const clerkProxy = clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  if (!userId) return redirectToSignIn(request);
  return NextResponse.next();
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!isClientClerkConfigured()) {
    return redirectToSignIn(request, true);
  }

  return clerkProxy(request, event);
}

export const config = {
  matcher: ["/inspection/:path*", "/messages/:path*", "/profile/:path*"],
};
