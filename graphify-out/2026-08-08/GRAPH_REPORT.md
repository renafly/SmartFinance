# Graph Report - SmartFinance  (2026-08-08)

## Corpus Check
- 461 files · ~255,951 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2341 nodes · 5405 edges · 193 communities (115 shown, 78 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ddf59cab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- monthly-budget.service.ts
- (protected)/index.tsx
- AccountsScreen
- NotificationsProvider.tsx
- RepoResult
- household-backup.service.ts
- category-suggestions/index.ts
- public-overview-screen.web.tsx
- login-callback-screen.tsx
- app-tabs.web.tsx
- DashboardScreen
- expo
- saving-pot-forecast.service.ts
- CategoriesService
- session.types.ts
- budget-rule-card.tsx
- typography.ts
- run-local-contract-tests.mjs
- ThemeProvider.tsx
- explorer-data.ts
- Database
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
- useTheme
- ProfileOnboardingProvider.tsx
- HouseholdsService
- exclude
- catalog.ts
- feedback/index.ts
- requireIdFor
- recurring-transactions.service.ts
- grouped-account-select.tsx
- SmartFinance command helper
- recurring.transactions.repository.ts
- transfers.tsx
- transaction.schema.ts
- migrated-page.tsx
- eslint
- categories.tsx
- SmartFinance Testing
- account.schema.ts
- repositories/index.ts
- TransactionsRepository
- .storybook/index.ts
- send-household-invitation/index.ts
- dependencies
- vercel.json
- metro.config.js
- useAuthContext.ts
- mocks/supabase.ts
- eslint.config.js
- savings.tsx
- localStorageService.ts
- devDependencies
- authUiStore.ts
- query-client.tsx
- nativewind-env.d.ts
- useHouseholdBackup.integration.test.tsx
- .importHouseholdBackup
- core/index.ts
- eslint-config-expo
- client.ts
- MonthlyBudgetService
- RootProvider.tsx
- formatCurrency
- AuthProvider.tsx
- web-smoke.spec.ts
- tsconfig.test.json
- serve-dist.mjs
- Expo HAS CHANGED
- buildCleanBackup
- profiles.repository.ts
- entry-screen.tsx
- global.d.ts
- transaction-automation.repository.ts
- dispatch-notification/index.ts
- Phase 2 — Importing, reconciliation, and recurring money
- SmartFinance product roadmap
- Phase 8 — Smart assistance and data ownership
- accounts.service.ts
- expo-application
- transactions.repository.ts
- Findings
- Phase 3 — Advanced budgeting
- expo-localization
- Phase 1 — Transaction automation and reporting
- Privacy readiness implementation backlog
- expo-linking
- transaction-import.repository.ts
- expo-auth-session
- expo-dev-client
- transaction.service.ts
- expo-device
- transaction-amount.ts
- expo-font
- saving-pots.repository.ts
- expo-image
- expo-linear-gradient
- transaction-create-form.ts
- member-income-input-card.tsx
- FeatureFlagProvider.tsx
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
- spacing
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
- package.json
- run-security-check.mjs
- SmartFinance processor and recipient register
- database.types.ts
- expo-constants
- expo-crypto
- expo-file-system
- expo-glass-effect
- expo-router
- jest-expo
- expo-status-bar
- react-hook-form
- husky
- expo-system-ui
- @react-three/drei
- react-native-svg
- @react-three/fiber
- @storybook/addon-ondevice-actions
- three
- @playwright/test
- postcss
- tailwindcss
- @testing-library/react-native
- @types/jest
- typescript
- assets.d.ts

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 175 edges
2. `spacing()` - 119 edges
3. `RepoResult` - 102 edges
4. `useAuth()` - 96 edges
5. `invalidateHouseholdData()` - 66 edges
6. `typography` - 56 edges
7. `formatCurrency()` - 46 edges
8. `radius` - 46 edges
9. `Database` - 46 edges
10. `useResponsiveMetrics()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `AuthLayout()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(auth)/_layout.tsx → src/theme/ThemeProvider.tsx
- `TypeCard()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(protected)/feedback.tsx → src/theme/ThemeProvider.tsx
- `EmptyState()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(protected)/feedback.tsx → src/theme/ThemeProvider.tsx
- `PolicySection()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(public)/cookie-policy.tsx → src/theme/ThemeProvider.tsx
- `PolicyFact()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(public)/cookie-policy.tsx → src/theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Communities (193 total, 78 thin omitted)

### Community 0 - "monthly-budget.service.ts"
Cohesion: 0.11
Nodes (24): Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, getCashAccountIds(), getExcludedMonths(), getMemberLabel() (+16 more)

### Community 1 - "(protected)/index.tsx"
Cohesion: 0.06
Nodes (53): styles, WageFlowRangePreset, EmptyState(), getMemberLabel(), HouseholdMemberSelect(), HouseholdMemberSelectProps, styles, DropdownItem (+45 more)

### Community 2 - "AccountsScreen"
Cohesion: 0.17
Nodes (13): AccountsScreen(), buildSelectionMap(), SavingsScreen(), useRecurringTransactions(), useCreateSavingPot(), useDeleteSavingPot(), useUpdateSavingPot(), useUpdateSavingPotAccounts() (+5 more)

### Community 3 - "NotificationsProvider.tsx"
Cohesion: 0.14
Nodes (9): useNotifications(), AppNotification, NotificationsService, registerWebPushDevice(), mockRegisterWebPushSubscription, urlBase64ToUint8Array(), WebPushRegistrationResult, NotificationsProvider() (+1 more)

### Community 4 - "RepoResult"
Cohesion: 0.08
Nodes (4): RepoResult, CategoriesRepository, HouseholdsRepository, MonthlyBudgetRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (38): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+30 more)

