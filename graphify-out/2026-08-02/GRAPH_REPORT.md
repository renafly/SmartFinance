# Graph Report - SmartFinance  (2026-08-02)

## Corpus Check
- 398 files · ~211,834 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2044 nodes · 4438 edges · 189 communities (113 shown, 76 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- monthly-budget.service.ts
- eslint
- RootProvider.tsx
- login-callback-screen.tsx
- RepoResult
- household-backup.service.ts
- build-financial-insights.ts
- grouped-account-select.tsx
- redirects.ts
- themed-text.tsx
- (protected)/index.tsx
- expo
- saving-pot-forecast.service.ts
- migrated-page.tsx
- TransactionsRepository
- transfers.tsx
- src/theme/spacing.ts
- preferencesStore.ts
- src/theme/ThemeProvider.tsx
- invalidateHouseholdData
- admin-feedback.tsx
- budget.tsx
- date-picker-field.tsx
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
- households.repository.ts
- exclude
- catalog.ts
- client.ts
- requireIdFor
- transactions.repository.ts
- animated-icon.web.tsx
- Welcome to your Expo app 👋
- recurring.transactions.repository.ts
- session.types.ts
- transaction.schema.ts
- useAuth
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
- spacing
- app-tabs.web.tsx
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
- protected-drawer.tsx
- transaction-import.repository.ts
- global.d.ts
- transaction-automation.repository.ts
- dispatch-notification/index.ts
- Phase 2 — Importing, reconciliation, and recurring money
- useTheme
- SmartFinance product roadmap
- Phase 8 — Smart assistance and data ownership
- feedback.tsx
- grouped-destination-select.tsx
- entry-screen.tsx
- Findings
- Phase 3 — Advanced budgeting
- transaction-create-form.ts
- Phase 1 — Transaction automation and reporting
- Privacy readiness implementation backlog
- AccountsRepository
- expo-application
- expo-auth-session
- expo-dev-client
- useHouseholdBackup.integration.test.tsx
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
- diagnostics.tsx
- expo-symbols
- AttachmentsRepository
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
- expo-status-bar
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
- husky
- react-i18next
- react-native-svg
- react-native-url-polyfill
- SmartFinance processor and recipient register
- monthly-budget.repository.ts
- storage.web.ts
- public-overview-screen.tsx
- adaptiveIcon
- extra
- SavingPotsService
- themeStore.ts
- monthly-budget.service.unit.test.ts
- useCookieConsent
- run-security-check.mjs
- expo-system-ui
- expo

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 136 edges
2. `RepoResult` - 92 edges
3. `useAuth()` - 87 edges
4. `spacing()` - 80 edges
5. `invalidateHouseholdData()` - 59 edges
6. `Database` - 43 edges
7. `BudgetScreen()` - 39 edges
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

## Communities (189 total, 76 thin omitted)

### Community 0 - "monthly-budget.service.ts"
Cohesion: 0.10
Nodes (25): Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, getCashAccountIds(), getExcludedMonths(), getMemberLabel() (+17 more)

### Community 2 - "RootProvider.tsx"
Cohesion: 0.13
Nodes (10): @vercel/speed-insights, NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), ModalContext, ModalContextValue, ModalProvider(), QueryProvider() (+2 more)

### Community 4 - "RepoResult"
Cohesion: 0.08
Nodes (4): RepoResult, CategoriesRepository, HouseholdsRepository, MonthlyBudgetRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (37): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+29 more)

### Community 6 - "build-financial-insights.ts"
Cohesion: 0.08
Nodes (47): projectAccountBalances(), buildFinancialInsights(), BuildFinancialInsightsInput, addRecurrence(), formatCalendarDate(), listRuleOccurrences(), parseCalendarDate(), buildBillCalendar() (+39 more)

### Community 7 - "grouped-account-select.tsx"
Cohesion: 0.22
Nodes (16): AccountLike, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedAccountSelect(), GroupedAccountSelectProps, MemberLike (+8 more)

### Community 8 - "redirects.ts"
Cohesion: 0.22
Nodes (11): buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo(), storePendingRedirectTo(), Guest(), mockUseAuth (+3 more)

