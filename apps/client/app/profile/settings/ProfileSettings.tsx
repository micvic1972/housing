"use client";

import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { CAMPUSES, isCampusId } from "../../config/campuses";
import { useFilters } from "../../components/filter/FilterProvider";
import { useAppearance } from "../../lib/appearance-provider";
import styles from "./page.module.css";

export default function ProfileSettings() {
  const { filters, setCampusPreference, campusPreferenceError } = useFilters();
  const {
    preferences,
    error: appearanceError,
    setMode,
    setAccent,
  } = useAppearance();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Your space</p>
        <h1>Settings</h1>
        <p>
          Manage your account through Clerk and set a local campus preference.
        </p>
      </header>

      <section className={styles.preference}>
        <h2>Appearance</h2>
        <p>Choose how Delta Housing looks on this device.</p>
        <label htmlFor="appearance-mode">Color mode</label>
        <select
          id="appearance-mode"
          value={preferences.mode}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "system" || value === "light" || value === "dark") {
              setMode(value);
            }
          }}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <label htmlFor="appearance-accent">Accent palette</label>
        <select
          id="appearance-accent"
          value={preferences.accent}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "blue" || value === "terracotta") {
              setAccent(value);
            }
          }}
        >
          <option value="blue">Blue and warm neutral</option>
          <option value="terracotta">Terracotta and sand</option>
        </select>
        {appearanceError ? (
          <p className={styles.error} role="alert">
            {appearanceError}
          </p>
        ) : null}
      </section>

      <section className={styles.preference}>
        <h2>Campus preference</h2>
        <p>
          This filters the same shared listings on Home and Map. It is stored in
          this browser and does not infer your course or campus.
        </p>
        <label htmlFor="campus-preference">Show listings for</label>
        <select
          id="campus-preference"
          value={filters.campus ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setCampusPreference(
              value === "" ? null : isCampusId(value) ? value : null,
            );
          }}
        >
          <option value="">All recorded campuses</option>
          {CAMPUSES.map((campus) => (
            <option key={campus.id} value={campus.id}>
              {campus.label}
            </option>
          ))}
        </select>
        {campusPreferenceError ? (
          <p className={styles.error} role="alert">
            {campusPreferenceError}
          </p>
        ) : null}
      </section>

      <section className={styles.account}>
        <h2>Account details</h2>
        <p>Profile edits use your authenticated Clerk account.</p>
        <UserProfile routing="hash" />
      </section>

      <Link className={styles.back} href="/profile">
        Back to profile
      </Link>
    </main>
  );
}
