import { auth } from "@clerk/nextjs/server";

export function clerkAdminIsConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      configuredAdminIds().length > 0,
  );
}

export function isAdminUser(userId: string): boolean {
  return configuredAdminIds().includes(userId);
}

function configuredAdminIds(): string[] {
  return (process.env.CLERK_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function getAdminBearerToken(): Promise<
  | { status: "ready"; token: string }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "misconfigured" }
> {
  if (!clerkAdminIsConfigured()) return { status: "misconfigured" };

  const { userId, getToken } = await auth();
  if (!userId) return { status: "unauthenticated" };
  if (!isAdminUser(userId)) return { status: "forbidden" };

  const token = await getToken();
  if (!token) return { status: "unauthenticated" };

  return { status: "ready", token };
}
