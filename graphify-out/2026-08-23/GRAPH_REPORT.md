# Graph Report - SmartFinance  (2026-08-08)

## Corpus Check
- 461 files · ~260,464 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2351 nodes · 5445 edges · 204 communities (116 shown, 88 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ddf59cab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- monthly-budget.service.ts
- wage-flow-config-panel.tsx
- category-browser-data.ts
- useCookieConsent
- RepoResult
- household-backup.service.ts
- category-suggestions/index.ts
- landing-screen.web.tsx
- redirects.ts
- themed-text.tsx
- DashboardScreen
- expo
- saving-pot-forecast.service.ts
- categories/hooks/index.ts
- session.types.ts
- budget-rule-card.tsx
- spacing.ts
- run-local-contract-tests.mjs
- ThemeProvider.tsx
- category-spend-graph-scene.tsx
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
- transfers.tsx
- SmartFinance command helper
- recurring.transactions.repository.ts
- TransfersContent
- transaction.schema.ts
- transactions.tsx
- app/_layout.tsx
- preferencesStore.ts
- SmartFinance Testing
- account.schema.ts
- repositories/index.ts
- animated-icon.web.tsx
- .storybook/index.ts
- send-household-invitation/index.ts
- dependencies
- vercel.json
- metro.config.js
- useAuthContext.ts
- mocks/supabase.ts
- eslint.config.js
- spacing
- localStorageService.ts
- devDependencies
- authUiStore.ts
- query-client.tsx
- nativewind-env.d.ts
- HouseholdBackupService
- .importHouseholdBackup
- core/index.ts
- eslint-config-expo
- client.ts
- expo-router
- RootProvider.tsx
- public-overview-screen.tsx
- (protected)/index.tsx
- AuthProvider.tsx
- web-smoke.spec.ts
- tsconfig.test.json
- serve-dist.mjs
- Expo HAS CHANGED
- buildCleanBackup
- ProfilesRepository
- adaptiveIcon
- entry-screen.tsx
- global.d.ts
- TransactionAutomationRepository
- dispatch-notification/index.ts
- Phase 2 — Importing, reconciliation, and recurring money
- app-tabs.web.tsx
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
- date-picker-field.tsx
- expo-auth-session
- expo-dev-client
- transaction.service.ts
- expo-device
- TransactionsScreen
- themeStore.ts
- expo-font
- SavingPotsRepository
- expo-image
- expo-linear-gradient
- transaction-create-form.ts
- extra
- public-overview-screen.web.tsx
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
- storage.web.ts
- insight-charts.tsx
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
- login-callback-screen.tsx
- Protected.tsx
- run-security-check.mjs
- SmartFinance processor and recipient register
- monthly-budget.repository.ts
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
- AccountsRepository
- AttachmentsRepository
- WageFlowCategoriesRepository
- nativewind

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 177 edges
2. `spacing()` - 122 edges
3. `RepoResult` - 103 edges
4. `useAuth()` - 97 edges
5. `invalidateHouseholdData()` - 66 edges
6. `typography` - 56 edges
7. `formatCurrency()` - 49 edges
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

## Communities (204 total, 88 thin omitted)

### Community 0 - "monthly-budget.service.ts"
Cohesion: 0.06
Nodes (50): buildAccountGroups(), AccountLike, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedAccountSelect(), GroupedAccountSelectProps (+42 more)

### Community 1 - "wage-flow-config-panel.tsx"
Cohesion: 0.15
Nodes (16): accountOptionSubtitle(), blankWageFlowCategory(), buildHierarchicalCategoryOptions(), groupAccountsByOwnerAndType(), ICON_PRESET, iconButtonStyle(), PickerKind, summarizeWageFlowRules() (+8 more)

### Community 2 - "category-browser-data.ts"
Cohesion: 0.12
Nodes (19): BrowserTransactionLike, CATEGORY_BROWSER_PERIOD_OPTIONS, CategoryBrowserBreakdownEntry, CategoryBrowserChildStat, categoryBrowserPeriodRange(), CategoryBrowserRecentTransaction, CategoryBrowserStats, computeCategoryBrowserStats() (+11 more)

### Community 3 - "useCookieConsent"
Cohesion: 0.18
Nodes (11): CookiePolicyPage(), PolicyFact(), PolicySection(), styles, mockUseCookieConsent, VercelSpeedInsights(), ConsentButton(), CookieConsentBanner() (+3 more)

### Community 4 - "RepoResult"
Cohesion: 0.06
Nodes (5): RepoResult, CategoriesRepository, HouseholdsRepository, MonthlyBudgetRepository, TransactionsRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (37): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+29 more)

