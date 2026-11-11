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
