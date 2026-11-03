# UniNest free-tier deployment

This deployment keeps the existing architecture: two Vercel Next.js projects
and one Render Fastify API. PostgreSQL remains the existing Supabase database;
photos remain in Supabase Storage. Database changes are versioned as Prisma
migrations and must be applied only after checking the target database.

## Before you deploy

- Review `prisma migrate status` and the pending SQL for the exact deployment
  target before applying migrations. Never use `db push`, reset a target, or
  reconcile migration history for an unverified database.
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

## Current production app origins

- Student frontend: `https://delta-housing.vercel.app`
- Admin frontend: `https://delta-housing-admin.vercel.app`
- Product service: `https://delta-housing.onrender.com`

In the existing Render service, set both `CORS_ALLOWED_ORIGINS` and
`CLERK_AUTHORIZED_PARTIES` to:

```text
https://delta-housing.vercel.app,https://delta-housing-admin.vercel.app
```

The application includes these two canonical production origins in the
production allowlists as a safeguard, but the Render values should still be
explicitly corrected. A missing `CLERK_AUTHORIZED_PARTIES` configuration is
reported as a server configuration error, not as a signed-out student.
In both Vercel projects, replace development Clerk keys with a matching
production key pair from the same Clerk production instance, then redeploy.

## Render: `apps/product-service`

Create a **Web Service** from the Git repository:

| Setting           | Value                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Runtime           | Node                                                                                                                           |
| Node Version      | `24.15.0` (or a later supported Node 24 patch)                                                                                 |
| Root Directory    | `.` (repository root)                                                                                                          |
| Build Command     | `pnpm install --frozen-lockfile && pnpm --filter @repo/product-db exec prisma generate && pnpm --filter product-service build` |
| Start Command     | `pnpm --filter product-service start`                                                                                          |
| Health Check Path | `/health`                                                                                                                      |
| Auto-Deploy       | Enable after the first verified deployment                                                                                     |

Set these variables in Render → Environment. Secrets must be entered in the
Render dashboard, never in source control.

| Variable                    | Visibility                   | Required / notes                                                                                                                                          |
| --------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | **Secret**                   | Required at build and runtime. Supabase PostgreSQL URI.                                                                                                   |
| `DIRECT_URL`                | **Secret**                   | Recommended. Direct Supabase PostgreSQL URI; Prisma CLI prefers this when present.                                                                        |
| `CLERK_SECRET_KEY`          | **Secret**                   | Required if using Clerk `verifyToken` with the secret key.                                                                                                |
| `CLERK_JWT_KEY`             | **Secret**                   | Optional alternative to `CLERK_SECRET_KEY` for JWT verification. Configure one of these.                                                                  |
| `CLERK_ADMIN_USER_IDS`      | **Secret**                   | Comma-separated trusted Clerk user IDs.                                                                                                                   |
| `CLERK_AUTHORIZED_PARTIES`  | **Non-secret configuration** | Set to `https://delta-housing.vercel.app,https://delta-housing-admin.vercel.app`. These are the exact student and admin origins accepted in Clerk tokens. |
| `CORS_ALLOWED_ORIGINS`      | **Non-secret configuration** | Set to `https://delta-housing.vercel.app,https://delta-housing-admin.vercel.app`. These exact browser origins must receive CORS headers.                  |
| `SUPABASE_URL`              | **Non-secret configuration** | Supabase project URL used for Storage.                                                                                                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret**                   | Server-only Supabase service-role or `sb_secret_` key. Never use a `NEXT_PUBLIC_` variable.                                                               |
| `SUPABASE_STORAGE_BUCKET`   | **Non-secret configuration** | Optional; defaults to `listing-images`. Bucket must be public for image reads.                                                                            |
| `PORT`                      | **Platform-provided**        | Render supplies this. The service listens on `process.env.PORT`, defaulting to 4000 locally.                                                              |
| `NODE_ENV`                  | **Platform-provided**        | Render sets production mode; do not change it to development.                                                                                             |

The service binds to `0.0.0.0`. Do not set `PORT` to a fixed value in the start
command. The free web-service plan may spin down when idle; the first request
after inactivity can be delayed. A successful `/health` check indicates the
process is alive, not that PostgreSQL or Storage is ready.

The service also includes the two canonical production frontend origins in
its production CORS and Clerk authorized-party allowlists. Keep both values
explicitly set in Render as above; the built-in values prevent a missing
student origin from being mistaken for a sign-in failure after a code deploy.
Preview deployment origins are not automatically trusted: add an exact,
reviewed preview origin to both Render lists and the Clerk instance before
using that preview.

## Vercel project: `apps/client`

Create a separate Vercel project for the client:

| Setting                                  | Value                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Framework Preset                         | Next.js                                                                 |
| Root Directory                           | `apps/client`                                                           |
| Include files outside the Root Directory | Enabled (the pnpm workspace and shared packages are at repository root) |
| Install Command                          | `pnpm install --frozen-lockfile`                                        |
| Build Command                            | `pnpm --filter client build`                                            |
| Output Directory                         | Leave the Next.js default                                               |

Add these variables to Vercel → Project → Settings → Environment Variables for
Production (and Preview only if Preview deployments are intentionally
configured):

