# Graph Report - SmartFinance  (2026-08-03)

## Corpus Check
- 413 files · ~224,351 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2105 nodes · 4591 edges · 181 communities (109 shown, 72 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- monthly-budget.service.ts
- spacing
- feedback.tsx
- notification-center.tsx
- RepoResult
- household-backup.service.ts
- insights.tsx
- (protected)/index.tsx
- expo-router
- app-tabs.web.tsx
- migrated-page.tsx
- expo
- savings.tsx
- invalidateHouseholdData
- session.types.ts
- transfers.tsx
- src/theme/typography.ts
- transaction-import.repository.ts
- CategoriesService
- grouped-account-select.tsx
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
- recurring.transactions.repository.ts
- data-surface.tsx
- transaction.schema.ts
- admin-feedback.tsx
- monthly-budget.service.unit.test.ts
- monthly-budget.repository.ts
- SmartFinance Testing
- account.schema.ts
- repositories/index.ts
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
- grouped-destination-select.tsx
- web-smoke.spec.ts
- tsconfig.test.json
- serve-dist.mjs
- Expo HAS CHANGED
- buildCleanBackup
- profiles.repository.ts
- AccountsService
- entry-screen.tsx
- global.d.ts
- TransactionAutomationRepository
- dispatch-notification/index.ts
- Phase 2 — Importing, reconciliation, and recurring money
- createDefaultIncomeDrafts
- SmartFinance product roadmap
- Phase 8 — Smart assistance and data ownership
- accounts.tsx
- expo-application
- transactions.repository.ts
- Findings
- Phase 3 — Advanced budgeting
- useAuth
- Phase 1 — Transaction automation and reporting
- Privacy readiness implementation backlog
- expo-linking
- expo-auth-session
- expo-dev-client
- expo-device
- expo-document-picker
- expo-font
- expo-image
- expo-linear-gradient
- expo-localization
- expo-notifications
- expo-router
- expo-splash-screen
- RootProvider.tsx
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
- diagnostics.tsx
- SmartFinance privacy and data inventory
- Privacy legal and business inputs
- Phase 7 — Investments and long-term planning
- public-overview-screen.tsx
- SmartFinance processor and recipient register
- client.ts
- useTheme
- households.repository.ts
- category-suggestions/index.ts
- expo
- expo-status-bar
- run-security-check.mjs
- husky
- expo-system-ui
- react-i18next
- react-native-svg
- react-native-url-polyfill
- Json

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

## Communities (181 total, 72 thin omitted)

### Community 0 - "monthly-budget.service.ts"
Cohesion: 0.09
Nodes (25): Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, getCashAccountIds(), getExcludedMonths(), getMemberLabel() (+17 more)

### Community 1 - "spacing"
Cohesion: 0.13
Nodes (24): AllocationDonut(), DropdownField(), EmptyState(), MetricCard(), TableCell(), TableRow(), getMemberLabel(), HouseholdMemberSelect() (+16 more)

### Community 2 - "feedback.tsx"
Cohesion: 0.15
Nodes (13): EmptyState(), FeedbackFrequency, FeedbackItem, FeedbackKind, FeedbackReply, FeedbackStatus, FeedbackTimelineCard(), frequencies (+5 more)

### Community 3 - "notification-center.tsx"
Cohesion: 0.13
Nodes (12): NotificationCenter(), styles, useMarkNotificationRead(), useNotifications(), AppNotification, NotificationsService, registerWebPushDevice(), mockRegisterWebPushSubscription (+4 more)

### Community 4 - "RepoResult"
Cohesion: 0.06
Nodes (5): RepoResult, CategoriesRepository, HouseholdsRepository, MonthlyBudgetRepository, TransactionsRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (37): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+29 more)

### Community 6 - "insights.tsx"
Cohesion: 0.09
Nodes (43): dateRange(), InsightsScreen(), localDate(), RangePreset, useAccountsWithBalances(), projectAccountBalances(), buildFinancialInsights(), BuildFinancialInsightsInput (+35 more)

