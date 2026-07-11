# Graph Report - SmartFinance  (2026-07-11)

## Corpus Check
- 263 files · ~142,857 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1262 nodes · 2763 edges · 98 communities (76 shown, 22 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `878a3f00`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- dependencies
- recurring.tsx
- Database
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
- grouped-account-select.tsx
- useTheme
- households.repository.ts
- CategoriesService
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
- CategoriesRepository
- households.repository.ts
- SavingPotsService
- devDependencies
- themeStore.ts
- Welcome to your Expo app 👋
- RecurringTransactionsRepository
- NotificationsProvider.tsx
- transaction.schema.ts
- members.tsx
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
- localStorageService.ts
- shadows.ts
- authUiStore.ts
- query-client.tsx
- nativewind-env.d.ts
- radius.ts
- typography.ts
- untitled-theme.ts
- untitled-theme.ts
- web-smoke.spec.ts
- tsconfig.test.json
- serve-dist.mjs
- Expo HAS CHANGED
- buildCleanBackup
- CategoriesRepository
- SettingsScreen
- SavingPotsService
- global.d.ts
- AccountsRepository
- animated-icon.tsx
- RecurringTransactionsService
- index.ts
- normalizeEmail

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 84 edges
2. `useAuth()` - 77 edges
3. `RepoResult` - 77 edges
4. `spacing()` - 62 edges
5. `invalidateHouseholdData()` - 59 edges
6. `BudgetScreen()` - 36 edges
7. `Database` - 36 edges
8. `useResponsiveMetrics()` - 29 edges
9. `BaseRepository` - 27 edges
10. `HouseholdsRepository` - 25 edges

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
- 2-file cycle: `src/features/saving-pots/hooks/index.ts -> src/features/saving-pots/hooks/useSavingPotForecasts.ts -> src/features/saving-pots/hooks/index.ts`

## Communities (98 total, 22 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.08
Nodes (54): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), formatMonthSelection(), getMemberAccentColor(), getMemberLabel(), getRuleRowKey() (+46 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (55): dependencies, eslint, eslint-config-expo, expo, expo-auth-session, expo-constants, expo-crypto, expo-dev-client (+47 more)

### Community 2 - "recurring.tsx"
Cohesion: 0.11
Nodes (10): AccountsScreen(), useAccounts(), useArchiveAccount(), useCreateAccount(), useDeleteAccount(), useUpdateAccount(), AccountIdInput, AccountsService (+2 more)

### Community 3 - "Database"
Cohesion: 0.09
Nodes (17): Account, AccountBalance, Attachment, BaseRepository, Insert, ListOptions, Row, TableName (+9 more)

### Community 4 - "RepoResult"
Cohesion: 0.10
Nodes (3): RepoResult, HouseholdsRepository, MonthlyBudgetRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (38): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+30 more)

### Community 6 - "monthly-budget.service.ts"
Cohesion: 0.08
Nodes (33): Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, findHighestCashAccount(), getCashAccountIds(), getExcludedMonths() (+25 more)

### Community 7 - "index.ts"
Cohesion: 0.14
Nodes (18): getTransactionTypeIcon(), TransactionsScreen(), emptyDraft(), ruleKindOf(), today(), TransfersScreen(), useCreateRecurringTransaction(), useDeleteRecurringTransaction() (+10 more)

### Community 8 - "google-sign-in-button.tsx"
Cohesion: 0.18
Nodes (11): AuthLayout(), GoogleAuthScreen(), GoogleSignInButtonProps, buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo() (+3 more)

### Community 9 - "app-tabs.web.tsx"
Cohesion: 0.13
Nodes (19): CustomTabList(), styles, ExternalLink(), Props, HintRowProps, styles, styles, ThemedText() (+11 more)

### Community 10 - "RootProvider.tsx"
Cohesion: 0.07
Nodes (26): @vercel/speed-insights, NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), resources, ProfilesService, FeatureFlagContext, FeatureFlagContextValue (+18 more)

### Community 11 - "expo"
Cohesion: 0.06
Nodes (30): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+22 more)

### Community 12 - "categories.tsx"
Cohesion: 0.12
Nodes (30): addMonths(), addOccurrence(), buildSavingPotForecasts(), findCompletionDate(), ForecastContribution, ForecastFrequency, ForecastPot, ForecastRule (+22 more)

### Community 13 - "transfers.tsx"
Cohesion: 0.17
Nodes (10): createClient(), createQuery(), QueryResult, Household, HouseholdInvitation, HouseholdInvitationDetails, HouseholdListItem, HouseholdMember (+2 more)

