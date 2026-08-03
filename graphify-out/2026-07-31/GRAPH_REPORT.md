# Graph Report - SmartFinance  (2026-07-31)

## Corpus Check
- 392 files · ~208,299 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2018 nodes · 4352 edges · 181 communities (103 shown, 78 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- monthly-budget.service.ts
- eslint
- RootProvider.tsx
- useTheme
- RepoResult
- household-backup.service.ts
- build-financial-insights.ts
- grouped-account-select.tsx
- AuthProvider.tsx
- app-tabs.web.tsx
- NotificationsProvider.tsx
- expo
- saving-pot-forecast.service.ts
- settings.tsx
- TransactionsRepository
- transfers.tsx
- src/theme/ThemeProvider.tsx
- invalidateHouseholdData
- useAuth
- categories/hooks/index.ts
- diagnostics.tsx
- budget.tsx
- TransactionImportRepository
- savings.tsx
- transaction-import/preview.ts
- execute-recurring.js
- Data-subject export and deletion workflow design
- feedback/types.ts
- scripts
- SmartFinance Release Checklist
- date-picker-field.web.tsx
- automation/service.ts
- reset-project.js
- accounts.service.ts
- ProfileOnboardingProvider.tsx
- HouseholdsService
- exclude
- catalog.ts
- client.ts
- requireIdFor
- transaction.service.ts
- useHouseholdBackup.ts
- Welcome to your Expo app 👋
- recurring.transactions.repository.ts
- date-picker-field.tsx
- transaction.schema.ts
- MembersScreen
- RecurringTransactionsService
- BaseRepository
- SmartFinance Testing
- account.schema.ts
- .importHouseholdBackup
- shared/theme/colors.ts
- .storybook/index.ts
- send-household-invitation/index.ts
- run-local-contract-tests.mjs
- vercel.json
- metro.config.js
- useAuthContext.ts
- mocks/supabase.ts
- eslint.config.js
- FeatureFlagProvider.tsx
- localStorageService.ts
- shared/theme/shadows.ts
- authUiStore.ts
- query-client.tsx
- nativewind-env.d.ts
- (protected)/index.tsx
- AttachmentsRepository
- core/index.ts
- shared/theme/radius.ts
- shared/theme/typography.ts
- shared/theme/untitled-theme.ts
- src/theme/untitled-theme.ts
- dependencies
- web-smoke.spec.ts
- tsconfig.test.json
- serve-dist.mjs
- Expo HAS CHANGED
- buildCleanBackup
- ProfilesRepository
- AccountsService
- SavingPotsService
- global.d.ts
- TransactionAutomationRepository
- dispatch-notification/index.ts
- Phase 2 — Importing, reconciliation, and recurring money
- public-overview-screen.web.tsx
- SmartFinance product roadmap
- Phase 8 — Smart assistance and data ownership
- feedback/index.ts
- spacing
- entry-screen.tsx
- Findings
- Phase 3 — Advanced budgeting
- transactions.tsx
- Phase 1 — Transaction automation and reporting
- Privacy readiness implementation backlog
- AccountsRepository
- expo-application
- expo-auth-session
- expo-dev-client
- HouseholdBackupService
- expo-device
- transaction-list.ts
- expo-document-picker
- expo-font
- Database
- expo-image
- expo-linear-gradient
- expo-linking
- expo-localization
- expo-notifications
- expo-router
- expo-splash-screen
- NotificationsService
- expo-symbols
- expo-system-ui
- @expo/ui
- @expo/vector-icons
- expo-web-browser
- Phase 4 — Net worth and debt management
- i18next
- @internationalized/date
- nativewind
- prettier
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
- useCreateTransfer.ts
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
- SmartFinance privacy and data inventory
- Privacy legal and business inputs
- Phase 7 — Investments and long-term planning
- run-security-check.mjs
- expo-constants
- expo-crypto
- expo-glass-effect
- SmartFinance processor and recipient register
- react-hook-form
- @storybook/addon-ondevice-actions
- zustand
- @vercel/speed-insights

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 130 edges
2. `RepoResult` - 91 edges
3. `useAuth()` - 84 edges
4. `spacing()` - 75 edges
5. `invalidateHouseholdData()` - 59 edges
6. `Database` - 43 edges
7. `BudgetScreen()` - 38 edges
8. `useResponsiveMetrics()` - 36 edges
9. `typography` - 35 edges
10. `radius` - 29 edges

## Surprising Connections (you probably didn't know these)
- `BudgetScreen()` --indirect_call--> `run()`  [INFERRED]
  src/app/(protected)/budget.tsx → test/security/run-security-check.mjs
- `AccountsScreen()` --indirect_call--> `account()`  [INFERRED]
  src/app/(protected)/accounts.tsx → src/features/monthly-budget/services/monthly-budget.service.unit.test.ts
- `AdminFeedbackScreen()` --calls--> `useUpdateFeedback`  [EXTRACTED]
  src/app/(protected)/admin-feedback.tsx → src/features/feedback/index.ts
- `BudgetScreen()` --indirect_call--> `account()`  [INFERRED]
  src/app/(protected)/budget.tsx → src/features/monthly-budget/services/monthly-budget.service.unit.test.ts
- `BudgetScreen()` --indirect_call--> `rule()`  [INFERRED]
  src/app/(protected)/budget.tsx → src/features/monthly-budget/services/monthly-budget.service.unit.test.ts

## Import Cycles
- None detected.

## Communities (181 total, 78 thin omitted)

### Community 0 - "monthly-budget.service.ts"
Cohesion: 0.08
Nodes (31): Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, getCashAccountIds(), getExcludedMonths(), getMemberLabel() (+23 more)

### Community 2 - "RootProvider.tsx"
Cohesion: 0.18
Nodes (8): ModalContext, ModalContextValue, ModalProvider(), QueryProvider(), Toast, ToastContext, ToastContextValue, ToastProvider()

### Community 3 - "useTheme"
Cohesion: 0.09
Nodes (25): AuthLayout(), AdminEmpty(), AdminFeedbackItem, AssignmentFilter, DetailBlock(), FeedbackKind, FeedbackPriority, FeedbackStatus (+17 more)

### Community 4 - "RepoResult"
Cohesion: 0.08
Nodes (4): RepoResult, CategoriesRepository, HouseholdsRepository, MonthlyBudgetRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (37): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+29 more)