### Community 7 - "(protected)/index.tsx"
Cohesion: 0.19
Nodes (18): AccountOverviewTable(), AllocationKey, AllocationLegend(), AllocationSegment, DashboardAccount, DashboardPot, DashboardScreen(), formatLocalDate() (+10 more)

### Community 8 - "expo-router"
Cohesion: 0.14
Nodes (15): expo-router, AuthLayout(), LoginCallbackScreen(), styles, buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo() (+7 more)

### Community 9 - "app-tabs.web.tsx"
Cohesion: 0.10
Nodes (24): plugins, expo-image, expo-localization, expo-status-bar, expo-web-browser, CustomTabList(), styles, ExternalLink() (+16 more)

### Community 10 - "migrated-page.tsx"
Cohesion: 0.14
Nodes (12): Button(), ButtonProps, CardProps, Field(), FieldProps, PageProps, PillProps, SectionProps (+4 more)

### Community 11 - "expo"
Cohesion: 0.06
Nodes (35): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+27 more)

### Community 12 - "savings.tsx"
Cohesion: 0.06
Nodes (56): AccountGroup, AccountGroupView, AccountOption, buildAccountGroups(), buildForecastYearRows(), buildSelectionMap(), createStyles(), ForecastViewMode (+48 more)

### Community 13 - "invalidateHouseholdData"
Cohesion: 0.11
Nodes (21): CategoriesScreen(), CategoryEditDraft, categoryIconSuggestions, CategoryLike, getTypeColor(), getTypeIcon(), types, DropdownMenu() (+13 more)

### Community 14 - "session.types.ts"
Cohesion: 0.21
Nodes (8): SessionRepository, SessionService, Claims, HouseholdMember, SessionState, UserProfile, mockLoadProfileAndHousehold, useSession()

### Community 15 - "transfers.tsx"
Cohesion: 0.11
Nodes (23): DatePickerField(), emptyDraft(), formatDateInput(), frequencies, Frequency, months, MovementDraft, MovementFields() (+15 more)

### Community 16 - "src/theme/typography.ts"
Cohesion: 0.08
Nodes (30): samples, StorybookPreviewScreen(), AttachmentPreview(), AttachmentPreviewProps, styles, FinanceMetricCard(), FinanceMetricCardProps, FinanceMetricTone (+22 more)

### Community 17 - "transaction-import.repository.ts"
Cohesion: 0.11
Nodes (10): Client, ImportBatchRow, table(), TransactionImportRepository, hasCrossHouseholdSeed, householdScopedTables, localUrls, privateTables (+2 more)

### Community 18 - "CategoriesService"
Cohesion: 0.21
Nodes (4): useChildCategories(), useTopLevelCategories(), CategoriesService, CategoryType

### Community 19 - "grouped-account-select.tsx"
Cohesion: 0.21
Nodes (17): AccountLike, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedAccountSelect(), GroupedAccountSelectProps, MemberLike (+9 more)

### Community 20 - "Database"
Cohesion: 0.06
Nodes (19): Attachment, AttachmentsRepository, BaseRepository, Insert, ListOptions, Row, TableName, createClient() (+11 more)

### Community 21 - "budget.tsx"
Cohesion: 0.13
Nodes (30): AccountLike, BudgetScreen(), buildPotNameByAccountId(), formatMonthSelection(), getMemberAccentColor(), getMemberLabel(), getRuleRowKey(), getSectionBadgeIcon() (+22 more)

### Community 22 - "transaction.service.ts"
Cohesion: 0.12
Nodes (14): ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName(), TransactionAttachmentInput, TransactionsService (+6 more)

### Community 23 - "transactions.tsx"
Cohesion: 0.11
Nodes (23): AttachmentDraft, createStyles(), DatePickerField(), DropdownFieldProps, formatDateInputValue(), parseDateInputValue(), TransactionEditDraft, TransactionsScreen() (+15 more)

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
Cohesion: 0.12
Nodes (11): AccountIdInput, CreateAccountInput, UpdateAccountInput, Account, CreateAccountDTO, NewAccount, UpdateAccount, UpdateAccountDTO (+3 more)