### Community 6 - "category-suggestions/index.ts"
Cohesion: 0.15
Nodes (20): normalizeTransactionTitle(), transactionTitleTokens(), rankCategorySuggestion(), RankedCandidate, titleSimilarity(), resolveCategorySelection(), ResolveCategorySelectionInput, suggestion (+12 more)

### Community 7 - "public-overview-screen.web.tsx"
Cohesion: 0.08
Nodes (18): LanguageMenu(), options, styles, Brand(), Cta(), featureIcons, LandingScreen(), styles (+10 more)

### Community 8 - "login-callback-screen.tsx"
Cohesion: 0.15
Nodes (14): AuthLayout(), LoginCallbackScreen(), styles, buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo() (+6 more)

### Community 9 - "app-tabs.web.tsx"
Cohesion: 0.06
Nodes (37): plugins, expo-image, expo-localization, expo-status-bar, expo-web-browser, AnimatedIcon(), AnimatedSplashOverlay(), glowKeyframe (+29 more)

### Community 10 - "DashboardScreen"
Cohesion: 0.06
Nodes (44): DashboardScreen(), computeDateRange(), localDate(), useCreateWageFlowCategory(), useDeleteWageFlowCategory(), useInvalidateWageFlowCategories(), useReorderWageFlowCategories(), useSeedWageFlowCategoryDefaults() (+36 more)

### Community 11 - "expo"
Cohesion: 0.06
Nodes (35): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+27 more)

### Community 12 - "saving-pot-forecast.service.ts"
Cohesion: 0.12
Nodes (33): addMonths(), addOccurrence(), buildForecastTimeline(), buildSavingPotForecasts(), findCompletionDate(), ForecastContribution, ForecastFrequency, ForecastPot (+25 more)

### Community 13 - "CategoriesService"
Cohesion: 0.21
Nodes (4): useChildCategories(), useTopLevelCategories(), CategoriesService, CategoryType

### Community 14 - "session.types.ts"
Cohesion: 0.23
Nodes (7): SessionRepository, SessionService, Claims, HouseholdMember, SessionState, mockLoadProfileAndHousehold, useSession()

### Community 15 - "budget-rule-card.tsx"
Cohesion: 0.19
Nodes (15): AccountLike, DestinationSelection, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedDestinationSelect(), GroupedDestinationSelectProps (+7 more)

### Community 16 - "typography.ts"
Cohesion: 0.10
Nodes (24): expo-router, samples, StorybookPreviewScreen(), FinanceMetricCard(), FinanceMetricCardProps, FinanceMetricTone, getToneColors(), styles (+16 more)

