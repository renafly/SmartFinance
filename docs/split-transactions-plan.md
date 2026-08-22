# Split transactions — analysis and proposed design

Status: proposal, not yet implemented. Mirrors the format of `docs/e2e-encryption-plan.md` and `transactions-list-filters-plan.md`.

Goal: let a single transaction be funded by multiple accounts and/or saving pots, while remaining exactly one row in every list, report, and balance calculation the app already has.

## 1. Current model (as of 2026-08-19)

- `public.transactions` is the single source of truth. Every row has a **required** `account_id` and an `amount numeric(14,2) check (amount > 0)`. There is no `transaction_movements` table — `list_transaction_movements()` is a read-only RPC that collapses the two legs of a transfer (`transfer_group_id`) into one "movement" row for the UI. The underlying table never changes shape.
- Transfers are two `transactions` rows (`type = 'expense'` + `type = 'income'`) sharing a `transfer_group_id`, created/edited/deleted through dedicated RPCs (`create_transfer`, `update_completed_transfer`, `delete_completed_transfer`) that hard-assume exactly one source and one destination account.
- `accounts.current_balance` (view `account_balances`) = `initial_balance + Σ(income) − Σ(expense)` where `transactions.account_id = accounts.id`. This is the only place balances are computed — there is no separate ledger table.
- `saving_pots` do **not** hold money themselves. A pot's balance (`saving_pot_balances` view) is 100% derived from the accounts explicitly assigned to it via `saving_pot_accounts`, and an account can back **at most one pot** (enforced by a unique index + deferred trigger, migration `20260711000100`).
- `transactions.pot_id` already exists, but today it is just an informational tag (nullable, single, optional) — it is **not** used anywhere in the pot balance calculation. It is effectively inert for money math today.
- There is already a table called **`transaction_splits`** (migration `20260731174334`), but it means something different: it splits one transaction's amount across multiple **categories** (Phase 1 roadmap item "Split transactions" → category lines), validated app-side, unrelated to funding source. **The new feature must not reuse this name.**
- There is a very close precedent for exactly the UX this feature needs: `budget_rule_allocations` (migration `20260813000000`) already implements "one parent total fanned out to N destination accounts, `equal_split` vs `custom` mode, server-side cent-exact remainder distribution, sum validated to the cent, delete-then-insert replace semantics" for monthly budget rules. The proposed design reuses this pattern almost verbatim.
- The project is mid-migration to end-to-end encryption (`docs/e2e-encryption-plan.md`). Sensitive columns (`transactions.amount`, `budget_rule_allocations.amount`, `transaction_splits.amount`, …) already have a nullable `*_enc bytea` sibling plus a per-row `enc_version` column, additive and non-breaking. The new table should follow the same shape so a later migration can add `amount_enc`/`enc_version` without a redesign.
- Money is stored everywhere as Postgres `numeric(14,2)` (exact decimal, not floating point) — the DB layer already has no float risk. The float risk the request calls out is purely client-side (JS numbers). `save_monthly_budget_configuration` already solves this server-side with integer-cent math for its equal-split remainder; the proposal reuses the same technique client-side.

### On "the new replenishment system" (sistema de reposição)

No code, migration, or doc in this repository uses "reposição", "reposicao", or "replenish". I asked for clarification; the answer received was not conclusive enough to name a concrete module. **Assumption made for this proposal**: that system does not exist yet in this codebase. The design below does not try to guess its shape — instead it exposes a generic, reusable write path (`transactionAllocationsService.replace(...)`) that any future process (a UI form, a batch job, an RPC) can call to create or update a transaction's allocations, so whatever that system ends up being, it plugs in without another schema change. This should be revisited once that system's own design exists.

## 2. Key design decisions

### 2.1 New table name: `transaction_allocations`
Avoids the collision with the existing `transaction_splits` (category lines). Vocabulary stays: **splits = category breakdown** (existing), **allocations = funding-source breakdown** (new) — matching `budget_rule_allocations`'s naming.