### Community 6 - "build-financial-insights.ts"
Cohesion: 0.09
Nodes (40): projectAccountBalances(), buildFinancialInsights(), BuildFinancialInsightsInput, addRecurrence(), formatCalendarDate(), listRuleOccurrences(), parseCalendarDate(), buildBillCalendar() (+32 more)

### Community 7 - "grouped-account-select.tsx"
Cohesion: 0.15
Nodes (23): AccountsScreen(), createStyles(), InsightsScreen(), localDate(), AccountLike, getAccountLabel(), getAccountSubtitle(), getMemberLabel() (+15 more)

### Community 8 - "AuthProvider.tsx"
Cohesion: 0.07
Nodes (28): shouldRefreshClaimsForAuthEvent(), ShouldRefreshClaimsInput, LoginCallbackScreen(), styles, buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo() (+20 more)

### Community 9 - "app-tabs.web.tsx"
Cohesion: 0.08
Nodes (29): plugins, expo-image, expo-localization, expo-status-bar, expo-web-browser, AnimatedIcon(), glowKeyframe, keyframe (+21 more)

### Community 10 - "NotificationsProvider.tsx"
Cohesion: 0.24
Nodes (8): useNotifications(), AppNotification, registerWebPushDevice(), mockRegisterWebPushSubscription, urlBase64ToUint8Array(), WebPushRegistrationResult, NotificationsProvider(), useToast()

### Community 11 - "expo"
Cohesion: 0.06
Nodes (35): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+27 more)

### Community 12 - "saving-pot-forecast.service.ts"
Cohesion: 0.12
Nodes (32): addMonths(), addOccurrence(), buildForecastTimeline(), buildSavingPotForecasts(), findCompletionDate(), ForecastContribution, ForecastFrequency, ForecastPot (+24 more)

### Community 13 - "settings.tsx"
Cohesion: 0.10
Nodes (34): CategoryEditDraft, categoryIconSuggestions, CategoryLike, types, EmptyState(), FeedbackFrequency, FeedbackItem, FeedbackKind (+26 more)

