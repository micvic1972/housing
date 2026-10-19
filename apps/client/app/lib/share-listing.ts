type ShareableListing = { id: string; name: string };
export type ShareResult = "shared" | "copied" | "cancelled";

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through for LAN origins where clipboard permissions are unavailable.
    }
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  let copied = false;
  try {
    input.focus();
    input.select();
    copied = document.execCommand("copy");
  } finally {
    input.remove();
  }
  if (!copied) throw new Error("Clipboard access is unavailable");
}

export async function shareListing(
  listing: ShareableListing,
): Promise<ShareResult> {
  const url = new URL(
    `/listings/${encodeURIComponent(listing.id)}`,
    window.location.origin,
  ).toString();

  if (navigator.share) {
    try {
      await navigator.share({ title: listing.name, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  await copyToClipboard(url);
  return "copied";
}