### Community 9 - "themed-text.tsx"
Cohesion: 0.18
Nodes (15): HintRowProps, styles, styles, ThemedText(), ThemedTextProps, ThemedView(), ThemedViewProps, Collapsible() (+7 more)

### Community 10 - "(protected)/index.tsx"
Cohesion: 0.15
Nodes (22): AccountOverviewTable(), AllocationDonut(), AllocationKey, AllocationLegend(), AllocationSegment, DashboardAccount, DashboardPot, DashboardScreen() (+14 more)

### Community 11 - "expo"
Cohesion: 0.11
Nodes (18): reactCompiler, typedRoutes, expo, experiments, icon, ios, name, orientation (+10 more)

### Community 12 - "saving-pot-forecast.service.ts"
Cohesion: 0.12
Nodes (32): addMonths(), addOccurrence(), buildForecastTimeline(), buildSavingPotForecasts(), findCompletionDate(), ForecastContribution, ForecastFrequency, ForecastPot (+24 more)

### Community 13 - "migrated-page.tsx"
Cohesion: 0.14
Nodes (11): getToken(), InviteScreen(), ButtonProps, CardProps, FieldProps, PageProps, PillProps, SectionProps (+3 more)

### Community 14 - "TransactionsRepository"
Cohesion: 0.12
Nodes (4): CreateTransferInput, TransferService, TransactionsRepository, QueryResult

### Community 15 - "transfers.tsx"
Cohesion: 0.08
Nodes (30): dateRange(), InsightsScreen(), localDate(), RangePreset, DatePickerField(), emptyDraft(), formatDateInput(), frequencies (+22 more)

### Community 16 - "src/theme/spacing.ts"
Cohesion: 0.10
Nodes (27): samples, StorybookPreviewScreen(), FinanceMetricCard(), FinanceMetricCardProps, FinanceMetricTone, getToneColors(), styles, FinanceProgressBar() (+19 more)

### Community 17 - "preferencesStore.ts"
Cohesion: 0.26
Nodes (10): resources, AppLanguage, getNativeStorage(), getStoredLanguage(), LanguageOption, LanguageStorage, normalizeLanguage(), setStoredLanguage() (+2 more)

### Community 18 - "src/theme/ThemeProvider.tsx"
Cohesion: 0.13
Nodes (12): AuthLoadingTransition(), FigureColors, styles, useThemeStore, blueColors, darkColors, lightColors, ThemeColors (+4 more)

### Community 19 - "invalidateHouseholdData"
Cohesion: 0.10
Nodes (20): CategoriesScreen(), useArchiveAccount(), useCreateAccount(), useDeleteAccount(), useUpdateAccount(), useArchiveCategory(), useCategories(), useChildCategories() (+12 more)

### Community 20 - "admin-feedback.tsx"
Cohesion: 0.14
Nodes (14): AdminEmpty(), AdminFeedbackItem, AdminFeedbackScreen(), AssignmentFilter, DetailBlock(), FeedbackKind, FeedbackPriority, FeedbackStatus (+6 more)

### Community 21 - "budget.tsx"
Cohesion: 0.12
Nodes (34): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), formatMonthSelection(), getMemberAccentColor(), getMemberLabel(), getRuleRowKey() (+26 more)

### Community 22 - "date-picker-field.tsx"
Cohesion: 0.39
Nodes (8): addMonths(), DateGranularity, DatePickerField(), DatePickerFieldProps, formatDateValue(), formatDisplayValue(), isSameDay(), parseDateValue()

### Community 23 - "savings.tsx"
Cohesion: 0.17
Nodes (22): AccountGroup, AccountGroupView, AccountOption, buildAccountGroups(), buildForecastYearRows(), buildSelectionMap(), createStyles(), ForecastViewMode (+14 more)

### Community 24 - "transaction-import/preview.ts"
Cohesion: 0.18
Nodes (18): CsvDocument, detectDelimiter(), parseCsv(), parseLocalizedDate(), parseLocalizedNumber(), validDate(), buildImportPreview(), exactKey() (+10 more)

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
Cohesion: 0.11
Nodes (9): AccountIdInput, AccountsService, CreateAccountInput, UpdateAccountInput, Account, CreateAccountDTO, NewAccount, UpdateAccount (+1 more)

