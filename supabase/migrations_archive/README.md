# Archived migrations (do not apply)

These are the 107 historical migrations (001_… to 20260929120000_…) plus the
one-off `scripts/migrate_to_planned_items.sql`. On 2026-10-01 they were
squashed into the baseline files in `../migrations/20261001000000…08_baseline_*.sql`.

How the baseline was produced and verified:

1. Every file here was replayed in order on a clean Postgres 16 (with minimal
   stand-ins for Supabase's auth / storage / cron / net / vault).
2. The resulting `public` schema was dumped and split by object type into the
   baseline files; storage buckets + policies, the auth.users trigger,
   realtime publication and pg_cron jobs went into `…08_baseline_platform.sql`.
3. The baseline was replayed on another clean database and dumped again:
   the `public` schema dump is identical to step 2 (0 diff lines), and the
   storage policies, buckets, cron jobs, realtime tables and auth trigger match.

Note: the historical files could not be replayed cleanly in order
(`010_audit_logs.sql` creates a trigger on `budget_rules`, which is only
created in `022_monthly_budget.sql`) — one more reason for the squash.

Supabase only reads `supabase/migrations/`, so nothing in this folder runs.
