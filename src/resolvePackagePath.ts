import { existsSync, readdirSync } from "fs-extra"
import { join, relative, resolve } from "./path"

/**
 * Resolves the real filesystem path for a package that may not be at the
 * expected node_modules location. Handles:
 *
 * 1. npm install-strategy=linked (.store directory layout)
 * 2. Monorepo hoisting (package in ancestor node_modules)
 *
 * Returns a path relative to appPath (like packageDetails.path).
 * Falls back to the original packagePath if the package cannot be found elsewhere.
 */
export function resolvePackagePath({
  appPath,
  packagePath,
  packageName,
  version,
}: {
  appPath: string
  packagePath: string
  packageName: string
  version?: string
}): string {
  const fullPath = join(appPath, packagePath)

  // Direct path exists (handles regular installs and working symlinks)
  if (existsSync(fullPath)) {
    return packagePath
  }

  // Try to find the package in .store directory (npm install-strategy=linked)
  const storePath = resolveFromStore({ appPath, packageName, version })
  if (storePath) {
    return storePath
  }

  // Try to find the package in ancestor node_modules (monorepo hoisting)
  const ancestorPath = resolveFromAncestors({ appPath, packageName })
  if (ancestorPath) {
    return ancestorPath
  }

  // Couldn't resolve, return original (caller will handle the error)
  return packagePath
}

function resolveFromStore({
  appPath,
  packageName,
  version,
}: {
  appPath: string
  packageName: string
  version?: string
}): string | null {
  const storePath = join(appPath, "node_modules", ".store")

  if (!existsSync(storePath)) {
    return null
  }

  try {
    const storeEntries = readdirSync(storePath)
    // For scoped packages like @scope/name, .store uses + as separator
    const normalizedName = packageName.replace("/", "+")

    // Try version-specific match first
    if (version) {
      const versionPrefix = `${normalizedName}@${version}`
      for (const entry of storeEntries) {
        if (entry.startsWith(versionPrefix)) {
          const candidatePath = join(
            "node_modules",
            ".store",
            entry,
            "node_modules",
            packageName,
          )
          if (existsSync(join(appPath, candidatePath))) {
            return candidatePath
          }
        }
      }
    }

    // Try any version match
    const namePrefix = normalizedName + "@"
    for (const entry of storeEntries) {
      if (entry.startsWith(namePrefix)) {
        const candidatePath = join(
          "node_modules",
          ".store",
          entry,
          "node_modules",
          packageName,
        )
        if (existsSync(join(appPath, candidatePath))) {
          return candidatePath
        }
      }
    }
  } catch (e) {
    // noop
  }

  return null
}

/**
 * Walks up parent directories looking for the package in ancestor
 * node_modules directories. This handles monorepo hoisting where
 * dependencies are installed in the workspace root node_modules
 * rather than the package's own node_modules.
 */
function resolveFromAncestors({
  appPath,
  packageName,
}: {
  appPath: string
  packageName: string
}): string | null {
  let currentDir = resolve(appPath, "..")

  while (true) {
    const candidateFullPath = join(currentDir, "node_modules", packageName)
    if (existsSync(candidateFullPath)) {
      return relative(appPath, candidateFullPath)
    }

    const parentDir = resolve(currentDir, "..")
    if (parentDir === currentDir) {
      // Reached filesystem root
      break
    }
    currentDir = parentDir
  }

  return null
}
