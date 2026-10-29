# Auth testing

Two suites.

## 1. Route tests (`npm test`)

Fast, no network, no secrets. Route handlers run against an in-memory fake of Supabase, storage and the rate limiter (`tests/support`). Covers: unauthenticated requests, cross-user access, invalid current passwords, password complexity, password reset validation, duplicate email changes, signup preflight states, expired/missing/claimed drafts, and email sync after confirmation.

Needs Node 20.6+ and `npm install`. `npm run test:e2e` loads local Supabase
and Redis settings from `.env.local` automatically. Keep the destructive
confirmation variables out of `.env.local` and set them explicitly in the
terminal or CI environment.

## 2. Live suite (`npm run test:e2e`)

Runs against a real Supabase project and a running copy of the site (`tests/e2e/auth.e2e.mjs`, `tests/e2e/rls.e2e.mjs`). It creates and deletes users (emails `e2e-*@example.com`), rows and files. **Use a dedicated TEST project, never the real MakeSB one.**

Setup:

1. Create a new Supabase project and a new Upstash Redis DB for testing.
2. Apply `supabase/schema.sql` to it.
3. Dashboard settings on the test project (these mirror what production needs):
   - Auth > Sign In / Providers > Email: "Confirm email" ON; password minimum length 12 with lowercase, uppercase, digits and symbols required; "Secure password change" ON.
   - Auth > URL Configuration: site URL and redirect URLs for localhost and production.
   - Optional: `supabase/auth-hook-before-user-created.sql` (see the file). The
     function is `SECURITY DEFINER` because `application_drafts` intentionally
     has RLS enabled with no public policies.
4. Put the TEST project's keys in `.env.local` (URL, publishable key, service-role key, Upstash vars), then `npm run dev`.
5. In another terminal, set these and run:

```
E2E_ALLOW_DESTRUCTIVE=yes
E2E_CONFIRM_PROJECT_REF=<the test project's ref, the part before .supabase.co>
npm run test:e2e
```

Optional:

- `E2E_BASE_URL` if the site is not on http://localhost:3000.
- `E2E_SEND_EMAILS=yes` enables cases that send a real email.
- `E2E_EXPECT_SIGNUP_HOOK=yes` after enabling the Before User Created hook.

If the hook rejects an email that has an active draft, re-run the complete
`supabase/auth-hook-before-user-created.sql` script in the same Supabase
project. Do not solve this by adding a public RLS policy or granting draft
table access to `anon` or `authenticated`.

Without the env vars the suite skips with a reason. Rate limits (5 password checks per user per 15 min, etc.) apply, so wait 15 minutes or flush the test Redis between runs.

## RLS

The design: RLS on, no policies, no grants to anon/authenticated, everything through server routes with the service-role key. Verify with:

- `supabase/verify-rls.sql` in the SQL editor (every row should be `true`).
- `tests/e2e/rls.e2e.mjs` (tries reads, writes, deletes and storage access with the anon key and a signed-in user's key, then confirms nothing changed).

## Manual check: email sync after confirmation

Needs a real emailed link, so it is not automated live.

1. Sign in on the test site, Settings > change email to an address you control.
2. Before confirming: the application row still has the old email.
3. Click the confirmation link in the new inbox.
4. The application row's email now equals the new address, and Settings shows it.
5. Try the same with an address another application already uses: expect 409.
