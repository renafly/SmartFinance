export type SemVer = {
  major: number;
  minor: number;
  patch: number;
  prerelease: (string | number)[];
};

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function parseSemVer(value: string): SemVer | null {
  const match = SEMVER_PATTERN.exec(value.trim());
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]
      ? match[4]
          .split(".")
          .map((identifier) =>
            /^\d+$/.test(identifier) ? Number(identifier) : identifier,
          )
      : [],
  };
}

export function isSemVer(value: string): boolean {
  return parseSemVer(value) !== null;
}

export function compareSemVer(left: string, right: string): number {
  const leftVersion = parseSemVer(left);
  const rightVersion = parseSemVer(right);
  if (!leftVersion || !rightVersion) {
    throw new Error(
      `Cannot compare invalid SemVer values: "${left}" and "${right}".`,
    );
  }

  for (const field of ["major", "minor", "patch"] as const) {
    if (leftVersion[field] !== rightVersion[field]) {
      return leftVersion[field] < rightVersion[field] ? -1 : 1;
    }
  }

  if (
    leftVersion.prerelease.length === 0 ||
    rightVersion.prerelease.length === 0
  ) {
    if (leftVersion.prerelease.length === rightVersion.prerelease.length)
      return 0;
    return leftVersion.prerelease.length === 0 ? 1 : -1;
  }

  const identifierCount = Math.max(
    leftVersion.prerelease.length,
    rightVersion.prerelease.length,
  );
  for (let index = 0; index < identifierCount; index += 1) {
    const leftIdentifier = leftVersion.prerelease[index];
    const rightIdentifier = rightVersion.prerelease[index];
    if (leftIdentifier === undefined || rightIdentifier === undefined) {
      return leftIdentifier === undefined ? -1 : 1;
    }
    if (leftIdentifier === rightIdentifier) continue;
    if (
      typeof leftIdentifier === "number" &&
      typeof rightIdentifier === "number"
    ) {
      return leftIdentifier < rightIdentifier ? -1 : 1;
    }
    if (typeof leftIdentifier === "number") return -1;
    if (typeof rightIdentifier === "number") return 1;
    return leftIdentifier < rightIdentifier ? -1 : 1;
  }

  return 0;
}
