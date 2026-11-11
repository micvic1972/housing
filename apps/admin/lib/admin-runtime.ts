export function isClerkKeyPairAllowed(
  publishableKey: string | undefined,
  secretKey: string | undefined,
  nodeEnv = process.env.NODE_ENV,
): boolean {
  const publishableMode = publishableKey?.match(/^pk_(test|live)_.+/)?.[1];
  const secretMode = secretKey?.match(/^sk_(test|live)_.+/)?.[1];

  if (!publishableMode || publishableMode !== secretMode) return false;
  return nodeEnv !== "production" || publishableMode === "live";
}

export function configuredAdminIds(): string[] {
  return (process.env.CLERK_ADMIN_USER_IDS ?? "demo-admin")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isLocalDemoModeEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.DEMO_MODE === "true" ||
      !isClerkKeyPairAllowed(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        process.env.CLERK_SECRET_KEY,
      ))
  );
}

export function clerkAdminIsConfigured(): boolean {
  return Boolean(
    (isClerkKeyPairAllowed(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      process.env.CLERK_SECRET_KEY,
    ) || isLocalDemoModeEnabled()) && configuredAdminIds().length > 0,
  );
}

export function isAdminUser(userId: string): boolean {
  return configuredAdminIds().includes(userId) || userId === "demo-admin";
}
