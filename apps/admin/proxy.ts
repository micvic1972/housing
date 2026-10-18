import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkAdminIsConfigured, isAdminUser } from "./lib/admin-authorization";

const clerkProxy = clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;
  if (
    pathname === "/login" ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/_next/")
  ) {
    return NextResponse.next();
  }

  if (!clerkAdminIsConfigured()) {
    return NextResponse.json(
      { error: "Clerk admin authentication is not configured on the server." },
      { status: 503 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect_url", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (!isAdminUser(userId)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerkAdminIsConfigured()) {
    if (request.nextUrl.pathname === "/login") {
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: "Clerk admin authentication is not configured on the server." },
      { status: 503 },
    );
  }

  return clerkProxy(request, event);
}


export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
