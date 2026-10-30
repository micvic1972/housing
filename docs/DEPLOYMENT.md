# UniNest free-tier deployment

This deployment keeps the existing architecture: two Vercel Next.js projects
and one Render Fastify API. PostgreSQL remains the existing Supabase database;
photos remain in Supabase Storage. No schema changes or migrations are part of
deployment setup.

## Before you deploy

- Ensure the existing Supabase schema is present. The runtime database has no
  `_prisma_migrations` history table, so do not run `migrate deploy`, `migrate
  resolve`, `db push`, or a reset as part of setup.
- Database TLS is not production-ready: the current pool config disables
  certificate verification, and a local strict-verification probe failed with
  a certificate-chain error. Do not deploy until the Supabase-provided CA is
  configured and a read-only connection succeeds with certificate verification
  enabled. See the current recheck in `UNINEST_ENGINEERING_HANDOFF.md`.
- Configure production Clerk keys and the trusted administrator user ID.
- Configure the Render API before the Vercel projects; use its HTTPS service
  URL in both apps.
- The Render build command runs Prisma generation. `DATABASE_URL` or
  `DIRECT_URL` must be available to the Render build environment and pass the
  repository's PostgreSQL URI shape validation. `prisma generate` does not
  apply migrations or modify database data.

## Render: `apps/product-service`

Create a **Web Service** from the Git repository:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Node Version | `24.15.0` (or a later supported Node 24 patch) |
| Root Directory | `.` (repository root) |
| Build Command | `pnpm install --frozen-lockfile && pnpm --filter @repo/product-db exec prisma generate && pnpm --filter product-service build` |
| Start Command | `pnpm --filter product-service start` |
| Health Check Path | `/health` |
| Auto-Deploy | Enable after the first verified deployment |

Set these variables in Render → Environment. Secrets must be entered in the
Render dashboard, never in source control.

| Variable | Visibility | Required / notes |
| --- | --- | --- |
| `DATABASE_URL` | **Secret** | Required at build and runtime. Supabase PostgreSQL URI. |
| `DIRECT_URL` | **Secret** | Recommended. Direct Supabase PostgreSQL URI; Prisma CLI prefers this when present. |
| `CLERK_SECRET_KEY` | **Secret** | Required if using Clerk `verifyToken` with the secret key. |
| `CLERK_JWT_KEY` | **Secret** | Optional alternative to `CLERK_SECRET_KEY` for JWT verification. Configure one of these. |
| `CLERK_ADMIN_USER_IDS` | **Secret** | Comma-separated trusted Clerk user IDs. |
| `CLERK_AUTHORIZED_PARTIES` | **Non-secret configuration** | Exact production admin origin(s), comma-separated, e.g. `https://admin.example.com`. |
| `CORS_ALLOWED_ORIGINS` | **Non-secret configuration** | Exact client and admin browser origins, comma-separated without paths, e.g. `https://uninest.example,https://admin.example.com`. |
| `SUPABASE_URL` | **Non-secret configuration** | Supabase project URL used for Storage. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Server-only Supabase service-role or `sb_secret_` key. Never use a `NEXT_PUBLIC_` variable. |
| `SUPABASE_STORAGE_BUCKET` | **Non-secret configuration** | Optional; defaults to `listing-images`. Bucket must be public for image reads. |
| `PORT` | **Platform-provided** | Render supplies this. The service listens on `process.env.PORT`, defaulting to 4000 locally. |
| `NODE_ENV` | **Platform-provided** | Render sets production mode; do not change it to development. |

The service binds to `0.0.0.0`. Do not set `PORT` to a fixed value in the start
command. The free web-service plan may spin down when idle; the first request
after inactivity can be delayed. A successful `/health` check indicates the
process is alive, not that PostgreSQL or Storage is ready.

## Vercel project: `apps/client`

