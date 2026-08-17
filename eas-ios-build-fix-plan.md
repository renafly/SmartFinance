# iOS EAS Build Failure — Fix Plan

Command that failed: `npx eas-cli build --profile production --platform ios` (per `COMMANDS.md`), which maps to the `production` profile in `eas.json` — `distribution` isn't set there, so it defaults to `"store"` (App Store), matching "is for iOS App Store build."

## Root cause

Only one line in the output is an actual failure; everything above it is warnings that don't block the build:

```
Distribution Certificate is not validated for non-interactive builds.
Failed to set up credentials.
Credentials are not set up. Run this command again in interactive mode.
Error: build:internal command failed.
```

This is EAS's remote-credentials flow needing to create or validate the iOS Distribution Certificate + Provisioning Profile with Apple, which requires an interactive prompt (confirmation, or an Apple ID login/2FA) the first time it happens for a project — or any time after a certificate was renewed/regenerated. `eas build --non-interactive` (or a non-interactive/CI-detected shell) can't satisfy that prompt, so it fails outright instead of pausing to ask. Once credentials are validated once, subsequent non-interactive builds normally work — this matches the pattern in [expo/eas-cli#3202](https://github.com/expo/eas-cli/issues/3202) and [expo/eas-cli#390](https://github.com/expo/eas-cli/issues/390), which describe the identical message.

`app.config.ts`/`app.json` only define an `android` build in `.github/workflows/eas-build.yml` — there's no CI job for iOS, so this build is being run locally/manually, which is good: it means step 1 below can just be re-run in a normal interactive terminal rather than needing a CI credential workaround.

## Fix steps, in order

1. **Run credential setup interactively, once.** From a real terminal (not through a script or piped/non-interactive shell):
   ```powershell
   npx eas-cli credentials
   ```
   Select **iOS** → the `production` app/profile → let it inspect the Distribution Certificate. If it reports the certificate as missing, expired, or unvalidated, follow the prompts to generate or re-validate it (this may ask you to log in to the Apple Developer account tied to `com.kintally`). This is the step that actually resolves the failure — everything else below is cleanup, not required to unblock the build.

2. **Re-run the real build**, still interactively the first time, to confirm it clears the credentials step:
   ```powershell
   npx eas-cli build --profile production --platform ios
   ```
   Once this succeeds interactively, `eas build --non-interactive --platform ios` (if you ever need it, e.g. from a future CI job) should work without re-prompting, per Expo's own docs — credentials, once validated, stay validated on Expo's servers until the certificate is next revoked or expires (Distribution Certificates don't expire on a fixed schedule tied to builds, but do need re-validation after regeneration).

## Cleanup for the warnings (non-blocking, but worth doing while you're in here)

3. **Add the missing encryption-export declaration** to `app.json`, so this stops being flagged on every build and App Store Connect doesn't require manual configuration before testing:
   ```json
   "ios": {
     "bundleIdentifier": "com.kintally",
     "icon": "./assets/expo.icon",
     "buildNumber": "1",
     "infoPlist": {
       "ITSAppUsesNonExemptEncryption": false
     }
   }
   ```
   `false` is correct *today* — the app only uses standard HTTPS/TLS (Supabase over HTTPS), which Apple classifies as exempt. **Revisit this if/when the pending end-to-end encryption feature (`src/features/security/`, currently unwired) actually ships and is turned on** — at that point this needs to become `true`, plus the actual export-compliance paperwork with Apple that the warning is referring to.

4. **Remove the now-redundant `ios.buildNumber` field** from `app.json`. `eas.json`'s `appVersionSource: "remote"` means EAS manages build numbers remotely (that's why the CLI auto-incremented 1→2 in the output) — the local `"buildNumber": "1"` in `app.json` is ignored for build purposes and only causes the "this value will still be in the manifest... recommended to remove" warning. Just delete that line; remote versioning already has the real number.

5. **Upgrade eas-cli.** The run used an outdated version ("eas-cli@22.0.0 is now available. Proceeding with outdated version.") — several of the GitHub issues matching this exact credentials error are version-specific CLI bugs, so ruling out an already-fixed bug is cheap:
   ```powershell
   npm install -g eas-cli
   ```
   (`eas.json`'s `"cli": {"version": ">= 20.4.0"}` only sets a floor, so this won't break anything already pinned.)

6. **Optional, lower priority: check the "No environment variables" warning.** It's informational — no `Plain text`/`Sensitive` EAS environment variables exist for the `production` environment. Looking at `app.config.ts`, the only `process.env` read is `GOOGLE_SERVICES_JSON`, which is Android-only (Firebase), so it shouldn't affect this iOS build. Worth a quick confirmation that nothing iOS-specific (e.g. a `GoogleService-Info.plist` equivalent, or any Apple push/Sentry config) was silently expected to come from an EAS env var that was never set — but nothing in the current config suggests that's the case.

## Suggested order to actually run this

Steps 1–2 first (they're the actual fix); 3–5 can be done anytime before or after, they're independent of whether the build succeeds. Step 6 is just a sanity check, not an action unless something turns up.
