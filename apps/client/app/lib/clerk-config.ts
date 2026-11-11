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

export function isLocalDemoModeEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      !isClerkKeyPairAllowed(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        process.env.CLERK_SECRET_KEY,
      ))
  );
}

export function isClientClerkConfigured(): boolean {
  return (
    isClerkKeyPairAllowed(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      process.env.CLERK_SECRET_KEY,
    ) || isLocalDemoModeEnabled()
  );
}