### Community 17 - "run-local-contract-tests.mjs"
Cohesion: 0.15
Nodes (6): hasCrossHouseholdSeed, householdScopedTables, localUrls, privateTables, reachabilityChecks, supabase

### Community 18 - "ThemeProvider.tsx"
Cohesion: 0.12
Nodes (14): AuthLoadingTransition(), FigureColors, styles, useThemeStore, blueColors, darkColors, lightColors, ThemeColors (+6 more)

### Community 19 - "explorer-data.ts"
Cohesion: 0.06
Nodes (39): CategoryGraphCanvas(), CategoryGraphCanvasProps, CategoryGraphCanvasProps, CategoryGraphScene(), CategoryGraphSceneProps, ROOT_POSITION, CategorySpendGraphCanvas(), CategorySpendGraphCanvasProps (+31 more)

### Community 20 - "Database"
Cohesion: 0.06
Nodes (11): Account, AccountBalance, AccountsRepository, Attachment, AttachmentsRepository, BaseRepository, createClient(), createQuery() (+3 more)

### Community 21 - "budget.tsx"
Cohesion: 0.12
Nodes (33): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), getRuleRowKey(), getSectionRank(), getTransferKey(), isRuleDraftValid() (+25 more)

### Community 22 - "useAuth"
Cohesion: 0.22
Nodes (18): getToken(), InviteScreen(), MembersScreen(), roles, useCreateHousehold(), HouseholdRole, useAcceptHouseholdInvitation(), useCreateHouseholdInvitation() (+10 more)

### Community 23 - "invalidateHouseholdData"
Cohesion: 0.09
Nodes (27): CategoriesScreen(), getTypeColor(), getTypeIcon(), SettingsScreen(), TransactionsScreen(), useCreateAccount(), useArchiveCategory(), useCategories() (+19 more)

### Community 24 - "transaction-import/preview.ts"
Cohesion: 0.18
Nodes (19): CsvDocument, detectDelimiter(), parseCsv(), parseLocalizedDate(), parseLocalizedNumber(), validDate(), buildImportPreview(), exactKey() (+11 more)

### Community 26 - "Data-subject export and deletion workflow design"
Cohesion: 0.10
Nodes (20): Data-subject export and deletion workflow design, Definition of done, Deletion workflow, Design principles, Erasure matrix requiring product/legal decisions, Export manifest, Export workflow, Failure and recovery (+12 more)

### Community 27 - "feedback/types.ts"
Cohesion: 0.07
Nodes (31): AdminFeedbackFilters, AdminFeedbackPage, appContextToJson(), AppRelease, AppReleasePlatform, cleanRoute(), cleanString(), Feedback (+23 more)

### Community 28 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, android, ios, lint, reset-project, security:check, start, test (+7 more)

### Community 30 - "SmartFinance Release Checklist"
Cohesion: 0.20
Nodes (9): Auth And Routing, Background Notifications, Build Gates, Environment, Finance Semantics, Recurring Automation, Responsive UI, Security Headers (+1 more)

### Community 31 - "date-picker-field.web.tsx"
Cohesion: 0.29
Nodes (8): addMonths(), DateGranularity, DatePickerField(), DatePickerFieldProps, ensureStyles(), formatDisplayValue(), isSameDay(), parseDateValue()

### Community 32 - "automation/service.ts"
Cohesion: 0.21
Nodes (13): baseRule, canonicalizeMerchant(), normalizeMerchantText(), matchTransactionRule(), titleMatches(), TransactionAutomationService, validateTransactionSplits(), BulkTransactionChanges (+5 more)

### Community 33 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 34 - "useTheme"
Cohesion: 0.07
Nodes (40): AdminEmpty(), AdminFeedbackItem, AssignmentFilter, DetailBlock(), FeedbackKind, FeedbackPriority, FeedbackStatus, FilterRow() (+32 more)

### Community 35 - "ProfileOnboardingProvider.tsx"
Cohesion: 0.10
Nodes (31): GuideModal(), GuideModalProps, styles, getOnboardingGuide(), onboardingGuides, emptyProgress(), OnboardingContext, OnboardingContextValue (+23 more)

### Community 36 - "HouseholdsService"
Cohesion: 0.09
Nodes (9): useDefaultHousehold(), useMyHouseholds(), useSetDefaultHousehold(), CreateInvitationInput, createInviteLinks(), HouseholdRole, HouseholdsService, InvitationDetails (+1 more)

