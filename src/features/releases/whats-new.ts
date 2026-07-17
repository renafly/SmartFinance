import { compareSemVer, isSemVer } from "./semver";
import type { PublishedRelease, WhatsNew } from "./types";

function uniqueHighlights(releases: PublishedRelease[]): string[] {
  const seen = new Set<string>();
  const highlights: string[] = [];

  for (const release of releases) {
    const releaseHighlights =
      release.highlights.length > 0
        ? release.highlights
        : [release.summary ?? release.title].filter(Boolean);
    for (const highlight of releaseHighlights) {
      const dedupeKey = highlight.trim().toLocaleLowerCase();
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      highlights.push(highlight.trim());
    }
  }

  return highlights;
}

export function aggregateWhatsNew(
  releases: PublishedRelease[],
  currentVersion: string,
  lastSeenVersion: string | null,
  channel: string,
): WhatsNew | null {
  if (!isSemVer(currentVersion)) return null;

  const eligible = releases
    .filter(
      (release) =>
        release.channel === channel &&
        isSemVer(release.version) &&
        compareSemVer(release.version, currentVersion) <= 0,
    )
    .sort((left, right) => compareSemVer(left.version, right.version));

  const unseen =
    lastSeenVersion && isSemVer(lastSeenVersion)
      ? eligible.filter(
          (release) => compareSemVer(release.version, lastSeenVersion) > 0,
        )
      : eligible.filter((release) => release.version === currentVersion);

  if (unseen.length === 0) return null;

  return {
    fromVersion: lastSeenVersion,
    toVersion: currentVersion,
    releases: unseen,
    highlights: uniqueHighlights(unseen),
  };
}
