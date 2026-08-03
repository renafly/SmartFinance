# Graph Report - SmartFinance  (2026-08-03)

## Corpus Check
- 405 files · ~220,834 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2083 nodes · 4525 edges · 186 communities (110 shown, 76 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- monthly-budget.service.ts
- monthly-budget.repository.ts
- SavingsScreen
- settings.tsx
- RepoResult
- household-backup.service.ts
- build-financial-insights.ts
- transactions.tsx
- redirects.ts
- themed-text.tsx
- transactions.repository.ts
- expo
- saving-pot-forecast.service.ts
- run-local-contract-tests.mjs
- session.types.ts
- transfers.tsx
- src/theme/spacing.ts
- TransactionsService
- src/theme/ThemeProvider.tsx
- grouped-account-select.tsx
- useHouseholdBackup.ts
- budget.tsx
- insights.tsx
- categories/hooks/index.ts
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
- feedback/index.ts
- requireIdFor
- RootProvider.tsx
- FeatureFlagProvider.tsx
- SmartFinance command helper
- recurring.transactions.repository.ts
- AuthProvider.tsx
- transaction.schema.ts
- useAuth
- savings.tsx
- SavingPotsRepository
- SmartFinance Testing
- account.schema.ts
- CategoriesRepository
- shared/theme/colors.ts
- .storybook/index.ts
- send-household-invitation/index.ts
- AttachmentsRepository
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
- (protected)/index.tsx
- ToastProvider.tsx
- core/index.ts
- shared/theme/radius.ts
- shared/theme/typography.ts
- shared/theme/untitled-theme.ts
- src/theme/untitled-theme.ts
- expo-application
- web-smoke.spec.ts
- tsconfig.test.json
- serve-dist.mjs
- Expo HAS CHANGED
- buildCleanBackup
- ProfilesRepository
- admin-feedback.tsx
- expo
- global.d.ts
- TransactionAutomationRepository
- dispatch-notification/index.ts
- Phase 2 — Importing, reconciliation, and recurring money
- useTheme
- SmartFinance product roadmap
- Phase 8 — Smart assistance and data ownership
- diagnostics.tsx
- expo-status-bar
- entry-screen.tsx
- Findings
- Phase 3 — Advanced budgeting
- dependencies
- Phase 1 — Transaction automation and reporting
- Privacy readiness implementation backlog
- SavingPotsService
- husky
- expo-auth-session
- expo-dev-client
- .importHouseholdBackup
- expo-device
- transaction-create-form.ts
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
- NotificationsProvider.tsx
- expo-symbols
- react-i18next
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
- invalidateHouseholdData
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
- react-native-svg
- SmartFinance privacy and data inventory
- Privacy legal and business inputs
- Phase 7 — Investments and long-term planning
- react-native-url-polyfill
- animated-icon.web.tsx
- RecurringTransactionsService
- transaction-list.ts
- SmartFinance processor and recipient register
- client.ts
- grouped-destination-select.tsx
- public-overview-screen.web.tsx
- BaseRepository
- adaptiveIcon
- app-tabs.web.tsx
- extra
- ios
- expo-system-ui

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 140 edges
2. `RepoResult` - 97 edges
3. `useAuth()` - 88 edges
4. `spacing()` - 80 edges
5. `invalidateHouseholdData()` - 64 edges
6. `Database` - 43 edges
7. `BudgetScreen()` - 40 edges
8. `useResponsiveMetrics()` - 36 edges
9. `typography` - 36 edges
10. `formatCurrency()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `BudgetScreen()` --indirect_call--> `run()`  [INFERRED]
  src/app/(protected)/budget.tsx → test/security/run-security-check.mjs
- `AccountsScreen()` --indirect_call--> `account()`  [INFERRED]
  src/app/(protected)/accounts.tsx → src/features/monthly-budget/services/monthly-budget.service.unit.test.ts
- `FilterRow()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(protected)/admin-feedback.tsx → src/theme/ThemeProvider.tsx
- `InboxRow()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(protected)/admin-feedback.tsx → src/theme/ThemeProvider.tsx
- `DetailBlock()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(protected)/admin-feedback.tsx → src/theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Communities (186 total, 76 thin omitted)

### Community 0 - "monthly-budget.service.ts"
Cohesion: 0.08
Nodes (32): buildAccountGroups(), Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, getCashAccountIds(), getExcludedMonths() (+24 more)

### Community 1 - "monthly-budget.repository.ts"
Cohesion: 0.14
Nodes (12): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, MonthlyBudgetRun, MonthlyBudgetRunInsert (+4 more)

### Community 2 - "SavingsScreen"
Cohesion: 0.24
Nodes (15): AccountsScreen(), buildForecastYearRows(), buildSelectionMap(), formatForecastMonth(), getAccountSummary(), SavingsScreen(), useMonthlyBudgetWorkspace(), useCreateSavingPot() (+7 more)

### Community 3 - "settings.tsx"
Cohesion: 0.08
Nodes (41): getToken(), InviteScreen(), CategoryEditDraft, categoryIconSuggestions, CategoryLike, types, EmptyState(), FeedbackFrequency (+33 more)

### Community 4 - "RepoResult"
Cohesion: 0.07
Nodes (4): RepoResult, HouseholdsRepository, MonthlyBudgetRepository, TransactionsRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (37): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+29 more)

