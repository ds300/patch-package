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

  const storeDir = join(appPath, "node_modules", ".store")
  if (!existsSync(storeDir)) {
    return path
  }

  const appRealPath = realpathSync(appPath)
  const lockfilePackages = readLockfilePackages(appPath)
  const lockfileVersion = lockfilePackages[path]?.version

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
      name,
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
        name: rootName,
        lockfileVersion: lockfilePackages[rootPath]?.version,
      })

  for (const name of nestedNames) {
    if (!packageDir) {
      return null
    }
    packageDir = resolveDependency({ fromDir: packageDir, name, appRealPath })
  }

  if (
    packageDir &&
    lockfileVersion &&
    readPackageVersion(packageDir) !== lockfileVersion
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
  // Store entries are named <name>@<version>-<hash>, grouped by scope.
  const entriesDir = name.startsWith("@")
    ? join(storeDir, name.split("/")[0])
    : storeDir
  if (!existsSync(entriesDir)) {
    return null
  }

  const entryPrefix = `${name.split("/").pop()}@`
  const candidates = readdirSync(entriesDir)
    .filter((entry) => entry.startsWith(entryPrefix))
    .sort()
    .map((entry) => join(entriesDir, entry, "node_modules", name))
    .filter((candidate) => existsSync(join(candidate, "package.json")))

  const findVersion = (version: string) =>
    candidates.find((candidate) => readPackageVersion(candidate) === version)

  let match: string | undefined
  if (lockfileVersion) {
    // makePatch diffs against the lockfile version, so never substitute another
    match = findVersion(lockfileVersion)
  } else if (fallbackVersion) {
    match = findVersion(fallbackVersion)
  }
  if (!match && !lockfileVersion && candidates.length === 1) {
    match = candidates[0]
  }

  return match ? realpathSync(match) : null
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

  while (!relative(appRealPath, currentDir).startsWith("..")) {
    if (basename(currentDir) !== "node_modules") {
      const candidate = join(currentDir, "node_modules", name)
      if (existsSync(candidate)) {
        return realpathSync(candidate)
      }
    }

    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      break
    }
    currentDir = parentDir
  }

  return null
}

type LockfilePackages = Record<string, { version?: string } | undefined>

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

function readPackageVersion(packageDir: string): string | undefined {
  try {
    return JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"))
      .version
  } catch (e) {
    return undefined
  }
}
