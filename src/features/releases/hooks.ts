import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listPublishedReleases } from "./catalog";
import { releaseMetadata } from "./metadata";
import { getLastSeenVersion, setLastSeenVersion } from "./storage";
import { aggregateWhatsNew } from "./whats-new";

export const releaseQueryKeys = {
  all: ["releases"] as const,
  catalog: (channel: string) =>
    [...releaseQueryKeys.all, "catalog", channel] as const,
};

export function useReleaseCatalog(channel = releaseMetadata.channel) {
  return useQuery({
    queryKey: releaseQueryKeys.catalog(channel),
    queryFn: () => listPublishedReleases(channel),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useLastSeenReleaseVersion(channel = releaseMetadata.channel) {
  const [lastSeenVersion, setLastSeenVersionState] = useState(() =>
    getLastSeenVersion(channel),
  );

  function markVersionSeen(version: string) {
    setLastSeenVersion(channel, version);
    setLastSeenVersionState(version);
  }

  return { lastSeenVersion, markVersionSeen };
}

export function useWhatsNew() {
  const catalog = useReleaseCatalog(releaseMetadata.channel);
  const { lastSeenVersion, markVersionSeen } = useLastSeenReleaseVersion(
    releaseMetadata.channel,
  );
  const whatsNew = catalog.data
    ? aggregateWhatsNew(
        catalog.data,
        releaseMetadata.version,
        lastSeenVersion,
        releaseMetadata.channel,
      )
    : null;

  return {
    ...catalog,
    metadata: releaseMetadata,
    lastSeenVersion,
    whatsNew,
    markCurrentVersionSeen: () => markVersionSeen(releaseMetadata.version),
  };
}
