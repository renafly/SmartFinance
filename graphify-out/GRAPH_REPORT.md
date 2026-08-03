# Graph Report - SmartFinance  (2026-08-03)

## Corpus Check
- 413 files · ~225,322 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2106 nodes · 4592 edges · 182 communities (110 shown, 72 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- monthly-budget.service.ts
- useResponsiveMetrics
- savings.tsx
- diagnostics.tsx
- RepoResult
- household-backup.service.ts
- build-financial-insights.ts
- languages.ts
- login-callback-screen.tsx
- themed-text.tsx
- saving-pots/hooks/index.ts
- expo
- saving-pot-forecast.service.ts
- categories/hooks/index.ts
- session.types.ts
- transfers.tsx
- src/theme/spacing.ts
- run-local-contract-tests.mjs
- RootProvider.tsx
- (protected)/index.tsx
- Database
- budget.tsx
- transaction.service.ts
- transactions.tsx
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
- recurring-transactions.service.ts
- src/theme/ThemeProvider.tsx
- SmartFinance command helper
- RecurringTransactionsRepository
- spacing
- transaction.schema.ts
- useTheme
- monthly-budget.service.unit.test.ts
- monthly-budget.repository.ts
- SmartFinance Testing
- account.schema.ts
- transaction.service.unit.test.ts
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
- AuthProvider.tsx
- .importHouseholdBackup
- core/index.ts
- shared/theme/radius.ts
- shared/theme/typography.ts
- shared/theme/untitled-theme.ts
- src/theme/untitled-theme.ts
- useCookieConsent
- web-smoke.spec.ts
- tsconfig.test.json
- serve-dist.mjs
- Expo HAS CHANGED
- buildCleanBackup
- ProfilesRepository
- invalidateHouseholdData
- entry-screen.tsx
- global.d.ts
- transaction-automation.repository.ts
- dispatch-notification/index.ts
- Phase 2 — Importing, reconciliation, and recurring money
- app-tabs.web.tsx
- SmartFinance product roadmap
- Phase 8 — Smart assistance and data ownership
- storage.web.ts
- expo-application
- transactions.repository.ts
- Findings
- Phase 3 — Advanced budgeting
- useAuth
- Phase 1 — Transaction automation and reporting
- Privacy readiness implementation backlog
- expo-linking
- adaptiveIcon
- expo-auth-session
- expo-dev-client
- extra
- expo-device
- icon-picker.tsx
- expo-document-picker
- expo-font
- SavingPotsRepository
- expo-image
- expo-linear-gradient
- base.repository.unit.test.ts
- expo-localization
- expo-notifications
- expo-router
- expo-splash-screen
- app/_layout.tsx
- expo-symbols
- @expo/ui
- @expo/vector-icons
- expo-web-browser
- Phase 4 — Net worth and debt management
- i18next
- @internationalized/date
- nativewind
- date-picker-field.tsx
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
- SmartFinance privacy and data inventory
- Privacy legal and business inputs
- Phase 7 — Investments and long-term planning
- SmartFinance processor and recipient register
- client.ts
- public-overview-screen.web.tsx
- expo
- expo-status-bar
- run-security-check.mjs
- husky
- expo-system-ui
- react-i18next
- react-native-svg
- react-native-url-polyfill
- HouseholdBackupService

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
- `BudgetScreen()` --indirect_call--> `account()`  [INFERRED]
  src/app/(protected)/budget.tsx → src/features/monthly-budget/services/monthly-budget.service.unit.test.ts
- `BudgetScreen()` --indirect_call--> `rule()`  [INFERRED]
  src/app/(protected)/budget.tsx → src/features/monthly-budget/services/monthly-budget.service.unit.test.ts

## Import Cycles
- None detected.

## Communities (182 total, 72 thin omitted)

### Community 0 - "monthly-budget.service.ts"
Cohesion: 0.09
Nodes (25): Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, getCashAccountIds(), getExcludedMonths(), getMemberLabel() (+17 more)

### Community 1 - "useResponsiveMetrics"
Cohesion: 0.09
Nodes (28): getMemberLabel(), HouseholdMemberSelect(), HouseholdMemberSelectProps, styles, DrawerContent(), getGuideKeyForPathname(), menuIconMap, ProtectedDrawerLayout() (+20 more)

### Community 2 - "savings.tsx"
Cohesion: 0.15
Nodes (21): AccountGroup, AccountGroupView, AccountOption, buildForecastYearRows(), buildSelectionMap(), createStyles(), ForecastViewMode, ForecastYearRow (+13 more)

### Community 3 - "diagnostics.tsx"
Cohesion: 0.09
Nodes (22): DiagnosticItem, DiagnosticRow(), DiagnosticsScreen(), DiagnosticStatus, maskSecret(), styles, isSystemAdminEmail(), SYSTEM_ADMIN_EMAIL_SET (+14 more)

### Community 4 - "RepoResult"
Cohesion: 0.06
Nodes (5): RepoResult, CategoriesRepository, HouseholdsRepository, MonthlyBudgetRepository, TransactionsRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (37): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+29 more)

