export function getClerkVerificationKeys(
  nodeEnv = process.env.NODE_ENV,
  secretKey = process.env.CLERK_SECRET_KEY,
  jwtKey = process.env.CLERK_JWT_KEY,
): { secretKey: string; jwtKey?: string } | { jwtKey: string } | null {
  if (nodeEnv === "production") {
    return secretKey?.startsWith("sk_live_") &&
      secretKey.length > "sk_live_".length
      ? { secretKey }
      : null;
  }

  if (secretKey) {
    return jwtKey ? { secretKey, jwtKey } : { secretKey };
  }
  return jwtKey ? { jwtKey } : null;
}

export function isLocalDemoModeEnabled(
  nodeEnv = process.env.NODE_ENV,
  secretKey = process.env.CLERK_SECRET_KEY,
  jwtKey = process.env.CLERK_JWT_KEY,
): boolean {
  return (
    nodeEnv !== "production" &&
    (process.env.DEMO_MODE === "true" || !getClerkVerificationKeys(nodeEnv, secretKey, jwtKey))
  );
}

export function getDemoTokenRoleAndUser(
  authorization: string,
): { role: "student" | "admin"; userId: string } | null {
  if (!authorization.startsWith("Bearer demo:")) return null;
  const parts = authorization.slice("Bearer demo:".length).split(":");
  if (parts.length < 2) return null;
  const [role, userId] = parts;
  if ((role === "student" || role === "admin") && userId && userId.length > 0) {
    return { role, userId };
  }
  return null;
}