### Community 6 - "build-financial-insights.ts"
Cohesion: 0.07
Nodes (51): dateRange(), InsightsScreen(), localDate(), projectAccountBalances(), buildFinancialInsights(), BuildFinancialInsightsInput, addRecurrence(), formatCalendarDate() (+43 more)

### Community 7 - "transactions.tsx"
Cohesion: 0.09
Nodes (36): AccountHistoryMode, createStyles(), currencyOptions, EditMode, AttachmentDraft, createStyles(), DateFilterField(), DatePickerField() (+28 more)

### Community 8 - "redirects.ts"
Cohesion: 0.22
Nodes (11): buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo(), storePendingRedirectTo(), Guest(), mockUseAuth (+3 more)

### Community 9 - "themed-text.tsx"
Cohesion: 0.18
Nodes (15): HintRowProps, styles, styles, ThemedText(), ThemedTextProps, ThemedView(), ThemedViewProps, Collapsible() (+7 more)

### Community 10 - "transactions.repository.ts"
Cohesion: 0.06
Nodes (32): ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName(), TransactionAttachmentInput, createdTransaction (+24 more)

### Community 11 - "expo"
Cohesion: 0.13
Nodes (14): reactCompiler, typedRoutes, expo, experiments, icon, name, orientation, scheme (+6 more)

### Community 12 - "saving-pot-forecast.service.ts"
Cohesion: 0.12
Nodes (32): addMonths(), addOccurrence(), buildForecastTimeline(), buildSavingPotForecasts(), findCompletionDate(), ForecastContribution, ForecastFrequency, ForecastPot (+24 more)

### Community 13 - "run-local-contract-tests.mjs"
Cohesion: 0.11
Nodes (9): Client, table(), TransactionImportRepository, hasCrossHouseholdSeed, householdScopedTables, localUrls, privateTables, reachabilityChecks (+1 more)

### Community 14 - "session.types.ts"
Cohesion: 0.23
Nodes (7): SessionRepository, SessionService, Claims, HouseholdMember, SessionState, mockLoadProfileAndHousehold, useSession()

### Community 15 - "transfers.tsx"
Cohesion: 0.11
Nodes (23): DatePickerField(), emptyDraft(), formatDateInput(), frequencies, Frequency, months, MovementDraft, MovementFields() (+15 more)

### Community 16 - "src/theme/spacing.ts"
Cohesion: 0.11
Nodes (24): samples, StorybookPreviewScreen(), FinanceMetricCard(), FinanceMetricCardProps, FinanceMetricTone, getToneColors(), styles, FinanceProgressBar() (+16 more)

### Community 17 - "TransactionsService"
Cohesion: 0.16
Nodes (5): useTransactions(), useTransactionsInfinite(), TransactionsService, TransactionFilters, TransactionMovementFilters

### Community 18 - "src/theme/ThemeProvider.tsx"
Cohesion: 0.09
Nodes (20): addMonths(), DateGranularity, DatePickerField(), DatePickerFieldProps, formatDateValue(), formatDisplayValue(), isSameDay(), parseDateValue() (+12 more)

