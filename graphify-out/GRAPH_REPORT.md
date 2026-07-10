# Graph Report - SmartFinance  (2026-07-10)

## Corpus Check
- 246 files · ~132,232 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1169 nodes · 2563 edges · 95 communities (73 shown, 22 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `379efb91`
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
- spacing
- transaction.service.ts
- invalidateHouseholdData
- settings.tsx
- monthly-budget.repository.ts
- index.tsx
- HouseholdsService
- preferencesStore.ts
- useTheme
- households.repository.ts
- CategoriesService
- selection-shell.tsx
- useHouseholdBackup.ts
- requireIdFor
- session.types.ts
- scripts
- members.tsx
- SmartFinance Release Checklist
- index.ts
- transactions.repository.ts
- reset-project.js
- grouped-destination-select.tsx
- accounts.service.ts
- .importHouseholdBackup
- tsconfig.json
- run-security-check.mjs
- HouseholdsService
- SavingPotsService
- CategoriesRepository
- themeStore.ts
- Welcome to your Expo app 👋
- RecurringTransactionsRepository
- accounts.service.ts
- transaction.schema.ts
- useCreateTransfer.ts
- AccountsRepository
- SavingPotsRepository
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
- HouseholdBackupService
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
- animated-icon.web.tsx
- useUpdatePreferredCurrency.ts
- AttachmentsRepository
- global.d.ts

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 84 edges
2. `RepoResult` - 75 edges
3. `useAuth()` - 73 edges
4. `spacing()` - 63 edges
5. `invalidateHouseholdData()` - 59 edges
6. `Database` - 34 edges
7. `BudgetScreen()` - 31 edges
8. `BaseRepository` - 27 edges
9. `useResponsiveMetrics()` - 27 edges
10. `HouseholdsRepository` - 25 edges

## Surprising Connections (you probably didn't know these)
- `BudgetScreen()` --indirect_call--> `run()`  [INFERRED]
  src/app/(protected)/budget.tsx → test/security/run-security-check.mjs
- `AuthLayout()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(auth)/_layout.tsx → src/theme/ThemeProvider.tsx
- `AccountsScreen()` --indirect_call--> `account()`  [INFERRED]
  src/app/(protected)/accounts.tsx → src/features/monthly-budget/services/monthly-budget.service.unit.test.ts
- `DiagnosticRow()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(protected)/diagnostics.tsx → src/theme/ThemeProvider.tsx
- `buildAccountGroups()` --indirect_call--> `account()`  [INFERRED]
  src/app/(protected)/savings.tsx → src/features/monthly-budget/services/monthly-budget.service.unit.test.ts

## Import Cycles
- None detected.

## Communities (95 total, 22 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.13
Nodes (30): AccountLike, BudgetScreen(), buildPotAccountMap(), createDefaultIncomeDrafts(), getMemberAccentColor(), getMemberLabel(), getSectionBadgeIcon(), getSectionBadgeStyle() (+22 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (54): dependencies, eslint, eslint-config-expo, expo, expo-auth-session, expo-constants, expo-crypto, expo-dev-client (+46 more)

### Community 2 - "recurring.tsx"
Cohesion: 0.10
Nodes (20): CategoryChoice(), createStyles(), DatePickerField(), formatDateInputValue(), frequencies, months, parseDateInputValue(), RecurringEditDraft (+12 more)

### Community 3 - "Database"
Cohesion: 0.09
Nodes (18): Account, AccountBalance, Attachment, BaseRepository, Insert, ListOptions, Row, TableName (+10 more)

### Community 4 - "RepoResult"
Cohesion: 0.10
Nodes (3): RepoResult, HouseholdsRepository, MonthlyBudgetRepository

### Community 5 - "household-backup.service.ts"
Cohesion: 0.05
Nodes (35): Account, Attachment, BackupKey, backupSchema, BudgetConfig, BudgetRule, Category, CleanAccount (+27 more)

### Community 6 - "monthly-budget.service.ts"
Cohesion: 0.11
Nodes (23): Account, BudgetConfig, BudgetHouseholdSettings, BudgetRule, buildPotAccountMap(), DestinationKind, findHighestCashAccount(), getCashAccountIds() (+15 more)

### Community 8 - "google-sign-in-button.tsx"
Cohesion: 0.18
Nodes (11): AuthLayout(), GoogleAuthScreen(), GoogleSignInButtonProps, buildCurrentRedirectTo(), canUseSessionStorage(), consumePendingRedirectTo(), normalizeRedirectTo(), peekPendingRedirectTo() (+3 more)

### Community 9 - "app-tabs.web.tsx"
Cohesion: 0.13
Nodes (19): CustomTabList(), styles, ExternalLink(), Props, HintRowProps, styles, styles, ThemedText() (+11 more)

### Community 10 - "RootProvider.tsx"
Cohesion: 0.06
Nodes (28): @vercel/speed-insights, NOTE: Provider composition (Theme, Query, Auth, Localization, Feature, RootStack(), VercelSpeedInsights(), resources, FeatureFlagContext, FeatureFlagContextValue, FeatureFlagProvider() (+20 more)

### Community 11 - "expo"
Cohesion: 0.07
Nodes (29): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+21 more)

### Community 12 - "categories.tsx"
Cohesion: 0.10
Nodes (32): TableCell(), getMemberLabel(), HouseholdMemberSelect(), HouseholdMemberSelectProps, styles, ALL_ICON_NAMES, DEFAULT_ICON_NAMES, IconPicker() (+24 more)

### Community 13 - "spacing"
Cohesion: 0.20
Nodes (11): DiagnosticItem, DiagnosticRow(), DiagnosticsScreen(), DiagnosticStatus, maskSecret(), styles, samples, StorybookPreviewScreen() (+3 more)

### Community 14 - "transaction.service.ts"
Cohesion: 0.09
Nodes (21): ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS, ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES, buildTransactionAttachmentPath(), CreateTransactionInput, getFileExtension(), sanitizeFileName(), TransactionAttachmentInput, TransactionsService (+13 more)

### Community 15 - "invalidateHouseholdData"
Cohesion: 0.16
Nodes (13): RecurringScreen(), useCreateRecurringTransaction(), useDeleteRecurringTransaction(), useRecurringTransactions(), useToggleRecurringTransaction(), useUpdateRecurringTransaction(), useCreateTransaction(), useDeleteTransaction() (+5 more)

### Community 16 - "settings.tsx"
Cohesion: 0.11
Nodes (33): getToken(), InviteScreen(), AccountHistoryMode, accountTypes, createStyles(), currencyOptions, EditMode, CategoryEditDraft (+25 more)

### Community 17 - "monthly-budget.repository.ts"
Cohesion: 0.15
Nodes (12): BudgetConfig, BudgetConfigInsert, BudgetConfigUpdate, BudgetConfigWithRules, BudgetRule, BudgetRuleInsert, BudgetRuleUpdate, MonthlyBudgetRun (+4 more)

### Community 18 - "index.tsx"
Cohesion: 0.19
Nodes (15): AllocationDonut(), AllocationKey, AllocationLegend(), AllocationSegment, DashboardAccount, DashboardPot, DashboardScreen(), getPercent() (+7 more)

### Community 19 - "HouseholdsService"
Cohesion: 0.10
Nodes (27): currencyOptions, languageOptions, SettingsScreen(), themeOptions, backup, mockedBackupService, mockedUseAuth, useExportHouseholdBackup() (+19 more)

### Community 20 - "preferencesStore.ts"
Cohesion: 0.12
Nodes (20): AccountGroup, AccountGroupView, AccountOption, addMonths(), buildAccountGroups(), buildSelectionMap(), createStyles(), getAccountSummary() (+12 more)

### Community 21 - "useTheme"
Cohesion: 0.13
Nodes (14): AnimatedIcon(), AnimatedSplashOverlay(), glowKeyframe, keyframe, logoKeyframe, styles, blueColors, darkColors (+6 more)

### Community 22 - "households.repository.ts"
Cohesion: 0.25
Nodes (7): Household, HouseholdInvitation, HouseholdInvitationDetails, HouseholdListItem, HouseholdMember, HouseholdRole, MyHouseholdInvitation

### Community 23 - "CategoriesService"
Cohesion: 0.14
Nodes (13): CategoriesScreen(), getTypeColor(), getTypeIcon(), useArchiveCategory(), useCategories(), useChildCategories(), useTopLevelCategories(), useCreateCategory() (+5 more)

### Community 24 - "selection-shell.tsx"
Cohesion: 0.20
Nodes (13): AttachmentDraft, createStyles(), DateFilterField(), DatePickerField(), DropdownField(), DropdownFieldProps, formatDateInputValue(), getTransactionTypeIcon() (+5 more)

### Community 25 - "useHouseholdBackup.ts"
Cohesion: 0.15
Nodes (9): GoogleLoginScreen(), SignOutButton(), AuthService, StorageService, UploadFile, memoryStorage, supabase, supabaseAnonKey (+1 more)

### Community 26 - "requireIdFor"
Cohesion: 0.43
Nodes (6): account(), member, preview(), recurring(), rule(), service

### Community 27 - "session.types.ts"
Cohesion: 0.25
Nodes (6): SessionRepository, SessionService, Claims, HouseholdMember, SessionState, UserProfile

### Community 28 - "scripts"
Cohesion: 0.06
Nodes (30): devDependencies, @expo/ngrok, jest, jest-expo, @playwright/test, react-test-renderer, @testing-library/react-native, @types/jest (+22 more)

### Community 29 - "members.tsx"
Cohesion: 0.27
Nodes (13): MembersScreen(), roles, HouseholdRole, useAcceptHouseholdInvitation(), useCreateHouseholdInvitation(), useDeclineHouseholdInvitation(), useHouseholdInvitations(), useMyHouseholdInvitations() (+5 more)

### Community 30 - "SmartFinance Release Checklist"
Cohesion: 0.25
Nodes (7): Auth And Routing, Build Gates, Environment, Finance Semantics, Responsive UI, Security Headers, SmartFinance Release Checklist

### Community 31 - "index.ts"
Cohesion: 0.19
Nodes (8): CreateInvitationInput, createInviteLinks(), HouseholdRole, InvitationDetails, normalizeInviteWebBase(), Frequency, TransactionType, Repositories

### Community 32 - "transactions.repository.ts"
Cohesion: 0.10
Nodes (9): CreateTransferInput, TransferService, CreateTransferInput, MonthlyCategorySpending, MonthlySummary, Transaction, TransactionsRepository, TransactionType (+1 more)

### Community 33 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 34 - "grouped-destination-select.tsx"
Cohesion: 0.24
Nodes (11): AccountLike, DestinationSelection, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedDestinationSelect(), GroupedDestinationSelectProps (+3 more)

### Community 35 - "accounts.service.ts"
Cohesion: 0.13
Nodes (6): AccountsScreen(), useArchiveAccount(), useCreateAccount(), useDeleteAccount(), useUpdateAccount(), AccountsService

### Community 36 - ".importHouseholdBackup"
Cohesion: 0.67
Nodes (3): createClient(), createQuery(), QueryResult

### Community 37 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, paths, strict, types, exclude, extends, include, @/* (+1 more)

### Community 40 - "SavingPotsService"
Cohesion: 0.26
Nodes (14): buildAccountInserts(), buildBudgetConfigInserts(), buildBudgetRuleInserts(), buildBudgetRunInserts(), buildCategoryInserts(), buildRecurringTransactionInserts(), buildSavingPotAccountInserts(), buildSavingPotInserts() (+6 more)

### Community 42 - "themeStore.ts"
Cohesion: 0.36
Nodes (7): getNativeStorage(), getStoredTheme(), normalizeTheme(), setStoredTheme(), ThemeMode, ThemeState, ThemeStorage

### Community 43 - "Welcome to your Expo app 👋"
Cohesion: 0.29
Nodes (6): Get a fresh project, Get started, Join the community, Learn more, Other setup steps, Welcome to your Expo app 👋

### Community 45 - "accounts.service.ts"
Cohesion: 0.22
Nodes (8): AccountIdInput, CreateAccountInput, UpdateAccountInput, Account, CreateAccountDTO, NewAccount, UpdateAccount, UpdateAccountDTO

### Community 46 - "transaction.schema.ts"
Cohesion: 0.40
Nodes (4): NOTE: "transfer" is intentionally excluded here. Transfers are created via, TransactionFormInput, TransactionFormValues, transactionSchema

### Community 47 - "useCreateTransfer.ts"
Cohesion: 0.31
Nodes (9): AccountLike, getAccountLabel(), getAccountSubtitle(), getMemberLabel(), getOwnerLabel(), GroupedAccountSelect(), GroupedAccountSelectProps, MemberLike (+1 more)

### Community 48 - "AccountsRepository"
Cohesion: 0.24
Nodes (4): getSectionSortRank(), MonthlyBudgetService, normalizeMonth(), roundMoney()

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
Cohesion: 0.33
Nodes (5): buildCommand, cleanUrls, headers, outputDirectory, rewrites

### Community 58 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 60 - "supabase.ts"
Cohesion: 0.67
Nodes (3): createSupabaseMock(), createSupabaseQuery(), QueryResult

### Community 62 - "HouseholdBackupService"
Cohesion: 0.25
Nodes (4): asBackupFile(), HouseholdBackupService, safeNamePart(), Json

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

### Community 91 - "animated-icon.web.tsx"
Cohesion: 0.29
Nodes (5): AnimatedIcon(), glowKeyframe, keyframe, logoKeyframe, styles

## Knowledge Gaps
- **428 isolated node(s):** `config`, `parameters`, `name`, `slug`, `scheme` (+423 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `RootProvider.tsx`, `scripts`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `@vercel/speed-insights` connect `RootProvider.tsx` to `dependencies`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `settings.tsx` to `useAuth`, `recurring.tsx`, `google-sign-in-button.tsx`, `app-tabs.web.tsx`, `RootProvider.tsx`, `categories.tsx`, `spacing`, `invalidateHouseholdData`, `index.tsx`, `HouseholdsService`, `preferencesStore.ts`, `useTheme`, `CategoriesService`, `selection-shell.tsx`, `useHouseholdBackup.ts`, `members.tsx`, `grouped-destination-select.tsx`, `accounts.service.ts`, `useCreateTransfer.ts`, `animated-icon.web.tsx`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **What connects `config`, `parameters`, `name` to the rest of the system?**
  _431 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._
- **Should `recurring.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10276679841897234 - nodes in this community are weakly interconnected._