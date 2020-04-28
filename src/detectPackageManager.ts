import fs from "fs-extra"
import { join } from "./path"
import chalk from "chalk"
import process from "process"
import findWorkspaceRoot from "find-yarn-workspace-root"
import { spawnSafeSync } from "./spawnSafe"
import { printPatchingProgress } from "./applyPatches"

export type PackageManager = "yarn" | "npm" | "npm-shrinkwrap"

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
  const yarnLockExists = fs.existsSync(join(appRootPath, "yarn.lock"))
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
  } else if (yarnLockExists || findWorkspaceRoot()) {
    return "yarn"
  } else {
    printNoLockfilesError()
    process.exit(1)
  }
  throw Error()
}

export function installPackage({
  packageManager,
  repoRoot,
  packageName,
  packageVersion,
}: {
  packageManager: PackageManager
  repoRoot: string
  packageName: string
  packageVersion: string
}) {
  if (packageManager === "yarn") {
    printPatchingProgress({
      progress: "installing",
      packageName,
      packageVersion,
    })

    try {
      // try first without ignoring scripts in case they are required
      // this works in 99.99% of cases
      spawnSafeSync(`yarn`, ["install", "--ignore-engines"], {
        cwd: repoRoot,
        logStdErrOnError: true,
      })
    } catch (e) {
      // try again while ignoring scripts in case the script depends on
      // an implicit context which we havn't reproduced
      spawnSafeSync(
        `yarn`,
        ["install", "--ignore-engines", "--ignore-scripts"],
        {
          cwd: repoRoot,
        },
      )
    }
  } else {
    console.info(
      chalk.green("•"),
      `Installing ${packageName}@${packageVersion} with npm`,
    )
    try {
      // try first without ignoring scripts in case they are required
      // this works in 99.99% of cases
      spawnSafeSync(`npm`, ["i"], {
        cwd: repoRoot,
        logStdErrOnError: false,
      })
    } catch (e) {
      // try again while ignoring scripts in case the script depends on
      // an implicit context which we havn't reproduced
      spawnSafeSync(`npm`, ["i", "--ignore-scripts"], {
        cwd: repoRoot,
      })
    }
  }
}
