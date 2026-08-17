# Transactions List & Filters — Implementation Plan

Based on `transactions-list-filters-ux-audit.md`. Organized into phases by risk and dependency rather than strictly by audit priority — Phase 1 is pure query/state config with no visual redesign, so it's the safest and highest-impact place to start.

Each phase is independently shippable. None block the others except where noted.

**Status: all 5 phases shipped (2026-08-17).** Each phase below is marked with what actually landed, including any deviations from the original recommendation. Verified with `tsc --noEmit` after each phase; no automated component tests exist for this screen, so changes were verified by direct code review rather than a test run.

---

## Phase 1 — Fix the loading/empty flash (audit §1) — ✅ Shipped

**Shipped as:** `placeholderData: keepPreviousData` added to both `useTransactionMovementsInfinite` and `useTransactionMovementsSummary`. `transactions.tsx` now branches on `transactionsQuery.isPending` (renders an `ActivityIndicator` + "Loading transactions..." in place of the table) before falling through to the existing `transactions.length ? <Table/> : <EmptyState/>` logic. The summary bar additionally shows a small "Updating..." line when `movementsSummaryQuery.isFetching` is true during a background refetch, so a stale-but-visible summary isn't silently out of date. `gcTime: 0` was left untouched as planned.

The core problem: `useTransactionMovementsInfinite` / `useTransactionMovementsSummary` have no `placeholderData`, and the page has no loading branch, so every filter/search/sort change flashes the "No transactions yet" empty state.

**Changes**
- `src/features/transactions/hooks/useTransactions.ts`: add `placeholderData: keepPreviousData` (import from `@tanstack/react-query`) to both `useTransactionMovementsInfinite` and `useTransactionMovementsSummary`. Keeps the previous page's rows and summary totals on screen while the next query key resolves, instead of dropping to `undefined`.
- `src/app/(protected)/transactions.tsx`: add a genuine loading branch. Something like:
  - `transactionsQuery.isPending` (first-ever load, no cached data at all) → skeleton rows or spinner in place of the table.
  - `transactionsQuery.isFetching && !transactionsQuery.isPending` (refetch after `placeholderData` kicked in) → optionally a subtle inline indicator (e.g. a thin progress bar under the summary bar), list stays interactive.
  - `!transactionsQuery.isPending && transactions.length === 0` → the real empty state, unchanged.
- Decide whether `gcTime: 0` on the infinite query still makes sense once `placeholderData` is in play — its own comment says it's there to stop refetching every cached page on remount; that reasoning is unaffected by this change, so leave it as-is unless testing shows otherwise.

**Risk**: low. No UI restructuring, just query config + one conditional branch.

**Acceptance criteria**
- Typing in Search, changing any filter, or switching sort never shows "No transactions yet — Add movement" while a request is in flight.
- A genuinely empty filter result (e.g. search for gibberish) still shows the empty state, just only after the fetch actually completes.
- First page load (cold cache) shows a loading indicator, not an empty-state flash.

---

## Phase 2 — Filter panel structure (audit §2, §3, §4) — ✅ Shipped

Three related changes to the Filters card in `transactions.tsx`. Shipped together in one pass since they touch the same JSX block.

### 2a. Promote Search (§2) — shipped, recommended option
Search moved out of the collapsible grid entirely; now renders always-visible (new `styles.alwaysVisibleSearchRow`) right after the Filters section header, before the active-filter-chips row — visible whether `filtersOpen` is true or false.

### 2b. Give Sort a visible active state (§3) — shipped, recommended option
Added a chip to `activeFilterChips` when `sortBy !== "newest"`, reusing existing translation keys (`${t("transactions.sortBy")}: ${t(\`transactions.sorts.${sortBy}\`)}` — no new locale strings needed), with `onClear: () => setSortBy("newest")`. `clearAllFilters()` intentionally still leaves `sortBy` alone, as planned — the chip is the only way to reset it.
- Parked alternative (relocating the Sort control itself out of the Filters card) not done — revisit only if the chip still feels buried in practice.

### 2c. Resolve the triple account-filter overlap on Transfers (§4) — shipped
The generic "Account" filter is now hidden when `filtersType === "transfer"` (Source/Destination remain the only account filters there), **and** `accountFilter` is reset to `"all"` in the same Movement-type `onPress` handler that already resets `sourceAccountFilter`/`destinationAccountFilter` — this was the critical part: hiding the control without clearing its state would have made the bug worse (invisible instead of just confusing), since the query still ANDs `accountId` with source/destination under the hood.