### Community 15 - "transfers.tsx"
Cohesion: 0.11
Nodes (25): TransactionsScreen(), DatePickerField(), emptyDraft(), formatDateInput(), frequencies, Frequency, months, MovementDraft (+17 more)

### Community 16 - "src/theme/ThemeProvider.tsx"
Cohesion: 0.07
Nodes (31): expo-router, samples, FinanceMetricCard(), FinanceMetricCardProps, FinanceMetricTone, getToneColors(), styles, FinanceProgressBar() (+23 more)

### Community 17 - "invalidateHouseholdData"
Cohesion: 0.15
Nodes (13): useArchiveAccount(), useCreateAccount(), useDeleteAccount(), useUpdateAccount(), useLeaveHousehold(), useRemoveHouseholdMember(), useTransferHouseholdOwnership(), useCreateTransaction() (+5 more)

### Community 18 - "useAuth"
Cohesion: 0.28
Nodes (10): useAccounts(), MemberProfile, useHouseholdMembers(), useMonthlyBudgetWorkspace(), useRecurringTransactions(), useSavingPotForecasts(), useSavingPotAccountAssignments(), useSavingPotBalances() (+2 more)

### Community 19 - "categories/hooks/index.ts"
Cohesion: 0.15
Nodes (12): CategoriesScreen(), getTypeColor(), getTypeIcon(), useArchiveCategory(), useCategories(), useChildCategories(), useCreateCategory(), useDeleteCategory() (+4 more)

### Community 20 - "diagnostics.tsx"
Cohesion: 0.13
Nodes (18): DiagnosticItem, DiagnosticRow(), DiagnosticsScreen(), DiagnosticStatus, maskSecret(), styles, NotificationCenter(), styles (+10 more)

### Community 21 - "budget.tsx"
Cohesion: 0.13
Nodes (31): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), formatMonthSelection(), getMemberAccentColor(), getMemberLabel(), getRuleRowKey() (+23 more)

### Community 22 - "TransactionImportRepository"
Cohesion: 0.31
Nodes (3): Client, table(), TransactionImportRepository

### Community 23 - "savings.tsx"
Cohesion: 0.17
Nodes (18): AccountGroup, AccountGroupView, AccountOption, buildAccountGroups(), buildForecastYearRows(), buildSelectionMap(), createStyles(), ForecastViewMode (+10 more)

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

### Community 34 - "accounts.service.ts"
Cohesion: 0.22
Nodes (8): AccountIdInput, CreateAccountInput, UpdateAccountInput, Account, CreateAccountDTO, NewAccount, UpdateAccount, UpdateAccountDTO

### Community 35 - "ProfileOnboardingProvider.tsx"
Cohesion: 0.10
Nodes (32): GuideModal(), GuideModalProps, styles, getOnboardingGuide(), onboardingGuides, emptyProgress(), OnboardingContext, OnboardingContextValue (+24 more)

### Community 36 - "HouseholdsService"
Cohesion: 0.08
Nodes (12): SettingsScreen(), useCreateHousehold(), useDefaultHousehold(), useSetDefaultHousehold(), useDeleteHousehold(), useUpdateHousehold(), CreateInvitationInput, createInviteLinks() (+4 more)

### Community 37 - "exclude"
Cohesion: 0.09
Nodes (22): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, test, **/*.ts, **/*.tsx (+14 more)

### Community 38 - "catalog.ts"
Cohesion: 0.11
Nodes (33): CatalogRow, firstString(), highlightText(), isPublished(), listPublishedReleases(), normalizePublishedRelease(), parseHighlights(), releaseQueryKeys (+25 more)

### Community 39 - "client.ts"
Cohesion: 0.08
Nodes (23): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, MonthlyBudgetRun, MonthlyBudgetRunInsert (+15 more)

### Community 40 - "requireIdFor"
Cohesion: 0.26
Nodes (15): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts() (+7 more)

### Community 41 - "transaction.service.ts"
Cohesion: 0.08
Nodes (27): ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName(), TransactionAttachmentInput, TransactionsService (+19 more)

