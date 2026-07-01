# SmartFinance Development Plan

> Based on Remaining Development Tasks (July 2026)

## Execution Status

- Status: In progress
- Started: July 1, 2026
- Active Sprint: Cross-feature stabilization and MVP progression
- Current Focus:
  - Categories management polish (CRUD, validation, reassignment behavior)
  - Dashboard data quality and UX consistency
  - Transactions filter and mobile interaction quality
  - Finalizing remaining household invite flows

### Completed Today (July 1, 2026)

- Unified form system between New Account and New Transaction screens (matching field layouts and styling).
- Replaced fragile selector interactions with reusable `Select` and `DateField` components.
- Fixed mobile date input in transactions with native picker behavior.
- Improved mobile transaction filters layout and interaction model.
- Implemented Categories screen with:
  - Type filtering
  - Create category action
  - Delete category action
  - Categories hooks/service wiring and query invalidation
- Added category archive support with:
  - Archive/restore actions
  - Archived category visibility toggle
  - Picker filtering to keep archived categories hidden by default
- Added basic category icon and color inputs to creation flow.
- Implemented dashboard cards with live data (accounts, transactions, spending summaries, upcoming payments).
- Added DB migration `015_category_delete_reassign_transactions.sql` and applied via `supabase db push`.
- Added DB migration `016_categories_archive.sql` for category archive support.
- Category delete behavior now:
  - Reassigns existing transactions to `Other Income` / `Other Expenses` when present
  - Falls back to `NULL` category when no fallback category exists

---

## 1) Goal

Deliver a production-ready MVP in iterative milestones, prioritizing core money flows first:

1. Accounts
2. Categories
3. Transactions
4. Transfers
5. Dashboard
6. Budgets
7. Recurring Transactions
8. Reports
9. Notifications
10. Settings
11. Testing & Polish

---

## 2) Execution Strategy

- Build vertical slices per phase (DB + repository + service + hooks + UI + QA), not UI-only batches.
- Keep Accounts as the reference implementation pattern for all upcoming features.
- Enforce data consistency: every balance-impacting mutation must invalidate both transactions and accounts query keys.
- Validate security and multi-user household behavior in every phase (RLS + ownership + visibility rules).

---

## 3) MVP Milestones

## Milestone A: Household Management Completion

### Scope

- Invite household members
- Accept/Decline invitations
- Leave household
- Transfer household ownership
- Remove member
- Household settings screen
- Invitation email delivery (send + fallback link sharing)

### Dependencies

- Existing auth/profile/household tables and RLS policies

### Acceptance Criteria

- Invite lifecycle works end-to-end (send, list, accept, decline, revoke)
- Ownership transfer updates permissions immediately
- Leaving/removing users cannot break existing financial records
- Household settings actions are permission-gated (owner/admin/member)

---

## Milestone B: Accounts Completion

### Scope

- Owner selector in account create/edit
- Load household members for owner picker
- Persist owner_profile_id
- Show owner in account details/list
- Archive/restore accounts
- Search accounts
- Account statistics (basic)

### Dependencies

- Milestone A membership and role flows finalized

### Acceptance Criteria

- Owner selection supports Shared Household, Me, Other Member
- Owner displayed consistently across list/detail/edit
- Archived accounts excluded by default but restorable
- Search is responsive and accurate

---

## Milestone C: Categories Completion

### Scope

- Full CRUD categories
- Default categories setup
- Custom icon and color selection
- Archive category
- Deletion guard when category is used by transactions

### Dependencies

- Transactions form integration points prepared

### Acceptance Criteria

- In-use category deletion reassigns transactions to same-type `Other` category or `NULL` fallback
- Archive keeps historical transaction integrity
- Category picker reflects active/archived rules correctly

---

## Milestone D: Transactions + Transfers Core

### Scope

- Transaction CRUD
- Expense and income fully supported
- Transfer form and validation
- Automatic double-entry transfer behavior
- Transaction list, filters, search, details
- Notes and attachments (MVP-level)
- Transfer history

### Dependencies

- Accounts and Categories complete

### Acceptance Criteria

- Transaction create/edit/delete keeps balances correct
- Transfer creates symmetric debit/credit entries atomically
- Filter and search support date/account/category/type
- Attachments work with access control per household

---

