import { supabase } from "@/shared/lib/supabase/client";

import { compareSemVer, isSemVer } from "./semver";
import type { PublishedRelease } from "./types";

export const RELEASE_CATALOG_TABLE = "app_releases";

type CatalogRow = Record<string, unknown>;

function firstString(row: CatalogRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function highlightText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return firstString(value as CatalogRow, [
    "title",
    "text",
    "description",
    "summary",
  ]);
}

function parseHighlights(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(highlightText)
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parseHighlights(parsed);
  } catch {
    // Plain text release notes are split below.
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function isPublished(row: CatalogRow): boolean {
  const status = firstString(row, ["status", "release_status"]);
  if (status) return status.toLowerCase() === "published";
  if (typeof row.is_published === "boolean") return row.is_published;
  return Boolean(firstString(row, ["published_at", "publishedAt"]));
}

export function normalizePublishedRelease(
  row: CatalogRow,
): PublishedRelease | null {
  if (!isPublished(row)) return null;

  const version = firstString(row, ["version", "semver", "app_version"]);
  const publishedAt = firstString(row, ["published_at", "publishedAt", "released_at"]);
  if (!version || !isSemVer(version) || !publishedAt) return null;

  const title = firstString(row, ["title", "name"]) ?? `Version ${version}`;
  const summary = firstString(row, ["summary", "description"]);
  const highlightsValue =
    row.highlights ??
    row.changes ??
    row.release_notes ??
    row.notes ??
    row.content;

  return {
    id: firstString(row, ["id"]) ?? version,
    version,
    build: firstString(row, ["build", "build_number"]),
    channel: firstString(row, ["channel", "release_channel"]) ?? "production",
    commit: firstString(row, ["commit", "commit_sha", "git_commit"]),
    title,
    summary,
    highlights: parseHighlights(highlightsValue),
    publishedAt,
  };
}

export async function listPublishedReleases(
  channel: string,
): Promise<PublishedRelease[]> {
  const { data, error } = await supabase
    .from(RELEASE_CATALOG_TABLE)
    .select("*");
  if (error) throw error;

  return ((data ?? []) as CatalogRow[])
    .map(normalizePublishedRelease)
    .filter(
      (release): release is PublishedRelease => release?.channel === channel,
    )
    .sort((left, right) => compareSemVer(right.version, left.version));
}