### Community 6 - "build-financial-insights.ts"
Cohesion: 0.07
Nodes (48): projectAccountBalances(), buildFinancialInsights(), BuildFinancialInsightsInput, addRecurrence(), formatCalendarDate(), listRuleOccurrences(), parseCalendarDate(), buildBillCalendar() (+40 more)

### Community 7 - "languages.ts"
Cohesion: 0.18
Nodes (16): resources, isPreferenceStorageAllowed(), getNativeStorage(), getStoredLanguage(), LanguageOption, LanguageStorage, normalizeLanguage(), setStoredLanguage() (+8 more)

### Community 8 - "login-callback-screen.tsx"
Cohesion: 0.15
Nodes (14): AuthLayout(), LoginCallbackScreen(), styles, buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo() (+6 more)

### Community 9 - "themed-text.tsx"
Cohesion: 0.18
Nodes (15): HintRowProps, styles, styles, ThemedText(), ThemedTextProps, ThemedView(), ThemedViewProps, Collapsible() (+7 more)

### Community 10 - "saving-pots/hooks/index.ts"
Cohesion: 0.22
Nodes (7): useMonthlyBudgetWorkspace(), useRecurringTransactions(), useSavingPotForecasts(), useSavingPotAccountAssignments(), useSavingPotBalances(), useSavingPots(), SavingPotsService

### Community 11 - "expo"
Cohesion: 0.11
Nodes (18): reactCompiler, typedRoutes, expo, experiments, icon, ios, name, orientation (+10 more)

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
Cohesion: 0.09
Nodes (23): DatePickerField(), formatDateInput(), frequencies, Frequency, months, MovementDraft, MovementFields(), MovementKind (+15 more)

### Community 16 - "src/theme/spacing.ts"
Cohesion: 0.08
Nodes (29): expo-router, PublicLayout(), samples, StorybookPreviewScreen(), AttachmentPreview(), AttachmentPreviewProps, styles, FinanceMetricCard() (+21 more)

### Community 17 - "run-local-contract-tests.mjs"
Cohesion: 0.15
Nodes (6): hasCrossHouseholdSeed, householdScopedTables, localUrls, privateTables, reachabilityChecks, supabase

### Community 18 - "RootProvider.tsx"
Cohesion: 0.15
Nodes (9): FeatureFlagContext, FeatureFlagContextValue, FeatureFlagProvider(), ModalContext, ModalContextValue, ModalProvider(), QueryProvider(), DEFAULT_FLAGS (+1 more)

### Community 19 - "(protected)/index.tsx"
Cohesion: 0.10
Nodes (36): AccountOverviewTable(), AllocationDonut(), AllocationKey, AllocationLegend(), AllocationSegment, DashboardAccount, DashboardPot, DashboardScreen() (+28 more)

### Community 20 - "Database"
Cohesion: 0.07
Nodes (25): Attachment, AttachmentsRepository, BaseRepository, Insert, ListOptions, Row, TableName, Update (+17 more)

### Community 21 - "budget.tsx"
Cohesion: 0.12
Nodes (33): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), formatMonthSelection(), getMemberAccentColor(), getMemberLabel(), getRuleRowKey() (+25 more)

### Community 22 - "transaction.service.ts"
Cohesion: 0.08
Nodes (22): useAllTransactions(), useTransactions(), ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName() (+14 more)

### Community 23 - "transactions.tsx"
Cohesion: 0.09
Nodes (28): AttachmentDraft, createStyles(), DatePickerField(), DropdownField(), DropdownFieldProps, formatDateInputValue(), parseDateInputValue(), TransactionEditDraft (+20 more)

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
Cohesion: 0.13
Nodes (9): AccountIdInput, CreateAccountInput, UpdateAccountInput, Account, CreateAccountDTO, NewAccount, UpdateAccount, UpdateAccountDTO (+1 more)

### Community 35 - "ProfileOnboardingProvider.tsx"
Cohesion: 0.11
Nodes (30): GuideModal(), GuideModalProps, styles, getOnboardingGuide(), onboardingGuides, emptyProgress(), OnboardingContext, OnboardingContextValue (+22 more)

