# SmartFinance product roadmap

Status: future implementation backlog, based on the product and competitor review completed on 2026-07-31.

This roadmap covers capabilities that are not currently implemented, or are only partially implemented. It is intentionally ordered so that transaction automation and trustworthy reporting come before more expensive bank, AI, and investment integrations.

## Status legend

- [ ] Not started
- [~] Partially implemented or requires an audit before implementation
- [x] Completed

## Product principles

- Keep manual accounts and manual entry fully supported.
- Prefer deterministic and explainable automation over opaque decisions.
- Require confirmation before automation changes historical financial data.
- Treat imports as reversible operations.
- Keep household permissions and private financial data explicit.
- Build calculations and reporting foundations before adding conversational AI.
- Design European functionality around GDPR, PSD2/Open Banking, multiple currencies, and consent renewal.

## Phase 1 — Transaction automation and reporting

Goal: reduce manual work and make the data users already enter substantially more useful.

### Transaction rules

- [ ] Add rules that match merchant, title, description, account, amount, or transaction type.
- [ ] Support rule actions for category, normalized merchant, tags, account, and household member.
- [ ] Make rule priority and evaluation order visible.
- [ ] Show why a rule matched.
- [ ] Let users preview a rule against existing transactions.
- [ ] Require confirmation before applying rules retroactively.
- [ ] Add conflict handling when several rules match.
- [ ] Add unit and integration coverage for rule ordering and retroactive application.

### Merchant normalization

- [ ] Add a canonical merchant model.
- [ ] Preserve the original bank/import description.
- [ ] Group different merchant descriptions under one display name.
- [ ] Allow users to merge, rename, and separate merchants.
- [ ] Reuse normalized merchants in category suggestions and reports.

### Split transactions

- [ ] Allow one transaction to contain multiple category lines.
- [ ] Validate that split lines equal the original transaction amount.
- [ ] Support different notes and household members per split.
- [ ] Preserve attachment and source metadata on the parent transaction.
- [ ] Decide how splits affect editing, deletion, transfers, and reporting.

### Tags, flags, and bulk editing

- [ ] Add household-scoped custom tags.
- [ ] Support common workflows such as reimbursable, tax deductible, vacation, returned, and needs review.
- [ ] Add multi-select to the transaction list.
- [ ] Add bulk category, account, member, tag, and review-status changes.
- [ ] Add bulk operations to the audit history.

### Reports

- [ ] Add income-versus-expense cash-flow charts.
- [ ] Add monthly savings-rate reporting.
- [ ] Add spending by category, merchant, account, member, and tag.
- [ ] Add fixed-versus-discretionary spending.
- [ ] Support custom ranges and period comparisons.
- [ ] Add drill-down from every report to its underlying transactions.
- [ ] Add this-month versus last-month and year-over-year comparisons.
- [ ] Make reports exportable.

### Phase 1 completion criteria

- [ ] A user can automate repetitive transaction cleanup without losing control.
- [ ] A transaction can be split and still reconcile to its source amount.
- [ ] Every report can be traced to the transactions used in its calculation.
- [ ] Rules, splits, and bulk changes are tested and included in household backups.

## Phase 2 — Importing, reconciliation, and recurring money

Goal: make SmartFinance useful without requiring every transaction to be typed manually.

### CSV import wizard

- [ ] Accept CSV files from common Portuguese and European banks.
- [ ] Let users map date, description, debit, credit, amount, currency, and balance columns.
- [ ] Save import mappings per institution and file format.
- [ ] Normalize localized dates, decimal separators, and encodings.
- [ ] Preview valid, invalid, duplicate, and uncertain rows before import.
- [ ] Make an entire import batch reversible.
- [ ] Store import source and external transaction identifiers.

### Additional file formats

- [ ] Add CAMT.053 import.
- [ ] Add OFX import.
- [ ] Add QIF import if user demand justifies it.
- [ ] Document supported institutions and known format limitations.

### Duplicate detection and reconciliation

