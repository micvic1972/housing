export function validateDatabaseUrl(
  value: string | undefined,
  variableName: string,
): string {
  const invalidUrlMessage =
    `${variableName} must be a valid PostgreSQL URI in the form ` +
    "`postgresql://<user>:<password>@<host>:<port>/<database>`. " +
    "Use the Supabase dashboard connection URI and URL-encode special characters in credentials.";

  if (!value || value.trim() !== value) {
    throw new Error(invalidUrlMessage);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(invalidUrlMessage);
  }

  const isPostgres =
    url.protocol === "postgresql:" || url.protocol === "postgres:";
  const hasValidPort =
    url.port !== "" &&
    Number.isInteger(Number(url.port)) &&
    Number(url.port) >= 1 &&
    Number(url.port) <= 65535;
  const hasDatabase = url.pathname.length > 1;

  if (
    !isPostgres ||
    !url.hostname ||
    !url.username ||
    !url.password ||
    !hasValidPort ||
    !hasDatabase
  ) {
    throw new Error(invalidUrlMessage);
  }

  return value;
}