### Community 42 - "useHouseholdBackup.ts"
Cohesion: 0.20
Nodes (6): backup, mockedBackupService, mockedUseAuth, useExportHouseholdBackup(), useImportHouseholdBackup(), HouseholdBackupFile

### Community 43 - "Welcome to your Expo app 👋"
Cohesion: 0.29
Nodes (6): Get a fresh project, Get started, Join the community, Learn more, Other setup steps, Welcome to your Expo app 👋

### Community 44 - "recurring.transactions.repository.ts"
Cohesion: 0.14
Nodes (5): RecurringRunExecution, RecurringTransaction, RecurringTransactionsRepository, RecurringTransactionWithRelations, QueryResult

### Community 45 - "date-picker-field.tsx"
Cohesion: 0.33
Nodes (9): addMonths(), DateGranularity, DatePickerField(), DatePickerFieldProps, formatDateValue(), formatDisplayValue(), isSameDay(), MonthPickerField() (+1 more)

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "MembersScreen"
Cohesion: 0.27
Nodes (10): getToken(), InviteScreen(), MembersScreen(), HouseholdRole, useAcceptHouseholdInvitation(), useCreateHouseholdInvitation(), useDeclineHouseholdInvitation(), useHouseholdInvitations() (+2 more)

### Community 48 - "RecurringTransactionsService"
Cohesion: 0.15
Nodes (4): GoogleLoginScreen(), SignOutButton(), RecurringTransactionsService, AuthService

### Community 49 - "BaseRepository"
Cohesion: 0.12
Nodes (5): BaseRepository, createClient(), createQuery(), QueryResult, SavingPotsRepository

### Community 50 - "SmartFinance Testing"
Cohesion: 0.33
Nodes (5): Fast Local Checks, Local Supabase Contract Check, Production Release Checklist, Release-Only Web Smoke, SmartFinance Testing

### Community 51 - "account.schema.ts"
Cohesion: 0.50
Nodes (3): AccountFormInput, AccountFormValues, accountSchema

### Community 52 - ".importHouseholdBackup"
Cohesion: 0.36
Nodes (8): buildIncomeInputInserts(), getCurrentProfile(), getMemberFallbackMap(), insertMany(), newId(), newIdMap(), normalizeEmail(), throwIfError()

### Community 53 - "shared/theme/colors.ts"
Cohesion: 0.40
Nodes (4): blueColors, darkColors, lightColors, ThemeColors

### Community 55 - "send-household-invitation/index.ts"
Cohesion: 0.23
Nodes (10): baseCorsHeaders, EmailLogInsert, extractInviteTokenFromLink(), getAllowedOrigins(), getCorsHeaders(), HouseholdRole, InvitePayload, normalizeHttpOrigin() (+2 more)

### Community 56 - "run-local-contract-tests.mjs"
Cohesion: 0.17
Nodes (6): hasCrossHouseholdSeed, householdScopedTables, localUrls, privateTables, reachabilityChecks, supabase

### Community 57 - "vercel.json"
Cohesion: 0.18
Nodes (10): maxDuration, buildCommand, cleanUrls, crons, functions, api/cron/execute-recurring.js, headers, outputDirectory (+2 more)

### Community 58 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativewind }

### Community 60 - "mocks/supabase.ts"
Cohesion: 0.67
Nodes (3): createSupabaseMock(), createSupabaseQuery(), QueryResult

### Community 62 - "FeatureFlagProvider.tsx"
Cohesion: 0.32
Nodes (5): FeatureFlagContext, FeatureFlagContextValue, FeatureFlagProvider(), DEFAULT_FLAGS, FeatureFlagKey

### Community 68 - "(protected)/index.tsx"
Cohesion: 0.08
Nodes (40): AccountHistoryMode, currencyOptions, EditMode, AccountOverviewTable(), AllocationDonut(), AllocationKey, AllocationLegend(), AllocationSegment (+32 more)

### Community 70 - "core/index.ts"
Cohesion: 0.05
Nodes (52): NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), CookiePolicyPage(), PolicyFact(), PolicySection(), styles, VercelSpeedInsights(), mockUseCookieConsent (+44 more)

