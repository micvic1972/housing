export const productionFrontendOrigins = [
  "https://delta-housing.vercel.app",
  "https://delta-housing-admin.vercel.app",
] as const;

function parseOriginList(configuredOrigins: string): string[] {
  const entries = configuredOrigins.split(",").map((origin) => origin.trim());
  if (entries.some((origin) => !origin)) {
    throw new Error(
      "Origin allowlists must contain comma-separated HTTP(S) origins",
    );
  }

  const origins = entries.map((origin) => {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(
        "Origin allowlists must contain comma-separated HTTP(S) origins",
      );
    }

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== origin
    ) {
      throw new Error(
        "Origin allowlists must contain HTTP(S) origins without paths",
      );
    }

    return parsed.origin;
  });

  return [...new Set(origins)];
}

export function resolveCorsOrigins(
  nodeEnv = process.env.NODE_ENV,
  configuredOrigins = process.env.CORS_ALLOWED_ORIGINS,
): true | string[] {
  if (nodeEnv !== "production") {
    return true;
  }

  if (!configuredOrigins?.trim()) {
    throw new Error("CORS_ALLOWED_ORIGINS must be configured in production");
  }

  return [
    ...new Set([
      ...parseOriginList(configuredOrigins),
      ...productionFrontendOrigins,
    ]),
  ];
}

export function resolveClerkAuthorizedParties(
  nodeEnv = process.env.NODE_ENV,
  configuredParties = process.env.CLERK_AUTHORIZED_PARTIES,
): string[] {
  if (!configuredParties?.trim()) {
    if (nodeEnv === "production") {
      throw new Error(
        "CLERK_AUTHORIZED_PARTIES must contain both production frontend origins",
      );
    }
    return [];
  }

  const parties = parseOriginList(configuredParties);
  return nodeEnv === "production"
    ? [...new Set([...parties, ...productionFrontendOrigins])]
    : parties;
}
