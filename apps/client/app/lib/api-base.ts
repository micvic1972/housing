const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function apiBase(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!configuredUrl) {
    return `http://${window.location.hostname}:4000`;
  }

  const url = new URL(configuredUrl);
  if (
    loopbackHosts.has(url.hostname) &&
    !loopbackHosts.has(window.location.hostname)
  ) {
    url.hostname = window.location.hostname;
  }

  return url.toString().replace(/\/+$/, "");
}
