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
