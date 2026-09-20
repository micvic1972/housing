// Animates an element's horizontal scroll position over a fixed duration,
// with the same easing on every platform — unlike the browser's native
// smooth-scroll, which iOS and Android run at noticeably different speeds.
export function smoothScrollTo(el: HTMLElement, targetLeft: number, duration = 380) {
  const prefersReduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced) {
    el.scrollLeft = targetLeft;
    return;
  }

  const startLeft = el.scrollLeft;
  const delta = targetLeft - startLeft;
  if (Math.abs(delta) < 1) return;

  const start = performance.now();
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  function step(now: number) {
    const progress = Math.min((now - start) / duration, 1);
    el.scrollLeft = startLeft + delta * easeOutCubic(progress);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}