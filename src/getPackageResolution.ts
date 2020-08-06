import { join, resolve } from "./path"
import { PackageDetails, getPatchDetailsFromCliString } from "./PackageDetails"
import { PackageManager, detectPackageManager } from "./detectPackageManager"
import { readFileSync, existsSync } from "fs-extra"
import { parse as parseYarnLockFile } from "@yarnpkg/lockfile"
import findWorkspaceRoot from "find-yarn-workspace-root"

export function getPackageResolution({
  packageDetails,
  packageManager,
  appPath,
}: {
  packageDetails: PackageDetails
  packageManager: PackageManager
  appPath: string
}) {
  if (packageManager === "yarn") {
    let lockFilePath = "yarn.lock"
    if (!existsSync(lockFilePath)) {
      const workspaceRoot = findWorkspaceRoot()
      if (!workspaceRoot) {
        throw new Error("Can't find yarn.lock file")
      }
      lockFilePath = join(workspaceRoot, "yarn.lock")
    }
    if (!existsSync(lockFilePath)) {
      throw new Error("Can't find yarn.lock file")
    }
    const appLockFile = parseYarnLockFile(readFileSync(lockFilePath).toString())
    if (appLockFile.type !== "success") {
      throw new Error("Can't parse lock file")
    }

    const installedVersion = require(join(
      resolve(appPath, packageDetails.path),
      "package.json",
    )).version as string

    const entries = Object.entries(appLockFile.object).filter(
      ([pkgNameAndVersion, v]) => {
        if (pkgNameAndVersion.startsWith(packageDetails.name + "@") && v.version === installedVersion) {
            return true
        }        
        // Non-standard versioning. Yarn resolves "package@1.2.3+3d74b79d" as version "1.2.3"
        // while installedVersion (from package.json) is "1.2.3+3d74b79d"
        return pkgNameAndVersion === packageDetails.name + "@" + installedVersion;
      }
    )

    const resolutions = entries.map(([_, v]) => {
      return v.resolved
    })

    if (resolutions.length === 0) {
      throw new Error(
        `Can't find lockfile entry for ${packageDetails.pathSpecifier}`,
      )
    }

    if (new Set(resolutions).size !== 1) {
      console.warn(
        `Ambigious lockfile entries for ${packageDetails.pathSpecifier}. Using version ${installedVersion}`,
      )
      return installedVersion
    }

    if (resolutions[0]) {
      return resolutions[0]
    }

    const resolution = entries[0][0].slice(packageDetails.name.length + 1)

    // resolve relative file path
    if (resolution.startsWith("file:.")) {
      return `file:${resolve(appPath, resolution.slice("file:".length))}`
    }

    return resolution
  } else {
    const lockfile = require(join(
      appPath,
      packageManager === "npm-shrinkwrap"
        ? "npm-shrinkwrap.json"
        : "package-lock.json",
    ))
    const lockFileStack = [lockfile]
    for (const name of packageDetails.packageNames.slice(0, -1)) {
      const child = lockFileStack[0].dependencies
      if (child && name in child) {
        lockFileStack.push(child[name])
      }
    }
    lockFileStack.reverse()
    const relevantStackEntry = lockFileStack.find(
      entry => entry.dependencies && packageDetails.name in entry.dependencies,
    )
    const pkg = relevantStackEntry.dependencies[packageDetails.name]
    return pkg.resolved || pkg.from || pkg.version
  }
}

if (require.main === module) {
  const packageDetails = getPatchDetailsFromCliString(process.argv[2])
  if (!packageDetails) {
    console.error(`Can't find package ${process.argv[2]}`)
    process.exit(1)
    throw new Error()
  }
  console.log(
    getPackageResolution({
      appPath: process.cwd(),
      packageDetails,
      packageManager: detectPackageManager(process.cwd(), null),
    }),
  )
}
