"use client";

import { useState } from "react";
import BottomSheet from "../components/ui/bottomsheet/BottomSheet";
import FeedGrid from "../components/home/feed/FeedGrid";
import ListingDetail, {
  ListingDetailFooter,
} from "../components/home/listingcard/ListingDetail";
import { useListings } from "../lib/listings-provider";
import { useSavedListings } from "../lib/saved-listings";
import styles from "./page.module.css";

export default function ProfilePage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { listings, status, reload } = useListings();
  const {
    savedIds,
    ready,
    error,
    toggleSaved,
  } = useSavedListings();
  const savedListings = listings.filter((listing) => savedIds.has(listing.id));
  const activeListing = listings.find((listing) => listing.id === openId) ?? null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Your profile</p>
        <h1>Saved places</h1>
        <p>
          Saved places are stored in this browser only. They are not synced to
          your account or other devices.
        </p>
      </header>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {!ready || status === "loading" ? (
        <p className={styles.message} role="status">
          Loading your saved places…
        </p>
      ) : null}

      {status === "error" ? (
        <section className={styles.message} role="alert">
          <p>Listings could not be loaded, so your saved places cannot be shown.</p>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </section>
      ) : null}

      {ready && status === "ready" && savedListings.length === 0 ? (
        <section className={styles.message} role="status">
          <p>You have not saved any places on this device yet.</p>
        </section>
      ) : null}

      {ready && savedListings.length > 0 ? (
        <FeedGrid
          listings={savedListings}
          saved={savedIds}
          savingDisabled={!ready}
          onToggleSave={toggleSaved}
          onOpen={setOpenId}
        />
      ) : null}

      <BottomSheet
        open={Boolean(activeListing)}
        onClose={() => setOpenId(null)}
        title={activeListing?.name}
        footer={
          activeListing ? (
            <ListingDetailFooter
              listing={activeListing}
              saved={savedIds.has(activeListing.id)}
              savingDisabled={!ready}
              onToggleSave={toggleSaved}
            />
          ) : undefined
        }
      >
        {activeListing ? (
          <ListingDetail key={activeListing.id} listing={activeListing} />
        ) : null}
      </BottomSheet>
    </main>
  );
}
