# SmartFinance Testing

Use the fastest checks while developing, then run the release-only gates before promoting a web build.

## Fast Local Checks

- `npm run test:unit` runs unit tests only.
- `npm run test:integration` runs integration tests only.
- `npm run test:ci` runs the Jest suite in band without coverage.
- `npm run typecheck:test` type-checks test files with Jest globals isolated from app source.
- `npm run lint` runs Expo linting.

## Local Supabase Contract Check

`npm run test:supabase` is local-only. It refuses remote Supabase URLs and never starts, stops, resets, or mutates Supabase.

Required environment:

- `SUPABASE_TEST_URL=http://127.0.0.1:54321` or `SUPABASE_TEST_URL=http://localhost:54321`
- `SUPABASE_TEST_ANON_KEY=<local anon key from supabase status>`

Seed expectation:

- Run this only against a local Supabase database that has already been prepared with the checked-in migrations and local seed data.
- The check only reads contract surfaces such as views and tables; it does not create test data.
- If the env vars are missing, the command skips so regular CI does not accidentally require a local Supabase daemon.
- For a release gate, set `SUPABASE_TEST_REQUIRED=1` so missing local env vars fail instead of skipping.

## Release-Only Web Smoke

- `npm run test:e2e:web` exports the Expo web app, serves `dist`, and runs Playwright route smoke tests.
- Playwright stubs external auth-provider and Supabase requests, so the smoke tests do not depend on real Google OAuth, production Supabase, or a live auth redirect.
- Treat this as a release gate because `npx expo export --platform web` is slower than the Jest checks.

## Production Release Checklist

Also run the broader checks in `docs/release-checklist.md` before promoting a Vercel deployment.