### Community 37 - "exclude"
Cohesion: 0.09
Nodes (22): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, test, **/*.ts, **/*.tsx (+14 more)

### Community 38 - "catalog.ts"
Cohesion: 0.10
Nodes (35): CatalogRow, firstString(), highlightText(), isPublished(), listPublishedReleases(), normalizePublishedRelease(), parseHighlights(), RELEASE_CATALOG_TABLE (+27 more)

### Community 39 - "feedback/index.ts"
Cohesion: 0.15
Nodes (22): AdminFeedbackScreen(), FeedbackScreen(), key, useAddFeedbackReply(), useAdminFeedback(), useCreateFeedback(), useMyFeedback(), usePlatformAdminAccess() (+14 more)

### Community 40 - "requireIdFor"
Cohesion: 0.26
Nodes (15): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts() (+7 more)

### Community 41 - "recurring-transactions.service.ts"
Cohesion: 0.14
Nodes (7): CreateRecurringTransactionInput, ExpenseKind, Frequency, RecurringTransactionsService, RuleKind, TransactionType, UpdateRecurringTransactionInput

### Community 42 - "grouped-account-select.tsx"
Cohesion: 0.09
Nodes (35): AccountLike, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedAccountSelect(), GroupedAccountSelectProps, MemberLike (+27 more)

### Community 43 - "SmartFinance command helper"
Cohesion: 0.10
Nodes (19): Builds, Common troubleshooting, Daily development, Database migrations, Deploy migrations to hosted Supabase, First-time setup, Graphify and Git checks, Packages (+11 more)

### Community 44 - "recurring.transactions.repository.ts"
Cohesion: 0.14
Nodes (5): RecurringRunExecution, RecurringTransaction, RecurringTransactionsRepository, RecurringTransactionWithRelations, QueryResult

### Community 45 - "transfers.tsx"
Cohesion: 0.22
Nodes (16): RecurringTransferCreateForm(), TransfersContent(), formatDate(), useAccountsWithBalances(), useCreateRecurringTransaction(), useDeleteRecurringTransaction(), useRecurringExecutionHistory(), useRecurringTransactionsInfinite() (+8 more)

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "migrated-page.tsx"
Cohesion: 0.06
Nodes (49): AccountHistoryMode, currencyOptions, EditMode, EmptyState(), FeedbackFrequency, FeedbackItem, FeedbackKind, FeedbackReply (+41 more)

### Community 49 - "categories.tsx"
Cohesion: 0.13
Nodes (15): CategoryEditDraft, categoryIconSuggestions, CategoryLike, types, ALL_ICON_NAMES, DEFAULT_ICON_NAMES, IconPicker(), IconPickerProps (+7 more)

### Community 50 - "SmartFinance Testing"
Cohesion: 0.33
Nodes (5): Fast Local Checks, Local Supabase Contract Check, Production Release Checklist, Release-Only Web Smoke, SmartFinance Testing

### Community 51 - "account.schema.ts"
Cohesion: 0.50
Nodes (3): AccountFormInput, AccountFormValues, accountSchema

### Community 52 - "repositories/index.ts"
Cohesion: 0.15
Nodes (13): Attachment, isImageAttachment(), listTransactionAttachmentPreviews(), TransactionAttachmentPreview, createSignedUrl, listForTransaction, useTransactionAttachments(), createdTransaction (+5 more)

### Community 53 - "TransactionsRepository"
Cohesion: 0.12
Nodes (3): CreateTransferInput, TransferService, TransactionsRepository

### Community 55 - "send-household-invitation/index.ts"
Cohesion: 0.23
Nodes (10): baseCorsHeaders, EmailLogInsert, extractInviteTokenFromLink(), getAllowedOrigins(), getCorsHeaders(), HouseholdRole, InvitePayload, normalizeHttpOrigin() (+2 more)

### Community 56 - "dependencies"
Cohesion: 0.12
Nodes (17): expo-asset, expo-document-picker, expo-gl, expo-notifications, nativewind, dependencies, expo-asset, expo-document-picker (+9 more)

