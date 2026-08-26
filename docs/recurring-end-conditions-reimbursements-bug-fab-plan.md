# Recurring end-conditions, expense reimbursements, and a bug-report FAB

Status: implemented (this document was written alongside the code, not before it — see "Deviations from the original prompt" below). Follows the format of `docs/split-transactions-plan.md`.

## 0. How this differs from the generic multi-agent prompt it was built from

The prompt this was built from assumed recurring expenses and a bug-report flow didn't exist yet. Both already do:

- **Recurring rules already exist** (`recurring_transactions`, migration `008_recurring_transactions.sql` + later ones): frequency (`daily|weekly|monthly|yearly|custom`), `next_run`/`last_run`, `is_active`, household/account/category scoping, and a server-side generator (`execute_due_recurring_movements`, called by the `execute-recurring-movements` Edge Function on a cron). What was missing was only the **end condition** (never / after N occurrences / until a date) — so this feature is an *extension* of that table and function, not a new subsystem.
- **A bug-report system already exists** (`app_feedback` + related tables, `src/features/feedback`, screen at `src/app/(protected)/feedback.tsx`, reachable today from the drawer menu). What was missing was a **fast, always-visible entry point** — so this feature adds a floating button plus a `kind=bug` deep link into the existing screen, not a new backend.
- **Reimbursements are genuinely new.** The closest existing concepts — `transaction_allocations` (funding-source split, i.e. which accounts/pots *paid* for one transaction) and `replenishments` (settling who-owes-whom balances between household members over time) — solve different problems. Neither models "a third party paid me back part of what I spent." This is a new table.

## 1. Recurring expenses: end conditions

### 1.1 Data model (extends `recurring_transactions`)

New columns, migration `20260901000300_recurring_end_conditions.sql`:

| Column | Type | Meaning |
|---|---|---|
| `end_condition` | enum `recurring_end_condition` (`never` \| `count` \| `date`) | How the rule stops. Default `never`, matching every existing rule. |
| `end_after_occurrences` | `integer`, nullable | Required and `> 0` iff `end_condition = 'count'`. |
| `end_date` | `date`, nullable | Required iff `end_condition = 'date'`. |
| `occurrences_count` | `integer not null default 0` | How many movements this rule has generated so far. Only ever incremented, including across edits. |

A single check constraint enforces the three shapes are mutually exclusive (exactly one of `end_after_occurrences`/`end_date` is set, matching `end_condition`).

Frequencies are unchanged (`daily|weekly|monthly|yearly|custom`, the existing `recurring_frequency` enum) — the prompt's four frequencies already exist; `custom` additionally supports excluding specific months (pre-existing).

### 1.2 Generation model: already just-in-time, unchanged

Movements are **not** pre-generated. `execute_due_recurring_movements(p_as_of_date)` runs on a schedule, and for each active rule whose `next_run <= p_as_of_date` it creates exactly one `transactions` row and advances `next_run`. Each occurrence is a normal, independent `transactions` row — nothing re-derives it from the rule later. This document's changes are additive to that loop:

1. Before generating: if `end_condition = 'date'` and the rule's `next_run` is already past `end_date`, the rule is deactivated (`is_active = false`) and no transaction is generated for that date.
2. After a successful generation: `occurrences_count` increments; if `end_condition = 'count'` and the new count reaches `end_after_occurrences`, the rule is deactivated in the same update. The occurrence that *reaches* the limit is still generated (an "after 3 occurrences" rule produces exactly 3 transactions, not 2).

### 1.3 Edit / delete semantics: already "future-only" by construction

This was verified against the existing schema rather than built new: `recurring_run_executions.recurring_transaction_id` is `on delete cascade` from `recurring_transactions`, but `transactions.recurring_execution_id` is `on delete set null` from `recurring_run_executions`. So deleting a rule cascades away its execution-tracking rows but only *unlinks* (never deletes) the real `transactions` rows already generated. Editing a rule (amount, frequency, end condition, etc.) only changes the template used for the *next* generation — past rows are untouched because they were never a view over the rule, just plain data. No code change was needed for this guarantee; it's a property of the existing foreign keys.

### 1.4 Known pre-existing edge case (not introduced by this change, flagged for visibility)

