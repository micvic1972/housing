// Combines CSS module classNames from multiple files (base + tablet + desktop)
// safely — skips anything undefined instead of leaking "undefined" into the DOM.
export function cx(...classes: Array<string | undefined | false | null>): string {
  return classes.filter(Boolean).join(" ");
}