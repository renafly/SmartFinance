import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Kintally",
  // The EAS project (extra.eas.projectId) is permanently bound to the "SmartFinance"
  // slug from when it was created — EAS project IDs cannot be reassigned to a new
  // slug. The slug is an internal EAS identifier only; it isn't shown to users,
  // so it doesn't need to match the public app name ("Kintally").
  slug: config.slug ?? "SmartFinance",
  android: {
    ...config.android,
    // Configure this as an EAS secret file so Firebase credentials stay out of git.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
  },
});