- [ ] Detect exact duplicates using external identifiers.
- [ ] Detect probable duplicates using account, date, amount, currency, and merchant.
- [ ] Add a review screen for probable matches.
- [ ] Allow users to enter an authoritative account balance.
- [ ] Explain missing, duplicated, or unreconciled amounts.
- [ ] Store reconciliation checkpoints.

### Recurring detection and calendar

- [ ] Detect repeating income, bills, and subscriptions from transaction history.
- [ ] Distinguish fixed, variable, monthly, annual, and irregular recurring payments.
- [ ] Let users confirm or dismiss detected patterns.
- [ ] Add a calendar and timeline for upcoming transactions.
- [ ] Warn when an expected salary or bill does not appear.
- [ ] Detect recurring price changes.

### Subscription dashboard

- [ ] List detected subscriptions with monthly and annual cost.
- [ ] Show next expected charge and historical price changes.
- [ ] Allow a subscription to be marked active, cancelled, ignored, or shared.
- [ ] Notify users before annual renewals.
- [ ] Avoid claiming cancellation support until an actual provider or workflow exists.

### Projected balances

- [ ] Combine current balances with confirmed recurring transactions.
- [ ] Project balances per account and for the household.
- [ ] Add configurable low-balance warnings.
- [ ] Show which future transactions produce a projected shortfall.
- [ ] Keep projections separate from posted balances.

### Phase 2 completion criteria

- [ ] A user can import a bank export, review it, and undo it safely.
- [ ] Duplicate imports do not silently create duplicate transactions.
- [ ] Upcoming bills and projected shortfalls are visible from one calendar.
- [ ] Detected recurring payments always require user confirmation.

## Phase 3 — Advanced budgeting

Goal: move from monitoring past spending to actively planning future spending.

### Budget rollover

- [ ] Add category-level rollover settings.
- [ ] Support carry-forward, reset, and return-to-pool behavior.
- [ ] Handle overspending explicitly.
- [ ] Show the rollover calculation in the budget history.

### Category targets

- [ ] Support maximum-spend targets.
- [ ] Support save-by-date targets.
- [ ] Support repeating funding targets.
- [ ] Support refill-to-amount targets.
- [ ] Calculate the required contribution for each period.
- [ ] Allow a target to be snoozed without deleting it.

### Zero-based and envelope budgeting

- [ ] Add an optional assign-every-euro budgeting mode.
- [ ] Display money available to allocate.
- [ ] Move funds between categories without creating transactions.
- [ ] Support category groups and reusable templates.
- [ ] Provide 50/30/20, zero-based, student, couple, family, freelancer, and debt-payoff templates.

### Flexible planning periods

- [ ] Support weekly, fortnightly, monthly, annual, and custom payday periods.
- [ ] Allow annual costs to be funded monthly.
- [ ] Preserve comparable reporting across different periods.

### Safe-to-spend

- [ ] Define the calculation using available cash, upcoming bills, reserved savings, and planned spending.
- [ ] Explain every amount included in the result.
- [ ] Allow users to exclude accounts or categories.
- [ ] Add a dashboard card and low-funds alert.

### Phase 3 completion criteria

- [ ] Budget calculations remain reproducible across rollover and custom periods.
- [ ] Users can understand how much is safe to spend and inspect the calculation.
- [ ] Budget templates are optional and never overwrite an existing plan without confirmation.

## Phase 4 — Net worth and debt management

Goal: provide a complete view of the household balance sheet and actionable debt planning.

### Net-worth history

- [ ] Store or derive historical balance snapshots.
- [ ] Separate assets, liabilities, and net worth.
- [ ] Add account and date filters.
- [ ] Explain changes caused by transfers, contributions, debt reduction, and manual adjustments.

### Liability accounts

- [ ] Add mortgages, personal loans, credit cards, car finance, and informal debt.
- [ ] Store principal, interest rate, term, due date, and minimum payment.
- [ ] Link payments to transactions without double-counting transfers or expenses.
- [ ] Support variable-rate debt and rate history.

### Debt payoff planner

- [ ] Add snowball, avalanche, and custom-order strategies.
- [ ] Calculate payoff date and projected interest.
- [ ] Compare additional one-time and monthly payments.
- [ ] Allow scenarios without modifying the active plan.
- [ ] Convert an accepted scenario into targets and recurring payments.

