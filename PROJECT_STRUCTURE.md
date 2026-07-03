# SmartFinance Project Structure

## Overview

SmartFinance is an Expo + React Native app with a Supabase backend.
The codebase is organized into:

- Route-first UI entrypoints in app/
- Feature modules in src/features/
- Shared reusable layers in src/shared/
- Database schema and security in supabase/migrations/

## Root Layout

- app/: Expo Router screens and route groups
- src/: Application logic and reusable app code
- supabase/: Local Supabase config and SQL migrations
- android/: Native Android project files
- assets/: Static assets (icons, images, fonts)
- package.json: Scripts and JS dependencies
- tsconfig.json: TypeScript configuration
- app.json: Expo application config
- eas.json: EAS build profiles

## App Routing (app/)

- _layout.tsx: Root router layout
- +not-found.tsx: Fallback route
- (auth)/: Unauthenticated flows (for example login)
- (app)/: Authenticated app shell and feature routes
	- accounts/
	- budgets/
	- categories/
	- investments/
	- members/
	- savings/
	- settings/
	- transactions/

Routing follows Expo Router file conventions.

## Feature Modules (src/features/)

Each folder represents a business domain and should contain its own:

- UI components
- Services/use-cases
- Data hooks (TanStack Query)
- Validation schemas/forms
- Feature-specific types/helpers

Current feature domains include:

- accounts
- auth
- categories
- dashboard
- households
- members
- settings
- transactions

## Shared Layer (src/shared/)

- components/: Cross-feature UI components
- constants/: Shared constants
- hooks/: Reusable hooks
- lib/: Core utilities and integrations (including repositories)
- providers/: App-level providers
- session/: Session/auth support helpers
- theme/: Design tokens and theme setup
- types/: Shared type definitions

## Data And Backend (supabase/)

- config.toml: Local Supabase project configuration
- migrations/: Ordered SQL migrations that define:
	- Core tables (accounts, transactions, categories, budgets, recurring_transactions, attachments, profiles, households, household_members)
	- RLS policies
	- Triggers/functions
	- RPC functions (for example transfer and defaults)
	- Views for summaries and progress

The migration history is the source of truth for database behavior.

## Architecture Flow

The app follows a layered flow:

database.types.ts -> BaseRepository<T> -> feature repositories -> services -> query hooks -> screens

This keeps database contracts typed and separates data access from UI routing.

## Notes

- Prefer extending existing feature folders over creating cross-cutting logic in route files.
- Keep route files focused on screen composition and navigation.
- Place shared logic in src/shared/ and domain logic in src/features/.