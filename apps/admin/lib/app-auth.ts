import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { isLocalDemoModeEnabled } from "./admin-runtime";

export type AppAuthRole = "student" | "admin";

export function getDemoUserId(role: AppAuthRole = "admin") {
  if (role === "admin") {
    return process.env.NEXT_PUBLIC_DEMO_ADMIN_ID ?? "demo-admin";
  }
  return process.env.NEXT_PUBLIC_DEMO_STUDENT_ID ?? "demo-student";
}

export function useAppAuth(role: AppAuthRole = "admin") {
  if (isLocalDemoModeEnabled()) {
    const userId = getDemoUserId(role);
    return {
      getToken: async () => `demo:${role}:${userId}`,
      isLoaded: true,
      isSignedIn: true,
      userId,
    };
  }

  return useClerkAuth();
}