### Community 6 - "category-suggestions/index.ts"
Cohesion: 0.15
Nodes (20): normalizeTransactionTitle(), transactionTitleTokens(), rankCategorySuggestion(), RankedCandidate, titleSimilarity(), resolveCategorySelection(), ResolveCategorySelectionInput, suggestion (+12 more)

### Community 7 - "landing-screen.web.tsx"
Cohesion: 0.18
Nodes (9): LanguageMenu(), options, styles, Brand(), Cta(), featureIcons, LandingScreen(), styles (+1 more)

### Community 8 - "redirects.ts"
Cohesion: 0.56
Nodes (6): buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo(), storePendingRedirectTo()

### Community 9 - "themed-text.tsx"
Cohesion: 0.16
Nodes (17): HintRowProps, styles, styles, ThemedText(), ThemedTextProps, ThemedView(), ThemedViewProps, Collapsible() (+9 more)

### Community 10 - "DashboardScreen"
Cohesion: 0.06
Nodes (45): DashboardScreen(), computeDateRange(), localDate(), useCreateWageFlowCategory(), useDeleteWageFlowCategory(), useInvalidateWageFlowCategories(), useReorderWageFlowCategories(), useSeedWageFlowCategoryDefaults() (+37 more)

### Community 11 - "expo"
Cohesion: 0.11
Nodes (18): reactCompiler, typedRoutes, expo, experiments, icon, ios, name, orientation (+10 more)

### Community 12 - "saving-pot-forecast.service.ts"
Cohesion: 0.12
Nodes (33): addMonths(), addOccurrence(), buildForecastTimeline(), buildSavingPotForecasts(), findCompletionDate(), ForecastContribution, ForecastFrequency, ForecastPot (+25 more)

### Community 13 - "categories/hooks/index.ts"
Cohesion: 0.13
Nodes (14): CategoriesScreen(), getTypeColor(), getTypeIcon(), useArchiveCategory(), useCategories(), useChildCategories(), useTopLevelCategories(), useCreateCategory() (+6 more)

### Community 14 - "session.types.ts"
Cohesion: 0.21
Nodes (8): SessionRepository, SessionService, Claims, HouseholdMember, SessionState, UserProfile, mockLoadProfileAndHousehold, useSession()

### Community 15 - "budget-rule-card.tsx"
Cohesion: 0.19
Nodes (15): AccountLike, DestinationSelection, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedDestinationSelect(), GroupedDestinationSelectProps (+7 more)

### Community 16 - "spacing.ts"
Cohesion: 0.07
Nodes (44): CategoryEditDraft, categoryIconSuggestions, CategoryLike, types, samples, StorybookPreviewScreen(), AttachmentPreview(), AttachmentPreviewProps (+36 more)

### Community 17 - "run-local-contract-tests.mjs"
Cohesion: 0.10
Nodes (10): Client, ImportBatchRow, table(), TransactionImportRepository, hasCrossHouseholdSeed, householdScopedTables, localUrls, privateTables (+2 more)

### Community 18 - "ThemeProvider.tsx"
Cohesion: 0.12
Nodes (13): AuthLoadingTransition(), FigureColors, styles, blueColors, darkColors, lightColors, ThemeColors, ultraColors (+5 more)

### Community 19 - "category-spend-graph-scene.tsx"
Cohesion: 0.10
Nodes (22): CategorySpendGraphCanvas(), CategorySpendGraphCanvasProps, CategorySpendGraphCanvasProps, CategorySpendGraphScene(), CategorySpendGraphSceneProps, fibonacciSpherePositions(), HUB_POSITION, PositionedSpendNode (+14 more)

