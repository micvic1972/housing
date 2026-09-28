"use client";

// ============================================================================
// BottomSheet, the "Quick look" shell (Step 2)
//
// Phone and iPad (under 1024px): a sheet that rises from the bottom.
//   - opens HALF height, so the tab bar behind it and a fade at the bottom
//     tell the student "pull up for more"
//   - drag the header up  -> FULL height
//   - drag the header down -> back to half, then closed
//   - swipe up on the content, or scroll the wheel down, while at half -> FULL
//
// Laptop (1024px and up): a centred modal with a fade + slight scale in.
//   No handle, no drag, no fade at the bottom.
//
// Close paths: X button, tap the dark backdrop, Escape, drag down.
//
// The 1024px breakpoint lives in ONE constant (DESKTOP_MIN_WIDTH). JavaScript
// reads it, then tells the CSS which mode we are in through a data-mode
// attribute. So the CSS never repeats the number.
// ============================================================================

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { X } from "lucide-react";
import styles from "./BottomSheet.module.css";

// The ONE place the laptop breakpoint is defined. Reuse it for the filter sheet.
export const DESKTOP_MIN_WIDTH = 1024;

// How tall the sheet is, as a share of the screen height.
const HALF_RATIO = 0.64;
const FULL_RATIO = 0.92;

type Snap = "half" | "full";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Read out by screen readers (for example the listing name). */
  title?: string;
  /** The small label in the header. */
  label?: string;
  children: ReactNode;
  /** Always visible at the bottom, even at half height. */
  footer?: ReactNode;
}

