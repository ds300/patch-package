import { join, resolve } from "./path"
import { PackageDetails, getPatchDetailsFromCliString } from "./PackageDetails"
import { PackageManager, detectPackageManager } from "./detectPackageManager"
import { readFileSync, existsSync } from "fs-extra"
import { parse as parseYarnLockFile } from "@yarnpkg/lockfile"
import yaml from "yaml"
import findWorkspaceRoot from "find-yarn-workspace-root"
import { getPackageVersion } from "./getPackageVersion"
import { coerceSemVer } from "./coerceSemVer"

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
    const lockFileString = readFileSync(lockFilePath).toString()
    let appLockFile: Record<
      string,
      {
        version: string
        resolution?: string
        resolved?: string
      }
    >
    if (lockFileString.includes("yarn lockfile v1")) {
      const parsedYarnLockFile = parseYarnLockFile(lockFileString)
      if (parsedYarnLockFile.type !== "success") {
        throw new Error("Could not parse yarn v1 lock file")
      } else {
        appLockFile = parsedYarnLockFile.object
      }
    } else {
      try {
        appLockFile = yaml.parse(lockFileString)
      } catch (e) {
        console.log(e)
        throw new Error("Could not parse yarn v2 lock file")
      }
    }

    const installedVersion = getPackageVersion(
      join(resolve(appPath, packageDetails.path), "package.json"),
    )

    const entries = Object.entries(appLockFile).filter(
      ([k, v]) =>
        k.startsWith(packageDetails.name + "@") &&
        // @ts-ignore
        coerceSemVer(v.version) === coerceSemVer(installedVersion),
    )

    const resolutions = entries.map(([_, v]) => {
      return v.resolved
    })

    if (resolutions.length === 0) {
      throw new Error(
        `\`${packageDetails.pathSpecifier}\`'s installed version is ${installedVersion} but a lockfile entry for it couldn't be found. Your lockfile is likely to be corrupt or you forgot to reinstall your packages.`,
      )
    }

    if (new Set(resolutions).size !== 1) {
      console.log(
        `Ambiguous lockfile entries for ${packageDetails.pathSpecifier}. Using version ${installedVersion}`,
      )
      return installedVersion
    }

    if (resolutions[0]) {
      return resolutions[0]
    }

    const packageName = packageDetails.name

    const resolutionVersion = entries[0][1].version

    // `@backstage/integration@npm:^1.5.0, @backstage/integration@npm:^1.7.0, @backstage/integration@npm:^1.7.2`
    // ->
    // `^1.5.0 ^1.7.0 ^1.7.2`
    const resolution = entries[0][0]
      .replace(new RegExp(packageName + "@", "g"), "")
      .replace(/npm:/g, "")
      .replace(/,/g, "")

    // resolve relative file path
    if (resolution.startsWith("file:.")) {
      return `file:${resolve(appPath, resolution.slice("file:".length))}`
    }

    // add `resolutionVersion` to ensure correct version, `^1.0.0` could resolve latest `v1.3.0`, but `^1.0.0 1.2.1` won't
    return resolutionVersion ? resolution + " " + resolutionVersion : resolution
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
    const relevantStackEntry = lockFileStack.find((entry) => {
      if (entry.dependencies) {
        return entry.dependencies && packageDetails.name in entry.dependencies
      } else if (entry.packages) {
        return entry.packages && packageDetails.path in entry.packages
      }
      throw new Error("Cannot find dependencies or packages in lockfile")
    })
    const pkg = relevantStackEntry.dependencies
      ? relevantStackEntry.dependencies[packageDetails.name]
      : relevantStackEntry.packages[packageDetails.path]
    return pkg.resolved || pkg.version || pkg.from
  }
}

if (require.main === module) {
  const packageDetails = getPatchDetailsFromCliString(process.argv[2])
  if (!packageDetails) {
    console.log(`Can't find package ${process.argv[2]}`)
    process.exit(1)
  }
  console.log(
    getPackageResolution({
      appPath: process.cwd(),
      packageDetails,
      packageManager: detectPackageManager(process.cwd(), null),
    }),
  )
}
