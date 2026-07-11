# Graph Report - SmartFinance  (2026-07-11)

## Corpus Check
- 265 files · ~144,982 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1289 nodes · 2824 edges · 97 communities (77 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5226354b`
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
- MonthlyBudgetService
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
- SettingsScreen
- SavingPotsService
- global.d.ts
- AccountsRepository
- monthly-budget.service.unit.test.ts
- run-security-check.mjs
- normalizeEmail

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 86 edges
2. `useAuth()` - 77 edges
3. `RepoResult` - 77 edges
4. `spacing()` - 64 edges
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

## Communities (97 total, 20 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.13
Nodes (30): AccountLike, BudgetScreen(), buildPotNameByAccountId(), createDefaultIncomeDrafts(), formatMonthSelection(), getMemberAccentColor(), getMemberLabel(), getRuleRowKey() (+22 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (57): dependencies, eslint, eslint-config-expo, expo, expo-auth-session, expo-constants, expo-crypto, expo-dev-client (+49 more)

### Community 2 - "recurring.tsx"
Cohesion: 0.11
Nodes (9): AccountIdInput, AccountsService, CreateAccountInput, UpdateAccountInput, Account, CreateAccountDTO, NewAccount, UpdateAccount (+1 more)

### Community 3 - "Database"
Cohesion: 0.08
Nodes (18): Account, AccountBalance, Attachment, BaseRepository, Insert, ListOptions, Row, TableName (+10 more)

### Community 4 - "RepoResult"
Cohesion: 0.08
Nodes (4): RepoResult, CategoriesRepository, HouseholdsRepository, MonthlyBudgetRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (37): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+29 more)

### Community 6 - "monthly-budget.service.ts"
Cohesion: 0.11
Nodes (21): Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, DestinationKind, getExcludedMonths(), getMonthNumber(), getRecurringMonthlyAmount() (+13 more)

### Community 7 - "index.ts"
Cohesion: 0.22
Nodes (6): useCreateHousehold(), useDeleteTransaction(), useUpdateTransaction(), HOUSEHOLD_QUERY_KEYS, invalidateHouseholdData(), queryClient

### Community 8 - "google-sign-in-button.tsx"
Cohesion: 0.26
Nodes (10): AuthLayout(), GoogleAuthScreen(), buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo(), storePendingRedirectTo() (+2 more)

### Community 9 - "app-tabs.web.tsx"
Cohesion: 0.13
Nodes (18): styles, ExternalLink(), Props, HintRowProps, styles, styles, ThemedText(), ThemedTextProps (+10 more)

### Community 10 - "RootProvider.tsx"
Cohesion: 0.06
Nodes (30): @vercel/speed-insights, NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), resources, NotificationsService, FeatureFlagContext, FeatureFlagContextValue (+22 more)

### Community 11 - "expo"
Cohesion: 0.06
Nodes (30): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+22 more)

### Community 12 - "categories.tsx"
Cohesion: 0.12
Nodes (32): addMonths(), addOccurrence(), buildForecastTimeline(), buildSavingPotForecasts(), findCompletionDate(), ForecastContribution, ForecastFrequency, ForecastPot (+24 more)

### Community 13 - "transfers.tsx"
Cohesion: 0.17
Nodes (22): getToken(), InviteScreen(), MembersScreen(), roles, Button(), Card(), Page(), Section() (+14 more)

### Community 14 - "transaction.service.ts"
Cohesion: 0.11
Nodes (17): ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName(), TransactionAttachmentInput, TransactionsService (+9 more)

### Community 15 - "invalidateHouseholdData"
Cohesion: 0.12
Nodes (24): getMemberLabel(), HouseholdMemberSelect(), HouseholdMemberSelectProps, styles, ALL_ICON_NAMES, DEFAULT_ICON_NAMES, IconPicker(), IconPickerProps (+16 more)

### Community 16 - "settings.tsx"
Cohesion: 0.23
Nodes (8): blueColors, darkColors, lightColors, ThemeColors, shadows, ThemeContext, ThemeContextValue, ThemeProvider()

### Community 17 - "monthly-budget.repository.ts"
Cohesion: 0.12
Nodes (11): GoogleLoginScreen(), GoogleSignInButtonProps, SignOutButton(), AppNotification, AuthService, StorageService, UploadFile, memoryStorage (+3 more)

### Community 18 - "index.tsx"
Cohesion: 0.17
Nodes (12): DateFilterField(), DropdownField(), PublicLayout(), AnimatedIcon(), AnimatedSplashOverlay(), glowKeyframe, keyframe, logoKeyframe (+4 more)

### Community 19 - "HouseholdsService"
Cohesion: 0.14
Nodes (15): currencyOptions, languageOptions, SettingsScreen(), themeOptions, Field(), backup, mockedBackupService, mockedUseAuth (+7 more)

### Community 20 - "grouped-account-select.tsx"
Cohesion: 0.16
Nodes (13): DiagnosticItem, DiagnosticRow(), DiagnosticsScreen(), DiagnosticStatus, maskSecret(), styles, DrawerContent(), menuIconMap (+5 more)

### Community 21 - "useTheme"
Cohesion: 0.13
Nodes (21): samples, StorybookPreviewScreen(), addMonths(), DateGranularity, DatePickerField(), DatePickerFieldProps, formatDateValue(), formatDisplayValue() (+13 more)

### Community 22 - "households.repository.ts"
Cohesion: 0.15
Nodes (20): AccountLike, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedAccountSelect(), GroupedAccountSelectProps, MemberLike (+12 more)

### Community 23 - "CategoriesService"
Cohesion: 0.12
Nodes (18): CategoriesScreen(), CategoryEditDraft, categoryIconSuggestions, CategoryLike, getTypeColor(), getTypeIcon(), types, useArchiveCategory() (+10 more)

### Community 24 - "selection-shell.tsx"
Cohesion: 0.20
Nodes (13): AccountHistoryMode, AccountsScreen(), accountTypes, createStyles(), currencyOptions, EditMode, useAccountsWithBalances(), useArchiveAccount() (+5 more)

### Community 26 - "requireIdFor"
Cohesion: 0.18
Nodes (15): AttachmentDraft, createStyles(), DatePickerField(), DropdownFieldProps, formatDateInputValue(), getTransactionTypeIcon(), parseDateInputValue(), TransactionEditDraft (+7 more)

### Community 27 - "session.types.ts"
Cohesion: 0.08
Nodes (36): AllocationDonut(), AllocationKey, AllocationLegend(), AllocationSegment, DashboardAccount, DashboardPot, DashboardScreen(), formatLocalDate() (+28 more)

### Community 28 - "scripts"
Cohesion: 0.06
Nodes (30): devDependencies, @expo/ngrok, jest, jest-expo, @playwright/test, react-test-renderer, @testing-library/react-native, @types/jest (+22 more)

### Community 30 - "SmartFinance Release Checklist"
Cohesion: 0.22
Nodes (8): Auth And Routing, Build Gates, Environment, Finance Semantics, Recurring Automation, Responsive UI, Security Headers, SmartFinance Release Checklist

### Community 31 - "index.ts"
Cohesion: 0.31
Nodes (7): calendarButtonStyle, DateGranularity, DatePickerField(), DatePickerFieldProps, formatDateValue(), formatDisplayValue(), toDateValue()

### Community 32 - "transactions.repository.ts"
Cohesion: 0.10
Nodes (11): createdTransaction, mockCreate, mockDelete, mockUploadAndCreate, CreateTransferInput, MonthlyCategorySpending, MonthlySummary, Transaction (+3 more)

### Community 33 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 34 - "grouped-destination-select.tsx"
Cohesion: 0.25
Nodes (6): SessionRepository, SessionService, Claims, HouseholdMember, SessionState, UserProfile

### Community 35 - "HouseholdsService"
Cohesion: 0.09
Nodes (8): useDefaultHousehold(), useSetDefaultHousehold(), CreateInvitationInput, createInviteLinks(), HouseholdRole, HouseholdsService, InvitationDetails, normalizeInviteWebBase()

### Community 36 - ".importHouseholdBackup"
Cohesion: 0.12
Nodes (13): CreateRecurringTransactionInput, Frequency, RuleKind, TransactionType, UpdateRecurringTransactionInput, Household, HouseholdInvitation, HouseholdInvitationDetails (+5 more)

### Community 37 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, paths, strict, types, exclude, extends, include, @/* (+1 more)

### Community 38 - "CategoriesRepository"
Cohesion: 0.05
Nodes (50): AccountGroup, AccountGroupView, AccountOption, buildAccountGroups(), buildForecastYearRows(), buildSelectionMap(), createStyles(), ForecastViewMode (+42 more)

### Community 39 - "households.repository.ts"
Cohesion: 0.15
Nodes (12): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, BudgetRuleUpdate, MonthlyBudgetRun (+4 more)

### Community 40 - "SavingPotsService"
Cohesion: 0.22
Nodes (21): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildIncomeInputInserts(), buildRecurringRunExecutionInserts(), buildRecurringTransactionInserts() (+13 more)

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
Cohesion: 0.25
Nodes (5): AnimatedIcon(), glowKeyframe, keyframe, logoKeyframe, styles

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "members.tsx"
Cohesion: 0.60
Nodes (4): NotificationCenter(), styles, useMarkNotificationRead(), useNotifications()

### Community 48 - "MonthlyBudgetService"
Cohesion: 0.21
Nodes (6): findHighestCashAccount(), getCashAccountIds(), getMemberLabel(), MonthlyBudgetService, normalizeMonth(), roundMoney()

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
Cohesion: 0.40
Nodes (6): buildCleanBackup(), buildKeyMap(), buildTransferGroupKeyMap(), keyFor(), makeKey(), scrubJsonIds()

### Community 92 - "SettingsScreen"
Cohesion: 0.19
Nodes (9): useAccounts(), ProfilesService, AuthContext, AuthContextValue, AuthProvider(), useSession(), AppCurrency, PreferencesState (+1 more)

### Community 96 - "monthly-budget.service.unit.test.ts"
Cohesion: 0.43
Nodes (6): account(), member, preview(), recurring(), rule(), service

### Community 100 - "normalizeEmail"
Cohesion: 0.29
Nodes (3): asBackupFile(), fetchPaged(), HouseholdBackupService

## Knowledge Gaps
- **470 isolated node(s):** `config`, `parameters`, `{ timingSafeEqual }`, `name`, `slug` (+465 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `RootProvider.tsx`, `scripts`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `RootProvider.tsx` to `dependencies`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `index.tsx` to `useAuth`, `google-sign-in-button.tsx`, `app-tabs.web.tsx`, `RootProvider.tsx`, `transfers.tsx`, `invalidateHouseholdData`, `settings.tsx`, `monthly-budget.repository.ts`, `HouseholdsService`, `grouped-account-select.tsx`, `useTheme`, `households.repository.ts`, `CategoriesService`, `selection-shell.tsx`, `requireIdFor`, `session.types.ts`, `CategoriesRepository`, `NotificationsProvider.tsx`, `members.tsx`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `{ timingSafeEqual }` to the rest of the system?**
  _473 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.1310483870967742 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._
- **Should `recurring.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11052631578947368 - nodes in this community are weakly interconnected._