# Category Budget / Limit Proposal — Analysis & Suggestions

## Bottom line up front

The proposal is well-scoped and the instincts in section 5 ("analyze first, reuse existing concepts, minimum DB changes") are exactly right for this codebase — more so than you may realize. Since the last time this feature area was touched, Monthly Budget was rebuilt around a unified `planned_items` system that **already implements most of proposal section 2 in a more general form**: expected-vs-actual amounts, "mark as paid", per-month independence so editing one month never changes future months, and match-to-a-real-transaction to prevent double counting. Section 2 as written would recreate that system under a new name.

The real gap — the thing that doesn't exist anywhere in the app today — is section 1: a **category-level spending limit with a rollup view**. That part is a clean, additive feature. My suggestion is to narrow scope to that gap and make it read from `planned_items` and `transactions` rather than building a second recurring-expense model.

Below: what's already built, where the proposal's assumptions don't quite match the current architecture, the traps specific to this codebase, a minimal schema, and a phased plan.

---

## 1. What already exists (and changes the shape of sections 2 & 3)

### The Monthly Budget rebuild (`planned_items`)

A prior session rebuilt Monthly Budget from scratch around one unified table chain:

- **`planned_items`** — the definition of a recurring or one-time planned expense/income (name, amount, category, source account, recurrence: `monthly` / `specific_months` / `interval` / `one_time`, `is_estimate` flag). This is your "Rent: €800 / Electricity: €100" list already, generalized to also cover income and transfers.
- **`planned_item_occurrences`** — one row per planned item per month, snapshotting the definition's amount at generation time (`source_definition_version`) and tracking `status` (`planned` / `confirmed` / `matched` / `skipped` / `cancelled`) plus `is_overridden`.
- **`planned_item_matches`** — links an estimate occurrence to the real `transactions` row that settled it, unique on both sides (one occurrence ↔ one transaction, enforced by a DB constraint).

Mapped against your section 2 requirements directly:

| Your requirement | Already exists as |
|---|---|
| See recurring expense as expected for the month | `planned_item_occurrences` row, generated per month |
| Mark as paid | `status` transitions on the occurrence |
| Change actual amount without touching future months | Editing an occurrence sets `is_overridden = true`; the definition (`planned_items.amount`) is untouched, so next month's occurrence regenerates from the original default |
| Keep the recurring definition's default separate from what was actually paid | `planned_items.amount` (expected/default) vs `planned_item_occurrences.expected_amount` (this month's resolved figure, independently overridable) |
| Distinguish expected vs actual | `is_overridden` + occurrence snapshot vs definition |
| Avoid double-counting when marking paid creates/links a transaction | `planned_item_matches`, unique on `transaction_id` — a DB constraint, not just app logic |

So section 2's data model is not a new build — it's "read `planned_items`/`planned_item_occurrences` filtered to the categories in view." Rebuilding it as a parallel `recurring_expenses`-style table (which, notably, is exactly what an *earlier* session tried before the `planned_items` rebuild superseded it) would reintroduce the two-representations-of-the-same-expense problem you explicitly want to avoid.

**One nuance worth deciding up front**: `planned_items` covers income and transfers too, not just outflow expenses. A category budget should only ever look at `direction = 'outflow'` items whose destination is an external category (not a transfer to another of your own accounts) — see the transfer/savings exclusion problem below, it applies here too.

### A second, older recurring system still lives in the app

`recurring_transactions` (an older, separate table) auto-posts real transactions on a schedule and lives on the Transfers screen. It's unrelated to `planned_items` and still active. For a category budget, this doesn't need special handling — by the time it fires, it has already created a normal row in `transactions`, which your "amount spent so far" query will pick up naturally. Just don't confuse it with `planned_items` when the code says "recurring" — there are two unrelated things with that name in this codebase, only one of which the new feature should reason about explicitly (`planned_items`, for the "still unpaid this month" line item).

There are also now-dead tables (`recurring_expenses`, `income_sources`, `budget_rules`, `monthly_income_inputs`) left over from before the `planned_items` rebuild — still physically in the schema, no longer read by any current UI. Worth flagging so a future cleanup pass drops them, but not something this feature needs to touch.

### Categories

`categories` already has a self-referencing `parent_id`, and in practice the app uses exactly two levels (top-level categories with subcategories; income categories are kept flat with no children) even though the schema itself doesn't hard-limit depth. There's also an `is_discretionary` flag on categories already, which could be a nice free signal for a later "how much of this is discretionary spend" view, though not something the initial version needs.

---

## 2. Where the proposal's assumptions need adjusting for this schema

### "Transfers, savings contributions, and other non-expense transactions" — there's no `type = 'transfer'` to filter on

`transactions.type` is only `income` / `expense` — there is no third "transfer" value. A transfer is two linked rows sharing a `transfer_group_id` (one `expense` leg, one `income` leg). That alone would be a simple filter (`transfer_group_id is null`), except:

Since a mid-August migration, a transfer's expense leg **can carry a normal expense-type category** (e.g. "Investments", "Savings > PPR") specifically so it shows up correctly in the existing Wage Flow reporting feature. That means `type = 'expense' and transfer_group_id is null` is not a safe-enough filter — some transfers now look like categorized expenses at the row level.