### Community 84 - "dependencies"
Cohesion: 0.13
Nodes (15): eslint-config-expo, expo, expo-status-bar, husky, dependencies, eslint-config-expo, expo, expo-status-bar (+7 more)

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
Cohesion: 0.29
Nodes (7): buildCleanBackup(), buildKeyMap(), buildTransferGroupKeyMap(), fetchPaged(), keyFor(), makeKey(), scrubJsonIds()

### Community 100 - "Phase 2 — Importing, reconciliation, and recurring money"
Cohesion: 0.25
Nodes (8): Additional file formats, CSV import wizard, Duplicate detection and reconciliation, Phase 2 completion criteria, Phase 2 — Importing, reconciliation, and recurring money, Projected balances, Recurring detection and calendar, Subscription dashboard

### Community 102 - "public-overview-screen.web.tsx"
Cohesion: 0.08
Nodes (18): LanguageMenu(), options, styles, Brand(), Cta(), featureIcons, LandingScreen(), styles (+10 more)

### Community 103 - "SmartFinance product roadmap"
Cohesion: 0.29
Nodes (6): Deferred or country-dependent services, Product principles, Research references, SmartFinance product roadmap, Status legend, Suggested next implementation sequence

### Community 105 - "Phase 8 — Smart assistance and data ownership"
Cohesion: 0.29
Nodes (7): Anomaly detection, Data portability and integrations, Explainable financial assistant, Phase 8 completion criteria, Phase 8 — Smart assistance and data ownership, Platform improvements, Receipt OCR

### Community 106 - "feedback/index.ts"
Cohesion: 0.16
Nodes (21): AdminFeedbackScreen(), FeedbackScreen(), key, useAddFeedbackReply(), useAdminFeedback(), useCreateFeedback(), useMyFeedback(), usePlatformAdminAccess() (+13 more)

### Community 107 - "spacing"
Cohesion: 0.08
Nodes (36): createStyles(), RuleMenu(), StorybookPreviewScreen(), AccountLike, DestinationSelection, getAccountLabel(), getAccountSubtitle(), getMemberLabel() (+28 more)

### Community 109 - "Findings"
Cohesion: 0.13
Nodes (14): Executive assessment, Findings, Official Supabase references reviewed, Positive controls, Required remote verification, SR-01 — No authenticated account-deletion workflow, SR-02 — Household backup is not a complete personal-data export, SR-03 — Auth/session settings are not evidenced as production-hardened (+6 more)

### Community 110 - "Phase 3 — Advanced budgeting"
Cohesion: 0.29
Nodes (7): Budget rollover, Category targets, Flexible planning periods, Phase 3 — Advanced budgeting, Phase 3 completion criteria, Safe-to-spend, Zero-based and envelope budgeting

### Community 111 - "transactions.tsx"
Cohesion: 0.15
Nodes (15): AttachmentDraft, DateFilterField(), DatePickerField(), DropdownField(), DropdownFieldProps, formatDateInputValue(), parseDateInputValue(), TransactionEditDraft (+7 more)

### Community 112 - "Phase 1 — Transaction automation and reporting"
Cohesion: 0.29
Nodes (7): Merchant normalization, Phase 1 completion criteria, Phase 1 — Transaction automation and reporting, Reports, Split transactions, Tags, flags, and bulk editing, Transaction rules

### Community 113 - "Privacy readiness implementation backlog"
Cohesion: 0.18
Nodes (10): Account deletion and erasure, Next engineering tranche, P0 — release and compliance-claim blockers, P1 — authentication and application security, P1 — data-subject rights, P1 — retention and minimization, P2 — governance and operations, Personal-data export (+2 more)

### Community 118 - "HouseholdBackupService"
Cohesion: 0.25
Nodes (4): asBackupFile(), HouseholdBackupService, safeNamePart(), Json

### Community 120 - "transaction-list.ts"
Cohesion: 0.48
Nodes (5): compareTransactions(), SortableTransaction, timestamp(), TransactionListSortKey, sortedIds()

### Community 123 - "Database"
Cohesion: 0.08
Nodes (29): CreateRecurringTransactionInput, Frequency, RuleKind, TransactionType, UpdateRecurringTransactionInput, Account, AccountBalance, Attachment (+21 more)