### Community 14 - "transaction.service.ts"
Cohesion: 0.10
Nodes (19): useTransactions(), useTransactionsInfinite(), ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName() (+11 more)

### Community 15 - "invalidateHouseholdData"
Cohesion: 0.16
Nodes (18): createStyles(), AttachmentDraft, createStyles(), DateFilterField(), DatePickerField(), DropdownField(), DropdownFieldProps, formatDateInputValue() (+10 more)

### Community 16 - "settings.tsx"
Cohesion: 0.09
Nodes (27): CategoryEditDraft, categoryIconSuggestions, CategoryLike, types, currencyOptions, languageOptions, themeOptions, Badge() (+19 more)

### Community 17 - "monthly-budget.repository.ts"
Cohesion: 0.17
Nodes (8): MemberProfile, AppNotification, StorageService, UploadFile, memoryStorage, supabase, supabaseAnonKey, supabaseUrl

### Community 18 - "index.tsx"
Cohesion: 0.11
Nodes (20): DiagnosticItem, DiagnosticRow(), DiagnosticsScreen(), DiagnosticStatus, maskSecret(), styles, ButtonProps, Card() (+12 more)

### Community 19 - "HouseholdsService"
Cohesion: 0.17
Nodes (10): backup, mockedBackupService, mockedUseAuth, useExportHouseholdBackup(), useImportHouseholdBackup(), AuthContext, AuthContextValue, AuthProvider() (+2 more)

### Community 20 - "grouped-account-select.tsx"
Cohesion: 0.25
Nodes (5): getToken(), InviteScreen(), GoogleLoginScreen(), SignOutButton(), AuthService

### Community 21 - "useTheme"
Cohesion: 0.14
Nodes (18): samples, StorybookPreviewScreen(), styles, menuIconMap, ProtectedDrawerLayout(), styles, styles, useThemeStore (+10 more)

### Community 22 - "households.repository.ts"
Cohesion: 0.15
Nodes (21): PersonBreakdownBar(), AccountLike, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedAccountSelect(), GroupedAccountSelectProps (+13 more)

### Community 23 - "CategoriesService"
Cohesion: 0.14
Nodes (13): CategoriesScreen(), getTypeColor(), getTypeIcon(), useArchiveCategory(), useCategories(), useChildCategories(), useTopLevelCategories(), useCreateCategory() (+5 more)

### Community 26 - "requireIdFor"
Cohesion: 0.18
Nodes (15): AllocationDonut(), AllocationKey, AllocationLegend(), AllocationSegment, DashboardAccount, DashboardPot, DashboardScreen(), formatLocalDate() (+7 more)

### Community 27 - "session.types.ts"
Cohesion: 0.11
Nodes (24): AccountHistoryMode, accountTypes, currencyOptions, EditMode, BadgeProps, BadgeTone, EmptyStateProps, MetricCard() (+16 more)

### Community 28 - "scripts"
Cohesion: 0.06
Nodes (30): devDependencies, @expo/ngrok, jest, jest-expo, @playwright/test, react-test-renderer, @testing-library/react-native, @types/jest (+22 more)

### Community 30 - "SmartFinance Release Checklist"
Cohesion: 0.22
Nodes (8): Auth And Routing, Build Gates, Environment, Finance Semantics, Recurring Automation, Responsive UI, Security Headers, SmartFinance Release Checklist

### Community 31 - "index.ts"
Cohesion: 0.16
Nodes (10): CreateRecurringTransactionInput, Frequency, RuleKind, TransactionType, UpdateRecurringTransactionInput, createdTransaction, mockCreate, mockDelete (+2 more)

### Community 32 - "transactions.repository.ts"
Cohesion: 0.12
Nodes (7): CreateTransferInput, MonthlyCategorySpending, MonthlySummary, Transaction, TransactionsRepository, TransactionType, QueryResult

### Community 33 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 34 - "grouped-destination-select.tsx"
Cohesion: 0.25
Nodes (6): SessionRepository, SessionService, Claims, HouseholdMember, SessionState, UserProfile

### Community 35 - "HouseholdsService"
Cohesion: 0.09
Nodes (7): useCreateHousehold(), CreateInvitationInput, createInviteLinks(), HouseholdRole, HouseholdsService, InvitationDetails, normalizeInviteWebBase()

### Community 37 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, paths, strict, types, exclude, extends, include, @/* (+1 more)

