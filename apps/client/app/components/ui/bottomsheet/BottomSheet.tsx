"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    dragging.current = true;
    startY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setDragY(delta);
  }
  function onTouchEnd() {
    dragging.current = false;
    if (dragY > 110) onClose();
    setDragY(0);
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className={styles.grabRow}>
            <div className={styles.grab} aria-hidden="true" />
          </div>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{title}</h2>
            <button type="button" className={styles.closeBtn} aria-label="Close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}