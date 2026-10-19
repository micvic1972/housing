"use client";

import { useEffect, useRef, useState } from "react";
import BottomSheet from "../ui/bottomsheet/BottomSheet";
import { CAMPUSES, type CampusId } from "../../config/campuses";
import { useFilters } from "../filter/FilterProvider";
import styles from "./CampusOnboarding.module.css";

const DISMISSED_KEY = "delta-housing.campus-onboarding.v1";
const SESSION_INTERACTION_KEY = "delta-housing.campus-onboarding-interacted";

export default function CampusOnboarding({
  blocked,
}: {
  blocked: boolean;
}) {
  const {
    filters,
    campusPreferenceReady,
    campusPreferenceError,
    setCampusPreference,
  } = useFilters();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CampusId | "">("");
  const interacted = useRef(false);
  const dismissed = useRef(false);

  useEffect(() => {
    if (!campusPreferenceReady || filters.campus) return;

    try {
      if (
        window.localStorage.getItem(DISMISSED_KEY) ||
        window.sessionStorage.getItem(SESSION_INTERACTION_KEY)
      ) {
        dismissed.current = true;
        return;
      }
    } catch {
      dismissed.current = true;
      return;
    }

    function markInteraction() {
      interacted.current = true;
      try {
        window.sessionStorage.setItem(SESSION_INTERACTION_KEY, "1");
      } catch {
        dismissed.current = true;
      }
    }
    window.addEventListener("pointerdown", markInteraction, { once: true });
    window.addEventListener("keydown", markInteraction, { once: true });

    const timer = window.setTimeout(() => {
      if (!interacted.current && !dismissed.current && !blocked) setOpen(true);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("keydown", markInteraction);
    };
  }, [blocked, campusPreferenceReady, filters.campus]);

  function rememberDismissal() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "dismissed");
    } catch {
      try {
        window.sessionStorage.setItem(SESSION_INTERACTION_KEY, "1");
      } catch {
        dismissed.current = true;
      }
    }
    dismissed.current = true;
    setOpen(false);
  }

  function applyPreference() {
    if (!selected) return;
    if (setCampusPreference(selected)) {
      try {
        window.localStorage.setItem(DISMISSED_KEY, "complete");
      } catch {
        dismissed.current = true;
      }
      dismissed.current = true;
      setOpen(false);
    }
  }

  return (
    <BottomSheet
      open={open && !blocked}
      onClose={rememberDismissal}
      title="Choose a campus"
      label="Personalize your search"
    >
      <section className={styles.content} aria-labelledby="campus-onboarding-title">
        <p className={styles.eyebrow}>Optional preference</p>
        <h2 id="campus-onboarding-title">Filter by campus</h2>
        <p>
          Choose a campus to show listings that explicitly identify it. You can
          change or clear this filter at any time. Course-to-campus assignments
          have not been verified, so this choice is manual.
        </p>
        <div className={styles.options} role="group" aria-label="Choose a campus">
          {CAMPUSES.map((campus) => (
            <button
              key={campus.id}
              type="button"
              className={
                selected === campus.id
                  ? `${styles.option} ${styles.optionSelected}`
                  : styles.option
              }
              aria-pressed={selected === campus.id}
              onClick={() => setSelected(campus.id)}
            >
              {campus.label}
            </button>
          ))}
        </div>
        {campusPreferenceError ? (
          <p className={styles.error} role="alert">
            {campusPreferenceError}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button type="button" className={styles.skip} onClick={rememberDismissal}>
            Skip for now
          </button>
          <button
            type="button"
            className={styles.continue}
            disabled={!selected}
            onClick={applyPreference}
          >
            Apply campus filter
          </button>
        </div>
      </section>
    </BottomSheet>
  );
}
