# SmartFinance command helper

Run these commands from the repository root in PowerShell:

```powershell
Set-Location C:\Personal\SmartFinance
```

## Prerequisites

- Node.js 22.13 or newer for Expo SDK 57.
- Docker Desktop running for the local Supabase stack.
- Android Studio/emulator for Android development.
- Xcode on macOS for local iOS development. Windows cannot run the iOS simulator.

Check the main tools:

```powershell
node --version
npm --version
docker --version
npx supabase --version
npx expo --version
```

## First-time setup

Install the exact dependency versions from `package-lock.json`:

```powershell
npm ci
```

Create the local environment file, then fill in its values:

```powershell
Copy-Item .env.example .env
notepad .env
```

Start Docker Desktop before starting Supabase. The first Supabase start downloads its Docker images and applies the checked-in migrations and seed file:

```powershell
npx supabase start
npx supabase status
```

Use the API URL and publishable/anon key shown by `supabase status` in `.env`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local key from supabase status>
```

Local services:

- API: `http://127.0.0.1:54321`
- Postgres: `127.0.0.1:54322`
- Supabase Studio: `http://127.0.0.1:54323`
- Local email viewer: `http://127.0.0.1:54324`

## Daily development

Start Supabase if it is not already running:

```powershell
npx supabase start
```

Start Expo and choose a target from the terminal:

```powershell
npm start
```

Start a specific target directly:

```powershell
npm run web
npm run android
npm run ios
```

Useful Expo variants:

```powershell
npx expo start --clear
npx expo start --dev-client
```

Stop the local Supabase stack while preserving its local data:

```powershell
npx supabase stop
```

## Packages

For Expo or React Native packages, let Expo choose a compatible version:

```powershell
npx expo install <package-name>
```

For ordinary JavaScript packages:

```powershell
npm install <package-name>
npm install --save-dev <package-name>
```

Remove a package:

```powershell
npm uninstall <package-name>
```

After changing packages, commit both `package.json` and `package-lock.json`.

Check dependency and Expo compatibility:

```powershell
npm outdated
npx expo install --check
npx expo-doctor
```

## Database migrations

Create every migration through the Supabase CLI:

```powershell
npx supabase migration new <descriptive_name>
```

Edit the generated SQL file in `supabase/migrations`, then apply only migrations that have not yet run locally:

```powershell
npx supabase migration up --local
```

List local migration status:

```powershell
npx supabase migration list --local
```

Lint the local database and run database tests:

```powershell
npx supabase db lint --local
npx supabase test db --local
```

### Rebuild the local database

> Warning: this deletes all local Supabase data, reapplies every migration, and reruns `supabase/seed.sql`. It does not target the hosted project unless a remote flag is explicitly added.

```powershell
npx supabase db reset --local
```

### Deploy migrations to hosted Supabase

Run these steps from `C:\Personal\SmartFinance`.

1. Authenticate the Supabase CLI:

```powershell
npx supabase login
```

2. Find the project reference in the Supabase dashboard URL:

```text
https://supabase.com/dashboard/project/<project-ref>
```

3. Link this checkout to that project. This is normally required only once:

```powershell
npx supabase link --project-ref <project-ref>
```

4. Compare local and remote migration history:

```powershell
npx supabase migration list
```

5. Preview the migrations that would be applied without changing the remote database:

```powershell
npx supabase db push --dry-run
```

6. Apply the pending migrations:

> Warning: this changes the linked hosted database. Confirm the project reference and review the dry run first.

```powershell
npx supabase db push
```

7. Verify that local and remote migration history now match:

```powershell
npx supabase migration list
```

Never run `npx supabase db reset --linked` against production because it drops and rebuilds the remote schema.

## Supabase Edge Functions

Serve functions locally:

```powershell
npx supabase functions serve
```

Deploy the functions used by this project:

```powershell
npx supabase functions deploy execute-recurring-movements --no-verify-jwt
npx supabase functions deploy dispatch-notification --no-verify-jwt
npx supabase functions deploy purge-read-notifications --no-verify-jwt
npx supabase functions deploy feedback-maintenance
```

List hosted function secrets without printing their values:

```powershell
npx supabase secrets list
```

## Tests and code quality

Fast development checks:

```powershell
npm run lint
npm run typecheck:test
npm run test:unit -- --runInBand
```

Other test suites:

```powershell
npm run test:integration
npm run test:ci
npm run test:e2e:web
```

Run the local Supabase contract tests in the current PowerShell session:

```powershell
$env:SUPABASE_TEST_URL = "http://127.0.0.1:54321"
$env:SUPABASE_TEST_ANON_KEY = "<local anon key from npx supabase status>"
npm run test:supabase
```

Make the local Supabase check mandatory instead of allowing it to skip:

```powershell
$env:SUPABASE_TEST_REQUIRED = "1"
npm run test:supabase
```

Run the full security/release gate:

```powershell
npm run security:check
```

## Builds

Export the production web bundle to `dist`:

```powershell
npx expo export --platform web
```

Create EAS builds:

```powershell
npx eas-cli build --profile development --platform android
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform android
npx eas-cli build --profile production --platform ios
```

Before a production release, also follow `docs/release-checklist.md`.

## Graphify and Git checks

Refresh the code graph after changing code:

```powershell
graphify update .
```

Inspect the working tree and whitespace errors:

```powershell
git status --short
git diff --check
git diff
```

## Common troubleshooting

Clear the Expo/Metro cache:

```powershell
npx expo start --clear
```

If Supabase cannot connect to Docker, start Docker Desktop and retry:

```powershell
npx supabase status
npx supabase start
```

Reinstall dependencies exactly from the lockfile:

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
```

The last command removes only this repository's `node_modules` directory; it does not remove application source or database data.
