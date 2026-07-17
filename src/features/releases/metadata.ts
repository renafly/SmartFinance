import Constants from "expo-constants";
import * as Application from "expo-application";
import { Platform } from "react-native";

import { isSemVer } from "./semver";
import type { ReleaseMetadata } from "./types";

type ReleaseExtra = {
  build?: unknown;
  channel?: unknown;
  commit?: unknown;
};

function configuredReleaseExtra(): ReleaseExtra {
  const release = Constants.expoConfig?.extra?.release;
  return release && typeof release === "object"
    ? (release as ReleaseExtra)
    : {};
}

function configuredBuild(): string | null {
  const releaseBuild = configuredReleaseExtra().build;
  if (typeof releaseBuild === "string" && releaseBuild.trim())
    return releaseBuild.trim();

  if (Platform.OS === "ios")
    return Constants.expoConfig?.ios?.buildNumber ?? null;
  if (Platform.OS === "android") {
    const versionCode = Constants.expoConfig?.android?.versionCode;
    return versionCode === undefined ? null : String(versionCode);
  }
  return null;
}

function publicEnvironmentValue(
  name: "channel" | "commit",
): string | undefined {
  const value =
    name === "channel"
      ? process.env.EXPO_PUBLIC_RELEASE_CHANNEL
      : process.env.EXPO_PUBLIC_COMMIT_SHA;
  return value?.trim() || undefined;
}

export function getReleaseMetadata(): ReleaseMetadata {
  const extra = configuredReleaseExtra();
  const configuredVersion = Constants.expoConfig?.version;
  const nativeVersion =
    Platform.OS === "web" ? null : Application.nativeApplicationVersion;
  const versionCandidate = nativeVersion ?? configuredVersion ?? "0.0.0";
  const version = isSemVer(versionCandidate) ? versionCandidate : "0.0.0";
  const nativeBuild =
    Platform.OS === "web" ? null : Application.nativeBuildVersion;

  return {
    version,
    build: nativeBuild ?? configuredBuild() ?? "unknown",
    channel:
      publicEnvironmentValue("channel") ??
      (typeof extra.channel === "string" && extra.channel.trim()
        ? extra.channel.trim()
        : __DEV__
          ? "development"
          : "production"),
    commit:
      publicEnvironmentValue("commit") ??
      (typeof extra.commit === "string" && extra.commit.trim()
        ? extra.commit.trim()
        : "unknown"),
    source: nativeVersion ? "native" : "config",
  };
}

export const releaseMetadata = getReleaseMetadata();
