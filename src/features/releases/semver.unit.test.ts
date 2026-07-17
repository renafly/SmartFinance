import { compareSemVer, isSemVer, parseSemVer } from "./semver";

describe("SemVer", () => {
  it("parses valid release and prerelease versions", () => {
    expect(parseSemVer("2.4.1-beta.2+abc123")).toEqual({
      major: 2,
      minor: 4,
      patch: 1,
      prerelease: ["beta", 2],
    });
    expect(isSemVer("1.0.0")).toBe(true);
  });

  it("rejects incomplete versions and leading zeroes", () => {
    expect(isSemVer("1.0")).toBe(false);
    expect(isSemVer("01.0.0")).toBe(false);
  });

  it("compares releases according to SemVer precedence", () => {
    expect(compareSemVer("1.10.0", "1.9.0")).toBe(1);
    expect(compareSemVer("2.0.0-beta.2", "2.0.0-beta.11")).toBe(-1);
    expect(compareSemVer("2.0.0", "2.0.0-rc.1")).toBe(1);
    expect(compareSemVer("1.0.0+one", "1.0.0+two")).toBe(0);
  });
});