### Community 35 - "ProfileOnboardingProvider.tsx"
Cohesion: 0.11
Nodes (30): GuideModal(), GuideModalProps, styles, getOnboardingGuide(), onboardingGuides, emptyProgress(), OnboardingContext, OnboardingContextValue (+22 more)

### Community 36 - "HouseholdsService"
Cohesion: 0.12
Nodes (3): useDefaultHousehold(), useSetDefaultHousehold(), HouseholdsService

### Community 37 - "exclude"
Cohesion: 0.09
Nodes (22): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, test, **/*.ts, **/*.tsx (+14 more)

### Community 38 - "catalog.ts"
Cohesion: 0.11
Nodes (33): CatalogRow, firstString(), highlightText(), isPublished(), listPublishedReleases(), normalizePublishedRelease(), parseHighlights(), releaseQueryKeys (+25 more)

### Community 39 - "feedback/index.ts"
Cohesion: 0.11
Nodes (24): FeedbackScreen(), key, useAddFeedbackReply(), useAdminFeedback(), useCreateFeedback(), useMyFeedback(), useUpdateAdminFeedback(), useWithdrawFeedback() (+16 more)

### Community 40 - "requireIdFor"
Cohesion: 0.26
Nodes (15): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts() (+7 more)

### Community 41 - "recurring-transactions.service.ts"
Cohesion: 0.15
Nodes (6): CreateRecurringTransactionInput, Frequency, RecurringTransactionsService, RuleKind, TransactionType, UpdateRecurringTransactionInput

### Community 42 - "src/theme/ThemeProvider.tsx"
Cohesion: 0.09
Nodes (17): AnimatedIcon(), glowKeyframe, keyframe, logoKeyframe, styles, AuthLoadingTransition(), FigureColors, styles (+9 more)

### Community 43 - "SmartFinance command helper"
Cohesion: 0.10
Nodes (19): Builds, Common troubleshooting, Daily development, Database migrations, Deploy migrations to hosted Supabase, First-time setup, Graphify and Git checks, Packages (+11 more)

### Community 44 - "recurring.transactions.repository.ts"
Cohesion: 0.14
Nodes (5): RecurringRunExecution, RecurringTransaction, RecurringTransactionsRepository, RecurringTransactionWithRelations, QueryResult

### Community 45 - "data-surface.tsx"
Cohesion: 0.15
Nodes (12): Badge(), BadgeProps, BadgeTone, EmptyStateProps, MetricCardProps, styles, Table(), TableCellProps (+4 more)

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "admin-feedback.tsx"
Cohesion: 0.14
Nodes (15): AdminEmpty(), AdminFeedbackItem, AdminFeedbackScreen(), AssignmentFilter, DetailBlock(), FeedbackKind, FeedbackPriority, FeedbackStatus (+7 more)

### Community 48 - "monthly-budget.service.unit.test.ts"
Cohesion: 0.43
Nodes (6): account(), member, preview(), recurring(), rule(), service

### Community 49 - "monthly-budget.repository.ts"
Cohesion: 0.17
Nodes (11): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, MonthlyBudgetRun, MonthlyBudgetRunInsert (+3 more)

### Community 50 - "SmartFinance Testing"
Cohesion: 0.33
Nodes (5): Fast Local Checks, Local Supabase Contract Check, Production Release Checklist, Release-Only Web Smoke, SmartFinance Testing

### Community 51 - "account.schema.ts"
Cohesion: 0.50
Nodes (3): AccountFormInput, AccountFormValues, accountSchema

### Community 52 - "repositories/index.ts"
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
Cohesion: 0.10
Nodes (24): currencyOptions, languageOptions, SettingsScreen(), themeOptions, shouldRefreshClaimsForAuthEvent(), ShouldRefreshClaimsInput, backup, mockedBackupService (+16 more)

