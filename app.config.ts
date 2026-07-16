import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "SmartFinance",
  slug: config.slug ?? "SmartFinance",
  android: {
    ...config.android,
    // Configure this as an EAS secret file so Firebase credentials stay out of git.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
  },
});
