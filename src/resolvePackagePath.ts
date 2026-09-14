import { existsSync, readdirSync, readFileSync, realpathSync } from "fs-extra"
import { basename, dirname } from "path"
import { PackageDetails } from "./PackageDetails"
import { join, relative } from "./path"

/**
 * npm install-strategy=linked keeps transitive and nested packages only in
 * node_modules/.store. Returns packageDetails.path when it exists or can't be resolved.
 */
export function resolvePackagePath({
  appPath,
  packageDetails,
  version,
}: {
  appPath: string
  packageDetails: PackageDetails
  version?: string
}): string {
  const { path, packageNames, name } = packageDetails

  if (existsSync(join(appPath, path))) {
    return path
  }

  const appRealPath = realpathSync(appPath)
  const storeDir = join(appPath, "node_modules", ".store")
  const lockfilePackages = readLockfilePackages(appPath)
  // makePatch reads the lockfile entry for this path, so it must exist
  if (Object.keys(lockfilePackages).length && !lockfilePackages[path]) {
    return path
  }
  const lockfileVersion = lockfilePackages[path]?.version
  // npm aliases record the real package name, which is what .store uses
  const storeName = lockfilePackages[path]?.name || name

  const packageDir =
    resolveThroughParents({
      appPath,
      appRealPath,
      storeDir,
      packageNames,
      lockfilePackages,
      lockfileVersion,
    }) ||
    findInStore({
      storeDir,
      name: storeName,
      lockfileVersion,
      fallbackVersion: version,
    })

  return packageDir ? relative(appRealPath, packageDir) : path
}

/**
 * The lockfile nests packages as a hoisted install would, which may not match
 * the real dependent, so the result only counts if its version agrees.
 */
function resolveThroughParents({
  appPath,
  appRealPath,
  storeDir,
  packageNames,
  lockfilePackages,
  lockfileVersion,
}: {
  appPath: string
  appRealPath: string
  storeDir: string
  packageNames: string[]
  lockfilePackages: LockfilePackages
  lockfileVersion?: string
}): string | null {
  const [rootName, ...nestedNames] = packageNames
  if (!nestedNames.length) {
    return null
  }

  const rootPath = join("node_modules", rootName)
  let packageDir = existsSync(join(appPath, rootPath))
    ? realpathSync(join(appPath, rootPath))
    : findInStore({
        storeDir,
        name: lockfilePackages[rootPath]?.name || rootName,
        lockfileVersion: lockfilePackages[rootPath]?.version,
      })

  for (const name of nestedNames) {
    if (!packageDir) {
      return null
    }
    packageDir = resolveDependency({ fromDir: packageDir, name, appRealPath })
  }

  if (!packageDir) {
    return null
  }

  // anything outside .store is a regular install, which is left untouched
  const storeEntry = parseStoreEntry(packageDir)
  if (
    !storeEntry ||
    (lockfileVersion && storeEntry.version !== lockfileVersion)
  ) {
    return null
  }
  return packageDir
}

function findInStore({
  storeDir,
  name,
  lockfileVersion,
  fallbackVersion,
}: {
  storeDir: string
  name: string
  lockfileVersion?: string
  fallbackVersion?: string
}): string | null {
  const entriesDir = name.startsWith("@")
    ? join(storeDir, name.split("/")[0])
    : storeDir
  if (!existsSync(entriesDir)) {
    return null
  }

  const candidates = readdirSync(entriesDir)
    .map((entry) => join(entriesDir, entry, "node_modules", name))
    .filter((candidate) => parseStoreEntry(candidate)?.name === name)
    .filter((candidate) => existsSync(join(candidate, "package.json")))

  // makePatch diffs against the lockfile version, so never substitute another
  const wantedVersion = lockfileVersion || fallbackVersion
  const matches = wantedVersion
    ? candidates.filter(
        (candidate) => parseStoreEntry(candidate)?.version === wantedVersion,
      )
    : []

  if (!matches.length && !lockfileVersion && candidates.length === 1) {
    return realpathSync(candidates[0])
  }
  // same-version entries differ by dependency graph, and we can't tell which is used
  return matches.length === 1 ? realpathSync(matches[0]) : null
}

/**
 * Store entries are node_modules/.store/<name>@<version>-<hash>/node_modules/<name>.
 * Reading the version from the path keeps patches to package.json resolvable.
 */
function parseStoreEntry(
  packageDir: string,
): { name: string; version: string } | undefined {
  const match = join(packageDir).match(
    /\/node_modules\/\.store\/((?:@[^/]+\/)?[^/@]+)@([^/]+)-[\w-]{22}\/node_modules\/(.+)$/,
  )
  if (!match || match[1] !== match[3]) {
    return undefined
  }
  return { name: match[1], version: match[2] }
}

/**
 * Mirrors Node's module lookup from the parent's real location, which finds
 * the sibling symlinks npm creates inside each .store entry.
 */
function resolveDependency({
  fromDir,
  name,
  appRealPath,
}: {
  fromDir: string
  name: string
  appRealPath: string
}): string | null {
  let currentDir = fromDir

  while (true) {
    if (basename(currentDir) !== "node_modules") {
      const candidate = join(currentDir, "node_modules", name)
      if (existsSync(candidate)) {
        return realpathSync(candidate)
      }
    }

    // workspace links point into the root .store, outside appPath
    const parentDir = dirname(currentDir)
    if (
      parentDir === currentDir ||
      basename(parentDir) === ".store" ||
      (!join(parentDir).includes("/node_modules/.store/") &&
        relative(appRealPath, parentDir).startsWith(".."))
    ) {
      return null
    }
    currentDir = parentDir
  }
}

type LockfilePackages = Record<
  string,
  { name?: string; version?: string } | undefined
>

function readLockfilePackages(appPath: string): LockfilePackages {
  for (const lockfileName of ["npm-shrinkwrap.json", "package-lock.json"]) {
    try {
      const lockfile = JSON.parse(
        readFileSync(join(appPath, lockfileName), "utf8"),
      )
      return lockfile.packages || {}
    } catch (e) {
      // noop
    }
  }
  return {}
}
