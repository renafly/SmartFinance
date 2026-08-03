# Graph Report - SmartFinance  (2026-08-03)

## Corpus Check
- 416 files · ~226,830 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2112 nodes · 4599 edges · 175 communities (103 shown, 72 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- monthly-budget.service.ts
- savings.tsx
- SavingsScreen
- RootProvider.tsx
- RepoResult
- household-backup.service.ts
- build-financial-insights.ts
- public-overview-screen.web.tsx
- login-callback-screen.tsx
- app-tabs.web.tsx
- accounts.tsx
- expo
- saving-pot-forecast.service.ts
- categories/hooks/index.ts
- session.types.ts
- transfers.tsx
- src/theme/spacing.ts
- run-local-contract-tests.mjs
- src/theme/ThemeProvider.tsx
- MembersScreen
- BaseRepository
- budget.tsx
- useAuth
- invalidateHouseholdData
- transaction-import/preview.ts
- execute-recurring.js
- Data-subject export and deletion workflow design
- feedback/types.ts
- scripts
- SmartFinance Release Checklist
- date-picker-field.web.tsx
- automation/service.ts
- reset-project.js
- AccountsRepository
- ProfileOnboardingProvider.tsx
- HouseholdsService
- exclude
- catalog.ts
- feedback/service.ts
- requireIdFor
- RecurringTransactionsService
- (protected)/index.tsx
- SmartFinance command helper
- recurring.transactions.repository.ts
- useTheme
- transaction.schema.ts
- admin-feedback.tsx
- eslint
- icon-picker.tsx
- SmartFinance Testing
- account.schema.ts
- Database
- shared/theme/colors.ts
- .storybook/index.ts
- send-household-invitation/index.ts
- dependencies
- vercel.json
- metro.config.js
- useAuthContext.ts
- mocks/supabase.ts
- eslint.config.js
- eslint-config-expo
- localStorageService.ts
- shared/theme/shadows.ts
- authUiStore.ts
- query-client.tsx
- nativewind-env.d.ts
- HouseholdBackupService
- .importHouseholdBackup
- core/index.ts
- shared/theme/radius.ts
- shared/theme/typography.ts
- shared/theme/untitled-theme.ts
- src/theme/untitled-theme.ts
- AuthProvider.tsx
- web-smoke.spec.ts
- tsconfig.test.json
- serve-dist.mjs
- Expo HAS CHANGED
- buildCleanBackup
- ProfilesRepository
- types/index.ts
- entry-screen.tsx
- global.d.ts
- transaction-automation.repository.ts
- dispatch-notification/index.ts
- Phase 2 — Importing, reconciliation, and recurring money
- SmartFinance product roadmap
- Phase 8 — Smart assistance and data ownership
- accounts.service.ts
- expo-application
- transaction.service.ts
- Findings
- Phase 3 — Advanced budgeting
- expo-localization
- Phase 1 — Transaction automation and reporting
- Privacy readiness implementation backlog
- expo-linking
- transaction-import.repository.ts
- expo-auth-session
- expo-dev-client
- expo-device
- expo-document-picker
- expo-font
- saving-pots.repository.ts
- expo-image
- expo-linear-gradient
- transaction-create-form.ts
- expo-notifications
- expo-splash-screen
- expo
- transaction-list.ts
- expo-symbols
- @expo/ui
- @expo/vector-icons
- expo-web-browser
- Phase 4 — Net worth and debt management
- i18next
- @internationalized/date
- nativewind
- transactions.tsx
- react
- react-aria-components
- react-dom
- Phase 5 — Household collaboration
- react-native
- @react-native-async-storage/async-storage
- react-native-css
- react-native-gesture-handler
- react-native-get-random-values
- react-native-mmkv
- react-native-reanimated
- react-native-safe-area-context
- react-native-screens
- Phase 6 — Multi-currency and European bank connectivity
- prettier
- react-native-web
- react-native-worklets
- @react-navigation/drawer
- @react-oauth/google
- @storybook/addon-ondevice-controls
- @storybook/react-native
- @supabase/supabase-js
- @tanstack/react-query
- unleash-proxy-client
- zod
- react-native-url-polyfill
- SmartFinance privacy and data inventory
- Privacy legal and business inputs
- Phase 7 — Investments and long-term planning
- SmartFinance processor and recipient register
- client.ts
- expo-status-bar
- husky
- expo-system-ui
- react-i18next
- react-native-svg

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 143 edges
2. `RepoResult` - 98 edges
3. `useAuth()` - 90 edges
4. `spacing()` - 81 edges
5. `invalidateHouseholdData()` - 66 edges
6. `Database` - 44 edges
7. `BudgetScreen()` - 40 edges
8. `typography` - 37 edges
9. `useResponsiveMetrics()` - 36 edges
10. `radius` - 30 edges

## Surprising Connections (you probably didn't know these)
- `BudgetScreen()` --indirect_call--> `run()`  [INFERRED]
  src/app/(protected)/budget.tsx → test/security/run-security-check.mjs
- `AuthLayout()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(auth)/_layout.tsx → src/theme/ThemeProvider.tsx
- `AccountsScreen()` --indirect_call--> `account()`  [INFERRED]
  src/app/(protected)/accounts.tsx → src/features/monthly-budget/services/monthly-budget.service.unit.test.ts
- `FilterRow()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(protected)/admin-feedback.tsx → src/theme/ThemeProvider.tsx
- `InboxRow()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(protected)/admin-feedback.tsx → src/theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Communities (175 total, 72 thin omitted)

### Community 0 - "monthly-budget.service.ts"
Cohesion: 0.08
Nodes (32): buildAccountGroups(), Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, getCashAccountIds(), getExcludedMonths() (+24 more)

### Community 1 - "savings.tsx"
Cohesion: 0.07
Nodes (51): getToken(), InviteScreen(), CategoryEditDraft, categoryIconSuggestions, CategoryLike, types, roles, AccountGroup (+43 more)

### Community 2 - "SavingsScreen"
Cohesion: 0.11
Nodes (23): buildForecastYearRows(), buildSelectionMap(), formatForecastMonth(), getAccountSummary(), SavingsScreen(), TransfersContent(), useMonthlyBudgetWorkspace(), useCreateRecurringTransaction() (+15 more)

### Community 3 - "RootProvider.tsx"
Cohesion: 0.05
Nodes (27): @vercel/speed-insights, NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), useNotifications(), AppNotification, NotificationsService, registerWebPushDevice() (+19 more)

### Community 4 - "RepoResult"
Cohesion: 0.06
Nodes (5): RepoResult, CategoriesRepository, HouseholdsRepository, MonthlyBudgetRepository, TransactionsRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (38): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+30 more)

### Community 6 - "build-financial-insights.ts"
Cohesion: 0.07
Nodes (49): projectAccountBalances(), buildFinancialInsights(), BuildFinancialInsightsInput, addRecurrence(), formatCalendarDate(), listRuleOccurrences(), parseCalendarDate(), buildBillCalendar() (+41 more)

### Community 7 - "public-overview-screen.web.tsx"
Cohesion: 0.08
Nodes (18): LanguageMenu(), options, styles, Brand(), Cta(), featureIcons, LandingScreen(), styles (+10 more)

### Community 8 - "login-callback-screen.tsx"
Cohesion: 0.15
Nodes (14): AuthLayout(), LoginCallbackScreen(), styles, buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo() (+6 more)

### Community 9 - "app-tabs.web.tsx"
Cohesion: 0.08
Nodes (29): plugins, expo-image, expo-localization, expo-status-bar, expo-web-browser, AnimatedIcon(), glowKeyframe, keyframe (+21 more)

### Community 10 - "accounts.tsx"
Cohesion: 0.12
Nodes (17): AccountHistoryMode, createStyles(), currencyOptions, EditMode, BadgeProps, BadgeTone, EmptyStateProps, MetricCardProps (+9 more)

### Community 11 - "expo"
Cohesion: 0.06
Nodes (35): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+27 more)

### Community 12 - "saving-pot-forecast.service.ts"
Cohesion: 0.12
Nodes (32): addMonths(), addOccurrence(), buildForecastTimeline(), buildSavingPotForecasts(), findCompletionDate(), ForecastContribution, ForecastFrequency, ForecastPot (+24 more)

### Community 13 - "categories/hooks/index.ts"
Cohesion: 0.14
Nodes (13): CategoriesScreen(), getTypeColor(), getTypeIcon(), useArchiveCategory(), useCategories(), useChildCategories(), useTopLevelCategories(), useCreateCategory() (+5 more)

### Community 14 - "session.types.ts"
Cohesion: 0.21
Nodes (8): SessionRepository, SessionService, Claims, HouseholdMember, SessionState, UserProfile, mockLoadProfileAndHousehold, useSession()

### Community 15 - "transfers.tsx"
Cohesion: 0.08
Nodes (28): DatePickerField(), emptyDraft(), ExpenseKind, formatDateInput(), frequencies, Frequency, months, MovementDraft (+20 more)

### Community 16 - "src/theme/spacing.ts"
Cohesion: 0.09
Nodes (30): expo-router, samples, AttachmentPreviewProps, styles, FinanceMetricCard(), FinanceMetricCardProps, FinanceMetricTone, getToneColors() (+22 more)

### Community 17 - "run-local-contract-tests.mjs"
Cohesion: 0.15
Nodes (6): hasCrossHouseholdSeed, householdScopedTables, localUrls, privateTables, reachabilityChecks, supabase

### Community 18 - "src/theme/ThemeProvider.tsx"
Cohesion: 0.13
Nodes (12): AuthLoadingTransition(), FigureColors, styles, useThemeStore, blueColors, darkColors, lightColors, ThemeColors (+4 more)

### Community 19 - "MembersScreen"
Cohesion: 0.36
Nodes (8): MembersScreen(), HouseholdRole, useAcceptHouseholdInvitation(), useCreateHouseholdInvitation(), useDeclineHouseholdInvitation(), useHouseholdInvitations(), useMyHouseholdInvitations(), useRevokeHouseholdInvitation()

### Community 20 - "BaseRepository"
Cohesion: 0.08
Nodes (18): BaseRepository, Insert, ListOptions, Row, TableName, createClient(), createQuery(), QueryResult (+10 more)

### Community 21 - "budget.tsx"
Cohesion: 0.11
Nodes (35): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), formatMonthSelection(), getMemberAccentColor(), getMemberLabel(), getRuleRowKey() (+27 more)

### Community 22 - "useAuth"
Cohesion: 0.09
Nodes (29): AccountsScreen(), dateRange(), InsightsScreen(), localDate(), SettingsScreen(), TransactionsScreen(), RecurringTransferCreateForm(), useAccountsWithBalances() (+21 more)

### Community 23 - "invalidateHouseholdData"
Cohesion: 0.11
Nodes (15): useCreateHousehold(), useLeaveHousehold(), useRemoveHouseholdMember(), useTransferHouseholdOwnership(), useBulkUpdateTransactionCategories(), useCreateTransaction(), useDeleteCompletedTransfer(), useDeleteTransaction() (+7 more)

### Community 24 - "transaction-import/preview.ts"
Cohesion: 0.18
Nodes (19): CsvDocument, detectDelimiter(), parseCsv(), parseLocalizedDate(), parseLocalizedNumber(), validDate(), buildImportPreview(), exactKey() (+11 more)

### Community 26 - "Data-subject export and deletion workflow design"
Cohesion: 0.10
Nodes (20): Data-subject export and deletion workflow design, Definition of done, Deletion workflow, Design principles, Erasure matrix requiring product/legal decisions, Export manifest, Export workflow, Failure and recovery (+12 more)

### Community 27 - "feedback/types.ts"
Cohesion: 0.08
Nodes (26): AdminFeedbackFilters, AdminFeedbackPage, appContextToJson(), AppRelease, AppReleasePlatform, cleanRoute(), cleanString(), Feedback (+18 more)

### Community 28 - "scripts"
Cohesion: 0.04
Nodes (48): @expo/ngrok, jest, jest-expo, devDependencies, @expo/ngrok, jest, jest-expo, @playwright/test (+40 more)

### Community 30 - "SmartFinance Release Checklist"
Cohesion: 0.20
Nodes (9): Auth And Routing, Background Notifications, Build Gates, Environment, Finance Semantics, Recurring Automation, Responsive UI, Security Headers (+1 more)

### Community 31 - "date-picker-field.web.tsx"
Cohesion: 0.31
Nodes (7): calendarButtonStyle, DateGranularity, DatePickerField(), DatePickerFieldProps, formatDateValue(), formatDisplayValue(), toDateValue()

### Community 32 - "automation/service.ts"
Cohesion: 0.21
Nodes (13): baseRule, canonicalizeMerchant(), normalizeMerchantText(), matchTransactionRule(), titleMatches(), TransactionAutomationService, validateTransactionSplits(), BulkTransactionChanges (+5 more)

### Community 33 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 35 - "ProfileOnboardingProvider.tsx"
Cohesion: 0.10
Nodes (30): GuideModal(), GuideModalProps, styles, getOnboardingGuide(), onboardingGuides, emptyProgress(), OnboardingContext, OnboardingContextValue (+22 more)

### Community 37 - "exclude"
Cohesion: 0.09
Nodes (22): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, test, **/*.ts, **/*.tsx (+14 more)

### Community 38 - "catalog.ts"
Cohesion: 0.11
Nodes (33): CatalogRow, firstString(), highlightText(), isPublished(), listPublishedReleases(), normalizePublishedRelease(), parseHighlights(), releaseQueryKeys (+25 more)

### Community 39 - "feedback/service.ts"
Cohesion: 0.23
Nodes (10): useUpdateAdminFeedback(), categoryFor(), createFeedback(), FeedbackInput, FeedbackUiItem, listAdminFeedback(), listMyFeedback(), mapFeedback() (+2 more)

### Community 40 - "requireIdFor"
Cohesion: 0.26
Nodes (15): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts() (+7 more)

### Community 42 - "(protected)/index.tsx"
Cohesion: 0.10
Nodes (36): AccountOverviewTable(), AllocationDonut(), AllocationKey, AllocationLegend(), AllocationSegment, DashboardAccount, DashboardPot, DashboardScreen() (+28 more)

### Community 43 - "SmartFinance command helper"
Cohesion: 0.10
Nodes (19): Builds, Common troubleshooting, Daily development, Database migrations, Deploy migrations to hosted Supabase, First-time setup, Graphify and Git checks, Packages (+11 more)

### Community 44 - "recurring.transactions.repository.ts"
Cohesion: 0.14
Nodes (5): RecurringRunExecution, RecurringTransaction, RecurringTransactionsRepository, RecurringTransactionWithRelations, QueryResult

### Community 45 - "useTheme"
Cohesion: 0.14
Nodes (20): RangePreset, PublicLayout(), AnimatedIcon(), AnimatedSplashOverlay(), glowKeyframe, keyframe, logoKeyframe, styles (+12 more)

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "admin-feedback.tsx"
Cohesion: 0.06
Nodes (48): AdminEmpty(), AdminFeedbackItem, AdminFeedbackScreen(), AssignmentFilter, DetailBlock(), FeedbackKind, FeedbackPriority, FeedbackStatus (+40 more)

### Community 49 - "icon-picker.tsx"
Cohesion: 0.33
Nodes (6): ALL_ICON_NAMES, DEFAULT_ICON_NAMES, IconPicker(), IconPickerProps, STARTER_ICON_NAMES, styles

### Community 50 - "SmartFinance Testing"
Cohesion: 0.33
Nodes (5): Fast Local Checks, Local Supabase Contract Check, Production Release Checklist, Release-Only Web Smoke, SmartFinance Testing

### Community 51 - "account.schema.ts"
Cohesion: 0.50
Nodes (3): AccountFormInput, AccountFormValues, accountSchema

### Community 52 - "Database"
Cohesion: 0.07
Nodes (23): CreateInvitationInput, createInviteLinks(), HouseholdRole, InvitationDetails, normalizeInviteWebBase(), CreateRecurringTransactionInput, ExpenseKind, Frequency (+15 more)

### Community 53 - "shared/theme/colors.ts"
Cohesion: 0.40
Nodes (4): blueColors, darkColors, lightColors, ThemeColors

### Community 55 - "send-household-invitation/index.ts"
Cohesion: 0.23
Nodes (10): baseCorsHeaders, EmailLogInsert, extractInviteTokenFromLink(), getAllowedOrigins(), getCorsHeaders(), HouseholdRole, InvitePayload, normalizeHttpOrigin() (+2 more)

### Community 56 - "dependencies"
Cohesion: 0.13
Nodes (15): expo-constants, expo-crypto, expo-glass-effect, expo-router, dependencies, expo-constants, expo-crypto, expo-glass-effect (+7 more)

### Community 57 - "vercel.json"
Cohesion: 0.18
Nodes (10): maxDuration, buildCommand, cleanUrls, crons, functions, api/cron/execute-recurring.js, headers, outputDirectory (+2 more)

### Community 58 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativewind }

### Community 60 - "mocks/supabase.ts"
Cohesion: 0.67
Nodes (3): createSupabaseMock(), createSupabaseQuery(), QueryResult

### Community 68 - "HouseholdBackupService"
Cohesion: 0.18
Nodes (5): asBackupFile(), fetchPaged(), HouseholdBackupService, safeNamePart(), Json

### Community 69 - ".importHouseholdBackup"
Cohesion: 0.36
Nodes (8): buildIncomeInputInserts(), getCurrentProfile(), getMemberFallbackMap(), insertMany(), newId(), newIdMap(), normalizeEmail(), throwIfError()

### Community 70 - "core/index.ts"
Cohesion: 0.06
Nodes (52): CookiePolicyPage(), PolicyFact(), PolicySection(), styles, mockUseCookieConsent, VercelSpeedInsights(), resources, ActionButton() (+44 more)

### Community 84 - "AuthProvider.tsx"
Cohesion: 0.19
Nodes (9): shouldRefreshClaimsForAuthEvent(), ShouldRefreshClaimsInput, useUpdatePreferredCurrency(), AuthContext, AuthContextValue, AuthProvider(), completeNativeAuthCallback(), isNativeAuthCallback() (+1 more)

### Community 86 - "tsconfig.test.json"
Cohesion: 0.14
Nodes (13): jest, ./tsconfig.json, compilerOptions, types, exclude, extends, include, node_modules (+5 more)

### Community 87 - "serve-dist.mjs"
Cohesion: 0.40
Nodes (3): contentTypes, port, root

### Community 88 - "Expo HAS CHANGED"
Cohesion: 0.50
Nodes (3): Expo HAS CHANGED, Graphify, Multi-Agent Workflow

### Community 89 - "buildCleanBackup"
Cohesion: 0.40
Nodes (6): buildCleanBackup(), buildKeyMap(), buildTransferGroupKeyMap(), keyFor(), makeKey(), scrubJsonIds()

### Community 92 - "types/index.ts"
Cohesion: 0.33
Nodes (5): Account, CreateAccountDTO, NewAccount, UpdateAccount, UpdateAccountDTO

### Community 95 - "transaction-automation.repository.ts"
Cohesion: 0.12
Nodes (7): MerchantAliasInsert, Rule, RuleInsert, SplitInsert, TagInsert, TransactionAutomationRepository, TransactionUpdate

### Community 100 - "Phase 2 — Importing, reconciliation, and recurring money"
Cohesion: 0.25
Nodes (8): Additional file formats, CSV import wizard, Duplicate detection and reconciliation, Phase 2 completion criteria, Phase 2 — Importing, reconciliation, and recurring money, Projected balances, Recurring detection and calendar, Subscription dashboard

### Community 103 - "SmartFinance product roadmap"
Cohesion: 0.29
Nodes (6): Deferred or country-dependent services, Product principles, Research references, SmartFinance product roadmap, Status legend, Suggested next implementation sequence

### Community 105 - "Phase 8 — Smart assistance and data ownership"
Cohesion: 0.29
Nodes (7): Anomaly detection, Data portability and integrations, Explainable financial assistant, Phase 8 completion criteria, Phase 8 — Smart assistance and data ownership, Platform improvements, Receipt OCR

### Community 106 - "accounts.service.ts"
Cohesion: 0.10
Nodes (9): useAccounts(), useArchiveAccount(), useCreateAccount(), useDeleteAccount(), useUpdateAccount(), AccountIdInput, AccountsService, CreateAccountInput (+1 more)

### Community 108 - "transaction.service.ts"
Cohesion: 0.06
Nodes (34): ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName(), TransactionAttachmentInput, createdTransaction (+26 more)

### Community 109 - "Findings"
Cohesion: 0.13
Nodes (14): Executive assessment, Findings, Official Supabase references reviewed, Positive controls, Required remote verification, SR-01 — No authenticated account-deletion workflow, SR-02 — Household backup is not a complete personal-data export, SR-03 — Auth/session settings are not evidenced as production-hardened (+6 more)

### Community 110 - "Phase 3 — Advanced budgeting"
Cohesion: 0.29
Nodes (7): Budget rollover, Category targets, Flexible planning periods, Phase 3 — Advanced budgeting, Phase 3 completion criteria, Safe-to-spend, Zero-based and envelope budgeting

### Community 112 - "Phase 1 — Transaction automation and reporting"
Cohesion: 0.29
Nodes (7): Merchant normalization, Phase 1 completion criteria, Phase 1 — Transaction automation and reporting, Reports, Split transactions, Tags, flags, and bulk editing, Transaction rules

### Community 113 - "Privacy readiness implementation backlog"
Cohesion: 0.18
Nodes (10): Account deletion and erasure, Next engineering tranche, P0 — release and compliance-claim blockers, P1 — authentication and application security, P1 — data-subject rights, P1 — retention and minimization, P2 — governance and operations, Personal-data export (+2 more)

### Community 115 - "transaction-import.repository.ts"
Cohesion: 0.27
Nodes (4): Client, ImportBatchRow, table(), TransactionImportRepository

### Community 123 - "saving-pots.repository.ts"
Cohesion: 0.20
Nodes (4): SavingPot, SavingPotAccountAssignment, SavingPotBalance, SavingPotsRepository

### Community 126 - "transaction-create-form.ts"
Cohesion: 0.48
Nodes (5): getAddAnotherTransactionReset(), getFreshTransactionCreateReset(), getLocalCalendarDate(), TransactionCreateContext, TransactionCreateReset

### Community 132 - "transaction-list.ts"
Cohesion: 0.48
Nodes (5): compareTransactions(), SortableTransaction, timestamp(), TransactionListSortKey, sortedIds()

### Community 137 - "Phase 4 — Net worth and debt management"
Cohesion: 0.33
Nodes (6): Debt payoff planner, Liability accounts, Manual assets, Net-worth history, Phase 4 completion criteria, Phase 4 — Net worth and debt management

### Community 141 - "transactions.tsx"
Cohesion: 0.13
Nodes (23): createStyles(), AttachmentDraft, createStyles(), DateFilterField(), DatePickerField(), DropdownField(), DropdownFieldProps, formatDateInputValue() (+15 more)

### Community 145 - "Phase 5 — Household collaboration"
Cohesion: 0.40
Nodes (5): Collaboration, Expense splitting and settlements, Phase 5 completion criteria, Phase 5 — Household collaboration, Privacy and permissions

### Community 155 - "Phase 6 — Multi-currency and European bank connectivity"
Cohesion: 0.40
Nodes (5): Multi-currency ledger, Phase 6 completion criteria, Phase 6 — Multi-currency and European bank connectivity, Portugal-specific improvements, PSD2/Open Banking

### Community 169 - "SmartFinance privacy and data inventory"
Cohesion: 0.20
Nodes (9): Browser and device storage, Data flows, Data subjects, Evidence convention, Highest-risk gaps, Personal-data inventory, Required legal/business and production inputs, SmartFinance privacy and data inventory (+1 more)

### Community 170 - "Privacy legal and business inputs"
Cohesion: 0.20
Nodes (9): Controller identity, Data-subject rights, Privacy legal and business inputs, Processors, regions, and transfers, Product and users, Purposes and legal bases, Required approvals before publication, Retention and deletion (+1 more)

### Community 171 - "Phase 7 — Investments and long-term planning"
Cohesion: 0.40
Nodes (5): Investment tracking, Phase 7 completion criteria, Phase 7 — Investments and long-term planning, Read-only broker integrations, Retirement and FIRE planning

### Community 176 - "SmartFinance processor and recipient register"
Cohesion: 0.33
Nodes (5): External services, Immediate decisions, Internal recipients, SmartFinance processor and recipient register, Vendor diligence checklist

### Community 177 - "client.ts"
Cohesion: 0.09
Nodes (21): SignOutButton(), Account, AccountBalance, BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule (+13 more)

## Knowledge Gaps
- **733 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+728 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **72 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `expo-notifications`, `expo-splash-screen`, `expo`, `RootProvider.tsx`, `expo-symbols`, `@expo/ui`, `@expo/vector-icons`, `expo-web-browser`, `i18next`, `@internationalized/date`, `nativewind`, `react`, `react-aria-components`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-css`, `react-native-gesture-handler`, `react-native-get-random-values`, `react-native-mmkv`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `scripts`, `prettier`, `react-native-web`, `react-native-worklets`, `@react-navigation/drawer`, `@react-oauth/google`, `@storybook/addon-ondevice-controls`, `@storybook/react-native`, `@supabase/supabase-js`, `@tanstack/react-query`, `unleash-proxy-client`, `react-native-url-polyfill`, `zod`, `eslint`, `expo-status-bar`, `husky`, `expo-system-ui`, `react-i18next`, `react-native-svg`, `eslint-config-expo`, `expo-application`, `expo-localization`, `expo-linking`, `expo-auth-session`, `expo-dev-client`, `expo-device`, `expo-document-picker`, `expo-font`, `expo-image`, `expo-linear-gradient`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `RootProvider.tsx` to `dependencies`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `savings.tsx`, `SavingsScreen`, `RootProvider.tsx`, `public-overview-screen.web.tsx`, `login-callback-screen.tsx`, `app-tabs.web.tsx`, `accounts.tsx`, `categories/hooks/index.ts`, `transactions.tsx`, `transfers.tsx`, `src/theme/spacing.ts`, `src/theme/ThemeProvider.tsx`, `MembersScreen`, `budget.tsx`, `useAuth`, `ProfileOnboardingProvider.tsx`, `(protected)/index.tsx`, `admin-feedback.tsx`, `icon-picker.tsx`, `core/index.ts`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _733 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `monthly-budget.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07549361207897794 - nodes in this community are weakly interconnected._
- **Should `savings.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `SavingsScreen` be split into smaller, more focused modules?**
  _Cohesion score 0.10634920634920635 - nodes in this community are weakly interconnected._