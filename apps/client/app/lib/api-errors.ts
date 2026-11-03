export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof Error &&
    /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(
      error.message,
    )
  ) {
    return "Could not connect to app services. Check your connection and try again. Your sign-in has not changed.";
  }

  return error instanceof Error ? error.message : fallback;
}

export function getApiResponseError(
  status: number,
  serverMessage: string | null,
  fallback: string,
): string {
  if (status === 401) {
    return "The housing service did not accept your session (401). This may be an expired session or a Clerk configuration mismatch. Sign out and back in; if this continues, contact support.";
  }
  if (status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (status >= 500) {
    return "The housing service is temporarily unavailable. Please try again.";
  }

  return serverMessage ?? `${fallback} (${status})`;
}

export function readApiServerMessage(body: unknown): string | null {
  return body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : null;
}