### Community 36 - "HouseholdsService"
Cohesion: 0.09
Nodes (8): useDefaultHousehold(), useSetDefaultHousehold(), CreateInvitationInput, createInviteLinks(), HouseholdRole, HouseholdsService, InvitationDetails, normalizeInviteWebBase()

### Community 37 - "exclude"
Cohesion: 0.09
Nodes (22): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, test, **/*.ts, **/*.tsx (+14 more)

### Community 38 - "catalog.ts"
Cohesion: 0.12
Nodes (29): CatalogRow, firstString(), highlightText(), isPublished(), listPublishedReleases(), normalizePublishedRelease(), parseHighlights(), releaseQueryKeys (+21 more)

### Community 39 - "feedback/index.ts"
Cohesion: 0.18
Nodes (18): FeedbackScreen(), key, useAddFeedbackReply(), useCreateFeedback(), useMyFeedback(), useUpdateAdminFeedback(), useWithdrawFeedback(), addFeedbackReply() (+10 more)

### Community 40 - "requireIdFor"
Cohesion: 0.26
Nodes (15): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts() (+7 more)

### Community 41 - "recurring-transactions.service.ts"
Cohesion: 0.15
Nodes (6): CreateRecurringTransactionInput, Frequency, RecurringTransactionsService, RuleKind, TransactionType, UpdateRecurringTransactionInput

### Community 42 - "src/theme/ThemeProvider.tsx"
Cohesion: 0.07
Nodes (22): AnimatedIcon(), AnimatedSplashOverlay(), glowKeyframe, keyframe, logoKeyframe, styles, AnimatedIcon(), glowKeyframe (+14 more)

### Community 43 - "SmartFinance command helper"
Cohesion: 0.10
Nodes (19): Builds, Common troubleshooting, Daily development, Database migrations, Deploy migrations to hosted Supabase, First-time setup, Graphify and Git checks, Packages (+11 more)

### Community 45 - "spacing"
Cohesion: 0.10
Nodes (33): AccountHistoryMode, createStyles(), currencyOptions, EditMode, dateRange(), InsightsScreen(), localDate(), RangePreset (+25 more)

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "useTheme"
Cohesion: 0.07
Nodes (47): AdminEmpty(), AdminFeedbackItem, AdminFeedbackScreen(), AssignmentFilter, DetailBlock(), FeedbackKind, FeedbackPriority, FeedbackStatus (+39 more)

### Community 48 - "monthly-budget.service.unit.test.ts"
Cohesion: 0.36
Nodes (7): buildAccountGroups(), account(), member, preview(), recurring(), rule(), service

### Community 49 - "monthly-budget.repository.ts"
Cohesion: 0.17
Nodes (11): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, MonthlyBudgetRun, MonthlyBudgetRunInsert (+3 more)

### Community 50 - "SmartFinance Testing"
Cohesion: 0.33
Nodes (5): Fast Local Checks, Local Supabase Contract Check, Production Release Checklist, Release-Only Web Smoke, SmartFinance Testing

### Community 51 - "account.schema.ts"
Cohesion: 0.50
Nodes (3): AccountFormInput, AccountFormValues, accountSchema

### Community 52 - "transaction.service.unit.test.ts"
Cohesion: 0.15
Nodes (13): Attachment, isImageAttachment(), listTransactionAttachmentPreviews(), TransactionAttachmentPreview, createSignedUrl, listForTransaction, useTransactionAttachments(), createdTransaction (+5 more)

### Community 53 - "shared/theme/colors.ts"
Cohesion: 0.40
Nodes (4): blueColors, darkColors, lightColors, ThemeColors

### Community 55 - "send-household-invitation/index.ts"
Cohesion: 0.23
Nodes (10): baseCorsHeaders, EmailLogInsert, extractInviteTokenFromLink(), getAllowedOrigins(), getCorsHeaders(), HouseholdRole, InvitePayload, normalizeHttpOrigin() (+2 more)

### Community 56 - "dependencies"
Cohesion: 0.13
Nodes (15): eslint, expo-constants, expo-crypto, expo-glass-effect, dependencies, eslint, expo-constants, expo-crypto (+7 more)

### Community 57 - "vercel.json"
Cohesion: 0.18
Nodes (10): maxDuration, buildCommand, cleanUrls, crons, functions, api/cron/execute-recurring.js, headers, outputDirectory (+2 more)

### Community 58 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativewind }

### Community 60 - "mocks/supabase.ts"
Cohesion: 0.67
Nodes (3): createSupabaseMock(), createSupabaseQuery(), QueryResult

### Community 68 - "AuthProvider.tsx"
Cohesion: 0.09
Nodes (27): currencyOptions, languageOptions, SettingsScreen(), themeOptions, shouldRefreshClaimsForAuthEvent(), ShouldRefreshClaimsInput, backup, mockedBackupService (+19 more)

### Community 69 - ".importHouseholdBackup"
Cohesion: 0.36
Nodes (8): buildIncomeInputInserts(), getCurrentProfile(), getMemberFallbackMap(), insertMany(), newId(), newIdMap(), normalizeEmail(), throwIfError()

### Community 70 - "core/index.ts"
Cohesion: 0.26
Nodes (13): COOKIE_CONSENT_VERSION, CookieConsent, CookieConsentChoices, createCookieConsent(), isRecord(), isValidIsoDate(), parseCookieConsent(), parseStoredCookieConsent() (+5 more)

### Community 84 - "useCookieConsent"
Cohesion: 0.18
Nodes (11): CookiePolicyPage(), PolicyFact(), PolicySection(), styles, mockUseCookieConsent, VercelSpeedInsights(), ConsentButton(), CookieConsentBanner() (+3 more)

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

### Community 92 - "invalidateHouseholdData"
Cohesion: 0.10
Nodes (18): emptyDraft(), ruleKindOf(), today(), TransfersContent(), useArchiveAccount(), useCreateAccount(), useDeleteAccount(), useUpdateAccount() (+10 more)

### Community 95 - "transaction-automation.repository.ts"
Cohesion: 0.12
Nodes (7): MerchantAliasInsert, Rule, RuleInsert, SplitInsert, TagInsert, TransactionAutomationRepository, TransactionUpdate

### Community 100 - "Phase 2 — Importing, reconciliation, and recurring money"
Cohesion: 0.25
Nodes (8): Additional file formats, CSV import wizard, Duplicate detection and reconciliation, Phase 2 completion criteria, Phase 2 — Importing, reconciliation, and recurring money, Projected balances, Recurring detection and calendar, Subscription dashboard

### Community 102 - "app-tabs.web.tsx"
Cohesion: 0.17
Nodes (9): plugins, expo-image, expo-localization, expo-status-bar, expo-web-browser, CustomTabList(), styles, ExternalLink() (+1 more)

### Community 103 - "SmartFinance product roadmap"
Cohesion: 0.29
Nodes (6): Deferred or country-dependent services, Product principles, Research references, SmartFinance product roadmap, Status legend, Suggested next implementation sequence

### Community 105 - "Phase 8 — Smart assistance and data ownership"
Cohesion: 0.29
Nodes (7): Anomaly detection, Data portability and integrations, Explainable financial assistant, Phase 8 completion criteria, Phase 8 — Smart assistance and data ownership, Platform improvements, Receipt OCR

### Community 106 - "storage.web.ts"
Cohesion: 0.25
Nodes (6): CookieConsentState, CookieConsentStorage, clearOptionalPreferenceStorage(), cookieConsentStorage, getBrowserStorage(), OPTIONAL_PREFERENCE_KEYS

### Community 108 - "transactions.repository.ts"
Cohesion: 0.12
Nodes (12): CreateTransferInput, TransferService, CategorySuggestionHistoryRow, CreateTransferInput, MonthlyCategorySpending, MonthlySummary, TitleSuggestionHistoryRow, Transaction (+4 more)

### Community 109 - "Findings"
Cohesion: 0.13
Nodes (14): Executive assessment, Findings, Official Supabase references reviewed, Positive controls, Required remote verification, SR-01 — No authenticated account-deletion workflow, SR-02 — Household backup is not a complete personal-data export, SR-03 — Auth/session settings are not evidenced as production-hardened (+6 more)

### Community 110 - "Phase 3 — Advanced budgeting"
Cohesion: 0.29
Nodes (7): Budget rollover, Category targets, Flexible planning periods, Phase 3 — Advanced budgeting, Phase 3 completion criteria, Safe-to-spend, Zero-based and envelope budgeting

### Community 111 - "useAuth"
Cohesion: 0.16
Nodes (22): getToken(), InviteScreen(), AccountsScreen(), MembersScreen(), roles, RecurringTransferCreateForm(), useAccountsWithBalances(), HouseholdRole (+14 more)

### Community 112 - "Phase 1 — Transaction automation and reporting"
Cohesion: 0.29
Nodes (7): Merchant normalization, Phase 1 completion criteria, Phase 1 — Transaction automation and reporting, Reports, Split transactions, Tags, flags, and bulk editing, Transaction rules