### Community 19 - "grouped-account-select.tsx"
Cohesion: 0.21
Nodes (17): AccountLike, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedAccountSelect(), GroupedAccountSelectProps, MemberLike (+9 more)

### Community 20 - "useHouseholdBackup.ts"
Cohesion: 0.13
Nodes (8): backup, mockedBackupService, mockedUseAuth, useImportHouseholdBackup(), asBackupFile(), HouseholdBackupFile, HouseholdBackupService, safeNamePart()

### Community 21 - "budget.tsx"
Cohesion: 0.10
Nodes (36): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), formatMonthSelection(), getMemberAccentColor(), getMemberLabel(), getRuleRowKey() (+28 more)

### Community 22 - "insights.tsx"
Cohesion: 0.26
Nodes (9): RangePreset, CashFlowChart(), CategoryChartItem, ChartLabels(), Legend(), monthLabel(), SavingsRateChart(), useChartWidth() (+1 more)

### Community 23 - "categories/hooks/index.ts"
Cohesion: 0.13
Nodes (13): CategoriesScreen(), getTypeColor(), getTypeIcon(), useArchiveCategory(), useCategories(), useChildCategories(), useTopLevelCategories(), useCreateCategory() (+5 more)

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
Cohesion: 0.09
Nodes (12): useArchiveAccount(), useCreateAccount(), useDeleteAccount(), AccountIdInput, AccountsService, CreateAccountInput, UpdateAccountInput, Account (+4 more)

### Community 35 - "ProfileOnboardingProvider.tsx"
Cohesion: 0.10
Nodes (32): GuideModal(), GuideModalProps, styles, getOnboardingGuide(), onboardingGuides, emptyProgress(), OnboardingContext, OnboardingContextValue (+24 more)

### Community 37 - "exclude"
Cohesion: 0.09
Nodes (22): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, test, **/*.ts, **/*.tsx (+14 more)

### Community 38 - "catalog.ts"
Cohesion: 0.11
Nodes (33): CatalogRow, firstString(), highlightText(), isPublished(), listPublishedReleases(), normalizePublishedRelease(), parseHighlights(), releaseQueryKeys (+25 more)

### Community 39 - "feedback/index.ts"
Cohesion: 0.18
Nodes (18): FeedbackScreen(), key, useAddFeedbackReply(), useCreateFeedback(), useMyFeedback(), useUpdateAdminFeedback(), useWithdrawFeedback(), addFeedbackReply() (+10 more)

### Community 40 - "requireIdFor"
Cohesion: 0.26
Nodes (15): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts() (+7 more)

### Community 41 - "RootProvider.tsx"
Cohesion: 0.13
Nodes (10): @vercel/speed-insights, NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), ModalContext, ModalContextValue, ModalProvider(), QueryProvider() (+2 more)

### Community 42 - "FeatureFlagProvider.tsx"
Cohesion: 0.32
Nodes (5): FeatureFlagContext, FeatureFlagContextValue, FeatureFlagProvider(), DEFAULT_FLAGS, FeatureFlagKey

### Community 43 - "SmartFinance command helper"
Cohesion: 0.10
Nodes (19): Builds, Common troubleshooting, Daily development, Database migrations, Deploy migrations to hosted Supabase, First-time setup, Graphify and Git checks, Packages (+11 more)

### Community 44 - "recurring.transactions.repository.ts"
Cohesion: 0.14
Nodes (5): RecurringRunExecution, RecurringTransaction, RecurringTransactionsRepository, RecurringTransactionWithRelations, QueryResult

### Community 45 - "AuthProvider.tsx"
Cohesion: 0.22
Nodes (8): shouldRefreshClaimsForAuthEvent(), ShouldRefreshClaimsInput, AuthContext, AuthContextValue, AuthProvider(), completeNativeAuthCallback(), isNativeAuthCallback(), UserProfile

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "useAuth"
Cohesion: 0.20
Nodes (14): MembersScreen(), useAccounts(), useAccountsWithBalances(), HouseholdRole, useAcceptHouseholdInvitation(), useCreateHouseholdInvitation(), useDeclineHouseholdInvitation(), useHouseholdInvitations() (+6 more)