### Community 57 - "vercel.json"
Cohesion: 0.18
Nodes (10): maxDuration, buildCommand, cleanUrls, crons, functions, api/cron/execute-recurring.js, headers, outputDirectory (+2 more)

### Community 58 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 60 - "mocks/supabase.ts"
Cohesion: 0.67
Nodes (3): createSupabaseMock(), createSupabaseQuery(), QueryResult

### Community 62 - "savings.tsx"
Cohesion: 0.18
Nodes (16): AccountGroup, AccountGroupView, AccountOption, createStyles(), PotDraft, SelectionMode, MultiSelectShell(), createStyles() (+8 more)

### Community 64 - "devDependencies"
Cohesion: 0.13
Nodes (15): @expo/ngrok, jest, devDependencies, @expo/ngrok, jest, react-test-renderer, @tailwindcss/postcss, @types/react (+7 more)

### Community 68 - "useHouseholdBackup.integration.test.tsx"
Cohesion: 0.17
Nodes (6): backup, mockedBackupService, mockedUseAuth, asBackupFile(), HouseholdBackupService, safeNamePart()

### Community 69 - ".importHouseholdBackup"
Cohesion: 0.36
Nodes (8): buildIncomeInputInserts(), getCurrentProfile(), getMemberFallbackMap(), insertMany(), newId(), newIdMap(), normalizeEmail(), throwIfError()

### Community 70 - "core/index.ts"
Cohesion: 0.05
Nodes (53): CookiePolicyPage(), PolicyFact(), PolicySection(), styles, mockUseCookieConsent, VercelSpeedInsights(), resources, ActionButton() (+45 more)

### Community 74 - "client.ts"
Cohesion: 0.13
Nodes (11): GoogleLoginScreen(), SignOutButton(), HouseholdMemberDetails, MemberProfile, AuthService, StorageService, UploadFile, memoryStorage (+3 more)

### Community 75 - "MonthlyBudgetService"
Cohesion: 0.18
Nodes (8): buildAccountGroups(), MonthlyBudgetService, account(), member, preview(), recurring(), rule(), service

### Community 76 - "RootProvider.tsx"
Cohesion: 0.12
Nodes (12): NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), ModalContext, ModalContextValue, ModalProvider(), QueryProvider(), RootProvider() (+4 more)

### Community 82 - "formatCurrency"
Cohesion: 0.10
Nodes (33): formatSignedCurrency(), formatCurrency(), CategoryLike, CategorySpendNetworkSection(), CategorySpendNetworkSectionProps, MemberLike, Period, PERIOD_MONTHS (+25 more)

### Community 84 - "AuthProvider.tsx"
Cohesion: 0.21
Nodes (9): shouldRefreshClaimsForAuthEvent(), ShouldRefreshClaimsInput, AUTH_CALLBACK_ROUTE, AuthContext, AuthContextValue, AuthProvider(), completeNativeAuthCallback(), isNativeAuthCallback() (+1 more)

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

### Community 91 - "profiles.repository.ts"
Cohesion: 0.31
Nodes (3): normalizeOnboardingGuides(), Profile, ProfilesRepository

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
Cohesion: 0.09
Nodes (12): useArchiveAccount(), useDeleteAccount(), useUpdateAccount(), AccountIdInput, AccountsService, CreateAccountInput, UpdateAccountInput, Account (+4 more)

### Community 108 - "transactions.repository.ts"
Cohesion: 0.10
Nodes (18): CreateTransactionDTO, Transaction, TransactionInsert, TransactionUpdate, UpdateTransactionDTO, CategorySuggestionHistoryRow, CreateTransferInput, MonthlyCategorySpending (+10 more)

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

### Community 118 - "transaction.service.ts"
Cohesion: 0.09
Nodes (19): TRANSACTION_RELATIONS_QUERY_VERSION, useTransactionMovementsInfinite(), useTransactions(), useTransactionsInfinite(), ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput (+11 more)

### Community 120 - "transaction-amount.ts"
Cohesion: 0.25
Nodes (9): movementAmountColor(), movementAmountSign(), MovementColorPalette, movementIconBackground(), MovementIconPalette, MovementKind, MovementLike, resolveMovementKind() (+1 more)

### Community 123 - "saving-pots.repository.ts"
Cohesion: 0.20
Nodes (4): SavingPot, SavingPotAccountAssignment, SavingPotBalance, SavingPotsRepository