### Community 69 - ".importHouseholdBackup"
Cohesion: 0.33
Nodes (7): asBackupFile(), buildIncomeInputInserts(), getCurrentProfile(), insertMany(), newId(), newIdMap(), throwIfError()

### Community 70 - "core/index.ts"
Cohesion: 0.08
Nodes (37): resources, COOKIE_CONSENT_VERSION, CookieConsent, CookieConsentChoices, CookieConsentState, createCookieConsent(), isRecord(), isValidIsoDate() (+29 more)

### Community 84 - "grouped-destination-select.tsx"
Cohesion: 0.27
Nodes (10): AccountLike, DestinationSelection, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedDestinationSelect(), GroupedDestinationSelectProps (+2 more)

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

### Community 100 - "Phase 2 — Importing, reconciliation, and recurring money"
Cohesion: 0.25
Nodes (8): Additional file formats, CSV import wizard, Duplicate detection and reconciliation, Phase 2 completion criteria, Phase 2 — Importing, reconciliation, and recurring money, Projected balances, Recurring detection and calendar, Subscription dashboard

### Community 102 - "createDefaultIncomeDrafts"
Cohesion: 0.67
Nodes (4): createDefaultIncomeDrafts(), mapIncomeInputsToDrafts(), monthKey(), pickDefaultAccountId()

### Community 103 - "SmartFinance product roadmap"
Cohesion: 0.29
Nodes (6): Deferred or country-dependent services, Product principles, Research references, SmartFinance product roadmap, Status legend, Suggested next implementation sequence

### Community 105 - "Phase 8 — Smart assistance and data ownership"
Cohesion: 0.29
Nodes (7): Anomaly detection, Data portability and integrations, Explainable financial assistant, Phase 8 completion criteria, Phase 8 — Smart assistance and data ownership, Platform improvements, Receipt OCR

### Community 106 - "accounts.tsx"
Cohesion: 0.19
Nodes (12): AccountHistoryMode, AccountsScreen(), createStyles(), currencyOptions, EditMode, useArchiveAccount(), useCreateAccount(), useDeleteAccount() (+4 more)

### Community 108 - "transactions.repository.ts"
Cohesion: 0.09
Nodes (17): CreateTransactionDTO, Transaction, TransactionInsert, TransactionUpdate, UpdateTransactionDTO, CreateTransferInput, TransferService, CategorySuggestionHistoryRow (+9 more)

### Community 109 - "Findings"
Cohesion: 0.13
Nodes (14): Executive assessment, Findings, Official Supabase references reviewed, Positive controls, Required remote verification, SR-01 — No authenticated account-deletion workflow, SR-02 — Household backup is not a complete personal-data export, SR-03 — Auth/session settings are not evidenced as production-hardened (+6 more)

### Community 110 - "Phase 3 — Advanced budgeting"
Cohesion: 0.29
Nodes (7): Budget rollover, Category targets, Flexible planning periods, Phase 3 — Advanced budgeting, Phase 3 completion criteria, Safe-to-spend, Zero-based and envelope budgeting

### Community 111 - "useAuth"
Cohesion: 0.18
Nodes (20): getToken(), InviteScreen(), MembersScreen(), roles, Page(), Section(), HouseholdRole, useAcceptHouseholdInvitation() (+12 more)

### Community 112 - "Phase 1 — Transaction automation and reporting"
Cohesion: 0.29
Nodes (7): Merchant normalization, Phase 1 completion criteria, Phase 1 — Transaction automation and reporting, Reports, Split transactions, Tags, flags, and bulk editing, Transaction rules

### Community 113 - "Privacy readiness implementation backlog"
Cohesion: 0.18
Nodes (10): Account deletion and erasure, Next engineering tranche, P0 — release and compliance-claim blockers, P1 — authentication and application security, P1 — data-subject rights, P1 — retention and minimization, P2 — governance and operations, Personal-data export (+2 more)

