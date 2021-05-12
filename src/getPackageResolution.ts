import { join, resolve } from "./path"
import { PackageDetails, getPatchDetailsFromCliString } from "./PackageDetails"
import { PackageManager, detectPackageManager } from "./detectPackageManager"
import { readFileSync, existsSync } from "fs-extra"
import { parse as parseYarnLockFile } from "@yarnpkg/lockfile"
import findWorkspaceRoot from "find-yarn-workspace-root"
import { getPackageVersion } from "./getPackageVersion"
//import { execSync } from "child_process"

//const isVerbose = global.patchPackageIsVerbose
const isDebug = global.patchPackageIsDebug

export function getPackageResolution({
  packageDetails,
  packageManager,
  appPath,
  appPackageJson,
}: {
  packageDetails: PackageDetails
  packageManager: PackageManager
  appPath: string
  appPackageJson: any
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

    const installedVersion = getPackageVersion(
      join(resolve(appPath, packageDetails.path), "package.json"),
    )

    const entries = Object.entries(appLockFile.object).filter(
      ([k, v]) =>
        k.startsWith(packageDetails.name + "@") &&
        v.version === installedVersion,
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
      return { version: installedVersion }
    }

    if (resolutions[0]) {
      return { version: resolutions[0] }
    }

    const resolution = entries[0][0].slice(packageDetails.name.length + 1)

    // resolve relative file path
    if (resolution.startsWith("file:.")) {
      return {
        version: `file:${resolve(appPath, resolution.slice("file:".length))}`,
      }
    }
    return { version: resolution }
  } else if (packageManager === "pnpm") {
    // WORKAROUND for pnpm bug? pnpm-lock.yaml says version 1.2.3 for linked packages, not link:../../path/to/package
    const declaredVersion =
      (appPackageJson.dependencies &&
        appPackageJson.dependencies[packageDetails.name]) ||
      (appPackageJson.devDependencies &&
        appPackageJson.devDependencies[packageDetails.name])
    if (isDebug) {
      console.log(
        `patch-package/getPackageResolution: declaredVersion = ${declaredVersion}`,
      )
    }

    // TODO validate: declaredVersion must not be wildcard
    return { version: declaredVersion }

    // TODO dont use lockfiles at all?
    // package versions should be pinned in /package.json, so it works with all package managers at all times
    /*
    const lockfile = require("js-yaml").load(
      require("fs").readFileSync(join(appPath, "pnpm-lock.yaml"), "utf8"),
    )
    if (isDebug) {
      console.log(`patch-package/getPackageResolution: appPath = ${appPath}`)
      console.log(`patch-package/getPackageResolution: packageDetails:`)
      console.dir(packageDetails)
      console.log(
        `patch-package/getPackageResolution: packageDetails.name = ${packageDetails.name}`,
      )
      console.log(
        `patch-package/getPackageResolution: lockfile.dependencies[packageDetails.name] = ${
          lockfile.dependencies[packageDetails.name]
        }`,
      )
      console.log(
        `patch-package/getPackageResolution: lockfile.devDependencies[packageDetails.name] = ${
          lockfile.devDependencies[packageDetails.name]
        }`,
      )
    }
    let resolvedVersion =
      (lockfile.dependencies && lockfile.dependencies[packageDetails.name]) ||
      (lockfile.devDependencies &&
        lockfile.devDependencies[packageDetails.name])
    if (declaredVersion.startsWith("link:")) {
      // WORKAROUND
      if (isDebug) {
        console.log(
          `patch-package/getPackageResolution: using declaredVersion ${declaredVersion}, not resolvedVersion ${resolvedVersion}`,
        )
      }
      resolvedVersion = declaredVersion
    }
    if (isDebug) {
      console.log(
        `patch-package/getPackageResolution: resolvedVersion = ${resolvedVersion}`,
      )
    }
    if (resolvedVersion.startsWith("link:")) {
      const localPath = resolve(resolvedVersion.slice(5))
      if (isVerbose) {
        console.log(
          `patch-package/getPackageResolution: pnpm installed ${packageDetails.name} from ${localPath}`,
        )
      }
      if (existsSync(localPath + "/.git")) {
        // we hope that the originCommit will be available for future downloads
        // otherwise our patch will not work ...
        // ideally, we would use the last stable release before originCommit from npm or github
        function exec(cmd: string) {
          return execSync(cmd, {
            cwd: localPath,
            windowsHide: true,
            encoding: "utf8",
          }).trim()
        }
        const originUrl = exec("git remote get-url origin")
        // TODO what if the upstream repo is not called "origin"?
        const originCommit = exec("git rev-parse origin/HEAD") // npm needs the long commit hash
        resolvedVersion = `git+${originUrl}#${originCommit}`
        if (isVerbose) {
          console.log(
            `patch-package/getPackageResolution: using ${packageDetails.name} version ${resolvedVersion} from git origin/HEAD in ${localPath}`,
          )
        }
        return { version: resolvedVersion, originCommit }
      }
      const pkgJson = localPath + "/package.json"
      if (existsSync(pkgJson)) {
        resolvedVersion = require(pkgJson).version
        console.warn(
          `warning: using ${packageDetails.name} version ${resolvedVersion} from ${pkgJson}`,
        )
        return { version: resolvedVersion }
      }
    }
    if (isVerbose) {
      console.log(
        `patch-package/getPackageResolution: using ${packageDetails.name} version ${resolvedVersion}`,
      )
    }
    return { version: resolvedVersion }
    */
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
      (entry) =>
        entry.dependencies && packageDetails.name in entry.dependencies,
    )
    const pkg = relevantStackEntry.dependencies[packageDetails.name]
    return { version: pkg.resolved || pkg.from || pkg.version }
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
      appPackageJson: {}, // TODO?
    }),
  )
}
