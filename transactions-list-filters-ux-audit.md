# SmartFinance Transactions — List & Filters UX Audit

Scope: the "Activity" view of `src/app/(protected)/transactions.tsx` — the Filters card, summary bar, and transaction table/list. Not in scope: the create/edit modals or the Scheduled (recurring transfers) view, which are separate flows. Backed by `useTransactionMovementsInfinite` / `useTransactionMovementsSummary` (`src/features/transactions/hooks/useTransactions.ts`).

## 1. Loading and empty states aren't distinguished — the biggest issue

`useTransactionMovementsInfinite` and `useTransactionMovementsSummary` set no `placeholderData`, and the infinite query even sets `gcTime: 0` (deliberately, per its own comment, to avoid re-fetching every page on remount). On TanStack Query v5 that means `data` resets to `undefined` every time the query key changes — which happens on first mount, and again on *every* filter, debounced search keystroke, sort change, or account/category change.

The page has no loading branch anywhere (`isPending`/`isLoading` aren't referenced once in the file). Rendering is just `transactions.length ? <Table/> : <EmptyState .../>`, and that `EmptyState` is the onboarding-style "no transactions yet," complete with an "Add movement" call-to-action. Net effect: **every filter change flashes "No transactions yet — Add movement" before the real result set replaces it.** For a household with months of history, changing the date range or typing a search term means seeing an empty/onboarding state on every settle, not a loading indicator — easy to mistake for "this filter found nothing."

The summary bar (gated on `movementsSummaryQuery.data` being truthy) has the same gap: it fully disappears and reappears on every filter change instead of showing a loading state, so the page visibly blinks as a whole.

Fix: at minimum set `placeholderData: keepPreviousData` on both queries so the previous results stay on screen while the next page loads. Better: add an explicit loading branch (skeleton rows or spinner) driven by `isPending`/`isFetching`, separate from the true empty case (`!isPending && transactions.length === 0`).

## 2. Search is likely the most-used filter, but it's the hardest to reach

Filters are collapsed by default (`filtersOpen` starts `false`) — nothing is visible until "Show filters" is tapped. Once open, the field order is: Movement type → *(Source/Destination account, transfers only)* → Sort by → Account → Category → Created by → Date from → Date to → **Search** → Min amount → Max amount. That's 8th of 10 fields normally, 10th of 12 when Transfer is selected.

On phone the grid is single-column (`filterItemWidth` drops to 100% below 700px width), so reaching Search means scrolling past 7+ other full-width controls first. "Find this transaction by name" is probably one of the most common things a user does here, yet it's the most buried.

Fix: give Search a permanently visible field outside the collapsible panel (search bar always shown, everything else behind "More filters"), or at minimum move it to the top of the grid.

## 3. Sort lives under "Filters" but doesn't behave like a filter

Sort by (`sortBy`) sits inside the same collapsible "Filters" card, boxed identically (bordered pill group) to Movement type. But unlike every other control, an active non-default sort never gets a chip in `activeFilterChips` — once the panel is collapsed there's no visible sign the list isn't in default order. `clearAllFilters()` also resets every filter field but deliberately leaves `sortBy` untouched, which is a reasonable distinction the UI never actually communicates (it looks like just another filter).

Fix: either give non-default sort its own chip ("Sorted: Highest amount" with a clear action), or move it out of the "Filters" card into an always-visible control near the section header, next to "Select transactions" / "Add movement."

## 4. Three overlapping account filters when viewing transfers

Switching Movement type to "Transfer" reveals Source account and Destination account selects, *in addition to* the generic "Account" filter that's always present further down the grid. Server-side, `p_account_id` on `list_transaction_movements` matches source **or** destination — so if Source/Destination are also set, all three get ANDed together. Someone who sets "Account" to Checking and "Source account" to Savings gets a silent zero-result list with nothing explaining why the three fields interact.

Fix: hide the generic "Account" filter (or relabel it, e.g. "Any account") when Movement type is Transfer, since Source/Destination already cover that case more precisely.

## 5. Range fields aren't visually paired

Date from/Date to and Min amount/Max amount are each two independent, equal-weight grid items sitting alongside every categorical filter — nothing ties "from" to "to," or "min" to "max," as one control. In the 2-column tablet layout they can even land in different rows depending on what wraps above them.

Fix: group each pair into a single grid cell with the two fields side by side, so they read as one range control instead of two unrelated filters.

## 6. Loaded-count and total-count sit next to each other with near-identical wording

The section subtitle reads "**{{count}} rows from the current household**" using `transactions.length` — rows *currently loaded* client-side (25 per page, via infinite scroll). The summary bar directly above it reads "**{{count}} result(s)**" using `movementsSummaryQuery.data.movement_count` — the *true total* matching the filters, independent of pagination. Under any filter returning more than 25 rows, a user sees two different counts in the same view (e.g. "25 rows" vs. "340 results") with nothing explaining that one is "loaded so far" and the other is "total."

Fix: reword the subtitle to make the distinction explicit ("Showing 25 of 340"), or drop one of the two counts.

## 7. Every column shows for every row, on every screen size

The table has 8 columns (Title, Date, Account, Account owner, Created by, Amount, Balance after, actions) with no way to hide any of them. On phone, `TableCell`'s mobile mode (`data-surface.tsx`) turns each column into its own labeled row inside a card, so every transaction becomes a 7-row card. "Account owner" and "Created by" are genuinely useful in a multi-member household, but add real height to every single card even for single-person households where they're always the same value.

Fix: consider collapsing "Account owner" and "Created by" into one shared line (both answer "who"), or hiding them for single-member households where they add no information.

## 8. Bulk selection is capped to what's currently loaded, invisibly

"Select loaded" (and the row checkboxes generally) only ever operate on `transactions`, the client-side loaded set — reasonable, and honestly labeled ("loaded," not "all"). But there's no "select all N matching" server-side action, so recategorizing e.g. 300 transactions (or, now that bulk transfer editing exists, 300 transfers) means manually paging through a dozen "Load more" clicks first. Not urgent, but worth flagging now that the eligible set for bulk edits can be much larger than one page.

## Priority suggestions

1. **Fix the loading/empty flash (§1)** — this is the one that actively misleads users into thinking a filter combination returned nothing.
2. **Move Search higher or make it permanently visible** outside the collapsible panel (§2).
3. **Give sort a visible active-state indicator**, or move it out of "Filters" (§3).
4. **Hide/relabel the generic Account filter when viewing Transfers**, to remove the silent zero-result trap (§4).
5. **Pair the date and amount range fields visually** (§5).
6. **Reconcile or relabel the loaded-count vs. total-count wording** (§6).
7. **Reassess which columns need to show on every row on mobile** (§7).
8. **Consider a server-side "select all N matching" bulk action** if bulk-editing large sets becomes common (§8).