### Manual assets

- [ ] Support homes, vehicles, valuables, private investments, and money owed to the household.
- [ ] Store valuation history and source.
- [ ] Never present stale estimates as current market values.

### Phase 4 completion criteria

- [ ] Net worth can be reproduced for any historical reporting date.
- [ ] Loan calculations are covered by financial-math tests.
- [ ] Transfers and debt payments are not double-counted in spending reports.

## Phase 5 — Household collaboration

Goal: support couples and families without forcing every financial detail to be shared.

### Privacy and permissions

- [ ] Add owner, administrator, adult, teen, adviser, and read-only roles.
- [ ] Support shared transactions, balance-only sharing, totals-only sharing, and private accounts.
- [ ] Define permissions for budgets, imports, rules, members, exports, and deletion.
- [ ] Add permission and data-isolation tests.

### Collaboration

- [ ] Add comments and mentions to transactions.
- [ ] Add personal and shared budgets.
- [ ] Add configurable approval for unusual expenses and budget changes.
- [ ] Add a review queue for transactions requiring another member's confirmation.
- [ ] Add an immutable household audit history.

### Expense splitting and settlements

- [ ] Split expenses equally, proportionally, or by custom amount.
- [ ] Track who paid and who benefited.
- [ ] Calculate household settlements.
- [ ] Avoid mixing reimbursements with normal income and expense reporting.

### Phase 5 completion criteria

- [ ] Private data is excluded from unauthorized queries, exports, backups, notifications, and reports.
- [ ] Every shared change records who made it and when.
- [ ] Settlement balances reconcile to their source expenses.

## Phase 6 — Multi-currency and European bank connectivity

Goal: support real European households, cross-border finances, and automated synchronization.

### Multi-currency ledger

- [ ] Store currency on accounts and transactions.
- [ ] Store the original amount and normalized reporting amount.
- [ ] Use historical exchange rates for reports.
- [ ] Configure a household reporting currency.
- [ ] Handle exchange fees and cross-currency transfers.
- [ ] Show the exchange rate and source used in every conversion.

### PSD2/Open Banking

- [ ] Select a regulated aggregation provider with suitable Portuguese and EU coverage.
- [ ] Complete legal, security, cost, and data-retention review.
- [ ] Add explicit connection consent and institution selection.
- [ ] Import stable external account and transaction identifiers.
- [ ] Handle pending-to-posted transaction transitions.
- [ ] Add connection-health, reconnection, and consent-renewal flows.
- [ ] Keep credentials out of SmartFinance infrastructure.
- [ ] Provide account disconnection and imported-data deletion controls.
- [ ] Keep manual and file-imported accounts fully supported.

### Portugal-specific improvements

- [ ] Add templates for major Portuguese bank exports.
- [ ] Improve MB Way and Multibanco merchant recognition.
- [ ] Add optional Portuguese tax-related tags and exports.
- [ ] Add PPR-specific investment and retirement handling.
- [ ] Add Euribor and mortgage-rate scenarios.

### Phase 6 completion criteria

- [ ] Bank synchronization passes security and privacy review.
- [ ] Consent expiration and revoked access fail safely.
- [ ] Pending, posted, imported, and manually entered transactions reconcile correctly.
- [ ] Currency conversions remain auditable and reproducible.

## Phase 7 — Investments and long-term planning

Goal: extend SmartFinance from cash management to household wealth planning.

### Investment tracking

- [ ] Add stocks, ETFs, funds, bonds, crypto, pensions, and PPR holdings.
- [ ] Track trades, contributions, withdrawals, dividends, fees, and taxes.
- [ ] Separate investment return from contributions and currency movement.
- [ ] Add allocation by asset class, region, sector, currency, and account.
- [ ] Add manual price entry before external market-data integrations.

### Retirement and FIRE planning

- [ ] Model contributions, inflation, returns, retirement age, and expected spending.
- [ ] Support conservative, expected, and optimistic scenarios.
- [ ] Add financial-independence target and estimated date.
- [ ] Show assumptions and sensitivity to each variable.
- [ ] Avoid presenting projections as guaranteed outcomes or personalized regulated advice.

