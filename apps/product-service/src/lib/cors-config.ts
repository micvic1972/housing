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

  const entries = configuredOrigins.split(",").map((origin) => origin.trim());
  if (entries.some((origin) => !origin)) {
    throw new Error(
      "CORS_ALLOWED_ORIGINS must contain comma-separated HTTP(S) origins",
    );
  }

  const origins = entries.map((origin) => {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(
        "CORS_ALLOWED_ORIGINS must contain comma-separated HTTP(S) origins",
      );
    }

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== origin
    ) {
      throw new Error(
        "CORS_ALLOWED_ORIGINS must contain comma-separated HTTP(S) origins without paths",
      );
    }

    return parsed.origin;
  });

  return [...new Set(origins)];
}
