# SmartFinance Release Checklist

Use this checklist before promoting a Vercel deployment to production.

## Build Gates

- Run `npx tsc --noEmit --pretty false`.
- Run `npx expo export --platform web`.
- Confirm Vercel uses `npx expo export --platform web` and `dist`.
- Confirm `vercel.json` keeps SPA rewrites for protected and invite deep links.

## Environment

- Set `EXPO_PUBLIC_SUPABASE_URL`.
- Set `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Set `EXPO_PUBLIC_INVITE_WEB_URL` to the production web domain.
- Open Diagnostics in the protected drawer and run the live checks.
- Confirm the `attachments` storage bucket is reachable.
- Confirm `send-household-invitation` responds to the diagnostics preflight check.

## Auth And Routing

- Open `/login` directly from the production domain.
- Sign in with Google from the production domain.
- Confirm Google OAuth JavaScript origins include the production domain.
- Confirm Supabase redirect URLs include the production domain callback flow.
- Open `/settings` while signed out and verify it redirects to login.
- After login, verify the app returns to the originally requested protected page.
- Open `/invite/:token` directly from a clean browser session.
- Accept a valid invite with the invited Google account.
- Try an invite with the wrong Google account and confirm it does not loop.

## Responsive UI

- Verify the drawer becomes usable as a hamburger menu on small screens.
- Verify drawer content scrolls on short mobile heights.
- Verify dashboard tracker cards collapse from two columns to one on narrow screens.
- Verify accounts, transactions, settings, monthly budget, savings, recurring, categories, and members use the full available width.
- Verify table-heavy surfaces remain readable on phone width.

## Finance Semantics

- Confirm shared accounts are not attributed to the wrong member.
- Confirm saving pots backed by accounts are not double-counted in total wealth.
- Confirm transfer creation still writes double-entry transaction rows.
- Confirm recurring transfers and monthly budget rules preserve source and destination semantics.
- Confirm household import/export creates a new household and does not include invoice binary files in v1.