### Community 126 - "transaction-create-form.ts"
Cohesion: 0.48
Nodes (5): getAddAnotherTransactionReset(), getFreshTransactionCreateReset(), getLocalCalendarDate(), TransactionCreateContext, TransactionCreateReset

### Community 127 - "member-income-input-card.tsx"
Cohesion: 0.42
Nodes (6): MemberIncomeInputCard(), MemberIncomeInputCardProps, shiftMonth(), BudgetAccountLike, BudgetMemberLike, getMemberLabel()

### Community 129 - "FeatureFlagProvider.tsx"
Cohesion: 0.32
Nodes (5): FeatureFlagContext, FeatureFlagContextValue, FeatureFlagProvider(), DEFAULT_FLAGS, FeatureFlagKey

### Community 132 - "transaction-list.ts"
Cohesion: 0.43
Nodes (6): compareTransactions(), SortableTransaction, timestamp(), titleKey(), TransactionListSortKey, sortedIds()

### Community 137 - "Phase 4 — Net worth and debt management"
Cohesion: 0.33
Nodes (6): Debt payoff planner, Liability accounts, Manual assets, Net-worth history, Phase 4 completion criteria, Phase 4 — Net worth and debt management

### Community 141 - "spacing"
Cohesion: 0.09
Nodes (37): createStyles(), AttachmentDraft, TransactionEditDraft, TransferEditDraft, WIZARD_STEP_COPY, WizardStepKey, AttachmentPreview(), AttachmentPreviewProps (+29 more)

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

### Community 172 - "package.json"
Cohesion: 0.29
Nodes (6): main, name, overrides, lightningcss, private, version

### Community 176 - "SmartFinance processor and recipient register"
Cohesion: 0.33
Nodes (5): External services, Immediate decisions, Internal recipients, SmartFinance processor and recipient register, Vendor diligence checklist

### Community 177 - "database.types.ts"
Cohesion: 0.07
Nodes (26): Insert, ListOptions, Row, TableName, Update, Category, CategoryUpdate, Household (+18 more)

## Knowledge Gaps
- **795 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+790 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **78 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `(protected)/index.tsx`, `AccountsScreen`, `public-overview-screen.web.tsx`, `login-callback-screen.tsx`, `app-tabs.web.tsx`, `DashboardScreen`, `spacing`, `budget-rule-card.tsx`, `typography.ts`, `ThemeProvider.tsx`, `budget.tsx`, `useAuth`, `invalidateHouseholdData`, `date-picker-field.web.tsx`, `ProfileOnboardingProvider.tsx`, `feedback/index.ts`, `grouped-account-select.tsx`, `transfers.tsx`, `migrated-page.tsx`, `categories.tsx`, `savings.tsx`, `core/index.ts`, `client.ts`, `RootProvider.tsx`, `formatCurrency`, `member-income-input-card.tsx`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `Database` connect `Database` to `monthly-budget.service.ts`, `RepoResult`, `household-backup.service.ts`, `category-suggestions/index.ts`, `DashboardScreen`, `session.types.ts`, `useAuth`, `feedback/types.ts`, `automation/service.ts`, `HouseholdsService`, `recurring-transactions.service.ts`, `recurring.transactions.repository.ts`, `database.types.ts`, `repositories/index.ts`, `profiles.repository.ts`, `transaction-automation.repository.ts`, `accounts.service.ts`, `transactions.repository.ts`, `transaction-import.repository.ts`, `saving-pots.repository.ts`, `member-income-input-card.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `supabase` connect `client.ts` to `monthly-budget.service.ts`, `useTheme`, `NotificationsProvider.tsx`, `HouseholdsService`, `household-backup.service.ts`, `catalog.ts`, `feedback/index.ts`, `login-callback-screen.tsx`, `transactions.repository.ts`, `session.types.ts`, `typography.ts`, `database.types.ts`, `transaction-import.repository.ts`, `AuthProvider.tsx`, `Database`, `repositories/index.ts`, `transaction-automation.repository.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _795 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `monthly-budget.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `(protected)/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.061507936507936505 - nodes in this community are weakly interconnected._
- **Should `NotificationsProvider.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._