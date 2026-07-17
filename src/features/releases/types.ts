export type ReleaseMetadata = {
  version: string;
  build: string;
  channel: string;
  commit: string;
  source: "native" | "config";
};

export type PublishedRelease = {
  id: string;
  version: string;
  build: string | null;
  channel: string;
  commit: string | null;
  title: string;
  summary: string | null;
  highlights: string[];
  publishedAt: string;
};

export type WhatsNew = {
  fromVersion: string | null;
  toVersion: string;
  releases: PublishedRelease[];
  highlights: string[];
};