### Community 131 - "RootProvider.tsx"
Cohesion: 0.08
Nodes (21): @vercel/speed-insights, NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), mockUseCookieConsent, VercelSpeedInsights(), ActionButton(), CookieConsentBanner() (+13 more)

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

### Community 167 - "diagnostics.tsx"
Cohesion: 0.13
Nodes (16): DiagnosticItem, DiagnosticRow(), DiagnosticsScreen(), DiagnosticStatus, maskSecret(), styles, Card(), DrawerContent() (+8 more)

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
Cohesion: 0.09
Nodes (19): SignOutButton(), CreateInvitationInput, createInviteLinks(), HouseholdRole, InvitationDetails, normalizeInviteWebBase(), MerchantAliasInsert, Rule (+11 more)

### Community 179 - "useTheme"
Cohesion: 0.07
Nodes (34): DateFilterField(), CookiePolicyPage(), PolicyFact(), PolicySection(), styles, PublicLayout(), AnimatedIcon(), AnimatedSplashOverlay() (+26 more)

### Community 180 - "households.repository.ts"
Cohesion: 0.25
Nodes (7): Household, HouseholdInvitation, HouseholdInvitationDetails, HouseholdListItem, HouseholdMember, HouseholdRole, MyHouseholdInvitation

### Community 182 - "category-suggestions/index.ts"
Cohesion: 0.15
Nodes (20): normalizeTransactionTitle(), transactionTitleTokens(), rankCategorySuggestion(), RankedCandidate, titleSimilarity(), resolveCategorySelection(), ResolveCategorySelectionInput, suggestion (+12 more)

### Community 191 - "Json"
Cohesion: 0.33
Nodes (4): getMemberFallbackMap(), normalizeEmail(), safeNamePart(), Json

## Knowledge Gaps
- **728 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+723 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **72 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `expo-notifications`, `expo-router`, `expo-splash-screen`, `RootProvider.tsx`, `expo-symbols`, `@expo/ui`, `@expo/vector-icons`, `expo-web-browser`, `i18next`, `@internationalized/date`, `nativewind`, `react`, `react-aria-components`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-css`, `react-native-gesture-handler`, `react-native-get-random-values`, `react-native-mmkv`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `scripts`, `prettier`, `react-native-web`, `react-native-worklets`, `@react-navigation/drawer`, `@react-oauth/google`, `@storybook/addon-ondevice-controls`, `@storybook/react-native`, `@supabase/supabase-js`, `@tanstack/react-query`, `unleash-proxy-client`, `zod`, `expo`, `expo-status-bar`, `husky`, `expo-system-ui`, `react-i18next`, `react-native-svg`, `eslint-config-expo`, `react-native-url-polyfill`, `expo-application`, `expo-linking`, `expo-auth-session`, `expo-dev-client`, `expo-device`, `expo-document-picker`, `expo-font`, `expo-image`, `expo-linear-gradient`, `expo-localization`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `RootProvider.tsx` to `dependencies`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `spacing`, `feedback.tsx`, `RootProvider.tsx`, `notification-center.tsx`, `insights.tsx`, `(protected)/index.tsx`, `expo-router`, `app-tabs.web.tsx`, `migrated-page.tsx`, `savings.tsx`, `invalidateHouseholdData`, `date-picker-field.tsx`, `transfers.tsx`, `src/theme/typography.ts`, `grouped-account-select.tsx`, `budget.tsx`, `transactions.tsx`, `ProfileOnboardingProvider.tsx`, `diagnostics.tsx`, `feedback/index.ts`, `src/theme/ThemeProvider.tsx`, `data-surface.tsx`, `admin-feedback.tsx`, `AuthProvider.tsx`, `grouped-destination-select.tsx`, `accounts.tsx`, `useAuth`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _728 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `monthly-budget.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `spacing` be split into smaller, more focused modules?**
  _Cohesion score 0.1339031339031339 - nodes in this community are weakly interconnected._
- **Should `notification-center.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13230769230769232 - nodes in this community are weakly interconnected._