### Community 20 - "Database"
Cohesion: 0.07
Nodes (26): Account, AccountBalance, Attachment, BaseRepository, Insert, ListOptions, Row, TableName (+18 more)

### Community 21 - "budget.tsx"
Cohesion: 0.06
Nodes (57): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), getRuleRowKey(), getSectionRank(), getTransferKey(), isRuleDraftValid() (+49 more)

### Community 22 - "useAuth"
Cohesion: 0.15
Nodes (25): getToken(), InviteScreen(), AccountsScreen(), MembersScreen(), roles, RecurringTransferCreateForm(), useAccountsWithBalances(), useDefaultHousehold() (+17 more)

### Community 23 - "invalidateHouseholdData"
Cohesion: 0.14
Nodes (13): useCreateHousehold(), useDeleteHousehold(), useUpdateHousehold(), useBulkUpdateTransactionCategories(), useCreateTransaction(), useDeleteCompletedTransfer(), useDeleteTransaction(), useUpdateCompletedTransfer() (+5 more)

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
Cohesion: 0.06
Nodes (43): AdminEmpty(), AdminFeedbackItem, AssignmentFilter, DetailBlock(), FeedbackKind, FeedbackPriority, FeedbackStatus, FilterRow() (+35 more)

### Community 35 - "ProfileOnboardingProvider.tsx"
Cohesion: 0.11
Nodes (30): GuideModal(), GuideModalProps, styles, getOnboardingGuide(), onboardingGuides, emptyProgress(), OnboardingContext, OnboardingContextValue (+22 more)

### Community 37 - "exclude"
Cohesion: 0.09
Nodes (22): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, test, **/*.ts, **/*.tsx (+14 more)

### Community 38 - "catalog.ts"
Cohesion: 0.12
Nodes (30): CatalogRow, firstString(), highlightText(), isPublished(), listPublishedReleases(), normalizePublishedRelease(), parseHighlights(), RELEASE_CATALOG_TABLE (+22 more)

### Community 39 - "feedback/index.ts"
Cohesion: 0.08
Nodes (30): AdminFeedbackScreen(), FeedbackScreen(), key, useAddFeedbackReply(), useAdminFeedback(), useCreateFeedback(), useMyFeedback(), useUpdateAdminFeedback() (+22 more)

### Community 40 - "requireIdFor"
Cohesion: 0.26
Nodes (15): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts() (+7 more)

### Community 41 - "recurring-transactions.service.ts"
Cohesion: 0.14
Nodes (7): CreateRecurringTransactionInput, ExpenseKind, Frequency, RecurringTransactionsService, RuleKind, TransactionType, UpdateRecurringTransactionInput

### Community 42 - "transfers.tsx"
Cohesion: 0.12
Nodes (27): Pill(), KindPills(), KindPillsProps, DatePickerField(), DatePickerFieldProps, MovementFields(), MovementFieldsProps, MenuActionProps (+19 more)

### Community 43 - "SmartFinance command helper"
Cohesion: 0.10
Nodes (19): Builds, Common troubleshooting, Daily development, Database migrations, Deploy migrations to hosted Supabase, First-time setup, Graphify and Git checks, Packages (+11 more)

### Community 44 - "recurring.transactions.repository.ts"
Cohesion: 0.14
Nodes (5): RecurringRunExecution, RecurringTransaction, RecurringTransactionsRepository, RecurringTransactionWithRelations, QueryResult

### Community 45 - "TransfersContent"
Cohesion: 0.36
Nodes (7): TransfersContent(), useCreateRecurringTransaction(), useDeleteRecurringTransaction(), useRecurringExecutionHistory(), useRecurringTransactionsInfinite(), useToggleRecurringTransaction(), useUpdateRecurringTransaction()

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "transactions.tsx"
Cohesion: 0.06
Nodes (56): AccountHistoryMode, createStyles(), currencyOptions, EditMode, EmptyState(), FeedbackFrequency, FeedbackItem, FeedbackKind (+48 more)

