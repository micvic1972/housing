"use client";

// ============================================================================
// ListingDetail: shared content for Quick Look and the full listing page.
//
// Layout, top to bottom:
//   1. Hero photos: each photo is 86% wide so the NEXT photo peeks in at the
//      edge (a signifier that says "swipe me"), with a "1 / 3" counter.
//   2. Info block: name, area, room type, and the same trust signals as cards.
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Heart, MessageCircle, Minus } from "lucide-react";
import type { Listing } from "./types";
import { placeholderScene } from "./placeholder-scene";
import { getSignals } from "./ListingCard";
import { ROOM_LABELS } from "../../filter/listing-fields";
import { campusLabel } from "../../../config/campuses";
import {
  getListingStatusLabel,
  isListingUnavailable,
} from "../../../lib/listing-status";
import { useStudentActivity } from "../../../lib/student-activity";
import styles from "./ListingDetail.module.css";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

// ----------------------------------------------------------------------------
// HERO PHOTOS
// ----------------------------------------------------------------------------

function Hero({
  listing,
  presentation,
}: {
  listing: Listing;
  presentation: "sheet" | "page";
}) {
  const isBuild = listing.kind === "construction";

  // Same rule as the card: real photo if there is a url, otherwise draw the
  // placeholder for that photo position (0 outside, 1 room, 2 compound).
  const slides = useMemo(() => {
    const source = listing.images.filter((image) => image.url.trim());

    if (source.length === 0) {
      const fallback = placeholderScene(listing.id, isBuild, 0);
      return [
        {
          key: `${listing.id}-placeholder`,
          alt: `${listing.name} illustration; photo unavailable`,
          src: fallback,
          fallback,
          illustrative: true,
        },
      ];
    }

    return source.map((img, i) => ({
      key: img.id,
      alt: img.alt || listing.name,
      src: img.url,
      fallback: placeholderScene(listing.id, isBuild, i),
      illustrative: false,
    }));
  }, [listing.id, listing.images, listing.name, isBuild]);

  const count = slides.length;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [active, setActive] = useState(0);
  const [failedSlides, setFailedSlides] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const activeSlide = slides[Math.min(active, count - 1)];

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
        isListingUnavailable(listing) ? styles.unavailable : ""
      } ${presentation === "page" ? styles.heroWrapPage : ""}`}
    >
      <div
        ref={scrollerRef}
        className={`${styles.hero} ${
          presentation === "page" ? styles.heroPage : ""
        }`}
        onScroll={handleScroll}
        aria-label="Photos"
      >
        {slides.map((s) => (
          <div
            key={s.key}
            className={`${styles.heroSlide} ${
              count === 1 ? styles.heroSolo : ""
            } ${presentation === "page" ? styles.heroSlidePage : ""}`}
          >
            <img
              className={styles.heroImg}
              src={s.src}
              alt={
                s.illustrative || failedSlides.has(s.key)
                  ? `${listing.name} illustration; photo unavailable`
                  : s.alt
              }
              draggable={false}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = s.fallback;
                setFailedSlides((previous) => new Set(previous).add(s.key));
              }}
            />
          </div>
        ))}
      </div>

      {activeSlide.illustrative || failedSlides.has(activeSlide.key) ? (
        <span className={styles.imageNotice}>
          Illustration · photo unavailable
        </span>
      ) : null}

      {count > 1 ? (
        <span className={styles.counter} aria-hidden>
          {active + 1} / {count}
        </span>
      ) : null}
    </div>
  );
}

// ----------------------------------------------------------------------------
// TAB: OVERVIEW
// ----------------------------------------------------------------------------

function OverviewTab({ listing }: { listing: Listing }) {
  return (
    <>
      <h3 className={styles.sectionTitle}>About this place</h3>
      <p className={styles.lead}>
        {listing.insight ||
          "No description has been provided for this listing."}
      </p>

      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Room type</dt>
          <dd>{ROOM_LABELS[listing.roomType]}</dd>
        </div>
        <div className={styles.row}>
          <dt>Area</dt>
          <dd>{listing.location.area}</dd>
        </div>
        {listing.location.campus ? (
          <div className={styles.row}>
            <dt>Campus</dt>
            <dd>
              {campusLabel(listing.location.campus) ?? listing.location.campus}
            </dd>
          </div>
        ) : null}
      </dl>

      <h3 className={styles.sectionTitle}>Amenities</h3>
      {listing.amenities.length ? (
        <ul className={styles.chips}>
          {listing.amenities.map((amenity) => (
            <li key={amenity} className={styles.check}>
              {amenity}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.gap}>Amenities have not been reported yet.</p>
      )}
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
            : "Nobody from Delta Housing has checked it."}
        </p>
      )}

      <h3 className={styles.sectionTitle}>Who you deal with</h3>

      {listing.contact ? (
        <dl className={styles.rows}>
          <div className={styles.row}>
            <dt>Contact</dt>
            <dd>
              {listing.contact.contactType
                ? CONTACT_LABELS[listing.contact.contactType]
                : "Not reported yet"}
            </dd>
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
      <h3 className={styles.sectionTitle}>Location details</h3>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Area</dt>
          <dd>{listing.location.area}</dd>
        </div>
        {listing.location.campus ? (
          <div className={styles.row}>
            <dt>Campus</dt>
            <dd>{listing.location.campus}</dd>
          </div>
        ) : null}
        {listing.location.landmark ? (
          <div className={styles.row}>
            <dt>Nearby landmark</dt>
            <dd>{listing.location.landmark}</dd>
          </div>
        ) : null}
      </dl>
      <p className={styles.note}>
        Exact distance and directions are not available for this listing.
      </p>

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

export default function ListingDetail({
  listing,
  presentation = "sheet",
}: {
  listing: Listing;
  presentation?: "sheet" | "page";
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const uid = useId();
  const router = useRouter();
  const {
    inspections,
    ready: activityReady,
    error: activityError,
    requestInspection,
    startConversation,
  } = useStudentActivity();
  const activeInspection = inspections.find(
    (inspection) =>
      inspection.listingId === listing.id &&
      (inspection.status === "requested" || inspection.status === "confirmed"),
  );

  function requestLocalInspection() {
    const saved = requestInspection(listing.id);
    setActionMessage(
      saved
        ? "Demo request saved on this device only. It has not been sent to the property contact."
        : "The demo request could not be saved on this device.",
    );
  }

  function openLocalConversation() {
    const conversationId = startConversation(listing.id);
    if (!conversationId) {
      setActionMessage("The local demo conversation could not be created.");
      return;
    }
    router.push(`/messages/${encodeURIComponent(conversationId)}`);
  }

  const signals = getSignals(listing);
  const statusLabel = getListingStatusLabel(listing);

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
    <div
      className={`${styles.detail} ${
        presentation === "page" ? styles.detailPage : ""
      }`}
    >
      <Hero listing={listing} presentation={presentation} />

      {/* Info block */}
      <div
        className={`${styles.info} ${
          presentation === "page" ? styles.infoPage : ""
        }`}
      >
        {presentation === "page" ? (
          <h1 className={`${styles.name} ${styles.namePage}`}>
            {listing.name}
          </h1>
        ) : (
          <h2 className={styles.name}>{listing.name}</h2>
        )}
        <p className={styles.meta}>
          {ROOM_LABELS[listing.roomType]} · {listing.location.area}
        </p>
        {presentation === "page" ? (
          <p className={styles.pricePage}>
            <strong>₦{listing.pricing.amount.toLocaleString("en-NG")}</strong>
            <span> / {listing.pricing.period}</span>
          </p>
        ) : null}

        {statusLabel || signals.length > 0 ? (
          <div className={styles.signals}>
            {statusLabel ? (
              <span
                className={`${styles.signal} ${
                  isListingUnavailable(listing) ? styles.warn : styles.neutral
                }`}
              >
                {statusLabel}
              </span>
            ) : null}
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
      <div
        className={`${styles.tabs} ${
          presentation === "page" ? styles.tabsPage : ""
        }`}
        role="tablist"
        aria-label="Listing details"
      >
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
        className={`${styles.panel} ${
          presentation === "page" ? styles.panelPage : ""
        }`}
        role="tabpanel"
        id={`${uid}-panel-${tab}`}
        aria-labelledby={`${uid}-tab-${tab}`}
      >
        {tab === "overview" ? <OverviewTab listing={listing} /> : null}
        {tab === "trust" ? <TrustTab listing={listing} /> : null}
        {tab === "costs" ? <CostsTab listing={listing} /> : null}
        {tab === "location" ? <LocationTab listing={listing} /> : null}
      </div>

      <section className={styles.studentActions} aria-label="Student actions">
        <div>
          <p className={styles.actionEyebrow}>Next steps · local prototype</p>
          <p className={styles.actionNote}>
            These demo actions stay on this device. They don’t contact a
            landlord or confirm an appointment.
          </p>
        </div>
        {activeInspection ? (
          <p className={styles.actionState} role="status">
            Inspection request saved locally ·{" "}
            {activeInspection.status === "confirmed"
              ? "confirmed"
              : "waiting for a real contact"}
          </p>
        ) : (
          <button
            type="button"
            className={styles.actionButton}
            disabled={!activityReady}
            onClick={requestLocalInspection}
          >
            <CalendarDays size={17} aria-hidden />
            Request inspection
          </button>
        )}
        <button
          type="button"
          className={styles.actionSecondary}
          disabled={!activityReady}
          onClick={openLocalConversation}
        >
          <MessageCircle size={17} aria-hidden />
          Open local message demo
        </button>
        {actionMessage ? (
          <p className={styles.actionState} role="status">
            {actionMessage}
          </p>
        ) : null}
        {activityError ? (
          <p className={styles.actionError} role="alert">
            {activityError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------------
// THE FOOTER: save the listing or open its shareable detail page.
// ----------------------------------------------------------------------------

export function ListingDetailFooter({
  listing,
  saved,
  savingDisabled = false,
  onToggleSave,
}: {
  listing: Listing;
  saved: boolean;
  savingDisabled?: boolean;
  onToggleSave: (id: string) => void;
}) {
  return (
    <div className={styles.footerRow}>
      <button
        type="button"
        className={`${styles.saveBtn} ${saved ? styles.saveOn : ""}`}
        disabled={savingDisabled}
        aria-label={
          saved ? `Remove ${listing.name} from saved` : `Save ${listing.name}`
        }
        aria-pressed={saved}
        onClick={() => onToggleSave(listing.id)}
      >
        <Heart size={20} aria-hidden />
      </button>

      <Link
        href={`/listings/${encodeURIComponent(listing.id)}`}
        className={styles.primary}
      >
        View full listing
      </Link>
    </div>
  );
}
