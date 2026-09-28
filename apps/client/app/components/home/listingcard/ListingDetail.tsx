"use client";

// ============================================================================
// ListingDetail: the content inside the "Quick look" sheet (Step 3)
//
// Layout, top to bottom:
//   1. Hero photos: each photo is 86% wide so the NEXT photo peeks in at the
//      edge (a signifier that says "swipe me"), with a "1 / 3" counter.
//   2. Info block: name, distance, area, rating, and the same two trust
//      signals the card shows.
//   3. A sticky tab bar with the four questions students ask:
//        Overview: why this place?
//        Trust:    who checked it, and who will I deal with?
//        Costs:    what will I pay, and when?
//        Location: how far is it, and is it safe?
//
// HONEST-GAP RULE: when a fact is missing we say so ("Not reported yet"),
// we never imply it is fine.
//
// This file also exports ListingDetailFooter (heart + main action), which
// page.tsx hands to the sheet's footer slot so it never scrolls away.
//
// HYDRATION: the sheet only mounts after a tap, in the browser, so formatting
// numbers with toLocaleString here is safe.
// ============================================================================

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Check, Heart, Minus, Star } from "lucide-react";
import type { Listing } from "./types";
import { placeholderScene } from "./placeholder-scene";
import { getSignals } from "./ListingCard";
import styles from "./ListingDetail.module.css";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

// Walking time at an easy student pace of 5 km/h, never less than 1 minute.
function walkMinutes(km: number) {
  return Math.max(1, Math.round((km / 5) * 60));
}

// ----------------------------------------------------------------------------
// HERO PHOTOS
// ----------------------------------------------------------------------------

