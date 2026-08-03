# Graph Report - SmartFinance  (2026-07-30)

## Corpus Check
- 347 files · ~187,878 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1739 nodes · 3812 edges · 169 communities (93 shown, 76 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ee8a95ed`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- budget.tsx
- dependencies
- savings.tsx
- useTheme
- RepoResult
- household-backup.service.ts
- monthly-budget.service.ts
- (protected)/index.tsx
- login-callback-screen.tsx
- app-tabs.web.tsx
- NotificationsProvider.tsx
- expo
- saving-pot-forecast.service.ts
- admin-feedback.tsx
- transaction.service.ts
- transfers.tsx
- src/theme/spacing.ts
- preferencesStore.ts
- AuthProvider.tsx
- AccountsScreen
- app/_layout.tsx
- core/storage.ts
- invalidateHouseholdData
- categories/hooks/index.ts
- monthly-budget.repository.ts
- execute-recurring.js
- repositories/index.ts
- feedback/types.ts
- scripts
- SmartFinance Release Checklist
- date-picker-field.web.tsx
- TransactionsRepository
- reset-project.js
- session.types.ts
- ProfileOnboardingProvider.tsx
- HouseholdsService
- exclude
- catalog.ts
- client.ts
- requireIdFor
- RecurringTransactionsService
- spacing
- Welcome to your Expo app 👋
- recurring.transactions.repository.ts
- monthly-budget.service.unit.test.ts
- transaction.schema.ts
- SettingsScreen
- src/theme/ThemeProvider.tsx
- SavingPotsRepository
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
- grouped-destination-select.tsx
- localStorageService.ts
- shared/theme/shadows.ts
- authUiStore.ts
- query-client.tsx
- nativewind-env.d.ts
- types/index.ts
- AttachmentsRepository
- core/index.ts
- shared/theme/radius.ts
- shared/theme/typography.ts
- shared/theme/untitled-theme.ts
- src/theme/untitled-theme.ts
- expo
- web-smoke.spec.ts
- tsconfig.test.json
- serve-dist.mjs
- Expo HAS CHANGED
- buildCleanBackup
- ProfilesRepository
- useAuth
- AccountsRepository
- global.d.ts
- diagnostics.tsx
- dispatch-notification/index.ts
- themeStore.ts
- public-overview-screen.web.tsx
- RootProvider.tsx
- useCookieConsent
- FeatureFlagProvider.tsx
- icon-picker.tsx
- entry-screen.tsx
- SavingPotsService
- HouseholdBackupService
- base.repository.unit.test.ts
- eslint-config-expo
- useCreateTransfer.ts
- react-native-svg
- expo-application
- expo-auth-session
- expo-dev-client
- run-security-check.mjs
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
- expo-status-bar
- expo-symbols
- expo-system-ui
- @expo/ui
- @expo/vector-icons
- expo-web-browser
- husky
- i18next
- @internationalized/date
- nativewind
- prettier
- react
- react-aria-components
- react-dom
- react-i18next
- react-native
- @react-native-async-storage/async-storage
- react-native-css
- react-native-gesture-handler
- react-native-get-random-values
- react-native-mmkv
- react-native-reanimated
- react-native-safe-area-context
- react-native-screens
- react-native-url-polyfill
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

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 128 edges
2. `useAuth()` - 82 edges
3. `RepoResult` - 79 edges
4. `spacing()` - 73 edges
5. `invalidateHouseholdData()` - 59 edges
6. `BudgetScreen()` - 38 edges
7. `Database` - 37 edges
8. `useResponsiveMetrics()` - 36 edges
9. `typography` - 34 edges
10. `radius` - 28 edges

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

## Communities (169 total, 76 thin omitted)

### Community 0 - "budget.tsx"
Cohesion: 0.12
Nodes (31): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), formatMonthSelection(), getMemberAccentColor(), getMemberLabel(), getRuleRowKey() (+23 more)

### Community 1 - "dependencies"
Cohesion: 0.13
Nodes (15): eslint, expo-constants, expo-crypto, expo-glass-effect, dependencies, eslint, expo-constants, expo-crypto (+7 more)

### Community 2 - "savings.tsx"
Cohesion: 0.16
Nodes (23): AccountGroup, AccountGroupView, AccountOption, buildForecastYearRows(), buildSelectionMap(), createStyles(), ForecastViewMode, ForecastYearRow (+15 more)

### Community 3 - "useTheme"
Cohesion: 0.07
Nodes (53): CategoryEditDraft, categoryIconSuggestions, CategoryLike, types, EmptyState(), FeedbackFrequency, FeedbackItem, FeedbackKind (+45 more)

### Community 4 - "RepoResult"
Cohesion: 0.08
Nodes (4): RepoResult, CategoriesRepository, HouseholdsRepository, MonthlyBudgetRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (38): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+30 more)

### Community 6 - "monthly-budget.service.ts"
Cohesion: 0.09
Nodes (26): Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, findHighestCashAccount(), getCashAccountIds(), getExcludedMonths() (+18 more)

### Community 7 - "(protected)/index.tsx"
Cohesion: 0.10
Nodes (36): AccountOverviewTable(), AllocationDonut(), AllocationKey, AllocationLegend(), AllocationSegment, DashboardAccount, DashboardPot, DashboardScreen() (+28 more)

### Community 8 - "login-callback-screen.tsx"
Cohesion: 0.15
Nodes (14): AuthLayout(), LoginCallbackScreen(), styles, buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo() (+6 more)

### Community 9 - "app-tabs.web.tsx"
Cohesion: 0.08
Nodes (29): plugins, expo-image, expo-localization, expo-status-bar, expo-web-browser, AnimatedIcon(), glowKeyframe, keyframe (+21 more)

### Community 10 - "NotificationsProvider.tsx"
Cohesion: 0.15
Nodes (8): useNotifications(), AppNotification, NotificationsService, registerWebPushDevice(), mockRegisterWebPushSubscription, urlBase64ToUint8Array(), WebPushRegistrationResult, NotificationsProvider()

### Community 11 - "expo"
Cohesion: 0.06
Nodes (35): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+27 more)

### Community 12 - "saving-pot-forecast.service.ts"
Cohesion: 0.12
Nodes (32): addMonths(), addOccurrence(), buildForecastTimeline(), buildSavingPotForecasts(), findCompletionDate(), ForecastContribution, ForecastFrequency, ForecastPot (+24 more)

### Community 13 - "admin-feedback.tsx"
Cohesion: 0.09
Nodes (35): AdminEmpty(), AdminFeedbackItem, AdminFeedbackScreen(), AssignmentFilter, DetailBlock(), FeedbackKind, FeedbackPriority, FeedbackStatus (+27 more)

### Community 14 - "transaction.service.ts"
Cohesion: 0.08
Nodes (24): useTransactions(), useTransactionsInfinite(), ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName() (+16 more)

### Community 15 - "transfers.tsx"
Cohesion: 0.09
Nodes (24): DatePickerField(), emptyDraft(), formatDateInput(), frequencies, Frequency, months, MovementDraft, MovementFields() (+16 more)

### Community 16 - "src/theme/spacing.ts"
Cohesion: 0.10
Nodes (26): expo-router, samples, FinanceMetricCard(), FinanceMetricCardProps, FinanceMetricTone, getToneColors(), styles, FinanceProgressBar() (+18 more)

### Community 17 - "preferencesStore.ts"
Cohesion: 0.26
Nodes (10): resources, AppLanguage, getNativeStorage(), getStoredLanguage(), LanguageOption, LanguageStorage, normalizeLanguage(), setStoredLanguage() (+2 more)

### Community 18 - "AuthProvider.tsx"
Cohesion: 0.17
Nodes (10): shouldRefreshClaimsForAuthEvent(), ShouldRefreshClaimsInput, useUpdatePreferredCurrency(), AuthContext, AuthContextValue, AuthProvider(), completeNativeAuthCallback(), isNativeAuthCallback() (+2 more)

### Community 19 - "AccountsScreen"
Cohesion: 0.11
Nodes (10): AccountsScreen(), useAccounts(), useArchiveAccount(), useCreateAccount(), useDeleteAccount(), useUpdateAccount(), AccountIdInput, AccountsService (+2 more)

### Community 20 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (10): @vercel/speed-insights, NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), ActionButton(), CookieConsentBanner(), PreferenceRow(), styles (+2 more)

### Community 21 - "core/storage.ts"
Cohesion: 0.26
Nodes (6): CookieConsentState, CookieConsentStorage, clearOptionalPreferenceStorage(), cookieConsentStorage, getBrowserStorage(), OPTIONAL_PREFERENCE_KEYS

### Community 22 - "invalidateHouseholdData"
Cohesion: 0.16
Nodes (15): TransactionsScreen(), ruleKindOf(), TransfersScreen(), useCreateRecurringTransaction(), useDeleteRecurringTransaction(), useRecurringExecutionHistory(), useRecurringTransactions(), useToggleRecurringTransaction() (+7 more)

### Community 23 - "categories/hooks/index.ts"
Cohesion: 0.14
Nodes (13): CategoriesScreen(), getTypeColor(), getTypeIcon(), useArchiveCategory(), useCategories(), useChildCategories(), useTopLevelCategories(), useCreateCategory() (+5 more)

### Community 24 - "monthly-budget.repository.ts"
Cohesion: 0.17
Nodes (11): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, MonthlyBudgetRun, MonthlyBudgetRunInsert (+3 more)

### Community 26 - "repositories/index.ts"
Cohesion: 0.16
Nodes (10): CreateRecurringTransactionInput, Frequency, RuleKind, TransactionType, UpdateRecurringTransactionInput, createdTransaction, mockCreate, mockDelete (+2 more)

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

### Community 33 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 34 - "session.types.ts"
Cohesion: 0.23
Nodes (7): SessionRepository, SessionService, Claims, HouseholdMember, SessionState, mockLoadProfileAndHousehold, useSession()

### Community 35 - "ProfileOnboardingProvider.tsx"
Cohesion: 0.10
Nodes (30): GuideModal(), GuideModalProps, styles, getOnboardingGuide(), onboardingGuides, emptyProgress(), OnboardingContext, OnboardingContextValue (+22 more)

### Community 36 - "HouseholdsService"
Cohesion: 0.09
Nodes (7): useCreateHousehold(), CreateInvitationInput, createInviteLinks(), HouseholdRole, HouseholdsService, InvitationDetails, normalizeInviteWebBase()

### Community 37 - "exclude"
Cohesion: 0.09
Nodes (22): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, test, **/*.ts, **/*.tsx (+14 more)

### Community 38 - "catalog.ts"
Cohesion: 0.11
Nodes (33): CatalogRow, firstString(), highlightText(), isPublished(), listPublishedReleases(), normalizePublishedRelease(), parseHighlights(), releaseQueryKeys (+25 more)

### Community 39 - "client.ts"
Cohesion: 0.18
Nodes (8): SignOutButton(), AuthService, StorageService, UploadFile, memoryStorage, supabase, supabaseAnonKey, supabaseUrl

### Community 40 - "requireIdFor"
Cohesion: 0.26
Nodes (15): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts() (+7 more)

### Community 42 - "spacing"
Cohesion: 0.09
Nodes (35): AccountHistoryMode, createStyles(), currencyOptions, EditMode, AttachmentDraft, createStyles(), DateFilterField(), DatePickerField() (+27 more)

### Community 43 - "Welcome to your Expo app 👋"
Cohesion: 0.29
Nodes (6): Get a fresh project, Get started, Join the community, Learn more, Other setup steps, Welcome to your Expo app 👋

### Community 44 - "recurring.transactions.repository.ts"
Cohesion: 0.14
Nodes (5): RecurringRunExecution, RecurringTransaction, RecurringTransactionsRepository, RecurringTransactionWithRelations, QueryResult

### Community 45 - "monthly-budget.service.unit.test.ts"
Cohesion: 0.36
Nodes (7): buildAccountGroups(), account(), member, preview(), recurring(), rule(), service

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "SettingsScreen"
Cohesion: 0.17
Nodes (11): SettingsScreen(), backup, mockedBackupService, mockedUseAuth, useExportHouseholdBackup(), useImportHouseholdBackup(), useDefaultHousehold(), useMyHouseholds() (+3 more)

### Community 48 - "src/theme/ThemeProvider.tsx"
Cohesion: 0.08
Nodes (20): PublicLayout(), AnimatedIcon(), AnimatedSplashOverlay(), glowKeyframe, keyframe, logoKeyframe, styles, AppTabs() (+12 more)

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

### Community 62 - "grouped-destination-select.tsx"
Cohesion: 0.27
Nodes (10): AccountLike, DestinationSelection, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedDestinationSelect(), GroupedDestinationSelectProps (+2 more)

### Community 68 - "types/index.ts"
Cohesion: 0.33
Nodes (5): Account, CreateAccountDTO, NewAccount, UpdateAccount, UpdateAccountDTO

### Community 70 - "core/index.ts"
Cohesion: 0.26
Nodes (13): COOKIE_CONSENT_VERSION, CookieConsent, CookieConsentChoices, createCookieConsent(), isRecord(), isValidIsoDate(), parseCookieConsent(), parseStoredCookieConsent() (+5 more)

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

### Community 92 - "useAuth"
Cohesion: 0.22
Nodes (18): getToken(), InviteScreen(), MembersScreen(), roles, HouseholdRole, useAcceptHouseholdInvitation(), useCreateHouseholdInvitation(), useDeclineHouseholdInvitation() (+10 more)

### Community 95 - "diagnostics.tsx"
Cohesion: 0.25
Nodes (9): DiagnosticItem, DiagnosticRow(), DiagnosticsScreen(), DiagnosticStatus, maskSecret(), styles, isSystemAdminEmail(), SYSTEM_ADMIN_EMAIL_SET (+1 more)

### Community 100 - "themeStore.ts"
Cohesion: 0.36
Nodes (8): isPreferenceStorageAllowed(), getNativeStorage(), getStoredTheme(), normalizeTheme(), setStoredTheme(), ThemeMode, ThemeState, ThemeStorage

### Community 102 - "public-overview-screen.web.tsx"
Cohesion: 0.08
Nodes (18): LanguageMenu(), options, styles, Brand(), Cta(), featureIcons, LandingScreen(), styles (+10 more)

### Community 103 - "RootProvider.tsx"
Cohesion: 0.18
Nodes (8): ModalContext, ModalContextValue, ModalProvider(), QueryProvider(), Toast, ToastContext, ToastContextValue, ToastProvider()

### Community 105 - "useCookieConsent"
Cohesion: 0.29
Nodes (7): CookiePolicyPage(), PolicyFact(), PolicySection(), styles, mockUseCookieConsent, VercelSpeedInsights(), useCookieConsent()

### Community 106 - "FeatureFlagProvider.tsx"
Cohesion: 0.32
Nodes (5): FeatureFlagContext, FeatureFlagContextValue, FeatureFlagProvider(), DEFAULT_FLAGS, FeatureFlagKey

### Community 107 - "icon-picker.tsx"
Cohesion: 0.33
Nodes (6): ALL_ICON_NAMES, DEFAULT_ICON_NAMES, IconPicker(), IconPickerProps, STARTER_ICON_NAMES, styles

### Community 110 - "HouseholdBackupService"
Cohesion: 0.25
Nodes (4): asBackupFile(), HouseholdBackupService, safeNamePart(), Json

### Community 111 - "base.repository.unit.test.ts"
Cohesion: 0.67
Nodes (3): createClient(), createQuery(), QueryResult

### Community 113 - "useCreateTransfer.ts"
Cohesion: 0.33
Nodes (3): useCreateTransfer(), CreateTransferInput, TransferService

### Community 120 - "transaction-list.ts"
Cohesion: 0.48
Nodes (5): compareTransactions(), SortableTransaction, timestamp(), TransactionListSortKey, sortedIds()

### Community 123 - "Database"
Cohesion: 0.08
Nodes (23): Account, AccountBalance, Attachment, BaseRepository, Insert, ListOptions, Row, TableName (+15 more)

## Knowledge Gaps
- **578 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+573 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **76 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `expo-notifications`, `expo-router`, `expo-splash-screen`, `expo-status-bar`, `expo-symbols`, `expo-system-ui`, `@expo/ui`, `@expo/vector-icons`, `expo-web-browser`, `husky`, `i18next`, `@internationalized/date`, `nativewind`, `prettier`, `react`, `react-aria-components`, `react-dom`, `react-i18next`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-css`, `react-native-gesture-handler`, `react-native-get-random-values`, `react-native-mmkv`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `app/_layout.tsx`, `scripts`, `react-native-url-polyfill`, `react-native-web`, `react-native-worklets`, `@react-navigation/drawer`, `@react-oauth/google`, `@storybook/addon-ondevice-controls`, `@storybook/react-native`, `@supabase/supabase-js`, `@tanstack/react-query`, `unleash-proxy-client`, `zod`, `expo`, `eslint-config-expo`, `react-native-svg`, `expo-application`, `expo-auth-session`, `expo-dev-client`, `expo-device`, `expo-document-picker`, `expo-font`, `expo-image`, `expo-linear-gradient`, `expo-linking`, `expo-localization`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `app/_layout.tsx` to `dependencies`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `budget.tsx`, `savings.tsx`, `(protected)/index.tsx`, `login-callback-screen.tsx`, `app-tabs.web.tsx`, `admin-feedback.tsx`, `transfers.tsx`, `src/theme/spacing.ts`, `AccountsScreen`, `app/_layout.tsx`, `invalidateHouseholdData`, `categories/hooks/index.ts`, `ProfileOnboardingProvider.tsx`, `spacing`, `SettingsScreen`, `src/theme/ThemeProvider.tsx`, `grouped-destination-select.tsx`, `useAuth`, `diagnostics.tsx`, `public-overview-screen.web.tsx`, `useCookieConsent`, `icon-picker.tsx`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _578 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `budget.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.06892655367231638 - nodes in this community are weakly interconnected._