## Milestone E: Dashboard + Budgets + Recurring

### Scope

- Dashboard widgets (balance, income, expenses, cashflow, recent activity)
- Budget CRUD and progress calculation
- Recurring transactions CRUD and schedules (weekly/monthly/yearly)
- Recurrence controls (skip/pause)
- Automatic recurrence execution

### Dependencies

- Stable transaction and category data model

### Acceptance Criteria

- Dashboard numbers reconcile with transactions and accounts
- Budget progress updates in near real time
- Recurring engine is idempotent and does not duplicate runs

---

## Milestone F: Reports + Settings + Notifications

### Scope

- Reports: expenses by category, income vs expenses, monthly trends, net worth
- Export CSV/PDF
- Settings: profile, household settings, currency, language, theme, export, delete account
- Notifications: budget threshold, recurring due, transfer completed, invitations

### Dependencies

- Dashboard/Budgets/Recurring data pipelines complete

### Acceptance Criteria

- Reports match dashboard source totals
- Exports include correct date ranges and filters
- Notification triggers are accurate and deduplicated

---

## Milestone G: Quality Gate + Production Readiness

### Scope

- Unit, integration, repository, hook tests
- Pagination and infinite scrolling where needed
- Query optimization and cache invalidation review
- UX polish: empty states, skeletons, actionable errors
- Offline support (minimum viable mode)

### Acceptance Criteria

- Critical flows covered by automated tests
- No known balance corruption paths
- No blocking P1/P2 bugs
- Release checklist complete

---

## 4) Suggested Sprint Plan (10 Sprints)

## Sprint 1

- Household invites + invitation lifecycle
- Household settings base screen

## Sprint 2

- Ownership transfer + member removal + leave household
- Role and permission hardening

## Sprint 3

- Accounts owner selector and owner persistence
- Owner display in account list/details

## Sprint 4

- Account archive/restore/search/statistics
- Accounts UX refinements

## Sprint 5

- Categories CRUD + archive + in-use deletion guard
- Category icon/color UX

## Sprint 6

- Transactions CRUD + list + filters + search
- Notes/details foundations

## Sprint 7

- Transfers end-to-end (form, validation, double-entry, history)
- Attachments integration for transactions

## Sprint 8

- Dashboard widgets
- Budgets CRUD + progress

## Sprint 9

- Recurring transactions engine + controls
- Reports + exports

## Sprint 10

- Notifications + settings completion
- Testing hardening, performance tuning, UX polish, release prep

---

## 5) Technical Guardrails Per Sprint

- DB migrations are forward-only; no rewrites of existing migration history.
- Every feature must include:
  - Repository updates
  - Service layer updates
  - Query hooks
  - Screen/form integration
  - Error/loading states
- All mutations affecting balances must invalidate both query keys: transactions and accounts.
- Transfer logic must use dedicated RPC flow and never direct unsupported transaction type inserts.
- Validate RLS and household ownership/visibility paths before closing sprint.

---

## 6) Definition Of Done (Per Feature)

- Feature logic implemented and reachable from navigation.
- Happy path and common failure states tested.
- TypeScript clean for touched files.
- Security/permissions validated for household boundaries.
- Basic telemetry/logging available for critical mutations.
- Documentation updated (if data model, behavior, or UX changed).

---

## 7) Risk Register And Mitigation

- Ownership edge cases (member removed, account owner missing)
  - Mitigation: fallback ownership policy and migration-safe defaults.
- Transfer consistency under concurrent operations
  - Mitigation: transactional RPC and idempotency checks.
- Recurring duplicates
  - Mitigation: recurrence execution lock/idempotency key.
- Performance degradation in long transaction histories
  - Mitigation: pagination + indexed queries + selective projections.
- Scope creep from Nice-to-have list
  - Mitigation: freeze MVP scope until Milestone G complete.

---

## 8) Nice-to-Have Policy (Post-MVP)

Start only after MVP quality gate:

- Multi-currency + exchange rates
- OCR + AI categorization
- Financial goals and analytics
- Security extras (PIN/biometrics)
- Open Banking sync and investments/debt modules

---

## 9) Release Checklist

- MVP checklist fully checked
- EAS production profile validated
- Data backup/export path verified
- Crash/error monitoring configured
- Rollback plan documented
- Post-release bug triage process defined
