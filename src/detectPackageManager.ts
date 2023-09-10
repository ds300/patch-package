import fs from "fs-extra"
import { join } from "./path"
import chalk from "chalk"
import process from "process"
import findWorkspaceRoot from "find-yarn-workspace-root"

export type PackageManager = "yarn" | "npm" | "npm-shrinkwrap" | "bun"

function printNoYarnLockfileError() {
  console.log(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
    `The --use-yarn option was specified but there is no yarn.lock file`,
  )}
`)
}

function printNoBunLockfileError() {
  console.log(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
    `The --use-bun option was specified but there is no bun.lockb file`,
  )}
`)
}

function printNoLockfilesError() {
  console.log(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
    `No package-lock.json, npm-shrinkwrap.json, yarn.lock, or bun.lockb file.

You must use either npm@>=5, yarn, npm-shrinkwrap, or bun to manage this project's
dependencies.`,
  )}
`)
}

function printSelectingDefaultMessage() {
  console.info(
    `${chalk.bold(
      "patch-package",
    )}: you have multiple lockfiles, e.g. yarn.lock and package-lock.json
Defaulting to using ${chalk.bold("npm")}
You can override this setting by passing --use-yarn, --use-bun, or
deleting the conflicting lockfile if you don't need it
`,
  )
}

function checkForYarnOverride(overridePackageManager: PackageManager | null) {
  if (overridePackageManager === "yarn") {
    printNoYarnLockfileError()
    process.exit(1)
  }
}

function checkForBunOverride(overridePackageManager: PackageManager | null) {
  if (overridePackageManager === "bun") {
    printNoBunLockfileError()
    process.exit(1)
  }
}

export const detectPackageManager = (
  appRootPath: string,
  overridePackageManager: PackageManager | null,
): PackageManager => {
  const packageLockExists = fs.existsSync(
    join(appRootPath, "package-lock.json"),
  )
  const shrinkWrapExists = fs.existsSync(
    join(appRootPath, "npm-shrinkwrap.json"),
  )
  const yarnLockExists = fs.existsSync(
    join(findWorkspaceRoot() ?? appRootPath, "yarn.lock"),
  )
  // Bun workspaces seem to work the same as yarn workspaces - https://bun.sh/docs/install/workspaces
  const bunLockbExists = fs.existsSync(
    join(findWorkspaceRoot() ?? appRootPath, "bun.lockb"),
  )
  if (
    [
      packageLockExists || shrinkWrapExists,
      yarnLockExists,
      bunLockbExists,
    ].filter(Boolean).length > 1
  ) {
    if (overridePackageManager) {
      return overridePackageManager
    }
    printSelectingDefaultMessage()
    return shrinkWrapExists ? "npm-shrinkwrap" : "npm"
  } else if (packageLockExists || shrinkWrapExists) {
    checkForYarnOverride(overridePackageManager)
    checkForBunOverride(overridePackageManager)
    return shrinkWrapExists ? "npm-shrinkwrap" : "npm"
  } else if (yarnLockExists) {
    checkForBunOverride(overridePackageManager)
    return "yarn"
  } else if (bunLockbExists) {
    checkForYarnOverride(overridePackageManager)
    return "bun"
  } else {
    printNoLockfilesError()
    process.exit(1)
  }
  throw Error()
}