### 2.2 Additive, not a full renormalization
`transactions.account_id`/`amount` are left exactly as they are today for the (large majority) non-split case — zero changes to any existing filter, join, RLS policy, or index. A new `is_split boolean not null default false` column is added to `transactions`.

- `is_split = false` (today's behavior, unchanged): `account_id`/`pot_id`/`amount` on the row are authoritative, exactly like now.
- `is_split = true`: `transaction_allocations` rows become authoritative for the funding breakdown and for balance math. `account_id` is still kept **NOT NULL** on the parent row (nulling it would break every existing join/filter/RLS check that assumes it) but becomes a **representative account** — the allocation with the largest amount (ties broken by `sort_order`) — used only so existing account filters/list joins keep resolving to *something* sensible without being split-aware. `pot_id` is cleared when split (a split transaction can touch several pots, so a single tag no longer makes sense).

This keeps ~95%+ of existing read paths (category suggestions, title suggestions, bulk category updates, monthly summaries, category spending) completely untouched, because none of them read `account_id` for money math — only the two balance views do.

### 2.3 One row = one source, account XOR pot
Each `transaction_allocations` row targets exactly one `account_id` or one `pot_id`, never both — mirrors how `saving_pot_accounts`/`budget_rule_allocations` reference exactly one target, enforced with a `check` constraint plus two partial unique indexes (prevents "same source twice").

### 2.4 Value is the source of truth; percentage is never stored
Directly per the request: only `amount` is persisted. Percentage is always computed on read (`amount / transaction.amount * 100`) and in the UI while editing — never written to the database. This removes an entire class of drift bugs (stored % disagreeing with stored €) at the cost of re-deriving a display value, which is cheap.

### 2.5 Money arithmetic: cents client-side, `numeric(14,2)` server-side
No schema-wide switch to integer minor units — every other money column in this schema (`accounts.initial_balance`, `transactions.amount`, `budget_rule_allocations.amount`, `saving_pots.target_amount`, …) is `numeric(14,2)`, and Postgres `numeric` has no floating-point error. Keeping `transaction_allocations.amount numeric(14,2)` stays consistent and avoids an unrelated, much larger refactor. What *does* move to integer cents is all client-side split arithmetic (equal-split remainder distribution, value↔percentage conversion) — exactly the technique `save_monthly_budget_configuration` already uses server-side (`v_total_cents / v_count`, remainder distributed one cent at a time to the first N rows).

### 2.6 Pot allocations are a genuine behavior change — flagged, not hidden
Today `pot_id` on a transaction does not affect any computed balance. This feature is the first time a `pot_id` will actually move a number: `saving_pot_balances` needs a new delta term for allocations that target a pot directly (see §3.3), added on top of the existing "sum of the pot's backing accounts' balances" term. Two follow-on risks worth a product decision before shipping:

1. **Double counting**: if a split allocation targets a pot's own backing account *and* another allocation on the same transaction targets that same pot directly, the pot's balance would move twice for money that only left the household once. Recommend disallowing picking both an account and its own backing pot as two separate rows on the same transaction (validate in the RPC).
2. **Multi-account pots as a source**: a pot can be backed by more than one account. "60 € from Pot B" is ambiguous about which of Pot B's accounts physically loses the money. Recommended default: only offer a pot as a pickable allocation source in the UI when it has exactly one backing account (resolve transparently to that account under the hood); otherwise require the user to pick the specific account. This needs no schema change, only a client-side filter on the source picker — revisit if product wants pots to behave as true virtual envelopes later.

### 2.7 Transfers are out of scope for v1
Transfers already have a fixed, RPC-enforced one-source/one-destination contract (`create_transfer`, `update_completed_transfer`). Splitting a transfer's source or destination is a materially different problem (which leg splits? does the paired leg also split?) and isn't in the request's examples. Recommend explicitly excluding `transfer_group_id is not null` rows from split eligibility for v1, revisited later if needed.

## 3. Proposed schema

```sql
alter table public.transactions
  add column is_split boolean not null default false;

create table public.transaction_allocations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  transaction_id uuid not null,
  source_type text not null check (source_type in ('account', 'pot')),
  account_id uuid,
  pot_id uuid,
  amount numeric(14,2) not null check (amount > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (transaction_id, household_id)
    references public.transactions(id, household_id) on delete cascade,
  foreign key (account_id, household_id)
    references public.accounts(id, household_id) on delete restrict,
  foreign key (pot_id, household_id)
    references public.saving_pots(id, household_id) on delete restrict,
  check (
    (source_type = 'account' and account_id is not null and pot_id is null) or
    (source_type = 'pot' and pot_id is not null and account_id is null)
  )
);

-- "no duplicate sources" per transaction
create unique index idx_transaction_allocations_unique_account
  on public.transaction_allocations(transaction_id, account_id) where account_id is not null;
create unique index idx_transaction_allocations_unique_pot
  on public.transaction_allocations(transaction_id, pot_id) where pot_id is not null;

create index idx_transaction_allocations_transaction
  on public.transaction_allocations(transaction_id, sort_order);
create index idx_transaction_allocations_account
  on public.transaction_allocations(account_id);
create index idx_transaction_allocations_pot
  on public.transaction_allocations(pot_id);

create trigger set_transaction_allocations_updated_at
  before update on public.transaction_allocations
  for each row execute function public.update_updated_at();

alter table public.transaction_allocations enable row level security;

create policy "Members can manage transaction allocations"
on public.transaction_allocations for all to authenticated
using (public.is_household_member(household_id, (select auth.uid())))
with check (
  public.is_household_member(household_id, (select auth.uid()))
  and exists (
    select 1 from public.transactions t
    where t.id = transaction_allocations.transaction_id
      and t.household_id = transaction_allocations.household_id
  )
);

grant select, insert, update, delete on table public.transaction_allocations to authenticated;
comment on table public.transaction_allocations is
  'Funding-source breakdown for a split transaction. amount is the source of truth; percentage is always derived. Requires transactions.is_split = true and >= 2 rows summing exactly to transactions.amount.';
```

Needs its own `transactions_id_household_unique`-style composite FK target (already exists from migration `20260731174334`), and its own accounts/pots composite unique indexes for the FK — `accounts(id, household_id)` already exists; `saving_pots(id, household_id)` needs adding (mirrors the existing pattern), i.e. one extra `create unique index if not exists saving_pots_id_household_unique on public.saving_pots(id, household_id);`.

### 3.1 Consistency trigger
A deferred constraint trigger on `transaction_allocations` (same pattern as `enforce_saving_pot_account_integrity`) that, after any insert/update/delete, checks the affected `transaction_id`:

- if 0 rows remain → `transactions.is_split` must be `false`.
- if ≥ 1 row remains → there must be ≥ 2 rows, none negative/zero (already a `check`), no duplicate account/pot (already unique indexes), and `sum(amount) = transactions.amount` to the cent → `transactions.is_split` must be `true`.

This guarantees "editar uma split transaction mantém consistência" and "remover uma origem atualiza imediatamente o valor restante" even for a hypothetical future direct-table write, not only the RPC below.

### 3.2 Write RPC: `save_transaction_allocations`
Mirrors `save_monthly_budget_configuration`'s replace semantics:

```
save_transaction_allocations(p_transaction_id uuid, p_allocations jsonb) returns void
```//
`p_allocations` = `[{ source_type, account_id | pot_id, amount }]`. Server:
1. Loads the parent transaction, checks household membership, locks the row (`for update`) to serialize concurrent edits.
2. If `p_allocations` is empty → deletes all allocation rows, sets `is_split = false`, restores `account_id`/`pot_id` to whatever the caller also passed on the same transaction update (this is the "convert split → single source" path).
3. Otherwise validates: ≥ 2 rows, every amount > 0, no duplicate account/pot, every account/pot belongs to the same household, sum(amount) equals `transactions.amount` **to the cent** (integer-cent comparison, not float `=`), then delete-then-insert the rows, sets `is_split = true`, and recomputes the representative `account_id` (largest allocation).
4. Runs in the same transaction as the parent update where possible so "editar total + allocations" is atomic.

### 3.3 Balance views — the only two views that must change

`account_balances` needs a "direct" term (unchanged, today's query, filtered to `is_split = false`) plus a "split" term (new, from `transaction_allocations` joined back to the parent for `type`), summed:

```sql
create or replace view public.account_balances as
with direct as (
  select t.account_id,
         sum(case when t.type = 'income' then t.amount else -t.amount end) as delta
  from public.transactions t
  where t.is_split = false
  group by t.account_id
),
split as (
  select ta.account_id,
         sum(case when t.type = 'income' then ta.amount else -ta.amount end) as delta
  from public.transaction_allocations ta
  join public.transactions t on t.id = ta.transaction_id
  where ta.account_id is not null
  group by ta.account_id
)
select
  a.id, a.household_id, a.name, a.type, a.currency, a.initial_balance,
  a.initial_balance + coalesce(direct.delta, 0) + coalesce(split.delta, 0) as current_balance
from public.accounts a
left join direct on direct.account_id = a.id
left join split on split.account_id = a.id;
```

`saving_pot_balances` gets the same treatment: today's account-derived total, plus a new term for allocations that target the pot directly (`ta.pot_id is not null`), following §2.6's guardrail against double-counting an account and its own pot on the same transaction.

Nothing else changes:
- `monthly_summary`, `monthly_category_spending` are household/category totals independent of *where* the money came from — untouched.
- `list_transaction_movements` gains one cheap extra returned column, `is_split boolean` (straight from `t.is_split`), so the list can show a "split" badge. It keeps returning the single representative `account`/`account_id` — the full breakdown is fetched separately only when the user opens details/edit, exactly as the request's own UX spec describes ("Ao abrir os detalhes ou editar, deve ser possível ver o breakdown").
- `balance_after_transaction(transactions)` (the per-row running-balance function) has no single well-defined answer for a row that moved money in three accounts at once. Recommend returning `null` for `is_split = true` rows and showing "—" in the list's running-balance column for those rows, documented in the function's comment.
- Bulk category/transfer-category RPCs are untouched — they never read `account_id` for money math.

## 4. Client-side layer

- `src/repositories/transaction-allocations.repository.ts` — thin wrapper: `listForTransaction(transactionId)`, `save(transactionId, allocations)` → RPC above. Same shape as `saving-pots.repository.ts`.
- `src/features/transactions/utils/transaction-allocations.ts` (new module — deliberately not reusing `automation/splits.ts`, which validates the unrelated category-split concept and would be confusing to extend):
  - `toCents(amount)` / `fromCents(cents)`.
  - `distributeEqualSplitCents(totalCents, n)` — same remainder-to-first-N-rows algorithm as the SQL in `save_monthly_budget_configuration`, reused so client preview and server result always agree.
  - `amountsToPercentages(amountsCents, totalCents)` and `percentagesToAmounts(percentages, totalCents)`, both using the largest-remainder method so percentages always sum to exactly 100.00 and amounts always sum to exactly the total, satisfying "arredondamentos nunca alteram o total final" in both directions.
  - `summarizeAllocations(totalCents, allocations)` → `{ allocatedCents, remainingCents, isComplete, isOverAllocated }` backing the live "Allocated / Remaining" summary bar.
  - `validateAllocations(...)` — no negative amounts/percentages, no duplicate source, ≥ 2 rows, sum matches total to the cent.
- `transaction.schema.ts` gains a discriminated extension: `splitEnabled: boolean`, `allocations: { sourceType: 'account' | 'pot'; accountId?: string; potId?: string; amount: number }[]`, validated with `superRefine` only when `splitEnabled` is true (keeps the existing non-split schema/path completely untouched when the toggle is off).
- New hooks `useTransactionAllocations(transactionId)` (query) and `useSaveTransactionAllocations()` (mutation, invalidates `transactions`, `transaction-movements*`, `accounts`/`account_balances`, and `saving_pot_balances` query keys — same invalidation footprint `invalidateHouseholdData` already covers).
- UI: a "Split source" switch in the create/edit form. Off → today's single account/pot picker, unchanged. On → a repeatable row list (source type, target picker excluding already-chosen sources, value/percentage tabbed input per row) plus the live summary bar (`Transaction total / Allocated / Remaining`, green + check at exactly 0 remaining, warning state when over-allocated). Switching the Valor/Percentagem tab re-renders the same underlying cents array through the conversion utils above — no data loss switching back and forth, matching the "sem perder a distribuição atual" requirement.
- Transaction details/edit view: when `is_split`, render the breakdown (icon, name, amount, derived %) instead of the single account/pot line; list rows show a small "split" badge when `movement.is_split` is true.

## 5. Rule-by-rule mapping (validated client + server, server is authoritative)

| Rule | Enforced by |
|---|---|
| soma dos valores = total | Zod `superRefine` (UX) + `save_transaction_allocations` cent-exact check (source of truth) |
| soma das percentagens = 100% | derived from amounts, never stored — always true by construction |
| sem valores/percentagens negativas | `amount > 0` check constraint + Zod `.positive()` |
| sem fontes duplicadas | two partial unique indexes + Zod `superRefine` |
| funciona com cêntimos | integer-cent math client-side, `numeric(14,2)` server-side |
| arredondamentos nunca alteram o total final | largest-remainder distribution (both value→% and %→value) |
| edição mantém consistência | deferred constraint trigger (§3.1), independent of which code path wrote the rows |
| remover origem atualiza o restante | pure client recompute (`summarizeAllocations`), no round-trip needed while editing |

## 6. Suggested test coverage

Unit (pure functions, `*.unit.test.ts`, mirrors `saving-pot-forecast.service.unit.test.ts` style):
single source (split disabled, unaffected), two sources, several sources, 50/50, uneven values, percentage split, cent-level values (e.g. 0.01–0.02 edges), percentage rounding (33.33/33.33/33.34), value↔percentage round trip both directions, add/remove a row mid-edit, converting a normal transaction to split and back.

Repository/RPC (`supabase/tests`, following the existing pgTAP-style convention used for `saving_pot_accounts`/`budget_rule_allocations`): sum mismatch rejected, duplicate account/pot rejected, cross-household account/pot rejected, negative/zero amount rejected, empty-allocations reverts `is_split`, concurrent edit locking, `account_balances`/`saving_pot_balances` produce the same totals as manually summing legacy non-split transactions plus split allocations (regression check that the view rewrite doesn't change any existing non-split account's balance).

Integration: creating a split transaction updates the right accounts'/pots' balances and nothing else; editing an existing split transaction's allocations is atomic and consistent; a future "reposição"-style caller invoking `save_transaction_allocations` directly (not through the form) produces the same state as using the UI.

## 7. Suggested phased rollout (minimum footprint per phase)

1. **DB + repository, feature dark**: migration (table, `is_split`, both view rewrites, RPC, deferred trigger) + `transaction-allocations.repository.ts` + pure-function unit tests. `is_split` is always `false` in production until the UI ships — zero visible behavior change, fully reviewable/testable in isolation.
2. **Create/edit form**: split toggle, value/percentage modes, live summary, Zod schema, hooks.
3. **Read paths**: details/edit breakdown view, list "split" badge, running-balance "—" for split rows.
4. **Bulk operations review**: confirm which bulk actions remain valid for split rows (category bulk-update: fine, untouched; anything that would ever bulk-change `account_id` directly would need to explicitly exclude or special-case `is_split = true` rows).
5. **Programmatic integration point**: expose `transactionAllocationsService.replace(transactionId, allocations)` as the one write path recurring transactions, the monthly budget engine, or a future reconciliation/"reposição" system can call — no schema change needed once phase 1 ships, since the RPC is already generic.

## 8. Open questions for product/you before implementation starts

1. Confirm §2.6's guardrail (an allocation can't target both an account and that account's own backing pot on the same transaction) and the "pot only pickable as a source when it has exactly one backing account" default.
2. Confirm transfers stay out of scope for v1 (§2.7).
3. Confirm the running-balance column showing "—" for split transactions is acceptable, or if a different representation is wanted.
4. Once the "reposição" system's own design exists, revisit §1's assumption and confirm `transactionAllocationsService.replace(...)` is the right integration seam for it.
