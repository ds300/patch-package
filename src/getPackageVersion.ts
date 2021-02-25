export function getPackageVersion(packageJsonPath: string): string {
  // remove build metadata
  return require(packageJsonPath).version.replace(/\+.*$/, "")
}
