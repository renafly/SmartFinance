import {
  getPersistentString,
  setPersistentString,
} from "@/shared/lib/persistent-storage";

import { isSemVer } from "./semver";

const LAST_SEEN_VERSION_KEY = "smartfinance.releases.last-seen";

export function lastSeenVersionStorageKey(channel: string): string {
  return `${LAST_SEEN_VERSION_KEY}.${channel.trim().toLowerCase() || "production"}`;
}

export function getLastSeenVersion(channel: string): string | null {
  const value = getPersistentString(lastSeenVersionStorageKey(channel));
  return value && isSemVer(value) ? value : null;
}

export function setLastSeenVersion(channel: string, version: string): void {
  if (!isSemVer(version))
    throw new Error(`Cannot persist invalid release version "${version}".`);
  setPersistentString(lastSeenVersionStorageKey(channel), version);
}
