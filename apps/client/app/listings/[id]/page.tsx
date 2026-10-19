"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ListingDetail from "../../components/home/listingcard/ListingDetail";
import type { Listing } from "../../components/home/listingcard/types";
import { apiBase } from "../../lib/api-base";
import { shareListing } from "../../lib/share-listing";
import { useSavedListings } from "../../lib/saved-listings";
import type { ApiListing } from "../../lib/map-listing";
import { mapListing } from "../../lib/map-listing";
import styles from "./page.module.css";

type PageState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "not-found" }
  | { status: "ready"; listing: Listing };

type RequestState = { key: string; state: PageState };
type ApiListingResponse = { data: ApiListing };
type ShareStatus = "idle" | "shared" | "copied" | "error";

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${id}:${attempt}`;
  const [requestState, setRequestState] = useState<RequestState>({
    key: requestKey,
    state: { status: "loading" },
  });
  const pageState =
    requestState.key === requestKey
      ? requestState.state
      : { status: "loading" as const };
  const pageTitle =
    pageState.status === "ready" ? pageState.listing.name : null;
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const {
    savedIds,
    ready: savedReady,
    error: savedError,
    toggleSaved,
  } = useSavedListings();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setRequestState({
        key: requestKey,
        state: { status: "error" },
      });
    }, 15_000);

    Promise.resolve()
      .then(() =>
        fetch(`${apiBase()}/listings/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        }),
      )
      .then(async (response) => {
        if (controller.signal.aborted) return;

        if (response.status === 404) {
          setRequestState({
            key: requestKey,
            state: { status: "not-found" },
          });
          return;
        }
        if (!response.ok) {
          throw new Error(`Listing request failed with status ${response.status}`);
        }

        const result: ApiListingResponse = await response.json();
        if (controller.signal.aborted) return;
        setRequestState({
          key: requestKey,
          state: { status: "ready", listing: mapListing(result.data) },
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRequestState({ key: requestKey, state: { status: "error" } });
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [id, requestKey]);

  useEffect(() => {
    if (shareStatus === "idle") return;

    const timeout = window.setTimeout(() => setShareStatus("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [shareStatus]);

  useEffect(() => {
    if (pageTitle) document.title = `${pageTitle} | Delta Housing`;
  }, [pageTitle]);

  async function sharePageUrl(listingName: string) {
    try {
      const result = await shareListing({ id, name: listingName });
      if (result !== "cancelled") setShareStatus(result);
    } catch {
      setShareStatus("error");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <Link href="/" className={styles.back}>
            <span aria-hidden="true">←</span> Back to listings
          </Link>
          <span className={styles.pageTitle} title={pageTitle ?? undefined}>
            {pageTitle ?? "Listing details"}
          </span>
          {pageState.status === "ready" ? (
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.saveButton}
                disabled={!savedReady}
                aria-pressed={savedIds.has(pageState.listing.id)}
                onClick={() => toggleSaved(pageState.listing.id)}
              >
                {savedIds.has(pageState.listing.id) ? "Saved" : "Save"}
              </button>
              <button
                type="button"
                className={styles.shareButton}
                onClick={() => sharePageUrl(pageState.listing.name)}
              >
                {shareStatus === "shared"
                  ? "Shared"
                  : shareStatus === "copied"
                    ? "Link copied"
                    : "Share"}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className={styles.content}>
        {pageState.status === "loading" ? (
          <section
            className={styles.skeleton}
            aria-label="Loading listing details"
            role="status"
          >
            <div className={styles.skeletonHero} />
            <div className={styles.skeletonCopy}>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonMeta} />
              <div className={styles.skeletonPrice} />
              <div className={styles.skeletonTabs} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineShort} />
            </div>
            <span className={styles.srOnly}>Loading listing...</span>
          </section>
        ) : null}

        {pageState.status === "error" ? (
          <section className={styles.message} role="alert">
            <p className={styles.eyebrow}>Connection problem</p>
            <h1>We couldn’t load this listing</h1>
            <p>
              Check your connection and try again. The listing data has not
              been replaced with sample content.
            </p>
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => setAttempt((current) => current + 1)}
            >
              Try again
            </button>
          </section>
        ) : null}

        {pageState.status === "not-found" ? (
          <section className={styles.message} role="status">
            <p className={styles.eyebrow}>Listing unavailable</p>
            <h1>This place couldn’t be found</h1>
            <p>
              It may have been removed, or the address may be incomplete.
            </p>
            <Link href="/" className={styles.backToBrowse}>
              Browse listings
            </Link>
          </section>
        ) : null}

        {pageState.status === "ready" ? (
          <>
            {shareStatus !== "idle" ? (
              <p
                className={styles.feedback}
                aria-live="polite"
                role={shareStatus === "error" ? "alert" : "status"}
              >
                {shareStatus === "shared"
                  ? "Share sheet opened."
                  : shareStatus === "copied"
                    ? "The listing link is ready to share."
                    : "Could not copy the link here. You can copy the page address from your browser."}
              </p>
            ) : null}
            {savedError ? (
              <p className={styles.feedback} role="alert">
                {savedError} Saved places are stored on this device only and
                are not synced to an account.
              </p>
            ) : null}
            <article
              className={styles.detail}
              aria-label={pageState.listing.name}
            >
              <ListingDetail
                listing={pageState.listing}
                presentation="page"
              />
            </article>
          </>
        ) : null}
      </div>
    </main>
  );
}