The existing Monthly Preview code (`monthly-preview-view-model.ts`) already solved exactly this problem for its own "planned expenses" total, and it's the pattern to reuse rather than re-solving: it nets out amounts whose **destination account type** is `savings` or `investment`, using the account, not the category or a transaction-type flag, as the source of truth for "this was really a transfer into savings, not spending." Recommend the category-budget "amount spent" query follow the same rule: exclude a transaction from category-spend if it's one leg of a transfer whose *other* leg lands in a `savings`/`investment`-type account (or, simplest version: exclude both legs of any transfer from every category budget outright, and treat "money into savings" as something that's tracked elsewhere, not inside category budgets at all — worth a quick decision from you, see open questions below).

### "Consider parent/child categories" — needs an explicit rollup rule, not just support

Since categories are effectively two levels, the decision is really just: **when a parent category has its own budget, does spend in its children count toward it?** I'd suggest yes by default (spend in "Groceries" and "Takeout" both count toward a "Food" budget if "Food" is the parent with its own limit), with child categories still able to have their own independent budget/limit shown separately — mirrors how the existing category browser already aggregates child stats into parent totals (`category-browser-data.ts` already does a "sum child ids into parent" computation you can look at for the exact pattern).

### "Historical months remain correct if budgets or recurring expense values are changed later"

This one's important and the current schema convention already tells you how: don't store a single mutable `limit_amount` per category. Every date-scoped concept in this app so far (`planned_items.start_month`/`end_month`, `planned_item_occurrences` snapshotting `definition_version`) uses an effective-dated or snapshotted shape specifically so an edit doesn't retroactively rewrite a month that's already been looked at or confirmed. A category budget needs the same: a limit set in September and changed in November shouldn't make August's report show November's number. See the schema suggestion below.

---

## 3. Minimum database changes

One new table covers section 1 without touching anything else:

```sql
create table public.category_budgets (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    category_id uuid not null references public.categories(id) on delete cascade,
    amount numeric(14,2) not null check (amount > 0),
    effective_month date not null, -- first-of-month; this limit applies from here until superseded
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (category_id, effective_month)
);
```

"What was category X's limit in month Y" = the row with the latest `effective_month <= Y` for that category — same effective-dated lookup shape `planned_items` already uses elsewhere, no new pattern introduced. No `updated_at`/editing in place; changing a limit going forward is a new row, which is what keeps history correct for free without a separate audit table.

Nothing else needs a schema change:
- "Amount spent so far" is a query over existing `transactions`, not a new table.
- "Recurring expenses in the budget" is a query over existing `planned_items` / `planned_item_occurrences`, scoped to `direction = 'outflow'` and the categories being budgeted.
- "Percentage used / remaining / approaching-limit" are all pure computation over the two numbers above — no persistence needed, same as how `monthly-preview-view-model.ts` computes its segmented bar today.

If you want budgets to support more than a flat monthly figure later (e.g. an annual budget divided by 12, or a budget that only starts partway through the year and should stop generating rows before that), `effective_month` already gives you that without another migration — you'd just backfill/omit rows rather than adding columns.

---

## 4. Suggested scope for a first version

Narrowing to what's actually new, in roughly the order I'd build it:

1. **`category_budgets` table + a lookup function/query** for "the active limit for category X in month Y."
2. **A pure calculation module** (mirroring `monthly-preview-view-model.ts`'s "one place the math lives" convention) that takes: a month, the household's categories, `category_budgets` rows, real `transactions` for the month (transfer-into-savings excluded per the rule above), and `planned_item_occurrences` for the month (outflow only) — and returns, per category: budget, real spend, unpaid/estimated recurring amount still due, total (spend + due), remaining, percent used, and a status (`ok` / `approaching` / `over`). This is the one function everything else (UI, maybe a future notification) reads from.
3. **UI**: a Category Budgets screen or a new section on the existing Budget screen — likely the latter, since it already has the month picker and the "Account Impact"/"Allocation Breakdown" pattern to match visually. Each category row shows the `€350 / €500` style breakdown you described, expandable to show its recurring line items (paid/unpaid) the same way the existing Allocation Breakdown rows expand.
4. **Editing budgets**: a simple per-category amount field, written as a new `category_budgets` row effective from the currently-selected (or next) month — not an in-place edit.

I'd deliberately leave out, for a first version: a household-wide "likely to spend by end of month" projection across *all* categories (your section 4's last bullet) — it's a nice-to-have that falls naturally out of step 2's per-category numbers once they exist, so it's cheap to add after, but building it first would be scope creep before the core limit/rollup feature is proven out.

---

## 5. Open questions worth answering before implementation starts

- **Transfers into savings/investment accounts**: excluded from every category budget entirely, or attributable to a category if the transfer happens to carry one (per the Wage Flow convention)? I'd lean toward "always excluded" for budgets specifically — a spending limit measuring money that never left the household doesn't match the mental model you described — but it's your call.
- **Does a parent category's own budget include child-category spend automatically**, with children still separately budgetable? (I've assumed yes above.)
- **Should `planned_items` with `is_estimate = false`** (a "confirmed" definite planned expense, not a rough guess) be treated the same as `is_estimate = true` ones for the "still unpaid" bucket, or does only `is_estimate` really map to your "sometimes higher/lower than expected" framing? Worth a quick look at how the two are used today before assuming.
- **Where does this live in the UI** — folded into the existing Budget screen (keeps everything about a month in one place, but that screen is already dense after the recent redesign) or a new dedicated screen (cleaner, but splits "planned" and "actual" views of the same month across two places)?

Happy to turn this into a concrete implementation plan (migration + service + hooks + UI, file by file) once you've weighed in on those — this document is analysis only, no code changed.
