# Graph Report - SmartFinance  (2026-07-22)

## Corpus Check
- 327 files · ~181,236 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1573 nodes · 3488 edges · 106 communities (85 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e092da95`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- dependencies
- recurring.tsx
- accounts.tsx
- RepoResult
- household-backup.service.ts
- monthly-budget.service.ts
- index.ts
- google-sign-in-button.tsx
- app-tabs.web.tsx
- RootProvider.tsx
- expo
- categories.tsx
- transfers.tsx
- transaction.service.ts
- invalidateHouseholdData
- settings.tsx
- monthly-budget.repository.ts
- index.tsx
- HouseholdsService
- animated-icon.web.tsx
- useTheme
- households.repository.ts
- CategoriesService
- selection-shell.tsx
- execute-recurring.js
- requireIdFor
- session.types.ts
- scripts
- SmartFinance Release Checklist
- index.ts
- transactions.repository.ts
- reset-project.js
- grouped-destination-select.tsx
- HouseholdsService
- .importHouseholdBackup
- tsconfig.json
- index.ts
- households.service.ts
- SavingPotsService
- devDependencies
- useHouseholdBackup.ts
- Welcome to your Expo app 👋
- RecurringTransactionsRepository
- RecurringTransactionsService
- transaction.schema.ts
- members.tsx
- ThemeProvider.tsx
- saving-pots.repository.ts
- SmartFinance Testing
- account.schema.ts
- .importHouseholdBackup
- colors.ts
- index.ts
- index.ts
- run-local-contract-tests.mjs
- vercel.json
- metro.config.js
- useAuthContext.ts
- supabase.ts
- eslint.config.js
- households.repository.ts
- localStorageService.ts
- shadows.ts
- authUiStore.ts
- query-client.tsx
- nativewind-env.d.ts
- index.tsx
- radius.ts
- typography.ts
- untitled-theme.ts
- untitled-theme.ts
- AccountsRepository
- web-smoke.spec.ts
- tsconfig.test.json
- serve-dist.mjs
- Expo HAS CHANGED
- buildCleanBackup
- grouped-account-select.tsx
- SettingsScreen
- SavingPotsRepository
- global.d.ts
- queryClient
- normalizeEmail
- SavingPotsService
- SavingPotsRepository
- error-context.md
- run-security-check.mjs

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 120 edges
2. `useAuth()` - 82 edges
3. `RepoResult` - 79 edges
4. `spacing()` - 73 edges
5. `invalidateHouseholdData()` - 59 edges
6. `BudgetScreen()` - 38 edges
7. `Database` - 37 edges
8. `typography` - 34 edges
9. `useResponsiveMetrics()` - 33 edges
10. `radius` - 28 edges

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

## Communities (106 total, 21 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.12
Nodes (32): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), formatMonthSelection(), getMemberAccentColor(), getMemberLabel(), getRuleRowKey() (+24 more)

### Community 1 - "dependencies"
Cohesion: 0.03
Nodes (59): dependencies, eslint, eslint-config-expo, expo, expo-application, expo-auth-session, expo-constants, expo-crypto (+51 more)

### Community 2 - "recurring.tsx"
Cohesion: 0.17
Nodes (19): AccountOverviewTable(), AllocationDonut(), AllocationKey, AllocationLegend(), AllocationSegment, DashboardAccount, DashboardPot, DashboardScreen() (+11 more)

### Community 3 - "accounts.tsx"
Cohesion: 0.07
Nodes (43): AdminEmpty(), AdminFeedbackItem, AdminFeedbackScreen(), AssignmentFilter, DetailBlock(), FeedbackKind, FeedbackPriority, FeedbackStatus (+35 more)

### Community 4 - "RepoResult"
Cohesion: 0.08
Nodes (4): RepoResult, CategoriesRepository, HouseholdsRepository, MonthlyBudgetRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (37): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+29 more)

### Community 6 - "monthly-budget.service.ts"
Cohesion: 0.12
Nodes (21): Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, findHighestCashAccount(), getCashAccountIds(), getExcludedMonths() (+13 more)

### Community 7 - "index.ts"
Cohesion: 0.09
Nodes (41): AccountHistoryMode, accountTypes, currencyOptions, EditMode, AttachmentDraft, DateFilterField(), DatePickerField(), DropdownField() (+33 more)

### Community 8 - "google-sign-in-button.tsx"
Cohesion: 0.19
Nodes (12): AuthLayout(), LoginCallbackScreen(), styles, buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo() (+4 more)

### Community 9 - "app-tabs.web.tsx"
Cohesion: 0.13
Nodes (19): CustomTabList(), styles, ExternalLink(), Props, HintRowProps, styles, styles, ThemedText() (+11 more)

### Community 10 - "RootProvider.tsx"
Cohesion: 0.05
Nodes (28): @vercel/speed-insights, NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), NotificationCenter(), VercelSpeedInsights(), useMarkNotificationRead(), useNotifications(), AppNotification (+20 more)

### Community 11 - "expo"
Cohesion: 0.05
Nodes (36): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+28 more)

### Community 12 - "categories.tsx"
Cohesion: 0.12
Nodes (32): addMonths(), addOccurrence(), buildForecastTimeline(), buildSavingPotForecasts(), findCompletionDate(), ForecastContribution, ForecastFrequency, ForecastPot (+24 more)

### Community 13 - "transfers.tsx"
Cohesion: 0.10
Nodes (23): AccountLike, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedAccountSelect(), GroupedAccountSelectProps, MemberLike (+15 more)

### Community 14 - "transaction.service.ts"
Cohesion: 0.09
Nodes (25): ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName(), TransactionAttachmentInput, createdTransaction (+17 more)

### Community 15 - "invalidateHouseholdData"
Cohesion: 0.10
Nodes (23): DatePickerField(), formatDateInput(), frequencies, Frequency, months, MovementDraft, MovementFields(), MovementKind (+15 more)

### Community 16 - "settings.tsx"
Cohesion: 0.10
Nodes (24): samples, StorybookPreviewScreen(), FinanceMetricCard(), FinanceMetricCardProps, FinanceMetricTone, getToneColors(), styles, FinanceProgressBar() (+16 more)

### Community 17 - "monthly-budget.repository.ts"
Cohesion: 0.06
Nodes (33): GoogleLoginScreen(), SignOutButton(), key, useCreateFeedback(), useMyFeedback(), useUpdateAdminFeedback(), useWithdrawFeedback(), addFeedbackReply() (+25 more)

### Community 18 - "index.tsx"
Cohesion: 0.18
Nodes (9): backup, mockedBackupService, mockedUseAuth, AuthContext, AuthContextValue, AuthProvider(), completeNativeAuthCallback(), isNativeAuthCallback() (+1 more)

### Community 19 - "HouseholdsService"
Cohesion: 0.08
Nodes (16): AccountsScreen(), createStyles(), useArchiveAccount(), useCreateAccount(), useDeleteAccount(), useUpdateAccount(), AccountIdInput, AccountsService (+8 more)

### Community 20 - "animated-icon.web.tsx"
Cohesion: 0.13
Nodes (16): currencyOptions, languageOptions, SettingsScreen(), themeOptions, usePlatformAdminAccess(), useExportHouseholdBackup(), useImportHouseholdBackup(), HouseholdBackupFile (+8 more)

### Community 21 - "useTheme"
Cohesion: 0.06
Nodes (38): AccountGroup, AccountGroupView, AccountOption, buildAccountGroups(), buildForecastYearRows(), buildSelectionMap(), createStyles(), ForecastViewMode (+30 more)

### Community 22 - "households.repository.ts"
Cohesion: 0.15
Nodes (14): DiagnosticItem, DiagnosticRow(), DiagnosticsScreen(), DiagnosticStatus, maskSecret(), styles, DrawerContent(), getGuideKeyForPathname() (+6 more)

### Community 23 - "CategoriesService"
Cohesion: 0.12
Nodes (18): CategoriesScreen(), CategoryEditDraft, categoryIconSuggestions, CategoryLike, getTypeColor(), getTypeIcon(), types, useArchiveCategory() (+10 more)

### Community 24 - "selection-shell.tsx"
Cohesion: 0.33
Nodes (9): addMonths(), DateGranularity, DatePickerField(), DatePickerFieldProps, formatDateValue(), formatDisplayValue(), isSameDay(), MonthPickerField() (+1 more)

### Community 26 - "requireIdFor"
Cohesion: 0.11
Nodes (20): CreateRecurringTransactionInput, Frequency, RuleKind, TransactionType, UpdateRecurringTransactionInput, Account, AccountBalance, Attachment (+12 more)

### Community 27 - "session.types.ts"
Cohesion: 0.08
Nodes (26): AdminFeedbackFilters, AdminFeedbackPage, appContextToJson(), AppRelease, AppReleasePlatform, cleanRoute(), cleanString(), Feedback (+18 more)

### Community 28 - "scripts"
Cohesion: 0.06
Nodes (35): devDependencies, @expo/ngrok, jest, jest-expo, @playwright/test, postcss, react-test-renderer, tailwindcss (+27 more)

### Community 30 - "SmartFinance Release Checklist"
Cohesion: 0.20
Nodes (9): Auth And Routing, Background Notifications, Build Gates, Environment, Finance Semantics, Recurring Automation, Responsive UI, Security Headers (+1 more)

### Community 31 - "index.ts"
Cohesion: 0.31
Nodes (7): calendarButtonStyle, DateGranularity, DatePickerField(), DatePickerFieldProps, formatDateValue(), formatDisplayValue(), toDateValue()

### Community 33 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 34 - "grouped-destination-select.tsx"
Cohesion: 0.13
Nodes (10): createStyles(), getTransactionTypeIcon(), TransactionsScreen(), useCreateTransaction(), useDeleteTransaction(), useTransactions(), useTransactionsInfinite(), useUpdateTransaction() (+2 more)

### Community 35 - "HouseholdsService"
Cohesion: 0.12
Nodes (28): SectionGuideButton(), GuideModal(), getOnboardingGuide(), onboardingGuides, emptyProgress(), OnboardingContext, OnboardingContextValue, OnboardingProvider() (+20 more)

### Community 36 - ".importHouseholdBackup"
Cohesion: 0.09
Nodes (8): useDefaultHousehold(), useSetDefaultHousehold(), CreateInvitationInput, createInviteLinks(), HouseholdRole, HouseholdsService, InvitationDetails, normalizeInviteWebBase()

### Community 37 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, paths, strict, types, exclude, extends, include, @/* (+1 more)

### Community 38 - "index.ts"
Cohesion: 0.11
Nodes (33): CatalogRow, firstString(), highlightText(), isPublished(), listPublishedReleases(), normalizePublishedRelease(), parseHighlights(), releaseQueryKeys (+25 more)

### Community 39 - "households.service.ts"
Cohesion: 0.17
Nodes (11): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, MonthlyBudgetRun, MonthlyBudgetRunInsert (+3 more)

### Community 40 - "SavingPotsService"
Cohesion: 0.22
Nodes (21): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildIncomeInputInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts() (+13 more)

### Community 41 - "devDependencies"
Cohesion: 0.15
Nodes (11): ButtonProps, CardProps, FieldProps, formatDate(), PageProps, PillProps, SectionProps, styles (+3 more)

### Community 42 - "useHouseholdBackup.ts"
Cohesion: 0.18
Nodes (14): resources, LanguageMenu(), options, styles, AppLanguage, getNativeStorage(), getStoredLanguage(), LanguageOption (+6 more)

### Community 43 - "Welcome to your Expo app 👋"
Cohesion: 0.29
Nodes (6): Get a fresh project, Get started, Join the community, Learn more, Other setup steps, Welcome to your Expo app 👋

### Community 44 - "RecurringTransactionsRepository"
Cohesion: 0.14
Nodes (5): RecurringRunExecution, RecurringTransaction, RecurringTransactionsRepository, RecurringTransactionWithRelations, QueryResult

### Community 45 - "RecurringTransactionsService"
Cohesion: 0.22
Nodes (5): getSectionSortRank(), MonthlyBudgetService, normalizeMonth(), parseMonthField(), roundMoney()

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "members.tsx"
Cohesion: 0.29
Nodes (3): asBackupFile(), fetchPaged(), HouseholdBackupService

### Community 48 - "ThemeProvider.tsx"
Cohesion: 0.12
Nodes (14): AnimatedIcon(), glowKeyframe, keyframe, logoKeyframe, styles, AuthLoadingTransition(), blueColors, darkColors (+6 more)

### Community 49 - "saving-pots.repository.ts"
Cohesion: 0.43
Nodes (6): account(), member, preview(), recurring(), rule(), service

### Community 50 - "SmartFinance Testing"
Cohesion: 0.33
Nodes (5): Fast Local Checks, Local Supabase Contract Check, Production Release Checklist, Release-Only Web Smoke, SmartFinance Testing

### Community 51 - "account.schema.ts"
Cohesion: 0.50
Nodes (3): AccountFormInput, AccountFormValues, accountSchema

### Community 52 - ".importHouseholdBackup"
Cohesion: 0.40
Nodes (4): getMemberFallbackMap(), normalizeEmail(), safeNamePart(), Json

### Community 53 - "colors.ts"
Cohesion: 0.40
Nodes (4): blueColors, darkColors, lightColors, ThemeColors

### Community 55 - "index.ts"
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

### Community 60 - "supabase.ts"
Cohesion: 0.67
Nodes (3): createSupabaseMock(), createSupabaseQuery(), QueryResult

### Community 62 - "households.repository.ts"
Cohesion: 0.25
Nodes (6): Brand(), Cta(), featureIcons, LandingScreen(), styles, updateIcons

### Community 84 - "AccountsRepository"
Cohesion: 0.25
Nodes (7): Household, HouseholdInvitation, HouseholdInvitationDetails, HouseholdListItem, HouseholdMember, HouseholdRole, MyHouseholdInvitation

### Community 86 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, exclude, extends, include

### Community 87 - "serve-dist.mjs"
Cohesion: 0.40
Nodes (3): contentTypes, port, root

### Community 88 - "Expo HAS CHANGED"
Cohesion: 0.50
Nodes (3): Expo HAS CHANGED, Graphify, Multi-Agent Workflow

### Community 89 - "buildCleanBackup"
Cohesion: 0.40
Nodes (6): buildCleanBackup(), buildKeyMap(), buildTransferGroupKeyMap(), keyFor(), makeKey(), scrubJsonIds()

### Community 92 - "SettingsScreen"
Cohesion: 0.24
Nodes (17): getToken(), InviteScreen(), MembersScreen(), roles, HouseholdRole, useAcceptHouseholdInvitation(), useCreateHouseholdInvitation(), useDeclineHouseholdInvitation() (+9 more)

### Community 93 - "SavingPotsRepository"
Cohesion: 0.09
Nodes (6): AccountsRepository, AttachmentsRepository, BaseRepository, createClient(), createQuery(), QueryResult

### Community 100 - "normalizeEmail"
Cohesion: 0.31
Nodes (8): getNativeStorage(), getStoredTheme(), normalizeTheme(), setStoredTheme(), ThemeMode, ThemeState, ThemeStorage, useThemeStore

### Community 102 - "SavingPotsService"
Cohesion: 0.14
Nodes (8): PublicOverviewScreen(), PublicPageKey, Brand(), Header(), navItems, pageIcons, PublicOverviewScreen(), styles

### Community 110 - "error-context.md"
Cohesion: 0.40
Nodes (4): Error details, Instructions, Test info, Test source

## Knowledge Gaps
- **557 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+552 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `accounts.tsx` to `useAuth`, `recurring.tsx`, `index.ts`, `google-sign-in-button.tsx`, `app-tabs.web.tsx`, `RootProvider.tsx`, `transfers.tsx`, `invalidateHouseholdData`, `settings.tsx`, `monthly-budget.repository.ts`, `HouseholdsService`, `animated-icon.web.tsx`, `useTheme`, `households.repository.ts`, `CategoriesService`, `selection-shell.tsx`, `grouped-destination-select.tsx`, `HouseholdsService`, `devDependencies`, `useHouseholdBackup.ts`, `ThemeProvider.tsx`, `households.repository.ts`, `SettingsScreen`, `SavingPotsService`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `RootProvider.tsx`, `scripts`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `RootProvider.tsx` to `dependencies`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _560 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.12477718360071301 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03389830508474576 - nodes in this community are weakly interconnected._
- **Should `accounts.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06887755102040816 - nodes in this community are weakly interconnected._