### Community 48 - "app/_layout.tsx"
Cohesion: 0.18
Nodes (8): NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), ActionButton(), CookieConsentBanner(), PreferenceRow(), styles, RootProvider()

### Community 49 - "preferencesStore.ts"
Cohesion: 0.26
Nodes (10): resources, AppLanguage, getNativeStorage(), getStoredLanguage(), LanguageOption, LanguageStorage, normalizeLanguage(), setStoredLanguage() (+2 more)

### Community 50 - "SmartFinance Testing"
Cohesion: 0.33
Nodes (5): Fast Local Checks, Local Supabase Contract Check, Production Release Checklist, Release-Only Web Smoke, SmartFinance Testing

### Community 51 - "account.schema.ts"
Cohesion: 0.50
Nodes (3): AccountFormInput, AccountFormValues, accountSchema

### Community 52 - "repositories/index.ts"
Cohesion: 0.15
Nodes (13): Attachment, isImageAttachment(), listTransactionAttachmentPreviews(), TransactionAttachmentPreview, createSignedUrl, listForTransaction, useTransactionAttachments(), createdTransaction (+5 more)

### Community 53 - "animated-icon.web.tsx"
Cohesion: 0.18
Nodes (9): plugins, expo-image, expo-localization, expo-status-bar, AnimatedIcon(), glowKeyframe, keyframe, logoKeyframe (+1 more)

### Community 55 - "send-household-invitation/index.ts"
Cohesion: 0.23
Nodes (10): baseCorsHeaders, EmailLogInsert, extractInviteTokenFromLink(), getAllowedOrigins(), getCorsHeaders(), HouseholdRole, InvitePayload, normalizeHttpOrigin() (+2 more)

### Community 56 - "dependencies"
Cohesion: 0.12
Nodes (17): eslint, expo-asset, expo-document-picker, expo-gl, expo-notifications, dependencies, eslint, expo-asset (+9 more)

### Community 57 - "vercel.json"
Cohesion: 0.18
Nodes (10): maxDuration, buildCommand, cleanUrls, crons, functions, api/cron/execute-recurring.js, headers, outputDirectory (+2 more)

### Community 58 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 60 - "mocks/supabase.ts"
Cohesion: 0.67
Nodes (3): createSupabaseMock(), createSupabaseQuery(), QueryResult

### Community 62 - "spacing"
Cohesion: 0.07
Nodes (44): AccountGroup, AccountGroupView, AccountOption, createStyles(), PotDraft, SelectionMode, CategoryPicker(), CategoryPickerCategory (+36 more)

### Community 64 - "devDependencies"
Cohesion: 0.13
Nodes (15): @expo/ngrok, jest, devDependencies, @expo/ngrok, jest, react-test-renderer, @tailwindcss/postcss, @types/react (+7 more)

### Community 68 - "HouseholdBackupService"
Cohesion: 0.18
Nodes (5): asBackupFile(), fetchPaged(), HouseholdBackupService, safeNamePart(), Json

### Community 69 - ".importHouseholdBackup"
Cohesion: 0.36
Nodes (8): buildIncomeInputInserts(), getCurrentProfile(), getMemberFallbackMap(), insertMany(), newId(), newIdMap(), normalizeEmail(), throwIfError()

### Community 70 - "core/index.ts"
Cohesion: 0.20
Nodes (15): COOKIE_CONSENT_VERSION, CookieConsent, CookieConsentChoices, CookieConsentState, createCookieConsent(), isRecord(), isValidIsoDate(), parseCookieConsent() (+7 more)

### Community 74 - "client.ts"
Cohesion: 0.08
Nodes (20): GoogleLoginScreen(), SignOutButton(), CreateInvitationInput, createInviteLinks(), HouseholdRole, InvitationDetails, normalizeInviteWebBase(), MerchantAliasInsert (+12 more)

### Community 75 - "expo-router"
Cohesion: 0.27
Nodes (5): expo-router, AuthLayout(), Guest(), mockUseAuth, mockUseSegments