Create a separate Vercel project for the client:

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `apps/client` |
| Include files outside the Root Directory | Enabled (the pnpm workspace and shared packages are at repository root) |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm --filter client build` |
| Output Directory | Leave the Next.js default |

Add these variables to Vercel → Project → Settings → Environment Variables for
Production (and Preview only if Preview deployments are intentionally
configured):

| Variable | Visibility | Required / notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | **Public** | Render product-service HTTPS origin, with no path, e.g. `https://uninest-api.onrender.com`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Public** | Production Clerk publishable key. |
| `CLERK_SECRET_KEY` | **Secret** | Production Clerk secret key. |

Use the matching production Clerk instance/domain and configure its allowed
origins and redirect URLs for this Vercel client domain. The client middleware
protects Inspection, Messages, and Profile; listing discovery/details remain
public. `NEXT_PUBLIC_API_URL` is intentionally public and is not a credential.

The Next image configuration allows images from `**.supabase.co` under
`/storage/v1/object/public/**`. If using a custom Supabase Storage domain, add
that exact hostname pattern in `apps/client/next.config.ts`.

## Vercel project: `apps/admin`

Create a second, separate Vercel project:

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `apps/admin` |
| Include files outside the Root Directory | Enabled (the pnpm workspace and shared packages are at repository root) |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm --filter admin build` |
| Output Directory | Leave the Next.js default |

Add these Production environment variables:

| Variable | Visibility | Required / notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Public** | Same production Clerk application used by the admin. |
| `CLERK_SECRET_KEY` | **Secret** | Same production Clerk application; server-side only. |
| `CLERK_ADMIN_USER_IDS` | **Secret** | Trusted administrator Clerk user IDs; must match the product service allowlist. |
| `PRODUCT_SERVICE_API_URL` | **Secret** | Render product-service HTTPS origin. Server-to-server configuration, not a credential; keep server-only by not using a `NEXT_PUBLIC_` name. |

Configure the Clerk admin instance to allow the deployed admin origin. The API
also requires that origin in `CLERK_AUTHORIZED_PARTIES`, and both Vercel app
origins in Render's `CORS_ALLOWED_ORIGINS`. CORS does not replace API-side
Clerk authorization.

## Environment templates

Each app has an ignored-local template containing variable names only:

- `apps/client/.env.example`
- `apps/admin/.env.example`
- `apps/product-service/.env.example`

Copy the appropriate file for local development and provide values only in
ignored local env files or deployment dashboards. The database package also
requires its existing `DATABASE_URL` and `DIRECT_URL` configuration; those
values are secrets and are not duplicated into the app templates.

## Post-deploy checks

1. Open `https://<render-service>/health`; expect HTTP 200 and service status
   `ok`.
2. Open `https://<render-service>/listings`; expect HTTP 200 and `{ data,
   meta }`. This also checks PostgreSQL connectivity.
3. Open the Vercel client, browse a listing and its detail page, and verify an
   uploaded public Supabase image loads.
4. Sign in to the Vercel admin as an allowlisted user; read and edit a listing.
5. Confirm unauthenticated API writes and image uploads are rejected.
6. Test an admin image upload and verify the returned listing image URL in the
   public client.

## Production limitations and likely blockers

- Render free services can sleep and have cold-start latency; they are not a
  dependable always-on API for a time-sensitive beta.
- Supabase project/network access and Clerk production domains, authorized
  parties, admin IDs, and redirect URLs must be configured correctly.
- The service needs a valid database URI during the Render build because the
  Prisma CLI config validates a connection URI when generating the client.
- Do not run pending migrations: the database has no `_prisma_migrations`
  table even though its current listing schema matches the checked-in listing
  migrations. Reconcile/baseline that history separately and with explicit
  authorization.
- Vercel preview origins are dynamic and are not automatically in the API CORS
  or Clerk authorized-party allowlists. Use production/stable custom domains or
  configure known preview origins deliberately; do not open production CORS
  to every origin.
- Public listing-image delivery requires the configured Storage bucket to be
  public. Keep its service key only in Render.
- The admin page/API routes rely on server-side Clerk auth; do not move its
  service URL or secrets into client-visible `NEXT_PUBLIC_` variables.
