import semver from "semver"

export function coerceSemVer(version: string): string | null {
  return semver.coerce(version)?.version || null
}