### Community 137 - "Phase 4 — Net worth and debt management"
Cohesion: 0.33
Nodes (6): Debt payoff planner, Liability accounts, Manual assets, Net-worth history, Phase 4 completion criteria, Phase 4 — Net worth and debt management

### Community 145 - "Phase 5 — Household collaboration"
Cohesion: 0.40
Nodes (5): Collaboration, Expense splitting and settlements, Phase 5 completion criteria, Phase 5 — Household collaboration, Privacy and permissions

### Community 155 - "Phase 6 — Multi-currency and European bank connectivity"
Cohesion: 0.40
Nodes (5): Multi-currency ledger, Phase 6 completion criteria, Phase 6 — Multi-currency and European bank connectivity, Portugal-specific improvements, PSD2/Open Banking

### Community 156 - "useCreateTransfer.ts"
Cohesion: 0.33
Nodes (3): useCreateTransfer(), CreateTransferInput, TransferService

### Community 169 - "SmartFinance privacy and data inventory"
Cohesion: 0.20
Nodes (9): Browser and device storage, Data flows, Data subjects, Evidence convention, Highest-risk gaps, Personal-data inventory, Required legal/business and production inputs, SmartFinance privacy and data inventory (+1 more)

### Community 170 - "Privacy legal and business inputs"
Cohesion: 0.20
Nodes (9): Controller identity, Data-subject rights, Privacy legal and business inputs, Processors, regions, and transfers, Product and users, Purposes and legal bases, Required approvals before publication, Retention and deletion (+1 more)

### Community 171 - "Phase 7 — Investments and long-term planning"
Cohesion: 0.50
Nodes (4): Investment tracking, Phase 7 completion criteria, Phase 7 — Investments and long-term planning, Retirement and FIRE planning

### Community 176 - "SmartFinance processor and recipient register"
Cohesion: 0.33
Nodes (5): External services, Immediate decisions, Internal recipients, SmartFinance processor and recipient register, Vendor diligence checklist

## Knowledge Gaps
- **703 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+698 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **78 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `expo-notifications`, `eslint`, `expo-router`, `expo-splash-screen`, `expo-symbols`, `expo-system-ui`, `@expo/ui`, `@expo/vector-icons`, `expo-web-browser`, `i18next`, `@internationalized/date`, `nativewind`, `prettier`, `react`, `react-aria-components`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-css`, `react-native-gesture-handler`, `react-native-get-random-values`, `react-native-mmkv`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `scripts`, `react-native-web`, `react-native-worklets`, `@react-navigation/drawer`, `@react-oauth/google`, `@storybook/addon-ondevice-controls`, `@storybook/react-native`, `@supabase/supabase-js`, `@tanstack/react-query`, `unleash-proxy-client`, `zod`, `expo-constants`, `expo-crypto`, `expo-glass-effect`, `react-hook-form`, `@storybook/addon-ondevice-actions`, `zustand`, `@vercel/speed-insights`, `expo-application`, `expo-auth-session`, `expo-dev-client`, `expo-device`, `expo-document-picker`, `expo-font`, `expo-image`, `expo-linear-gradient`, `expo-linking`, `expo-localization`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `@vercel/speed-insights` to `dependencies`, `core/index.ts`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `grouped-account-select.tsx`, `AuthProvider.tsx`, `app-tabs.web.tsx`, `settings.tsx`, `transfers.tsx`, `src/theme/ThemeProvider.tsx`, `categories/hooks/index.ts`, `diagnostics.tsx`, `budget.tsx`, `savings.tsx`, `ProfileOnboardingProvider.tsx`, `HouseholdsService`, `date-picker-field.tsx`, `MembersScreen`, `RecurringTransactionsService`, `(protected)/index.tsx`, `core/index.ts`, `public-overview-screen.web.tsx`, `feedback/index.ts`, `spacing`, `transactions.tsx`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _703 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `monthly-budget.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08205128205128205 - nodes in this community are weakly interconnected._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.0896551724137931 - nodes in this community are weakly interconnected._
- **Should `RepoResult` be split into smaller, more focused modules?**
  _Cohesion score 0.07955596669750231 - nodes in this community are weakly interconnected._