`next_recurring_occurrence()` advances a monthly/yearly rule with plain `date + interval '1 month'` Postgres arithmetic. For a rule anchored on the 31st, "Jan 31 + 1 month" overflows a nonexistent "Feb 31" into early March instead of clamping to Feb 28/29. This function is shared with `budget_rules.frequency`, so changing its semantics is a larger, separate decision — see the QA doc (§1) for the concrete recommendation.

## 2. Expense reimbursements

### 2.1 Data model

New table `transaction_reimbursements` (migration `20260901000400_transaction_reimbursements.sql`), 1:N from `transactions`:

- `transaction_id` → `transactions(id)`, `on delete cascade`.
- `payer_name text not null` (free text — the app has no generic "external contact" entity to reference).
- `amount numeric(14,2) not null check (amount > 0)` — a zero/negative row is rejected at the database level, so a "phantom" zero-value reimbursement entry cannot be created (QA edge case).
- `amount_enc text` + `enc_version integer not null default 0`: unused today, added only so the column shape matches every other money column in this schema (`transactions.amount_enc`, `budget_rule_allocations.amount_enc`, …) ahead of the in-progress E2E-encryption migration (`docs/e2e-encryption-plan.md`) — avoids a second schema change later.
- A trigger rejects a reimbursement whose target transaction is not `type = 'expense'`, and rejects a `household_id` mismatch between the reimbursement and its transaction.
- RLS mirrors every other household-scoped table: household members can select/manage.

### 2.2 Effective amount

Partial, total, and over-reimbursement are all just "sum the rows" — no special-casing:

```
effective_amount = original_amount - sum(reimbursements.amount)   -- for expenses
effective_amount = original_amount                                -- for income (out of scope, passthrough)
```

This can go negative (over-reimbursed). A new view, `transaction_effective_amounts`, computes it per transaction. `monthly_summary` and `monthly_category_spending` (the two views that already back the app's monthly totals/reports, in `src/repositories/transactions.repository.ts`) are redefined to sum `effective_amount` instead of raw `amount` for expenses — so an over-reimbursed expense correctly *reduces* the month's total expenses (money that net came back in), rather than being floored at zero or ignored. Both views keep their exact original column signature, so every existing caller keeps working unchanged.

### 2.3 Client layer

- `src/repositories/transaction-reimbursements.repository.ts`, `src/features/transactions/services/transaction-reimbursements.service.ts`, `src/features/transactions/hooks/useTransactionReimbursements.ts` — same three-layer shape as every other feature in this codebase (repository → service → React Query hook).
- `computeEffectiveAmount(originalAmount, reimbursements)` is a small pure function (`src/features/transactions/utils/reimbursements.ts`) so the "effective amount" math is unit-testable without a database and reusable by both the transaction form's live preview and the list-row display.

## 3. Floating bug-report button

- `src/components/bug-report-fab.tsx`: a small circular `Pressable`, bottom-right, `bug-outline` icon (same icon already used for bug items in the feedback list and the drawer menu, so it reads as "the same bug thing" rather than a new visual language). `onPress` navigates to `/feedback?kind=bug`.
- Mounted once in `src/components/protected-drawer.tsx` (the single shell every `(protected)` route renders inside), so it appears on every authenticated page without per-screen wiring.
- Hidden while already on `/feedback` (no point floating a shortcut to the page you're already on) and while the create-feedback form itself doesn't need it.
- `feedback.tsx` reads `kind` from `useLocalSearchParams` to preselect the "bug" tab when arriving via the FAB; manual in-page selection is unaffected.
- Positioned to clear the drawer's menu toggle and the existing `NotificationCenter` bell (both live in the header, not bottom-right), and given a `pointerEvents`-safe hit area sized to not intercept scroll gestures underneath it.

## 4. What was deliberately not done

- Full E2E-encryption wiring for `transaction_reimbursements.amount_enc` (columns exist, but no client-side encrypt/decrypt path was added) — that migration is its own in-progress initiative; bolting one table onto it ad hoc risked doing it inconsistently with whatever the dedicated migration ends up doing.
- Changing `next_recurring_occurrence()`'s month-overflow behavior (§1.4) — pre-existing, shared with monthly budget rules, a product decision rather than a bug in the new feature.
- pgTAP database-level tests (this repo has a `supabase/tests/database` suite) — no local Postgres instance was available in this session to run them against; the new SQL was written to match the house style of the existing recurring/allocations migrations instead. Flagged in the QA doc as a follow-up.