**Files**: `transactions.tsx` (filters grid JSX, `activeFilterChips` memo, `clearAllFilters`), `src/locales/en/common.json` + `pt/common.json` (new "Sort" chip label if needed, e.g. `transactions.sortedByLabel`), `ui-styles.ts` (style for an always-visible search row, if going with 2a's recommended option).

**Risk**: medium — layout changes are visible and worth a quick pass on phone/tablet/desktop widths after.

**Acceptance criteria**
- Search is reachable without opening "Show filters" (2a), or is the first field inside it (fallback option).
- Setting a non-default sort shows a chip; clearing it (via the chip or "Clear all") returns to Newest.
- Selecting "Transfer" as Movement type removes the generic Account filter from view; Source/Destination remain the only account filters in that mode.

---

## Phase 3 — Range field pairing (audit §5) — ✅ Shipped

**Shipped as:** new `styles.filterRangeRow` (`flexDirection: "row", flexWrap: "wrap", gap: spacing(2), width: "100%"`), with each field wrapped in `{ flex: 1, minWidth: spacing(30) }` so the pair shares one grid cell and wraps to stacked only when genuinely cramped. Applied identically to Date From/To and Min/Max amount. No prop or behavior changes to the underlying fields.

- Wrap Date From + Date To in one `filterGridItem` with the two `DateFilterField`s side by side (new inline row style in `ui-styles.ts`, e.g. `filterRangeRow: { flexDirection: "row", gap: spacing(2) }`, each field `flex: 1`).
- Same treatment for Min Amount + Max Amount.
- On narrow widths the row can wrap to stacked (flexWrap already used elsewhere in this file) rather than needing a separate mobile layout.

**Files**: `transactions.tsx`, `ui-styles.ts`.

**Risk**: low, purely visual grouping — no state/logic changes.

**Acceptance criteria**: date range and amount range each read as one control with two inputs, at every breakpoint currently supported (`filterItemWidth` thresholds at 700px/1500px).

---

## Phase 4 — Count wording (audit §6) — ✅ Shipped

**Shipped as:** new derived `const latestSectionSubtitle` in `transactions.tsx`, used as the Section's `subtitle` prop: when `movementsSummaryQuery.data` exists and `transactions.length < movement_count`, it renders the new `transactions.latestSubtitleLoaded` key ("Showing {{loaded}} of {{total}} rows..." / PT: "A mostrar {{loaded}} de {{total}} linhas..."); otherwise it falls back to the original `latestSubtitle` key, unchanged. The `EmptyState`'s own subtitle (count: 0) was left as-is.
- Note: the agent implementing this phase hit a transient API error mid-task and left the work partially done (the derived const existed but wasn't wired into the `Section`, and the new locale keys hadn't been added yet). Caught during verification and finished directly rather than re-running the agent.

- Reword the section subtitle from "{{count}} rows from the current household" (using `transactions.length`, the loaded count) to something that names both numbers when they differ, e.g. "Showing {{loaded}} of {{total}}" — falling back to just the total once everything's loaded (`transactions.length === movementsSummaryQuery.data.movement_count`).
- Simplest version: only show "Showing X of Y" when `X < Y`; otherwise show "Y rows" (no "showing" framing needed once nothing's left to load).

**Files**: `transactions.tsx`, `src/locales/en/common.json` + `pt/common.json` (new `transactions.latestSubtitleLoaded` key or similar, replacing/extending `latestSubtitle`).

**Risk**: low, copy + one derived value.

**Acceptance criteria**: subtitle and summary-bar count never look like two conflicting totals for the same filtered set.

---

## Phase 5 — Mobile column density (audit §7) — ✅ Shipped (Option C)

**Shipped as:** new derived `const isSingleMemberHousehold = acceptedMembers.length <= 1`. Both the `Table`'s `columns` array and each row's `TableCell` list for "Account owner" and "Created by" are built as array literals with `!isSingleMemberHousehold && {...}` entries, then `.filter(Boolean)` — verified directly (via a small Node/React script, not just assumption) that `React.Children.map` keeps `null`/`false` array slots at their original index but genuinely drops filtered-out entries, so header and row column counts/positions stay in sync rather than risking a mobile-label misalignment. Proceeded with the plan's own recommended default (Option C) rather than pausing for a product decision, since it's the lowest-risk, purely-additive option.

Options considered (not mutually exclusive — C could still layer on top of A or B later):

- **Option A**: collapse "Account owner" and "Created by" into a single combined line (e.g. "Created by You · Checking") on all screen sizes.
- **Option B**: only collapse/hide them on phone width, keep both columns as-is on tablet/desktop where there's room.
- **Option C** (shipped): hide both entirely when the household has a single member (owner and creator are always the same person, so the columns carry no information) — needs a household-member-count check already available via `acceptedMembers`.

Revisit A/B if multi-member households still feel dense in practice.

**Files**: `transactions.tsx` (table columns array + per-row `TableCell`s), possibly `data-surface.tsx` if a shared "combined identity" cell pattern is worth extracting for reuse elsewhere.

**Risk**: medium — touches the table's column contract; needs a check across phone/tablet/desktop and single- vs multi-member households.

---

---

## Sequencing (as executed)

Shipped in the order originally suggested, each verified with `tsc --noEmit` and a manual diff review before moving to the next phase:

1. ✅ Phase 1 (loading/empty flash)
2. ✅ Phase 2 (filter structure)
3. ✅ Phase 3 (range pairing)
4. ✅ Phase 4 (count wording)
5. ✅ Phase 5 (mobile density, Option C)

## Follow-ups not yet scheduled

- §8 backlog item (server-side "select all N matching" bulk action) — still not scheduled, per the original plan.
- Phase 2b's parked alternative (relocating Sort out of the Filters card entirely) — only worth revisiting if the new Sort chip still feels buried in practice.
- Phase 5's Option A/B (combine or hide the owner/creator columns further on phone specifically) — only worth revisiting if multi-member households still feel dense with Option C alone.