### Community 48 - "savings.tsx"
Cohesion: 0.09
Nodes (23): AccountGroup, AccountGroupView, AccountOption, createStyles(), ForecastViewMode, ForecastYearRow, PotDraft, SelectionMode (+15 more)

### Community 50 - "SmartFinance Testing"
Cohesion: 0.33
Nodes (5): Fast Local Checks, Local Supabase Contract Check, Production Release Checklist, Release-Only Web Smoke, SmartFinance Testing

### Community 51 - "account.schema.ts"
Cohesion: 0.50
Nodes (3): AccountFormInput, AccountFormValues, accountSchema

### Community 53 - "shared/theme/colors.ts"
Cohesion: 0.40
Nodes (4): blueColors, darkColors, lightColors, ThemeColors

### Community 55 - "send-household-invitation/index.ts"
Cohesion: 0.23
Nodes (10): baseCorsHeaders, EmailLogInsert, extractInviteTokenFromLink(), getAllowedOrigins(), getCorsHeaders(), HouseholdRole, InvitePayload, normalizeHttpOrigin() (+2 more)

### Community 57 - "vercel.json"
Cohesion: 0.18
Nodes (10): maxDuration, buildCommand, cleanUrls, crons, functions, api/cron/execute-recurring.js, headers, outputDirectory (+2 more)

### Community 58 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativewind }

### Community 60 - "mocks/supabase.ts"
Cohesion: 0.67
Nodes (3): createSupabaseMock(), createSupabaseQuery(), QueryResult

### Community 68 - "(protected)/index.tsx"
Cohesion: 0.14
Nodes (23): AccountOverviewTable(), AllocationDonut(), AllocationKey, AllocationLegend(), AllocationSegment, DashboardAccount, DashboardPot, DashboardScreen() (+15 more)

### Community 69 - "ToastProvider.tsx"
Cohesion: 0.40
Nodes (4): Toast, ToastContext, ToastContextValue, ToastProvider()

### Community 70 - "core/index.ts"
Cohesion: 0.06
Nodes (52): CookiePolicyPage(), PolicyFact(), PolicySection(), styles, mockUseCookieConsent, VercelSpeedInsights(), resources, ActionButton() (+44 more)

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

### Community 92 - "admin-feedback.tsx"
Cohesion: 0.14
Nodes (15): AdminEmpty(), AdminFeedbackItem, AdminFeedbackScreen(), AssignmentFilter, DetailBlock(), FeedbackKind, FeedbackPriority, FeedbackStatus (+7 more)

### Community 100 - "Phase 2 — Importing, reconciliation, and recurring money"
Cohesion: 0.25
Nodes (8): Additional file formats, CSV import wizard, Duplicate detection and reconciliation, Phase 2 completion criteria, Phase 2 — Importing, reconciliation, and recurring money, Projected balances, Recurring detection and calendar, Subscription dashboard

### Community 102 - "useTheme"
Cohesion: 0.08
Nodes (23): expo-router, AuthLayout(), PublicLayout(), AnimatedIcon(), AnimatedSplashOverlay(), glowKeyframe, keyframe, logoKeyframe (+15 more)

### Community 103 - "SmartFinance product roadmap"
Cohesion: 0.29
Nodes (6): Deferred or country-dependent services, Product principles, Research references, SmartFinance product roadmap, Status legend, Suggested next implementation sequence

### Community 105 - "Phase 8 — Smart assistance and data ownership"
Cohesion: 0.29
Nodes (7): Anomaly detection, Data portability and integrations, Explainable financial assistant, Phase 8 completion criteria, Phase 8 — Smart assistance and data ownership, Platform improvements, Receipt OCR

### Community 106 - "diagnostics.tsx"
Cohesion: 0.15
Nodes (16): DiagnosticItem, DiagnosticRow(), DiagnosticsScreen(), DiagnosticStatus, maskSecret(), styles, DrawerContent(), getGuideKeyForPathname() (+8 more)

### Community 109 - "Findings"
Cohesion: 0.13
Nodes (14): Executive assessment, Findings, Official Supabase references reviewed, Positive controls, Required remote verification, SR-01 — No authenticated account-deletion workflow, SR-02 — Household backup is not a complete personal-data export, SR-03 — Auth/session settings are not evidenced as production-hardened (+6 more)

