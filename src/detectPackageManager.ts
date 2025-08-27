import fs from "fs-extra"
import { join } from "./path"
import chalk from "chalk"
import process from "process"
import findWorkspaceRoot from "find-yarn-workspace-root"

export type PackageManager = "yarn" | "npm" | "npm-shrinkwrap" | "pnpm"

function printNoYarnLockfileError() {
  console.log(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
    "The --use-yarn option was specified but there is no yarn.lock file",
  )}
`)
}

function printNoLockfilesError() {
  console.log(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
    "No package-lock.json, npm-shrinkwrap.json, yarn.lock, or pnpm-lock.yaml file.\n\nYou must use either npm@>=5, yarn, pnpm, or npm-shrinkwrap to manage this project's dependencies.",
  )}
`)
}

function printSelectingDefaultMessage() {
  console.info(
    `${chalk.bold(
      "patch-package",
    )}: you have both yarn.lock and package-lock.json
Defaulting to using ${chalk.bold("npm")}
You can override this setting by passing --use-yarn or deleting
package-lock.json if you don't need it
`,
  )
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
  const yarnLockExists = fs.existsSync(join(appRootPath, "yarn.lock"))
  const pnpmLockExists = fs.existsSync(join(process.cwd(), "pnpm-lock.yaml"))
  if ((packageLockExists || shrinkWrapExists) && yarnLockExists) {
    if (overridePackageManager) {
      return overridePackageManager
    } else {
      printSelectingDefaultMessage()
      return shrinkWrapExists ? "npm-shrinkwrap" : "npm"
    }
  } else if (packageLockExists || shrinkWrapExists) {
    if (overridePackageManager === "yarn") {
      printNoYarnLockfileError()
      process.exit(1)
    } else {
      return shrinkWrapExists ? "npm-shrinkwrap" : "npm"
    }
  } else if (pnpmLockExists) {
    return "pnpm"
  } else if (yarnLockExists || findWorkspaceRoot()) {
    return "yarn"
  } else {
    printNoLockfilesError()
    process.exit(1)
  }
  throw Error()
}