### Community 35 - "ProfileOnboardingProvider.tsx"
Cohesion: 0.11
Nodes (28): GuideModal(), getOnboardingGuide(), onboardingGuides, emptyProgress(), OnboardingContext, OnboardingContextValue, OnboardingProvider(), OnboardingProviderProps (+20 more)

### Community 36 - "households.repository.ts"
Cohesion: 0.25
Nodes (7): Household, HouseholdInvitation, HouseholdInvitationDetails, HouseholdListItem, HouseholdMember, HouseholdRole, MyHouseholdInvitation

### Community 37 - "exclude"
Cohesion: 0.09
Nodes (22): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, test, **/*.ts, **/*.tsx (+14 more)

### Community 38 - "catalog.ts"
Cohesion: 0.11
Nodes (33): CatalogRow, firstString(), highlightText(), isPublished(), listPublishedReleases(), normalizePublishedRelease(), parseHighlights(), releaseQueryKeys (+25 more)

### Community 39 - "client.ts"
Cohesion: 0.05
Nodes (32): SignOutButton(), key, useAdminFeedback(), useCreateFeedback(), useMyFeedback(), useUpdateAdminFeedback(), useWithdrawFeedback(), addFeedbackReply() (+24 more)

### Community 40 - "requireIdFor"
Cohesion: 0.26
Nodes (15): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts() (+7 more)

### Community 41 - "transactions.repository.ts"
Cohesion: 0.08
Nodes (24): ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName(), TransactionAttachmentInput, TransactionsService (+16 more)

### Community 42 - "animated-icon.web.tsx"
Cohesion: 0.29
Nodes (5): AnimatedIcon(), glowKeyframe, keyframe, logoKeyframe, styles

### Community 43 - "Welcome to your Expo app 👋"
Cohesion: 0.29
Nodes (6): Get a fresh project, Get started, Join the community, Learn more, Other setup steps, Welcome to your Expo app 👋

### Community 44 - "recurring.transactions.repository.ts"
Cohesion: 0.14
Nodes (5): RecurringRunExecution, RecurringTransaction, RecurringTransactionsRepository, RecurringTransactionWithRelations, QueryResult

### Community 45 - "session.types.ts"
Cohesion: 0.21
Nodes (8): SessionRepository, SessionService, Claims, HouseholdMember, SessionState, UserProfile, mockLoadProfileAndHousehold, useSession()

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "useAuth"
Cohesion: 0.09
Nodes (39): MembersScreen(), roles, currencyOptions, languageOptions, SettingsScreen(), themeOptions, Field(), shouldRefreshClaimsForAuthEvent() (+31 more)

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

### Community 68 - "spacing"
Cohesion: 0.06
Nodes (65): AccountHistoryMode, AccountsScreen(), createStyles(), currencyOptions, EditMode, CategoryEditDraft, categoryIconSuggestions, CategoryLike (+57 more)

### Community 69 - "app-tabs.web.tsx"
Cohesion: 0.17
Nodes (9): plugins, expo-image, expo-localization, expo-status-bar, expo-web-browser, CustomTabList(), styles, ExternalLink() (+1 more)

### Community 70 - "core/index.ts"
Cohesion: 0.26
Nodes (13): COOKIE_CONSENT_VERSION, CookieConsent, CookieConsentChoices, createCookieConsent(), isRecord(), isValidIsoDate(), parseCookieConsent(), parseStoredCookieConsent() (+5 more)

### Community 84 - "dependencies"
Cohesion: 0.13
Nodes (15): eslint-config-expo, expo-constants, expo-crypto, expo-glass-effect, dependencies, eslint-config-expo, expo-constants, expo-crypto (+7 more)

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

### Community 92 - "protected-drawer.tsx"
Cohesion: 0.24
Nodes (10): DrawerContent(), getGuideKeyForPathname(), menuIconMap, ProtectedDrawerLayout(), SectionGuideButton(), styles, isSystemAdminEmail(), SYSTEM_ADMIN_EMAIL_SET (+2 more)

### Community 93 - "transaction-import.repository.ts"
Cohesion: 0.26
Nodes (5): ImportTransactionCandidate, Client, ImportBatchRow, table(), TransactionImportRepository