### Community 110 - "Phase 3 — Advanced budgeting"
Cohesion: 0.29
Nodes (7): Budget rollover, Category targets, Flexible planning periods, Phase 3 — Advanced budgeting, Phase 3 completion criteria, Safe-to-spend, Zero-based and envelope budgeting

### Community 111 - "dependencies"
Cohesion: 0.13
Nodes (15): eslint, expo-constants, expo-crypto, expo-glass-effect, dependencies, eslint, expo-constants, expo-crypto (+7 more)

### Community 112 - "Phase 1 — Transaction automation and reporting"
Cohesion: 0.29
Nodes (7): Merchant normalization, Phase 1 completion criteria, Phase 1 — Transaction automation and reporting, Reports, Split transactions, Tags, flags, and bulk editing, Transaction rules

### Community 113 - "Privacy readiness implementation backlog"
Cohesion: 0.18
Nodes (10): Account deletion and erasure, Next engineering tranche, P0 — release and compliance-claim blockers, P1 — authentication and application security, P1 — data-subject rights, P1 — retention and minimization, P2 — governance and operations, Personal-data export (+2 more)

### Community 118 - ".importHouseholdBackup"
Cohesion: 0.36
Nodes (8): buildIncomeInputInserts(), getCurrentProfile(), getMemberFallbackMap(), insertMany(), newId(), newIdMap(), normalizeEmail(), throwIfError()

### Community 120 - "transaction-create-form.ts"
Cohesion: 0.48
Nodes (5): getAddAnotherTransactionReset(), getFreshTransactionCreateReset(), getLocalCalendarDate(), TransactionCreateContext, TransactionCreateReset

### Community 123 - "Database"
Cohesion: 0.07
Nodes (31): CreateInvitationInput, createInviteLinks(), HouseholdRole, InvitationDetails, normalizeInviteWebBase(), CreateRecurringTransactionInput, Frequency, RuleKind (+23 more)

### Community 131 - "NotificationsProvider.tsx"
Cohesion: 0.15
Nodes (8): useNotifications(), NotificationsService, registerWebPushDevice(), mockRegisterWebPushSubscription, urlBase64ToUint8Array(), WebPushRegistrationResult, NotificationsProvider(), useToast()

### Community 137 - "Phase 4 — Net worth and debt management"
Cohesion: 0.33
Nodes (6): Debt payoff planner, Liability accounts, Manual assets, Net-worth history, Phase 4 completion criteria, Phase 4 — Net worth and debt management

### Community 145 - "Phase 5 — Household collaboration"
Cohesion: 0.40
Nodes (5): Collaboration, Expense splitting and settlements, Phase 5 completion criteria, Phase 5 — Household collaboration, Privacy and permissions

### Community 155 - "Phase 6 — Multi-currency and European bank connectivity"
Cohesion: 0.40
Nodes (5): Multi-currency ledger, Phase 6 completion criteria, Phase 6 — Multi-currency and European bank connectivity, Portugal-specific improvements, PSD2/Open Banking

### Community 156 - "invalidateHouseholdData"
Cohesion: 0.11
Nodes (20): TransactionsScreen(), formatDate(), useUpdateAccount(), useCreateHousehold(), useSetDefaultHousehold(), useDeleteHousehold(), useUpdateHousehold(), useLeaveHousehold() (+12 more)

### Community 169 - "SmartFinance privacy and data inventory"
Cohesion: 0.20
Nodes (9): Browser and device storage, Data flows, Data subjects, Evidence convention, Highest-risk gaps, Personal-data inventory, Required legal/business and production inputs, SmartFinance privacy and data inventory (+1 more)

### Community 170 - "Privacy legal and business inputs"
Cohesion: 0.20
Nodes (9): Controller identity, Data-subject rights, Privacy legal and business inputs, Processors, regions, and transfers, Product and users, Purposes and legal bases, Required approvals before publication, Retention and deletion (+1 more)

### Community 171 - "Phase 7 — Investments and long-term planning"
Cohesion: 0.50
Nodes (4): Investment tracking, Phase 7 completion criteria, Phase 7 — Investments and long-term planning, Retirement and FIRE planning

