import * as fs from "fs"
import { join } from "./path"
import * as chalk from "chalk"
import * as process from "process"

export type PackageManager = "yarn" | "npm" | "npm-shrinkwrap" | "pnpm"

function printNoYarnLockfileError() {
  console.error(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
      `The --use-yarn option was specified but there is no yarn.lock file`,
    )}
`)
}

function printNoPnpmLockfileError() {
  console.error(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
      `The --use-pnpm option was specified but there is no shrinkwrap.yaml file`,
    )}
`)
}

function printNoLockfilesError() {
  console.error(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
      `No package-lock.json, npm-shrinkwrap.json, or yarn.lock file.

You must use either npm@>=5, yarn, or npm-shrinkwrap to manage this project's
dependencies.`,
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
  const shrinkWrapYamlExists = fs.existsSync(
    join(appRootPath, "shrinkwrap.yaml"),
  )
  const yarnLockExists = fs.existsSync(join(appRootPath, "yarn.lock"))
  if ((packageLockExists || shrinkWrapExists || shrinkWrapYamlExists) && yarnLockExists) {
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
    } else if (overridePackageManager === "pnpm") {
      printNoPnpmLockfileError()
      process.exit(1)
    } else {
      return shrinkWrapExists ? "npm-shrinkwrap" : "npm"
    }
  } else if (yarnLockExists) {
    return "yarn"
  } else if (shrinkWrapYamlExists) {
    return "pnpm"
  } else {
    printNoLockfilesError()
    process.exit(1)
  }
  throw Error()
}