### Community 95 - "transaction-automation.repository.ts"
Cohesion: 0.12
Nodes (7): MerchantAliasInsert, Rule, RuleInsert, SplitInsert, TagInsert, TransactionAutomationRepository, TransactionUpdate

### Community 100 - "Phase 2 — Importing, reconciliation, and recurring money"
Cohesion: 0.25
Nodes (8): Additional file formats, CSV import wizard, Duplicate detection and reconciliation, Phase 2 completion criteria, Phase 2 — Importing, reconciliation, and recurring money, Projected balances, Recurring detection and calendar, Subscription dashboard

### Community 102 - "useTheme"
Cohesion: 0.06
Nodes (43): expo-router, AuthLayout(), MovementFields(), CookiePolicyPage(), PolicyFact(), PolicySection(), styles, PublicLayout() (+35 more)

### Community 103 - "SmartFinance product roadmap"
Cohesion: 0.29
Nodes (6): Deferred or country-dependent services, Product principles, Research references, SmartFinance product roadmap, Status legend, Suggested next implementation sequence

### Community 105 - "Phase 8 — Smart assistance and data ownership"
Cohesion: 0.29
Nodes (7): Anomaly detection, Data portability and integrations, Explainable financial assistant, Phase 8 completion criteria, Phase 8 — Smart assistance and data ownership, Platform improvements, Receipt OCR

### Community 106 - "feedback.tsx"
Cohesion: 0.15
Nodes (14): EmptyState(), FeedbackFrequency, FeedbackItem, FeedbackKind, FeedbackReply, FeedbackScreen(), FeedbackStatus, FeedbackTimelineCard() (+6 more)

### Community 107 - "grouped-destination-select.tsx"
Cohesion: 0.27
Nodes (10): AccountLike, DestinationSelection, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedDestinationSelect(), GroupedDestinationSelectProps (+2 more)

### Community 109 - "Findings"
Cohesion: 0.13
Nodes (14): Executive assessment, Findings, Official Supabase references reviewed, Positive controls, Required remote verification, SR-01 — No authenticated account-deletion workflow, SR-02 — Household backup is not a complete personal-data export, SR-03 — Auth/session settings are not evidenced as production-hardened (+6 more)

### Community 110 - "Phase 3 — Advanced budgeting"
Cohesion: 0.29
Nodes (7): Budget rollover, Category targets, Flexible planning periods, Phase 3 — Advanced budgeting, Phase 3 completion criteria, Safe-to-spend, Zero-based and envelope budgeting

### Community 111 - "transaction-create-form.ts"
Cohesion: 0.48
Nodes (5): getAddAnotherTransactionReset(), getFreshTransactionCreateReset(), getLocalCalendarDate(), TransactionCreateContext, TransactionCreateReset

### Community 112 - "Phase 1 — Transaction automation and reporting"
Cohesion: 0.29
Nodes (7): Merchant normalization, Phase 1 completion criteria, Phase 1 — Transaction automation and reporting, Reports, Split transactions, Tags, flags, and bulk editing, Transaction rules

### Community 113 - "Privacy readiness implementation backlog"
Cohesion: 0.18
Nodes (10): Account deletion and erasure, Next engineering tranche, P0 — release and compliance-claim blockers, P1 — authentication and application security, P1 — data-subject rights, P1 — retention and minimization, P2 — governance and operations, Personal-data export (+2 more)

### Community 118 - "useHouseholdBackup.integration.test.tsx"
Cohesion: 0.15
Nodes (7): backup, mockedBackupService, mockedUseAuth, asBackupFile(), HouseholdBackupService, safeNamePart(), Json

### Community 120 - "transaction-list.ts"
Cohesion: 0.48
Nodes (5): compareTransactions(), SortableTransaction, timestamp(), TransactionListSortKey, sortedIds()

### Community 123 - "Database"
Cohesion: 0.09
Nodes (25): CreateRecurringTransactionInput, Frequency, RuleKind, TransactionType, UpdateRecurringTransactionInput, createdTransaction, mockCreate, mockDelete (+17 more)

### Community 131 - "diagnostics.tsx"
Cohesion: 0.09
Nodes (22): DiagnosticItem, DiagnosticRow(), DiagnosticsScreen(), DiagnosticStatus, maskSecret(), styles, NotificationCenter(), styles (+14 more)