### Community 76 - "RootProvider.tsx"
Cohesion: 0.18
Nodes (8): ModalContext, ModalContextValue, ModalProvider(), QueryProvider(), Toast, ToastContext, ToastContextValue, ToastProvider()

### Community 82 - "(protected)/index.tsx"
Cohesion: 0.08
Nodes (52): formatSignedCurrency(), styles, WageFlowRangePreset, formatCurrency(), BreakdownRow(), CategoryLike, CategorySpendNetworkSection(), CategorySpendNetworkSectionProps (+44 more)

### Community 84 - "AuthProvider.tsx"
Cohesion: 0.10
Nodes (23): currencyOptions, languageOptions, SettingsScreen(), themeOptions, shouldRefreshClaimsForAuthEvent(), ShouldRefreshClaimsInput, AUTH_CALLBACK_ROUTE, usePlatformAdminAccess() (+15 more)

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

### Community 92 - "adaptiveIcon"
Cohesion: 0.22
Nodes (9): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+1 more)

### Community 100 - "Phase 2 — Importing, reconciliation, and recurring money"
Cohesion: 0.25
Nodes (8): Additional file formats, CSV import wizard, Duplicate detection and reconciliation, Phase 2 completion criteria, Phase 2 — Importing, reconciliation, and recurring money, Projected balances, Recurring detection and calendar, Subscription dashboard

### Community 102 - "app-tabs.web.tsx"
Cohesion: 0.25
Nodes (5): expo-web-browser, CustomTabList(), styles, ExternalLink(), Props

### Community 103 - "SmartFinance product roadmap"
Cohesion: 0.29
Nodes (6): Deferred or country-dependent services, Product principles, Research references, SmartFinance product roadmap, Status legend, Suggested next implementation sequence

### Community 105 - "Phase 8 — Smart assistance and data ownership"
Cohesion: 0.29
Nodes (7): Anomaly detection, Data portability and integrations, Explainable financial assistant, Phase 8 completion criteria, Phase 8 — Smart assistance and data ownership, Platform improvements, Receipt OCR

### Community 106 - "accounts.service.ts"
Cohesion: 0.09
Nodes (13): useArchiveAccount(), useCreateAccount(), useDeleteAccount(), useUpdateAccount(), AccountIdInput, AccountsService, CreateAccountInput, UpdateAccountInput (+5 more)

### Community 108 - "transactions.repository.ts"
Cohesion: 0.08
Nodes (21): CreateTransactionDTO, Transaction, TransactionInsert, TransactionUpdate, UpdateTransactionDTO, CreateTransferInput, TransferService, CategorySuggestionHistoryRow (+13 more)

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

### Community 115 - "date-picker-field.tsx"
Cohesion: 0.39
Nodes (8): addMonths(), DateGranularity, DatePickerField(), DatePickerFieldProps, formatDateValue(), formatDisplayValue(), isSameDay(), parseDateValue()

### Community 118 - "transaction.service.ts"
Cohesion: 0.11
Nodes (15): ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), MAX_TRANSACTION_ATTACHMENT_BYTES, sanitizeFileName(), TransactionAttachmentInput (+7 more)

### Community 120 - "TransactionsScreen"
Cohesion: 0.16
Nodes (14): TransactionsScreen(), TRANSACTION_RELATIONS_QUERY_VERSION, useTransactionMovementsInfinite(), useTransactionMovementsSummary(), useTransactions(), movementAmountColor(), movementAmountSign(), MovementColorPalette (+6 more)

### Community 121 - "themeStore.ts"
Cohesion: 0.36
Nodes (8): isPreferenceStorageAllowed(), getNativeStorage(), getStoredTheme(), normalizeTheme(), setStoredTheme(), ThemeMode, ThemeState, ThemeStorage

### Community 126 - "transaction-create-form.ts"
Cohesion: 0.48
Nodes (5): getAddAnotherTransactionReset(), getFreshTransactionCreateReset(), getLocalCalendarDate(), TransactionCreateContext, TransactionCreateReset

### Community 127 - "extra"
Cohesion: 0.25
Nodes (8): projectId, extra, eas, release, router, build, channel, commit