### Community 38 - "CategoriesRepository"
Cohesion: 0.13
Nodes (13): DatePickerField(), formatDateInput(), frequencies, Frequency, months, MovementDraft, MovementFields(), MovementKind (+5 more)

### Community 39 - "households.repository.ts"
Cohesion: 0.15
Nodes (12): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, BudgetRuleUpdate, MonthlyBudgetRun (+4 more)

### Community 40 - "SavingPotsService"
Cohesion: 0.26
Nodes (15): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts() (+7 more)

### Community 42 - "themeStore.ts"
Cohesion: 0.36
Nodes (7): getNativeStorage(), getStoredTheme(), normalizeTheme(), setStoredTheme(), ThemeMode, ThemeState, ThemeStorage

### Community 43 - "Welcome to your Expo app 👋"
Cohesion: 0.29
Nodes (6): Get a fresh project, Get started, Join the community, Learn more, Other setup steps, Welcome to your Expo app 👋

### Community 44 - "RecurringTransactionsRepository"
Cohesion: 0.14
Nodes (5): RecurringRunExecution, RecurringTransaction, RecurringTransactionsRepository, RecurringTransactionWithRelations, QueryResult

### Community 45 - "NotificationsProvider.tsx"
Cohesion: 0.17
Nodes (10): NotificationCenter(), useMarkNotificationRead(), useNotifications(), NotificationsService, NotificationsProvider(), Toast, ToastContext, ToastContextValue (+2 more)

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "members.tsx"
Cohesion: 0.29
Nodes (15): MembersScreen(), roles, HouseholdRole, useAcceptHouseholdInvitation(), useCreateHouseholdInvitation(), useDeclineHouseholdInvitation(), useHouseholdInvitations(), useMyHouseholdInvitations() (+7 more)

### Community 50 - "SmartFinance Testing"
Cohesion: 0.33
Nodes (5): Fast Local Checks, Local Supabase Contract Check, Production Release Checklist, Release-Only Web Smoke, SmartFinance Testing

### Community 51 - "account.schema.ts"
Cohesion: 0.50
Nodes (3): AccountFormInput, AccountFormValues, accountSchema

### Community 52 - ".importHouseholdBackup"
Cohesion: 0.36
Nodes (8): buildIncomeInputInserts(), getCurrentProfile(), getMemberFallbackMap(), insertMany(), newId(), newIdMap(), normalizeEmail(), throwIfError()

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
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 60 - "supabase.ts"
Cohesion: 0.67
Nodes (3): createSupabaseMock(), createSupabaseQuery(), QueryResult

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
Cohesion: 0.29
Nodes (7): buildCleanBackup(), buildKeyMap(), buildTransferGroupKeyMap(), fetchPaged(), keyFor(), makeKey(), scrubJsonIds()

### Community 92 - "SettingsScreen"
Cohesion: 0.31
Nodes (7): SettingsScreen(), useDefaultHousehold(), useMyHouseholds(), useSetDefaultHousehold(), useDeleteHousehold(), useUpdateHousehold(), useUpdatePreferredCurrency()

### Community 96 - "animated-icon.tsx"
Cohesion: 0.13
Nodes (14): PublicLayout(), AnimatedIcon(), AnimatedSplashOverlay(), glowKeyframe, keyframe, logoKeyframe, styles, AnimatedIcon() (+6 more)

### Community 99 - "index.ts"
Cohesion: 0.33
Nodes (5): Account, CreateAccountDTO, NewAccount, UpdateAccount, UpdateAccountDTO

### Community 100 - "normalizeEmail"
Cohesion: 0.25
Nodes (4): asBackupFile(), HouseholdBackupService, safeNamePart(), Json

## Knowledge Gaps
- **461 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+456 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `RootProvider.tsx`, `scripts`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `RootProvider.tsx` to `dependencies`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `animated-icon.tsx` to `useAuth`, `recurring.tsx`, `index.ts`, `google-sign-in-button.tsx`, `app-tabs.web.tsx`, `RootProvider.tsx`, `invalidateHouseholdData`, `settings.tsx`, `index.tsx`, `grouped-account-select.tsx`, `useTheme`, `households.repository.ts`, `CategoriesService`, `requireIdFor`, `session.types.ts`, `CategoriesRepository`, `NotificationsProvider.tsx`, `members.tsx`, `SettingsScreen`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _464 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.07627118644067797 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03636363636363636 - nodes in this community are weakly interconnected._
- **Should `recurring.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10826210826210826 - nodes in this community are weakly interconnected._