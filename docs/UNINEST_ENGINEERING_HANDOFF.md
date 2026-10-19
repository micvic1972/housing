# UniNest engineering handoff

Updated: 2026-10-18

## Product and architecture

UniNest helps UNIDEL students discover student accommodation near Alihame
Main, Owa-Oyibu, and Owa-Alero. The repository is a pnpm monorepo:

- `apps/client`: public Next.js discovery experience, search/filter sheets,
  listing cards, Quick Look, and `/listings/[id]`.
- `apps/admin`: Next.js listing management and image selection/upload.
- `apps/product-service`: Fastify API for public listing reads and protected
  listing writes, deletion, and image uploads.
- `packages/product-db`: Prisma/PostgreSQL access.
- Supabase Storage: intended public image delivery with server-side uploads.

The homepage and listing detail remain public. No migration was applied and no
commit, push, or deployment was made.

## Latest safe recheck

- The local API returned HTTP 200 from `/health` and `/listings`; the listing
  response contained two records.
- Prisma schema validation passed. A read-only `prisma migrate diff` from the
  configured live datasource to `schema.prisma` reported no difference;
  `prisma db pull --print` also described the expected `Listing`,
  `ListingImage`, and `campus` field without writing a schema file. Catalog
  inspection confirmed 30 listing columns, 5 image columns, expected indexes,
  primary keys, and the cascading image foreign key. These match the combined
  initial-listing and add-campus migration SQL.
- The `_prisma_migrations` table is absent, so this verifies the current
  schema shape against the files, not whether or when either migration was
  applied. Do not apply, resolve, or deploy migrations until a safe migration
  baseline is explicitly authorized.
- Local environment files were present for the admin, product service, and
  product database. The service environment did not contain the Clerk admin
  allowlist, authorized-party, or Supabase storage variable names, so live
  protected admin and upload behavior remains unverified.
- The product service now requires an exact `CORS_ALLOWED_ORIGINS` allowlist
  in production; development retains LAN access. See Production CORS below.
- Admin can now edit an existing listing through validated,
  administrator-protected `PATCH /listings/:id`. Optional values can be
  cleared; existing listing images are preserved but not edited in this form.
- Client listings are fetched without browser caching and refreshed when the
  client tab regains focus after an admin change.
- Replaced the admin mobile hook's effect-driven state update with
  `useSyncExternalStore`.
- Latest verification: product-service test (8 tests), type-check, and build
  passed; admin and client production builds passed; targeted admin lint and
  full monorepo lint passed. Client lint reports four existing image-element
  warnings and no errors.

## Worktree preservation

At the start of this execution the worktree contained 32 modified tracked
paths and 21 untracked entries. At the end it still contains substantial user
work: 34 modified tracked paths and 23 untracked entries. Only files directly
related to this execution were changed further; unrelated dirty files were
not reset or cleaned. The final observed status is 34 modified tracked paths
and 19 untracked entries; the untracked count changed since the prior snapshot.

The database `.env` and admin `.env.local` are ignored by Git. Their contents
were not recorded here. The database source previously contained a tracked
connection credential; the literal was removed from
`packages/product-db/src/client.ts`, which now requires server-side
`DATABASE_URL`. The owner reports that the provider credential has since been
rotated; this was not independently verified.

## Implemented in this execution

- Database client now reads `DATABASE_URL` and fails explicitly if it is
  missing. Added `packages/product-db/.env.example` with variable names and
  safe placeholders.
- Admin authentication now uses Clerk. Admin pages and proxy routes require a
  verified Clerk session plus an explicit server-side
  `CLERK_ADMIN_USER_IDS` allowlist.
- The Fastify write, delete, and image-upload handlers independently verify a
  signed Clerk bearer token through `@clerk/backend`, check authorized
  parties, and enforce the same administrator ID allowlist.
