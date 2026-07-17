import { normalizePublishedRelease } from "./catalog";

describe("normalizePublishedRelease", () => {
  it("normalizes the supported release catalog fields", () => {
    expect(
      normalizePublishedRelease({
        id: "release-1",
        semver: "1.2.0",
        build_number: 12,
        release_channel: "production",
        commit_sha: "abc123",
        title: "Better budgets",
        description: "A focused planning update.",
        changes: ["Faster month setup", { title: "Clearer totals" }],
        status: "published",
        published_at: "2026-07-17T10:00:00.000Z",
      }),
    ).toEqual({
      id: "release-1",
      version: "1.2.0",
      build: "12",
      channel: "production",
      commit: "abc123",
      title: "Better budgets",
      summary: "A focused planning update.",
      highlights: ["Faster month setup", "Clearer totals"],
      publishedAt: "2026-07-17T10:00:00.000Z",
    });
  });

  it("excludes drafts and malformed versions", () => {
    expect(
      normalizePublishedRelease({
        version: "1.2.0",
        status: "draft",
        published_at: "2026-07-17T10:00:00.000Z",
      }),
    ).toBeNull();
    expect(
      normalizePublishedRelease({
        version: "next",
        status: "published",
        published_at: "2026-07-17T10:00:00.000Z",
      }),
    ).toBeNull();
  });
});
