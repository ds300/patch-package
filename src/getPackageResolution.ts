import { join, resolve } from "./path"
import { PackageDetails, getPatchDetailsFromCliString } from "./PackageDetails"
import { PackageManager, detectPackageManager } from "./detectPackageManager"
import { readFileSync, existsSync } from "fs-extra"
import { parse as parseYarnLockFile } from "@yarnpkg/lockfile"
import yaml from "yaml"
import findWorkspaceRoot from "find-yarn-workspace-root"
import { getPackageVersion } from "./getPackageVersion"
import { coerceSemVer } from "./coerceSemVer"
import { parseBunLockfile } from "./parseBunLockfile"

export function getPackageResolution({
  packageDetails,
  packageManager,
  appPath,
}: {
  packageDetails: PackageDetails
  packageManager: PackageManager
  appPath: string
}) {
  if (packageManager === "yarn" || packageManager === "bun") {
    const isBun = packageManager === "bun"
    const lockFileName = isBun ? "bun.lockb" : "yarn.lock"
    let lockFilePath = lockFileName
    if (!existsSync(lockFilePath)) {
      const workspaceRoot = findWorkspaceRoot()
      if (!workspaceRoot) {
        throw new Error(`Can't find ${lockFileName} file`)
      }
      lockFilePath = join(workspaceRoot, lockFilePath)
    }
    if (!existsSync(lockFilePath)) {
      throw new Error(`Can't find ${lockFileName} file`)
    }
    const lockFileString = isBun
      ? parseBunLockfile(lockFilePath)
      : readFileSync(lockFilePath).toString()
    let appLockFile
    if (lockFileString.includes("yarn lockfile v1")) {
      const parsedYarnLockFile = parseYarnLockFile(lockFileString)
      if (parsedYarnLockFile.type !== "success") {
        throw new Error(
          `Could not parse yarn v1 lock file ${
            isBun ? "- was originally a bun.lockb file" : ""
          }`,
        )
      } else {
        appLockFile = parsedYarnLockFile.object
      }
    } else {
      try {
        appLockFile = yaml.parse(lockFileString)
      } catch (e) {
        console.log(e)
        throw new Error(
          `Could not parse yarn v2 lock file ${
            isBun ? "- was originally a bun.lockb file (should not happen)" : ""
          }`,
        )
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
      // @ts-ignore
      return v.resolved
    })

    if (resolutions.length === 0) {
      throw new Error(
        `\`${packageDetails.pathSpecifier}\`'s installed version is ${installedVersion} but a lockfile entry for it couldn't be found. Your lockfile is likely to be corrupt or you forgot to reinstall your packages.`,
      )
    }

    if (new Set(resolutions).size !== 1) {
      console.log(
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

    if (resolution.startsWith("npm:")) {
      return resolution.replace("npm:", "")
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
