"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useClerk, useUser } from "@clerk/nextjs";
import { Settings, LogOut, BookmarkCheck, CalendarDays } from "lucide-react";
import BottomSheet from "../components/ui/bottomsheet/BottomSheet";
import FeedGrid from "../components/home/feed/FeedGrid";
import ListingDetail, {
  ListingDetailFooter,
} from "../components/home/listingcard/ListingDetail";
import { useListings } from "../lib/listings-provider";
import { useSavedListings } from "../lib/saved-listings";
import { useMessaging } from "../lib/messaging";
import { useInspectionRequests } from "../lib/inspection-requests";
import styles from "./page.module.css";

export default function ProfileContent() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { listings, status, reload } = useListings();
  const {
    savedIds,
    ready: savedReady,
    signedIn,
    error: savedError,
    toggleSaved,
  } = useSavedListings();
  const {
    conversations,
    ready: messagesReady,
    error: messagesError,
  } = useMessaging();
  const {
    requests: inspectionRequests,
    ready: inspectionsReady,
    error: inspectionError,
  } = useInspectionRequests();
  const savedListings = listings.filter((listing) => savedIds.has(listing.id));
  const activeListing =
    listings.find((listing) => listing.id === openId) ?? null;
  const displayName = user?.fullName || user?.firstName || "Student";
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.profileHeading}>
          {user?.imageUrl ? (
            <Image
              className={styles.avatar}
              src={user.imageUrl}
              alt=""
              width={58}
              height={58}
              unoptimized
            />
          ) : (
            <span className={styles.avatarFallback} aria-hidden>
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <p className={styles.eyebrow}>Your space</p>
            <h1>{isLoaded ? displayName : "Loading profile…"}</h1>
            {email ? <p>{email}</p> : null}
          </div>
        </div>
        <p className={styles.profileNote}>
          Account identity, inspection requests, saved listings and messages use
          your signed-in Clerk session.
        </p>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryAction} href="/profile/settings">
            <Settings size={17} aria-hidden />
            Settings
          </Link>
          <button
            className={styles.signOut}
            type="button"
            onClick={() => void signOut({ redirectUrl: "/" })}
          >
            <LogOut size={17} aria-hidden />
            Sign out
          </button>
        </div>
      </header>

      <section className={styles.summary} aria-label="Your activity">
        <Link
          className={styles.summaryTile}
          href="#saved-places"
          aria-label="View saved places for this account"
        >
          <BookmarkCheck size={18} aria-hidden />
          <strong>
            {!savedReady ? "…" : savedError ? "—" : savedIds.size}
          </strong>
          <span>saved places</span>
        </Link>
        <Link
          className={styles.summaryTile}
          href="/inspection"
          aria-label="View inspection requests for this account"
        >
          <CalendarDays size={18} aria-hidden />
          <strong>
            {!inspectionsReady
              ? "…"
              : inspectionError
                ? "—"
                : inspectionRequests.length}
          </strong>
          <span>inspection requests</span>
        </Link>
        <Link
          className={styles.summaryTile}
          href="/messages"
          aria-label="View account messages"
        >
          <strong>
            {!messagesReady ? "…" : messagesError ? "—" : conversations.length}
          </strong>
          <span>conversations</span>
        </Link>
      </section>

      <div className={styles.sectionHeading} id="saved-places" tabIndex={-1}>
        <div>
          <h2>Saved places</h2>
          <p>Saved to your account and available across devices.</p>
        </div>
        {savedListings.length ? <span>{savedListings.length}</span> : null}
      </div>

      {savedError ? (
        <p className={styles.error} role="alert">
          {savedError}
        </p>
      ) : null}
      {messagesError ? (
        <p className={styles.error} role="alert">
          {messagesError}
        </p>
      ) : null}
      {!savedReady || status === "loading" ? (
        <p className={styles.message} role="status">
          Loading saved places…
        </p>
      ) : null}
      {status === "error" ? (
        <section className={styles.message} role="alert">
          <p>Listings could not be loaded, so saved places cannot be shown.</p>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </section>
      ) : null}
      {savedReady &&
      !savedError &&
      status === "ready" &&
      savedListings.length === 0 &&
      !signedIn ? (
        <section className={styles.message} role="status">
          <p>Sign in to save places and sync them to your account.</p>
          <Link href="/sign-in?redirect_url=%2Fprofile">Sign in</Link>
        </section>
      ) : null}
      {savedReady &&
      !savedError &&
      status === "ready" &&
      savedListings.length === 0 &&
      signedIn ? (
        <section className={styles.message} role="status">
          <p>You have not saved a place yet.</p>
          <Link href="/">Find accommodation</Link>
        </section>
      ) : null}
      {savedReady && savedListings.length > 0 ? (
        <FeedGrid
          listings={savedListings}
          saved={savedIds}
          savingDisabled={!savedReady}
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
              savingDisabled={!savedReady}
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
