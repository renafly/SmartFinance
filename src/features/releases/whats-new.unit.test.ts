import type { PublishedRelease } from "./types";
import { aggregateWhatsNew } from "./whats-new";

function release(version: string, highlights: string[]): PublishedRelease {
  return {
    id: version,
    version,
    build: null,
    channel: "production",
    commit: null,
    title: `Version ${version}`,
    summary: null,
    highlights,
    publishedAt: "2026-07-17T10:00:00.000Z",
  };
}

describe("aggregateWhatsNew", () => {
  const releases = [
    release("1.0.0", ["Initial release"]),
    release("1.1.0", ["Shared budgets"]),
    release("1.2.0", ["Faster sync", "Shared budgets"]),
    release("1.3.0", ["New diagnostics"]),
  ];

  it("aggregates every published release skipped since the last seen version", () => {
    const result = aggregateWhatsNew(releases, "1.3.0", "1.0.0", "production");

    expect(result?.releases.map((item) => item.version)).toEqual([
      "1.1.0",
      "1.2.0",
      "1.3.0",
    ]);
    expect(result?.highlights).toEqual([
      "Shared budgets",
      "Faster sync",
      "New diagnostics",
    ]);
  });

  it("shows only the current release when no version has been seen", () => {
    expect(
      aggregateWhatsNew(releases, "1.3.0", null, "production")?.releases.map(
        (item) => item.version,
      ),
    ).toEqual(["1.3.0"]);
  });

  it("returns null when the current release has already been seen", () => {
    expect(
      aggregateWhatsNew(releases, "1.3.0", "1.3.0", "production"),
    ).toBeNull();
  });
});
