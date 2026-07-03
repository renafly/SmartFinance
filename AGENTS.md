# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Agent Base Definitions

### Purpose And Context

Rena is building a household finance tracker mobile app. The app supports accounts, transactions, saving pots, categories, recurring transactions, and attachments, with household-based multi-user access.

### Tech Stack

- Frontend: Expo / React Native
- Backend: Supabase (Postgres + RLS + RPCs)
- State management: TanStack Query (@tanstack/react-query)
- Forms: react-hook-form + zodResolver + Zod v4
- Types: Generated database.types.ts as the single source of truth

### Architecture (Layered)

database.types.ts -> BaseRepository<T> -> feature repositories -> services -> TanStack Query hooks -> screens

### Current State

- Repository layer is fully built: generic BaseRepository<T extends TableName> with typed CRUD, per-table repos, and a repositories singleton exported from an index.ts factory.
- Accounts feature is the reference implementation.
- Transactions feature is scaffolded to mirror accounts: transaction.schema.ts, transaction-form.tsx, route screens (index.tsx, new.tsx, [id].tsx, _layout.tsx), transaction-card.tsx, service, and hooks.
- Supabase signup trigger handle_new_user() inserts into public.profiles (not public.users) and seeds default data via create_default_accounts and create_default_categories.

### DB Schema Highlights

- Tables: accounts, transactions, categories, saving_pots, recurring_transactions, attachments, profiles, households, household_members
- Views: account_balances, saving_pot_balances, monthly_summary, monthly_category_spending
- RPCs: create_transfer, is_household_member, is_household_admin, is_household_owner, create_default_accounts, create_default_categories

### Key Learnings And Principles

- database.types.ts is the single source of truth. Avoid hand-written types that can drift.
- Transactions table supports only income and expense in the enum. Transfers must use createTransfer RPC and the dedicated useCreateTransfer hook.
- Correct transactions date column is transaction_date.
- created_by and household_id are injected server-side in screen onSubmit, not exposed as form inputs.
- Any mutation affecting balances must invalidate both ["transactions"] and ["accounts"] query keys.
- With generic Supabase query results, cast through unknown first (for example, data as unknown as Row<T>). Dynamic .eq() keys may require key as any.
- In security definer trigger flows, do not assume a live auth.uid() session. Validate profile, household, household_members, and seeded defaults on signup.
- In Zod v4, prefer z.uuid() over deprecated z.string().uuid().
- Use import alias @/shared/lib/repositories/base-repository.

### Approach And Patterns

- When real repository implementations are provided, discard guessed shapes and align service, hooks, and screens to real code.
- For new features, mirror accounts flow: repository -> service -> hooks -> screens/form/card.
- repositories singleton is the standard data access entry point.

### Tools And Resources

- Expo / React Native
- Supabase (Postgres, RLS, RPCs, generated types)
- TanStack Query
- react-hook-form + Zod v4
- TypeScript