| Variable                            | Visibility | Required / notes                                                                            |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`               | **Public** | Render product-service HTTPS origin, with no path, e.g. `https://uninest-api.onrender.com`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Public** | Production Clerk publishable key (`pk_live_…`), not a development key.                      |
| `CLERK_SECRET_KEY`                  | **Secret** | Matching production Clerk secret key (`sk_live_…`), not a development key.                  |

Use the same production Clerk application/key pair in the admin and Render
service. In Clerk Dashboard, configure the production instance for
`delta-housing.vercel.app`, including its application domain, allowed origins,
sign-in/sign-up URLs, and redirect URLs. Keep the student return path
`/inspection` working after sign-in. The client middleware protects Inspection,
Messages, and Profile; listing discovery/details remain public.
`NEXT_PUBLIC_API_URL` is intentionally public and is not a credential.

The Next image configuration allows images from `**.supabase.co` under
`/storage/v1/object/public/**`. If using a custom Supabase Storage domain, add
that exact hostname pattern in `apps/client/next.config.ts`.

## Vercel project: `apps/admin`

Create a second, separate Vercel project:

| Setting                                  | Value                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Framework Preset                         | Next.js                                                                 |
| Root Directory                           | `apps/admin`                                                            |
| Include files outside the Root Directory | Enabled (the pnpm workspace and shared packages are at repository root) |
| Install Command                          | `pnpm install --frozen-lockfile`                                        |
| Build Command                            | `pnpm --filter admin build`                                             |
| Output Directory                         | Leave the Next.js default                                               |

Add these Production environment variables:

| Variable                            | Visibility | Required / notes                                                                                                                            |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Public** | Same production Clerk application used by the admin.                                                                                        |
| `CLERK_SECRET_KEY`                  | **Secret** | Same production Clerk application; server-side only.                                                                                        |
| `CLERK_ADMIN_USER_IDS`              | **Secret** | Trusted administrator Clerk user IDs; must match the product service allowlist.                                                             |
| `PRODUCT_SERVICE_API_URL`           | **Secret** | Render product-service HTTPS origin. Server-to-server configuration, not a credential; keep server-only by not using a `NEXT_PUBLIC_` name. |

Set the same production Clerk publishable/secret key pair as the client.
Configure the Clerk production instance for
`delta-housing-admin.vercel.app`, including its allowed origins and sign-in
URLs. `CLERK_ADMIN_USER_IDS` must contain the trusted admin Clerk user ID(s);
do not include student IDs.

The Render API must list both frontend origins in both
`CLERK_AUTHORIZED_PARTIES` and `CORS_ALLOWED_ORIGINS`. The API validates the
signed Clerk token and administrator allowlist separately; CORS does not grant
access or replace API-side authentication.

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
3. Check both frontend CORS preflights. Each allowed origin must receive its
   own `Access-Control-Allow-Origin` value and the `authorization` request
   header must be permitted:

   ```sh
   curl -i -X OPTIONS https://delta-housing.onrender.com/inspections \
     -H "Origin: https://delta-housing.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: authorization"
   curl -i -X OPTIONS https://delta-housing.onrender.com/inspections \
     -H "Origin: https://delta-housing-admin.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: authorization"
   ```

   An unrelated origin must not receive `Access-Control-Allow-Origin`.

4. Confirm both deployed frontends show Clerk production mode, not the
   development-key warning. Sign in, refresh, and open a protected route.
5. Open the Vercel client, browse a listing and its detail page, and verify an
   uploaded public Supabase image loads.
6. Sign in to the Vercel admin as an allowlisted user; read and edit a listing.
7. Confirm unauthenticated API writes and image uploads are rejected.
8. Test an admin image upload and verify the returned listing image URL in the
   public client.
9. With separate test accounts, verify student saved listings, inspection
   request/history, messaging send/reply, admin inspection processing, and
   student-to-student isolation. Do not use production accounts or create test
   records without authorization.

An API `401` means the backend did not accept the Clerk session token (check
key pairing and authorized parties). A browser `Failed to fetch` with a
failed preflight is a network/CORS problem, not evidence that the Clerk user
has signed out. The student app now reports these conditions separately.

## Production limitations and likely blockers

- Render free services can sleep and have cold-start latency; they are not a
  dependable always-on API for a time-sensitive beta.
- Supabase project/network access and Clerk production domains, authorized
  parties, admin IDs, and redirect URLs must be configured correctly.
- The service needs a valid database URI during the Render build because the
  Prisma CLI config validates a connection URI when generating the client.
- The configured Supabase database's listing schema was verified against the
  checked-in baseline migrations, its migration history was reconciled, and
  the inspection-request migration was applied. The reschedule-response
  migration adds nullable inspection columns; verify migration status for each
  deployment target before deploying.
- Vercel preview origins are dynamic and are not automatically in the API CORS
  or Clerk authorized-party allowlists. Use production/stable custom domains or
  configure known preview origins deliberately; do not open production CORS
  to every origin.
- Public listing-image delivery requires the configured Storage bucket to be
  public. Keep its service key only in Render.
- The admin page/API routes rely on server-side Clerk auth; do not move its
  service URL or secrets into client-visible `NEXT_PUBLIC_` variables.
