import { auth } from "@clerk/nextjs/server";
import {
  clerkAdminIsConfigured,
  isAdminUser,
  isLocalDemoModeEnabled,
} from "./admin-runtime";

export {
  clerkAdminIsConfigured,
  isAdminUser,
  isLocalDemoModeEnabled,
} from "./admin-runtime";

export async function getAdminBearerToken(): Promise<
  | { status: "ready"; token: string }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "misconfigured" }
> {
  if (!clerkAdminIsConfigured()) return { status: "misconfigured" };

  if (isLocalDemoModeEnabled()) {
    return { status: "ready", token: "demo:admin:demo-admin" };
  }

  const { userId, getToken } = await auth();
  if (!userId) return { status: "unauthenticated" };
  if (!isAdminUser(userId)) return { status: "forbidden" };

  const token = await getToken();
  if (!token) return { status: "unauthenticated" };

  return { status: "ready", token };
}