### Community 173 - "animated-icon.web.tsx"
Cohesion: 0.18
Nodes (9): plugins, expo-image, expo-localization, expo-status-bar, AnimatedIcon(), glowKeyframe, keyframe, logoKeyframe (+1 more)

### Community 175 - "transaction-list.ts"
Cohesion: 0.48
Nodes (5): compareTransactions(), SortableTransaction, timestamp(), TransactionListSortKey, sortedIds()

### Community 176 - "SmartFinance processor and recipient register"
Cohesion: 0.33
Nodes (5): External services, Immediate decisions, Internal recipients, SmartFinance processor and recipient register, Vendor diligence checklist

### Community 177 - "client.ts"
Cohesion: 0.10
Nodes (16): SignOutButton(), AppNotification, MerchantAliasInsert, Rule, RuleInsert, SplitInsert, TagInsert, TransactionUpdate (+8 more)

### Community 178 - "grouped-destination-select.tsx"
Cohesion: 0.27
Nodes (10): AccountLike, DestinationSelection, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedDestinationSelect(), GroupedDestinationSelectProps (+2 more)

### Community 179 - "public-overview-screen.web.tsx"
Cohesion: 0.14
Nodes (8): PublicOverviewScreen(), PublicPageKey, Brand(), Header(), navItems, pageIcons, PublicOverviewScreen(), styles

### Community 180 - "BaseRepository"
Cohesion: 0.10
Nodes (7): Account, AccountBalance, AccountsRepository, BaseRepository, createClient(), createQuery(), QueryResult

### Community 181 - "adaptiveIcon"
Cohesion: 0.22
Nodes (9): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+1 more)

### Community 182 - "app-tabs.web.tsx"
Cohesion: 0.25
Nodes (5): expo-web-browser, CustomTabList(), styles, ExternalLink(), Props

### Community 183 - "extra"
Cohesion: 0.25
Nodes (8): projectId, extra, eas, release, router, build, channel, commit

### Community 184 - "ios"
Cohesion: 0.50
Nodes (4): ios, buildNumber, bundleIdentifier, icon

## Knowledge Gaps
- **721 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+716 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **76 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `expo-notifications`, `expo-router`, `expo-splash-screen`, `expo-symbols`, `react-i18next`, `@expo/ui`, `@expo/vector-icons`, `expo-web-browser`, `i18next`, `@internationalized/date`, `nativewind`, `prettier`, `react`, `react-aria-components`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-css`, `react-native-gesture-handler`, `react-native-get-random-values`, `react-native-mmkv`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `scripts`, `react-native-web`, `react-native-worklets`, `@react-navigation/drawer`, `@react-oauth/google`, `@storybook/addon-ondevice-controls`, `@storybook/react-native`, `@supabase/supabase-js`, `@tanstack/react-query`, `unleash-proxy-client`, `zod`, `react-native-svg`, `RootProvider.tsx`, `react-native-url-polyfill`, `expo-system-ui`, `eslint-config-expo`, `expo-application`, `expo`, `expo-status-bar`, `husky`, `expo-auth-session`, `expo-dev-client`, `expo-device`, `expo-document-picker`, `expo-font`, `expo-image`, `expo-linear-gradient`, `expo-linking`, `expo-localization`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `RootProvider.tsx` to `dependencies`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `SavingsScreen`, `settings.tsx`, `build-financial-insights.ts`, `transactions.tsx`, `themed-text.tsx`, `transfers.tsx`, `src/theme/spacing.ts`, `src/theme/ThemeProvider.tsx`, `grouped-account-select.tsx`, `budget.tsx`, `insights.tsx`, `categories/hooks/index.ts`, `invalidateHouseholdData`, `ProfileOnboardingProvider.tsx`, `feedback/index.ts`, `RootProvider.tsx`, `animated-icon.web.tsx`, `useAuth`, `savings.tsx`, `grouped-destination-select.tsx`, `public-overview-screen.web.tsx`, `app-tabs.web.tsx`, `(protected)/index.tsx`, `core/index.ts`, `admin-feedback.tsx`, `diagnostics.tsx`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _721 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `monthly-budget.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07549361207897794 - nodes in this community are weakly interconnected._
- **Should `monthly-budget.repository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `settings.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07738095238095238 - nodes in this community are weakly interconnected._