function Hero({ listing }: { listing: Listing }) {
  const isBuild = listing.kind === "construction";

  // Same rule as the card: real photo if there is a url, otherwise draw the
  // placeholder for that photo position (0 outside, 1 room, 2 compound).
  const slides = useMemo(() => {
    const source =
      listing.images && listing.images.length > 0
        ? listing.images
        : [{ id: `${listing.id}-ph`, url: "", alt: listing.name }];

    return source.map((img, i) => ({
      key: img.id,
      alt: img.alt,
      src: img.url || placeholderScene(listing.id, isBuild, i),
    }));
  }, [listing.id, listing.images, listing.name, isBuild]);

  const count = slides.length;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [active, setActive] = useState(0);

  // Update the counter as the student swipes. Once per animation frame.
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollerRef.current;
      if (!el) return;

      // The last photo cannot scroll all the way to the left edge (it is only
      // 86% wide), so "scrolled to the very end" means "on the last photo".
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) {
        setActive(count - 1);
        return;
      }

      const first = el.children[0] as HTMLElement | undefined;
      const second = el.children[1] as HTMLElement | undefined;
      if (!first || !second) return;

      const step = second.offsetLeft - first.offsetLeft;
      if (step <= 0) return;

      setActive(clamp(Math.round(el.scrollLeft / step), 0, count - 1));
    });
  }, [count]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className={`${styles.heroWrap} ${
        listing.kind === "rented" ? styles.rented : ""
      }`}
    >
      <div
        ref={scrollerRef}
        className={styles.hero}
        onScroll={handleScroll}
        aria-label="Photos"
      >
        {slides.map((s) => (
          <div
            key={s.key}
            className={`${styles.heroSlide} ${
              count === 1 ? styles.heroSolo : ""
            }`}
          >
            <img
              className={styles.heroImg}
              src={s.src}
              alt={s.alt}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {count > 1 ? (
        <span className={styles.counter} aria-hidden>
          {active + 1} / {count}
        </span>
      ) : null}
    </div >
  );
}

// ----------------------------------------------------------------------------
// TAB: OVERVIEW
// ----------------------------------------------------------------------------

function OverviewTab({ listing }: { listing: Listing }) {
  const km = listing.location.distanceFromUniversityKm;

  return (
    <>
      <h3 className={styles.sectionTitle}>Why this place?</h3>
      <p className={styles.lead}>{listing.insight ?? "Nothing noted yet."}</p>

      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>From the gate</dt>
          <dd>
            {km != null
              ? `${km} km, about ${walkMinutes(km)} min walk`
              : "Not reported yet"}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Area</dt>
          <dd>{listing.location.area}</dd>
        </div>
        <div className={styles.row}>
          <dt>Rating</dt>
          <dd>
            {listing.rating != null
              ? `${listing.rating.toFixed(1)} from ${
                  listing.reviewCount ?? 0
                } reviews`
              : "No reviews yet"}
          </dd>
        </div>
      </dl>
    </>
  );
}

// ----------------------------------------------------------------------------
// TAB: TRUST
// ----------------------------------------------------------------------------

const CHECK_LABELS: Record<string, string> = {
  water: "Water",
  power: "Power",
  security: "Security",
  "in-person-visit": "Visited in person",
};
const ALL_CHECKS = ["water", "power", "security", "in-person-visit"] as const;

const CONTACT_LABELS: Record<string, string> = {
  owner: "Owner. You deal directly.",
  agent: "Agent. You deal through a middleman.",
  "university-partner": "University partner.",
};

function TrustTab({ listing }: { listing: Listing }) {
  const checks = listing.verifiedChecks ?? [];
  const fee = listing.contact?.inspectionFee;

  return (
    <>
      <h3 className={styles.sectionTitle}>What we checked</h3>

      {listing.verified && checks.length > 0 ? (
        <ul className={styles.chips}>
          {ALL_CHECKS.map((c) => {
            const done = checks.includes(c);
            return (
              <li
                key={c}
                className={`${styles.check} ${done ? styles.checkOn : ""}`}
              >
                {done ? (
                  <Check size={14} aria-hidden />
                ) : (
                  <Minus size={14} aria-hidden />
                )}
                {done ? CHECK_LABELS[c] : `${CHECK_LABELS[c]} not checked`}
              </li>
            );
          })}
        </ul>
      ) : listing.verified ? (
        <p className={styles.gap}>
          Verified, but the list of checks was not recorded.
        </p>
      ) : (
        <p className={styles.gap}>
          Not verified yet.{" "}
          {listing.kind === "construction"
            ? "This place is still being built, so there is nothing to check in person."
            : "Nobody from UniNest has checked it."}
        </p>
      )}

      <h3 className={styles.sectionTitle}>Who you deal with</h3>

      {listing.contact ? (
        <dl className={styles.rows}>
          <div className={styles.row}>
            <dt>Contact</dt>
            <dd>{CONTACT_LABELS[listing.contact.contactType]}</dd>
          </div>
          <div className={styles.row}>
            <dt>Inspection fee</dt>
            <dd>
              {fee ? (
                <span className={styles.warnText}>
                  {naira(fee.amount)} just to look
                </span>
              ) : fee === null ? (
                "None. Looking is free."
              ) : (
                "Not confirmed. Ask before you go."
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <p className={styles.gap}>Not reported yet. Ask before you go.</p>
      )}
    </>
  );
}

// ----------------------------------------------------------------------------
// TAB: COSTS
// ----------------------------------------------------------------------------

const PERIOD_LABELS: Record<string, string> = {
  year: "Year",
  session: "Session",
  semester: "Semester",
  month: "Month",
};

function CostsTab({ listing }: { listing: Listing }) {
  const fee = listing.contact?.inspectionFee;
  const years = listing.paymentOptions?.requiresUpfrontYears;
  const periods = listing.paymentOptions?.acceptedPeriods;

  return (
    <>
      <h3 className={styles.sectionTitle}>What you will pay</h3>

      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Rent</dt>
          <dd>
            <b>{naira(listing.pricing.amount)}</b> / {listing.pricing.period}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>You can pay by</dt>
          <dd>
            {periods && periods.length > 0
              ? periods.map((p) => PERIOD_LABELS[p] ?? p).join(", ")
              : "Not reported yet"}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Inspection fee</dt>
          <dd>
            {fee ? (
              <span className={styles.warnText}>{naira(fee.amount)}</span>
            ) : fee === null ? (
              "None"
            ) : (
              "Not confirmed"
            )}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Paid upfront</dt>
          <dd>
            {years === undefined
              ? "Not reported yet. Ask before you pay."
              : years === 1
                ? "1 year, no more"
                : `${years} years`}
          </dd>
        </div>
      </dl>

      {years !== undefined && years > 1 ? (
        <div className={styles.warnBox} role="note">
          <strong>{years} years upfront</strong>
          <span>Ask why before you pay anything.</span>
        </div>
      ) : null}
    </>
  );
}

// ----------------------------------------------------------------------------
// TAB: LOCATION
// ----------------------------------------------------------------------------

function LocationTab({ listing }: { listing: Listing }) {
  const km = listing.location.distanceFromUniversityKm;
  const safety = listing.safety;

  // Only show a safety fact when we actually know it.
  const safetyChips: { text: string; on: boolean }[] = [];
  if (safety?.hasSecurityPost !== undefined) {
    safetyChips.push({
      text: safety.hasSecurityPost ? "Security post" : "No security post",
      on: safety.hasSecurityPost,
    });
  }
  if (safety?.isGatedCompound !== undefined) {
    safetyChips.push({
      text: safety.isGatedCompound ? "Gated compound" : "Not gated",
      on: safety.isGatedCompound,
    });
  }

  return (
    <>
      <h3 className={styles.sectionTitle}>From the UNIDEL gate</h3>

      {km != null ? (
        <>
          {/* A simple sketch, not a real map. A real map comes later. */}
          <svg
            className={styles.map}
            viewBox="0 0 320 130"
            role="img"
            aria-label={`Sketch of the walk from the UNIDEL gate to ${listing.name}`}
          >
            <rect className={styles.mapBg} width="320" height="130" rx="12" />
            <path
              className={styles.mapRoad}
              d="M40 90 C 110 90, 130 40, 200 44 S 270 60, 280 40"
            />
            <circle className={styles.mapGate} cx="40" cy="90" r="8" />
            <circle className={styles.mapPlace} cx="280" cy="40" r="8" />
            <text className={styles.mapText} x="40" y="114" textAnchor="middle">
              UNIDEL gate
            </text>
            <text className={styles.mapText} x="280" y="22" textAnchor="middle">
              This place
            </text>
          </svg>
          <p className={styles.lead}>
            {km} km, about {walkMinutes(km)} min on foot
          </p>
          <p className={styles.note}>Sketch, not to scale.</p>
        </>
      ) : (
        <p className={styles.gap}>Distance not reported yet.</p>
      )}

      <h3 className={styles.sectionTitle}>Safety</h3>

      {safetyChips.length > 0 ? (
        <ul className={styles.chips}>
          {safetyChips.map((c) => (
            <li
              key={c.text}
              className={`${styles.check} ${c.on ? styles.checkOn : ""}`}
            >
              {c.on ? (
                <Check size={14} aria-hidden />
              ) : (
                <Minus size={14} aria-hidden />
              )}
              {c.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.gap}>Not reported yet. Ask when you visit.</p>
      )}
    </>
  );
}

// ----------------------------------------------------------------------------
// THE DETAIL VIEW
// ----------------------------------------------------------------------------

type TabId = "overview" | "trust" | "costs" | "location";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "trust", label: "Trust" },
  { id: "costs", label: "Costs" },
  { id: "location", label: "Location" },
];

export default function ListingDetail({ listing }: { listing: Listing }) {
  const [tab, setTab] = useState<TabId>("overview");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const uid = useId();

  const signals = getSignals(listing);
  const km = listing.location.distanceFromUniversityKm;

  // Left / Right arrows move between tabs (standard tab keyboard behaviour).
  function onTabKeyDown(e: ReactKeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();

    const next =
      e.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : (index - 1 + TABS.length) % TABS.length;

    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className={styles.detail}>
      <Hero listing={listing} />

      {/* Info block */}
      <div className={styles.info}>
        <h2 className={styles.name}>{listing.name}</h2>
        <p className={styles.meta}>
          {km != null ? `${km} km · ` : ""}
          {listing.location.area}
          {listing.rating != null ? (
            <>
              {" · "}
              <Star size={12} aria-hidden className={styles.star} />{" "}
              {listing.rating.toFixed(1)}
            </>
          ) : null}
        </p>

        {signals.length > 0 ? (
          <div className={styles.signals}>
            {signals.map((s) => (
              <span
                key={s.text}
                className={`${styles.signal} ${styles[s.tone]}`}
              >
                {s.text}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Sticky tab bar */}
      <div className={styles.tabs} role="tablist" aria-label="Listing details">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${uid}-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`${styles.tab} ${tab === t.id ? styles.tabOn : ""}`}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* The active tab's content */}
      <div
        className={styles.panel}
        role="tabpanel"
        id={`${uid}-panel-${tab}`}
        aria-labelledby={`${uid}-tab-${tab}`}
      >
        {tab === "overview" ? <OverviewTab listing={listing} /> : null}
        {tab === "trust" ? <TrustTab listing={listing} /> : null}
        {tab === "costs" ? <CostsTab listing={listing} /> : null}
        {tab === "location" ? <LocationTab listing={listing} /> : null}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// THE FOOTER: heart + the main action. The label depends on the listing kind.
// The main action has no booking flow behind it yet, so it does nothing for
// now (we do not fake behaviour).
// ----------------------------------------------------------------------------

export function ListingDetailFooter({
  listing,
  saved,
  onToggleSave,
}: {
  listing: Listing;
  saved: boolean;
  onToggleSave: (id: string) => void;
}) {
  const label =
    listing.kind === "construction"
      ? "Follow this build"
      : listing.kind === "rented"
        ? "See similar places"
        : "Book an inspection"; // available and expiring

  return (
    <div className={styles.footerRow}>
      <button
        type="button"
        className={`${styles.saveBtn} ${saved ? styles.saveOn : ""}`}
        aria-label={
          saved ? `Remove ${listing.name} from saved` : `Save ${listing.name}`
        }
        aria-pressed={saved}
        onClick={() => onToggleSave(listing.id)}
      >
        <Heart size={20} aria-hidden />
      </button>

      <button type="button" className={styles.primary}>
        {label}
      </button>
    </div>
  );
}