### Phase 7 completion criteria

- [ ] Portfolio performance distinguishes cash flow from market return.
- [ ] Forecasts show assumptions, ranges, and limitations.
- [ ] Market-data failures do not corrupt recorded holdings or transactions.

## Phase 8 — Smart assistance and data ownership

Goal: add trustworthy intelligence and power-user integrations after the financial model is mature.

### Anomaly detection

- [ ] Detect unusual amounts, duplicate charges, unexpected merchants, missed salary, and abnormal bills.
- [ ] Explain the baseline and reason for every alert.
- [ ] Let users dismiss alerts and improve future detection.

### Receipt OCR

- [ ] Extract merchant, date, total, currency, tax, and optional line items.
- [ ] Show the original receipt beside extracted values.
- [ ] Require confirmation before creating or updating a transaction.
- [ ] Define secure retention and deletion behavior for receipt images.

### Explainable financial assistant

- [ ] Answer questions using deterministic queries and calculations.
- [ ] Link every answer to the relevant transactions and reports.
- [ ] Add affordability and what-if scenarios.
- [ ] Require confirmation before creating rules, targets, budgets, or transactions.
- [ ] Prevent cross-household data access in retrieval and prompts.
- [ ] Add evaluation cases for numerical accuracy and unsupported advice.

### Data portability and integrations

- [ ] Export filtered transactions to CSV, Excel, and JSON.
- [ ] Export complete household data in a documented portable format.
- [ ] Add a scoped personal API.
- [ ] Add revocable API tokens and audit logging.
- [ ] Add optional webhooks for transaction and budget events.
- [ ] Consider spreadsheet and Home Assistant integrations.

### Platform improvements

- [ ] Add offline transaction capture and conflict-safe synchronization.
- [ ] Add quick-entry shortcuts and widgets.
- [ ] Add an application-level biometric lock.
- [ ] Add configurable weekly and monthly financial summaries.
- [ ] Add a customizable dashboard.

### Phase 8 completion criteria

- [ ] AI-generated answers are numerically verifiable and cite their internal data sources.
- [ ] No AI action mutates financial data without explicit confirmation.
- [ ] API access is scoped, revocable, rate-limited, and audited.
- [ ] Offline conflicts are visible and recoverable.

## Deferred or country-dependent services

These features should not be scheduled until the regulatory, commercial, and support implications are understood.

- [ ] Credit-score monitoring.
- [ ] Rent reporting to credit bureaus.
- [ ] Bill negotiation.
- [ ] Subscription cancellation performed on the user's behalf.
- [ ] Cashback and financial-product recommendations.
- [ ] Payments, money movement, lending, or investment execution.
- [ ] Personalized regulated financial advice.

## Suggested next implementation sequence

When development resumes, start with these epics in order:

1. Transaction rules and merchant normalization.
2. CSV import, preview, duplicate detection, and rollback.
3. Split transactions, tags, and bulk editing.
4. Cash-flow, category, and merchant reports.
5. Recurring detection, subscription dashboard, and bill calendar.
6. Projected balances and safe-to-spend.
7. Budget rollover and category targets.
8. Net-worth history and liability accounts.
9. Household privacy roles and audit history.
10. PSD2/Open Banking integration.

## Research references

- [Monarch tracking, reports, recurring payments, investments, and dashboard](https://www.monarchmoney.com/features/recurring)
- [YNAB bank sync, goals, loan planner, reports, and household sharing](https://www.ynab.com/features)
- [YNAB loan accounts and payoff planning](https://support.ynab.com/en_us/loan-accounts-a-guide-HkNSkPHJi)
- [Emma Open Banking, subscriptions, budgets, and analytics](https://emma-app.com/features/tracking)
- [Emma product and security overview](https://emma-app.com/)
- [Empower planning tools](https://www.empower.com/tools)
- [Tiller automated feeds and user-owned spreadsheets](https://tiller.com/how-tiller-works/tiller-money-feeds/)

