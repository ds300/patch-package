import * as fs from "fs"
import * as path from "path"
import * as chalk from "chalk"
import * as process from "process"

export type PackageManager = "yarn" | "npm"

export default function detectPackageManager(
  appRootPath: string,
  overridePackageManager: PackageManager | null,
): PackageManager {
  const packageLockExists = fs.existsSync(
    path.join(appRootPath, "package-lock.json"),
  )
  const yarnLockExists = fs.existsSync(path.join(appRootPath, "yarn.lock"))
  if (packageLockExists && yarnLockExists) {
    if (overridePackageManager) {
      return overridePackageManager
    } else {
      printSelectingDefaultMessage()
      return "npm"
    }
  } else if (packageLockExists) {
    if (overridePackageManager === "yarn") {
      printNoYarnLockfileError()
      process.exit(1)
    } else {
      return "npm"
    }
  } else if (yarnLockExists) {
    return "yarn"
  } else {
    printNoLockfilesError()
    process.exit(1)
  }
  throw Error()
}

function printNoYarnLockfileError() {
  console.error(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
    `The --use-yarn option was specified but there is no yarn.lock file`,
  )}
`)
}

function printNoLockfilesError() {
  console.error(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
    `No package-lock.json or yarn.lock file. You must use either npm@>=5 or yarn
to manage this project's dependencies.`,
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