// ----------------------------------------------------------------------------
// Outer component: when closed it renders nothing. Because the inner Sheet is
// created fresh on every open, it always starts at half height with clean
// state, so there is no "reset" code to get wrong.
// ----------------------------------------------------------------------------
export default function BottomSheet(props: BottomSheetProps) {
  if (!props.open) return null;
  return <Sheet {...props} />;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function Sheet({
  onClose,
  title,
  label = "Quick look",
  children,
  footer,
}: BottomSheetProps) {
  // half or full (only matters on phone and iPad).
  const [snap, setSnap] = useState<Snap>("half");

  // While a finger is dragging, this holds the live height in pixels.
  // null = not dragging, so the CSS class decides the height.
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  // Laptop modal or bottom sheet? The sheet only mounts after a tap, in the
  // browser, so it is safe to read the window right here.
  const [isModal, setIsModal] = useState(
    () => window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches,
  );

  const sheetRef = useRef<HTMLDivElement>(null);

  // Remembers where the current drag started and how fast the finger moves.
  const drag = useRef<{
    startY: number;
    startH: number;
    lastY: number;
    lastT: number;
    velocity: number; // px per ms, positive = moving down
  } | null>(null);

  // Where a swipe on the content started.
  const bodyTouchY = useRef(0);

  // --------------------------------------------------------------------------
  // Keep isModal correct if the window is resized or an iPad is rotated.
  // --------------------------------------------------------------------------
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const onChange = () => setIsModal(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // --------------------------------------------------------------------------
  // Lock the page behind the sheet so it cannot scroll.
  // --------------------------------------------------------------------------
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // --------------------------------------------------------------------------
  // Escape closes.
  // --------------------------------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // --------------------------------------------------------------------------
  // Focus: move it INTO the sheet on open, hand it BACK to whatever opened the
  // sheet on close (so keyboard users do not lose their place).
  // --------------------------------------------------------------------------
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    return () => {
      opener?.focus?.();
    };
  }, []);

  // Keep Tab inside the sheet: from the last button it wraps to the first.
  function onKeyDown(e: ReactKeyboardEvent) {
    if (e.key !== "Tab") return;
    const nodes = sheetRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!nodes || nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const current = document.activeElement;

    if (e.shiftKey && (current === first || current === sheetRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // --------------------------------------------------------------------------
  // DRAGGING THE HEADER (phone and iPad only)
  //
  // Pointer capture means the header keeps receiving the finger's moves even
  // if it slides off the header while dragging.
  // --------------------------------------------------------------------------
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (isModal) return;
    // A press that starts on the X button is a tap, not a drag.
    if ((e.target as HTMLElement).closest("button")) return;

    const el = sheetRef.current;
    if (!el) return;

    e.currentTarget.setPointerCapture(e.pointerId);

    const startH = el.getBoundingClientRect().height;
    drag.current = {
      startY: e.clientY,
      startH,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
    };
    setDragHeight(startH);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;

    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;

    // Finger up = taller, finger down = shorter. Never taller than full.
    const full = window.innerHeight * FULL_RATIO;
    setDragHeight(clamp(d.startH - (e.clientY - d.startY), 0, full));
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;

    const half = window.innerHeight * HALF_RATIO;
    const full = window.innerHeight * FULL_RATIO;
    const height = clamp(d.startH - (d.lastY - d.startY), 0, full);

    // A quick flick counts only if the finger was still moving at release.
    const flicking = e.timeStamp - d.lastT < 100;

    let next: Snap | "close";
    if (flicking && d.velocity < -0.5) {
      next = "full"; // flicked up
    } else if (flicking && d.velocity > 0.5) {
      next = snap === "full" ? "half" : "close"; // flicked down
    } else if (height > (half + full) / 2) {
      next = "full"; // released nearer to full
    } else if (height > half * 0.6) {
      next = "half"; // released near half
    } else {
      next = "close"; // dragged well below half
    }

    setDragHeight(null);
    if (next === "close") onClose();
    else setSnap(next);
  }

  // --------------------------------------------------------------------------
  // At half height the content does not scroll. Swiping up on it, or rolling
  // the mouse wheel down, is the student saying "show me more", so we expand.
  // --------------------------------------------------------------------------
  function onBodyTouchStart(e: ReactTouchEvent) {
    bodyTouchY.current = e.touches[0].clientY;
  }
  function onBodyTouchMove(e: ReactTouchEvent) {
    if (isModal || snap !== "half") return;
    if (bodyTouchY.current - e.touches[0].clientY > 24) setSnap("full");
  }
  function onBodyWheel(e: ReactWheelEvent) {
    if (isModal || snap !== "half") return;
    if (e.deltaY > 0) setSnap("full");
  }

  const halfLocked = !isModal && snap === "half";

  const sheetClass = [
    styles.sheet,
    snap === "full" ? styles.full : styles.half,
    dragHeight !== null ? styles.drag : "",
  ].join(" ");

  return (
    <div
      className={styles.overlay}
      data-mode={isModal ? "modal" : "sheet"}
      // Only a tap on the dark backdrop itself closes, not taps inside the sheet.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        className={sheetClass}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={dragHeight !== null ? { height: dragHeight } : undefined}
      >
        {/* Header: handle + label + X. This whole area is the drag zone. */}
        <div
          className={styles.header}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className={styles.grabRow} aria-hidden="true">
            <div className={styles.grab} />
          </div>
          <div className={styles.labelRow}>
            <span className={styles.label}>{label}</span>
            <button
              type="button"
              className={styles.closeBtn}
              aria-label="Close"
              onClick={onClose}
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>

        {/* Content. At half it is locked (no scroll) with a fade at the
            bottom edge. At full, and on laptop, it scrolls normally. */}
        <div className={styles.bodyWrap}>
          <div
            className={`${styles.body} ${halfLocked ? styles.bodyLocked : ""}`}
            onTouchStart={onBodyTouchStart}
            onTouchMove={onBodyTouchMove}
            onWheel={onBodyWheel}
          >
            {children}
          </div>
          {halfLocked ? <div className={styles.fade} aria-hidden="true" /> : null}
        </div>

        {/* Footer never scrolls away, even at half height. */}
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}