### Community 128 - "public-overview-screen.web.tsx"
Cohesion: 0.25
Nodes (7): PublicPageKey, Brand(), Header(), navItems, pageIcons, PublicOverviewScreen(), styles

### Community 129 - "FeatureFlagProvider.tsx"
Cohesion: 0.32
Nodes (5): FeatureFlagContext, FeatureFlagContextValue, FeatureFlagProvider(), DEFAULT_FLAGS, FeatureFlagKey

### Community 132 - "transaction-list.ts"
Cohesion: 0.43
Nodes (6): compareTransactions(), SortableTransaction, timestamp(), titleKey(), TransactionListSortKey, sortedIds()

### Community 137 - "Phase 4 — Net worth and debt management"
Cohesion: 0.33
Nodes (6): Debt payoff planner, Liability accounts, Manual assets, Net-worth history, Phase 4 completion criteria, Phase 4 — Net worth and debt management

### Community 140 - "storage.web.ts"
Cohesion: 0.38
Nodes (5): COOKIE_CONSENT_STORAGE_KEY, clearOptionalPreferenceStorage(), cookieConsentStorage, getBrowserStorage(), OPTIONAL_PREFERENCE_KEYS

### Community 141 - "insight-charts.tsx"
Cohesion: 0.27
Nodes (8): formatDate(), useChartWidth(), WageFlowCategoryMenu(), WageFlowChart(), WageFlowChartBucket, WageFlowChartMatch, WageFlowDetailsBody(), WageFlowDetailsPanel()

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

### Community 177 - "monthly-budget.repository.ts"
Cohesion: 0.17
Nodes (11): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, MonthlyBudgetRun, MonthlyBudgetRunInsert (+3 more)

## Knowledge Gaps
- **798 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+793 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **88 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `monthly-budget.service.ts`, `wage-flow-config-panel.tsx`, `public-overview-screen.web.tsx`, `useCookieConsent`, `landing-screen.web.tsx`, `themed-text.tsx`, `DashboardScreen`, `categories/hooks/index.ts`, `insight-charts.tsx`, `budget-rule-card.tsx`, `spacing.ts`, `ThemeProvider.tsx`, `budget.tsx`, `useAuth`, `date-picker-field.web.tsx`, `ProfileOnboardingProvider.tsx`, `feedback/index.ts`, `transfers.tsx`, `TransfersContent`, `login-callback-screen.tsx`, `transactions.tsx`, `app/_layout.tsx`, `animated-icon.web.tsx`, `spacing`, `client.ts`, `expo-router`, `(protected)/index.tsx`, `AuthProvider.tsx`, `app-tabs.web.tsx`, `date-picker-field.tsx`, `TransactionsScreen`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `supabase` connect `client.ts` to `monthly-budget.service.ts`, `useTheme`, `household-backup.service.ts`, `catalog.ts`, `feedback/index.ts`, `transactions.repository.ts`, `login-callback-screen.tsx`, `session.types.ts`, `spacing.ts`, `monthly-budget.repository.ts`, `run-local-contract-tests.mjs`, `AuthProvider.tsx`, `Database`, `useAuth`, `repositories/index.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Database` connect `Database` to `monthly-budget.service.ts`, `RepoResult`, `household-backup.service.ts`, `category-suggestions/index.ts`, `DashboardScreen`, `session.types.ts`, `run-local-contract-tests.mjs`, `budget.tsx`, `useAuth`, `feedback/types.ts`, `automation/service.ts`, `recurring-transactions.service.ts`, `recurring.transactions.repository.ts`, `monthly-budget.repository.ts`, `repositories/index.ts`, `AccountsRepository`, `AttachmentsRepository`, `client.ts`, `WageFlowCategoriesRepository`, `ProfilesRepository`, `TransactionAutomationRepository`, `accounts.service.ts`, `transactions.repository.ts`, `SavingPotsRepository`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _798 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `monthly-budget.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055811571940604196 - nodes in this community are weakly interconnected._
- **Should `category-browser-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Should `RepoResult` be split into smaller, more focused modules?**
  _Cohesion score 0.060814383923849816 - nodes in this community are weakly interconnected._