- Clerk integration follows the official
  [Next.js middleware](https://clerk.com/docs/nextjs/reference/clerk-middleware),
  [App Router auth](https://clerk.com/docs/nextjs/reference/app-router/auth),
  and [backend token verification](https://clerk.com/docs/reference/backend/verify-token)
  guidance for the installed SDKs.
- Removed the shared-password/HMAC-session and static service-token
  implementation. Updated admin setup documentation and environment
  templates. Missing Clerk configuration fails closed.
- Preserved the existing admin create/list/delete and photo-selection journey.
  The image upload route now receives an admin Clerk bearer token at the
  service trust boundary.
- Added a browser fallback illustration for failed remote image loads in
  listing cards, Quick Look/detail, and search results. Existing missing-image
  placeholder behavior remains.
- Fixed the API discovery query so the “Under construction” collection's OR
  clause no longer overwrites the text-search OR clause.
- Installed Clerk SDKs only in `apps/admin` and `apps/product-service`.
- No database schema or migration was changed during this execution.

## Files changed by this execution

- `packages/product-db/src/client.ts`
- `packages/product-db/.env.example`
- `apps/admin/package.json`, `apps/product-service/package.json`, and
  `pnpm-lock.yaml`
- `apps/admin/proxy.ts`
- `apps/admin/lib/admin-authorization.ts`
- `apps/admin/lib/product-service.ts`
- `apps/admin/app/layout.tsx`
- `apps/admin/app/login/page.tsx`
- `apps/admin/app/unauthorized/page.tsx`
- `apps/admin/components/app-sidebar.tsx`
- `apps/admin/.env.example`
- `apps/admin/README.md`
- `apps/admin/lib/admin-auth.ts` and
  `apps/admin/app/api/admin/login/route.ts` were removed as part of replacing
  the previous authentication system.
- `apps/product-service/src/middleware/require-clerk-admin.ts`
- `apps/product-service/src/middleware/require-admin-token.ts` was renamed
  from the obsolete static-token name.
- `apps/product-service/src/routes/listing.route.ts`
- `apps/product-service/.env.example`
- `apps/product-service/src/controller/listing.controller.ts`
- `apps/client/app/components/filter/SearchSheet.tsx`
- `apps/client/app/components/home/listingcard/ListingCard.tsx`
- `apps/client/app/components/home/listingcard/ListingDetail.tsx`

The worktree also contains earlier in-progress client, admin, service, and
database changes from before this execution. They were preserved, not
re-attributed to this work.

## Verification actually run

Baseline before these changes:

- `pnpm.cmd --filter product-service run check-types`: passed.
- `pnpm.cmd --filter client run build`: passed.
- `pnpm.cmd --filter client run lint`: passed with four existing
  `@next/next/no-img-element` warnings.
- `pnpm.cmd --filter admin run build`: passed.
- `pnpm.cmd --filter admin run lint`: failed on the existing
  `apps/admin/hooks/use-mobile.ts:14` `react-hooks/set-state-in-effect` error.

After changes:

- `pnpm.cmd --filter product-service run check-types`: passed.
- `pnpm.cmd --filter product-service run build`: passed.
- `pnpm.cmd --filter client run build`: passed.
- `pnpm.cmd --filter client run lint`: passed with the same four image-element
  warnings.
- `pnpm.cmd --filter admin run build`: passed without Clerk keys configured;
  the app renders an explicit setup message and protected requests fail
  closed.
- Targeted ESLint over changed admin files: passed.
- Full admin lint still fails only at the pre-existing
  `apps/admin/hooks/use-mobile.ts:14` issue. That unrelated file was not
  changed.
- Focused test-only RS256 token smoke test passed for missing token,
  non-allowlisted user, wrong authorized party, expired token, and allowlisted
  administrator.
- Image type/signature smoke test passed for JPEG, PNG, WebP, and rejected
  SVG/invalid JPEG bytes.
- Storage protocol smoke test passed against a local mock server for bucket
  lookup/creation and an object upload. This was a mock, not a real Supabase
  upload.
- Earlier `git diff --check` on the changed tracked paths passed. The final
  worktree-wide run reports trailing whitespace in
  `apps/client/app/components/home/discovery/ListingRail.tsx:191` and
  `packages/product-db/prisma7.config.ts:10`. Neither file was changed during
  this execution, so they were left untouched.
- Source scan found no database connection literals and no old shared-password
  or static-token references in the app/service code and setup docs.
- During implementation, the first post-change product-service type check
  exposed a Clerk token-payload typing issue; the code was corrected and the
  final type check/build passed. Initial storage mock attempts had incorrect
  test-harness assumptions about when environment variables are read; the
  corrected mock test passed. No production fallback or fake storage response
  was added.

## Authentication and environment requirements

Authentication implementation:

- Admin Next app: Clerk session verified server-side; `CLERK_ADMIN_USER_IDS`
  determines which signed-in user may administer listings.
- Fastify: verifies the Clerk signature and authorized party; independently
  compares the verified `sub` to its server-side `CLERK_ADMIN_USER_IDS`.
- Public `GET /listings`, `GET /listings/:id`, `/`, and `/listings/[id]` remain
  public.
- The public client does not yet have user-specific account features or a
  client-side Clerk experience.

Configure these names locally; never send their values in chat:

- Admin: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
  `CLERK_ADMIN_USER_IDS`, `PRODUCT_SERVICE_API_URL`.
- Product service: `CLERK_SECRET_KEY`, `CLERK_ADMIN_USER_IDS`,
  `CLERK_AUTHORIZED_PARTIES`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, optional `SUPABASE_STORAGE_BUCKET`, and
  production `CORS_ALLOWED_ORIGINS`.
- Database package: `DATABASE_URL`, `DIRECT_URL`.

Do not put server secrets in `NEXT_PUBLIC_*` variables. Keep the Clerk admin
allowlist restricted to trusted users and disable public sign-up in Clerk if
account creation should be invitation-only.

## Production CORS

Development keeps CORS open to support localhost and LAN testing. In
production, the product service requires `CORS_ALLOWED_ORIGINS`, a
comma-separated list of exact HTTP(S) browser origins without paths, such as
`https://client.example.com,https://admin.example.com`. The service rejects a
missing or malformed production allowlist at startup. CORS is a browser policy,
not authentication; privileged API routes still verify Clerk tokens and the
server-side admin allowlist.

## Prisma database URL setup

The product database package is the local source of truth for database
connection strings. Copy `packages/product-db/.env.example` to
`packages/product-db/.env`, then replace each placeholder with the URI shown
in Supabase Dashboard → Project Settings → Database → Connection string →
URI. Do not paste the URI into chat or commit the `.env` file.

```dotenv
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
# Optional. If absent, Prisma CLI operations use DATABASE_URL.
# DIRECT_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
```

`DATABASE_URL` is used by the Fastify service through `@repo/product-db`.
Prisma CLI uses `DIRECT_URL` when set, otherwise it falls back to
`DATABASE_URL`. Existing process environment variables take precedence over
values loaded from the ignored package `.env`. URL-encode reserved characters
in credentials; the application validates scheme, username/password, host,
port, and database path without logging the URL.

After updating the local URI, restart the product service and check:

```powershell
Invoke-RestMethod http://localhost:4000/health
Invoke-RestMethod http://localhost:4000/listings
```

The health endpoint confirms the service is running; the listings endpoint
also confirms the database connection. A successful listings response can
contain an empty `data` array when there are no records.

## Image upload status and blockers

The admin already provides image selection (up to eight JPEG/PNG/WebP images,
5 MB each), creates the listing, then posts multipart data through the
same-origin admin API. Fastify validates type/signature and size, stores the
objects in Supabase Storage, and records ordered image URLs for the listing.
The client renders URLs and now falls back to its existing illustration if a
remote image fails.

**The real upload and persisted image retrieval are not verified.** At audit
time `apps/product-service/.env` was absent, and
`apps/admin/.env.local` had no Clerk configuration. A read-only request to the
already-running local API returned `/health` 200 but `GET /listings` 500.
The underlying database/API error was not established. Storage credentials
were not available for a live test. A successful mock storage protocol test
must not be treated as proof that Supabase is configured.

## Remaining known issues

1. The owner reports rotation of the database credential previously present
   in tracked source; retain the rotation evidence outside this repository.
2. Configure Clerk, authorized admin IDs, Supabase Storage, and product-service
   database environment values locally; do not paste them into chat.
3. Reconcile the two pending CLI migrations against the runtime database
   migration history before any schema operation.
4. Run a real admin sign-in → listing create → photo upload → persisted image
   URL → public client render test.
5. Decide how `status: "unavailable"` should appear in public discovery; the
   current card experience does not consistently surface that status.
6. Fix the unrelated admin full-lint error in `apps/admin/hooks/use-mobile.ts`
   only in a separate approved slice.
7. Review mobile detail-page bottom-navigation spacing with actual listing
   photos.
8. Decide whether to add public user sign-in/profile behavior. Do not protect
   the homepage or shared listing-detail URLs.
9. There are no app-level test scripts in the package manifests; the
   focused smoke checks above were executed inline and are not persisted as
   automated test files.

## Exact next task

Complete a real configured upload verification, without sharing secrets:

1. Rotate the exposed database credential in Supabase and set the replacement
   only in the ignored local `packages/product-db/.env`.
2. Configure Clerk keys and the trusted admin ID in ignored local app/service
   environments, then configure Supabase Storage variables in the service.
3. Restart the product service and establish that `GET /listings` returns a
   successful API response.
4. Sign in as the allowlisted admin, create one test listing with an image,
   verify its image record and public URL, and load that image on the public
   client detail page.
5. Verify a signed-in non-admin and a missing/invalid bearer token cannot
   create, delete, or upload.
6. Remove the test listing through the admin UI after verification if it is
   safe to do so; do not use destructive database commands.

Resume checks from the monorepo root:

```powershell
pnpm.cmd --filter product-service run check-types
pnpm.cmd --filter product-service run build
pnpm.cmd --filter client run build
pnpm.cmd --filter client run lint
pnpm.cmd --filter admin run build
pnpm.cmd --filter admin run lint
```

Do not commit, push, deploy, or apply migrations without explicit permission.

## Current recheck — 2026-10-18

This section records the current state and supersedes earlier conflicting
runtime and verification notes above.

- The existing dirty worktree was preserved. It already contained deployment
  changes in `.gitignore`, the package manifests, the product-db client, three
  untracked `.env.example` files, `docs/DEPLOYMENT.md`, and the product-db
  TypeScript config. No commit, reset, migration, or data write was performed.
- `prisma validate` passed. The read-only diff from the configured database to
  `schema.prisma` reported no difference. `migrate status` still reports both
  historical migrations as pending, and a read-only catalog query confirmed
  that `public._prisma_migrations` is absent. The SQL files describe the
  Listing/ListingImage baseline plus the campus column, which matches the
  current schema shape; this does not establish migration history. Do not run
  `migrate resolve`, deploy, or push until the baseline is explicitly resolved.
- The database client currently sets `rejectUnauthorized: false`. A
  read-only probe with certificate verification enabled failed with
  `SELF_SIGNED_CERT_IN_CHAIN`. The current connection therefore depends on
  disabled certificate verification. Do not deploy this configuration; obtain
  the correct Supabase CA through the project dashboard, configure strict
  verification, and repeat a read-only connection test. No certificate or
  connection value was printed.
- Public API smoke checks passed: `/health` 200; `/listings` returned a
  `data`/`meta` envelope with two records; detail returned the same stable ID;
  an invalid ID returned 404; and `roomType=shared` returned two matching
  records. This does not verify admin writes or image upload.
- The live dataset has only two records and its location/descriptive fields do
  not look beta-ready. In particular, the area values do not align with the
  client's fixed area-filter choices. Review and correct listing facts through
  the admin workflow; do not infer or fabricate location, rating, price, or
  verification data.
- Authentication is partially wired: client Clerk middleware gates
  Inspection, Messages, and Profile; the admin proxy checks the session and
  allowlist; Fastify independently verifies admin tokens and its allowlist.
  Profile, Map, Inspection, and Messages are still placeholders. Saved state
  is client-local; profiles, saved listings, inspections, conversations,
  messages, and analytics have no persistent schema/API implementation.
- Name-only inspection found local client/admin/service/database environment
  files and no tracked non-example env files. The DB package has
  `DATABASE_URL`/`DIRECT_URL`; the service environment relies on the package
  loader for database configuration. No environment values were emitted.
- A targeted scan of current application source found only a test-fixture
  pattern match; a scan of `packages/product-db/src/client.ts` history found
  no PostgreSQL URI-like literal. Broader heuristic matches were limited to
  vendored documentation/examples and the storage test fixture. This scan is
  not a substitute for provider-side credential rotation.
- Product-service tests passed (11/11), type-check passed, and build passed.
  Admin lint/build passed. Client lint passed with four existing
  `@next/next/no-img-element` warnings; the client production build passed.
- A focused seven-case check passed for listing status labels/unavailability.
  Client behavior now surfaces `rented`/`unavailable` from the API `status`
  field in cards and details, dims those images, and omits availability signals.
- Browser smoke checks on the built client confirmed a real detail route opens,
  refresh retains the same listing, Share/copy confirms the URL was copied, and
  the 360 px viewport has no horizontal page overflow with all four detail
  tabs visible. The client dev server could not be started on port 3000 because
  a pre-existing Node listener occupied it; that process was not terminated.
- A browser console warning confirms the local client currently loads Clerk
  development keys. Production Clerk keys and production origin allowlists
  still need dashboard configuration and verification.

### Changes in this recheck

- Added `apps/client/app/lib/listing-status.ts` and wired it into
  `ListingCard.tsx` and `ListingDetail.tsx` so publication status cannot be
  mistaken for availability.
- Updated `ListingCard.module.css` and `ListingDetail.module.css` for
  unavailable listings and compact mobile detail tabs.
- Updated this handoff and `docs/DEPLOYMENT.md` with the verified TLS and
  migration blockers.

### Next safest actions

1. Reconcile the existing database migration baseline read-only and obtain
   explicit approval before any `migrate resolve` or schema-changing command.
2. Configure the Supabase CA and make certificate-verifying DB access pass
   before deployment.
3. Replace placeholder listing content using the admin UI, then re-run search,
   campus/area/price, and status acceptance checks.
4. Verify a real Clerk-authenticated upload and public image retrieval.
5. Only after the baseline is safe, implement persisted saved listings as the
   first new user-data feature, with ownership and duplicate tests.
