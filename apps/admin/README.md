# Admin authentication and listing photos

Admin sign-in uses Clerk. The admin app checks the signed-in Clerk user ID
against `CLERK_ADMIN_USER_IDS`; the product service independently verifies the
Clerk bearer token and checks that same server-side allowlist before every
listing write, delete, or image upload. The Clerk secret and Supabase
service-role key stay server-side.

## Local configuration

1. Create/configure a Clerk application and set its publishable key and secret
   key in `apps/admin/.env.local`. Preserve existing settings in that file.
2. Add the trusted Clerk user ID(s) allowed to administer UniNest to
   `CLERK_ADMIN_USER_IDS` in both the admin and product-service environment.
   Do not use a role value supplied by the browser.
3. Set `PRODUCT_SERVICE_API_URL` in the admin environment to the service
   address reachable by the admin server, normally `http://localhost:4000`.
4. Set the same Clerk secret key and `CLERK_AUTHORIZED_PARTIES` in
   `apps/product-service/.env`. The party list must contain the exact trusted
   admin app origin, for example `http://localhost:3001`; add the production
   admin origin when deployed.
5. Add `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` to the
   product-service environment. Do not use a `NEXT_PUBLIC_` variable for that
   key. `SUPABASE_STORAGE_BUCKET` is optional.
6. For the database package, configure `DATABASE_URL` and `DIRECT_URL` in
   `packages/product-db/.env` using the provider's pooled and direct
   PostgreSQL URLs. Never store these values in source control.

Clerk sign-in alone does not grant admin access. Keep the account allowlist
limited to trusted administrators, and disable public sign-up in Clerk if
account creation should be invitation-only.

The service creates the public `uninest-listing-images` bucket on the first
successful upload when it does not exist. Listing photos are public to read;
only Clerk-authenticated allowlisted administrators can upload them. Accepted
files are JPEG, PNG, or WebP, at most 5 MB each and 8 images per listing.

## Run locally

From the monorepo root, start the product service:

```powershell
pnpm.cmd --filter product-service run dev
```

Then start the admin and sign in with an allowlisted Clerk account:

```powershell
pnpm.cmd --filter admin run dev
```

For client testing from a phone on the same Wi-Fi, run
`pnpm.cmd --filter client run dev:lan`. The product service already binds to
`0.0.0.0`; Windows Firewall must allow the development ports. The client
replaces a configured loopback API hostname with the hostname used to open the
client, so a `localhost` URL does not point a phone back to itself.

To verify the flow, create a listing with one or more photos, open that listing
on the client, refresh its detail URL, and check that the uploaded photos load.
This flow still requires valid Clerk, PostgreSQL, and Supabase configuration;
production storage behavior is not verified by a successful app build.