### Community 137 - "Phase 4 — Net worth and debt management"
Cohesion: 0.33
Nodes (6): Debt payoff planner, Liability accounts, Manual assets, Net-worth history, Phase 4 completion criteria, Phase 4 — Net worth and debt management

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
Cohesion: 0.50
Nodes (4): Investment tracking, Phase 7 completion criteria, Phase 7 — Investments and long-term planning, Retirement and FIRE planning

### Community 176 - "SmartFinance processor and recipient register"
Cohesion: 0.33
Nodes (5): External services, Immediate decisions, Internal recipients, SmartFinance processor and recipient register, Vendor diligence checklist

### Community 177 - "monthly-budget.repository.ts"
Cohesion: 0.17
Nodes (11): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, MonthlyBudgetRun, MonthlyBudgetRunInsert (+3 more)

### Community 178 - "storage.web.ts"
Cohesion: 0.25
Nodes (6): CookieConsentState, CookieConsentStorage, clearOptionalPreferenceStorage(), cookieConsentStorage, getBrowserStorage(), OPTIONAL_PREFERENCE_KEYS

### Community 180 - "adaptiveIcon"
Cohesion: 0.22
Nodes (9): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+1 more)

### Community 181 - "extra"
Cohesion: 0.25
Nodes (8): projectId, extra, eas, release, router, build, channel, commit

### Community 183 - "themeStore.ts"
Cohesion: 0.36
Nodes (8): isPreferenceStorageAllowed(), getNativeStorage(), getStoredTheme(), normalizeTheme(), setStoredTheme(), ThemeMode, ThemeState, ThemeStorage

### Community 184 - "monthly-budget.service.unit.test.ts"
Cohesion: 0.43
Nodes (6): account(), member, preview(), recurring(), rule(), service

### Community 185 - "useCookieConsent"
Cohesion: 0.70
Nodes (3): mockUseCookieConsent, VercelSpeedInsights(), useCookieConsent()

## Knowledge Gaps
- **706 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+701 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **76 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `expo-notifications`, `eslint`, `expo-router`, `expo-splash-screen`, `expo-symbols`, `RootProvider.tsx`, `@expo/ui`, `@expo/vector-icons`, `expo-web-browser`, `i18next`, `@internationalized/date`, `nativewind`, `prettier`, `react`, `react-aria-components`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-css`, `react-native-gesture-handler`, `react-native-get-random-values`, `react-native-mmkv`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `scripts`, `expo-status-bar`, `react-native-web`, `react-native-worklets`, `@react-navigation/drawer`, `@react-oauth/google`, `@storybook/addon-ondevice-controls`, `@storybook/react-native`, `@supabase/supabase-js`, `@tanstack/react-query`, `unleash-proxy-client`, `zod`, `husky`, `react-i18next`, `react-native-svg`, `react-native-url-polyfill`, `expo-system-ui`, `expo`, `expo-application`, `expo-auth-session`, `expo-dev-client`, `expo-device`, `expo-document-picker`, `expo-font`, `expo-image`, `expo-linear-gradient`, `expo-linking`, `expo-localization`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `RootProvider.tsx` to `dependencies`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `RootProvider.tsx`, `diagnostics.tsx`, `login-callback-screen.tsx`, `grouped-account-select.tsx`, `themed-text.tsx`, `(protected)/index.tsx`, `migrated-page.tsx`, `transfers.tsx`, `src/theme/spacing.ts`, `src/theme/ThemeProvider.tsx`, `invalidateHouseholdData`, `admin-feedback.tsx`, `budget.tsx`, `date-picker-field.tsx`, `savings.tsx`, `ProfileOnboardingProvider.tsx`, `animated-icon.web.tsx`, `useAuth`, `spacing`, `app-tabs.web.tsx`, `protected-drawer.tsx`, `feedback.tsx`, `grouped-destination-select.tsx`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _706 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `monthly-budget.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09659090909090909 - nodes in this community are weakly interconnected._
- **Should `RootProvider.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
- **Should `RepoResult` be split into smaller, more focused modules?**
  _Cohesion score 0.07955596669750231 - nodes in this community are weakly interconnected._