### Community 113 - "Privacy readiness implementation backlog"
Cohesion: 0.18
Nodes (10): Account deletion and erasure, Next engineering tranche, P0 — release and compliance-claim blockers, P1 — authentication and application security, P1 — data-subject rights, P1 — retention and minimization, P2 — governance and operations, Personal-data export (+2 more)

### Community 115 - "adaptiveIcon"
Cohesion: 0.22
Nodes (9): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+1 more)

### Community 118 - "extra"
Cohesion: 0.25
Nodes (8): projectId, extra, eas, release, router, build, channel, commit

### Community 120 - "icon-picker.tsx"
Cohesion: 0.33
Nodes (6): ALL_ICON_NAMES, DEFAULT_ICON_NAMES, IconPicker(), IconPickerProps, STARTER_ICON_NAMES, styles

### Community 126 - "base.repository.unit.test.ts"
Cohesion: 0.67
Nodes (3): createClient(), createQuery(), QueryResult

### Community 131 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (10): @vercel/speed-insights, NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), ActionButton(), CookieConsentBanner(), PreferenceRow(), styles (+2 more)

### Community 137 - "Phase 4 — Net worth and debt management"
Cohesion: 0.33
Nodes (6): Debt payoff planner, Liability accounts, Manual assets, Net-worth history, Phase 4 completion criteria, Phase 4 — Net worth and debt management

### Community 141 - "date-picker-field.tsx"
Cohesion: 0.33
Nodes (9): addMonths(), DateGranularity, DatePickerField(), DatePickerFieldProps, formatDateValue(), formatDisplayValue(), isSameDay(), MonthPickerField() (+1 more)

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

### Community 177 - "client.ts"
Cohesion: 0.10
Nodes (14): SignOutButton(), Account, AccountBalance, Client, ImportBatchRow, table(), TransactionImportRepository, AuthService (+6 more)

### Community 179 - "public-overview-screen.web.tsx"
Cohesion: 0.08
Nodes (17): LanguageMenu(), options, styles, Brand(), Cta(), featureIcons, LandingScreen(), styles (+9 more)

### Community 191 - "HouseholdBackupService"
Cohesion: 0.18
Nodes (5): asBackupFile(), fetchPaged(), HouseholdBackupService, safeNamePart(), Json

## Knowledge Gaps
- **728 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+723 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **72 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `expo-notifications`, `expo-router`, `expo-splash-screen`, `app/_layout.tsx`, `expo-symbols`, `@expo/ui`, `@expo/vector-icons`, `expo-web-browser`, `i18next`, `@internationalized/date`, `nativewind`, `react`, `react-aria-components`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-css`, `react-native-gesture-handler`, `react-native-get-random-values`, `react-native-mmkv`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `scripts`, `prettier`, `react-native-web`, `react-native-worklets`, `@react-navigation/drawer`, `@react-oauth/google`, `@storybook/addon-ondevice-controls`, `@storybook/react-native`, `@supabase/supabase-js`, `@tanstack/react-query`, `unleash-proxy-client`, `zod`, `expo`, `expo-status-bar`, `husky`, `expo-system-ui`, `react-i18next`, `react-native-svg`, `eslint-config-expo`, `react-native-url-polyfill`, `expo-application`, `expo-linking`, `expo-auth-session`, `expo-dev-client`, `expo-device`, `expo-document-picker`, `expo-font`, `expo-image`, `expo-linear-gradient`, `expo-localization`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `app/_layout.tsx` to `dependencies`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `useResponsiveMetrics`, `savings.tsx`, `app/_layout.tsx`, `diagnostics.tsx`, `login-callback-screen.tsx`, `themed-text.tsx`, `categories/hooks/index.ts`, `date-picker-field.tsx`, `transfers.tsx`, `src/theme/spacing.ts`, `(protected)/index.tsx`, `budget.tsx`, `transactions.tsx`, `ProfileOnboardingProvider.tsx`, `feedback/index.ts`, `src/theme/ThemeProvider.tsx`, `spacing`, `public-overview-screen.web.tsx`, `AuthProvider.tsx`, `useCookieConsent`, `invalidateHouseholdData`, `app-tabs.web.tsx`, `useAuth`, `icon-picker.tsx`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _728 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `monthly-budget.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `useResponsiveMetrics` be split into smaller, more focused modules?**
  _Cohesion score 0.09475806451612903 - nodes in this community are weakly interconnected._
- **Should `savings.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._