import chalk from "chalk"
import { copySync, existsSync, mkdirpSync, writeFileSync } from "fs-extra"
import { dirSync } from "tmp"
import { PackageManager } from "./detectPackageManager"
import { getPackageResolution } from "./getPackageResolution"
import { getPackageVersion } from "./getPackageVersion"
import { PackageDetails } from "./PackageDetails"
import { join, resolve } from "./path"
import { resolveRelativeFileDependencies } from "./resolveRelativeFileDependencies"
import { spawnSafeSync } from "./spawnSafe"

export function downloadPackage({
  packageDetails,
  appPath,
  packageManager,
}: {
  packageDetails: PackageDetails
  appPath: string
  packageManager: PackageManager
}) {
  const appPackageJson = require(join(appPath, "package.json"))

  const tmpRepo = dirSync({ unsafeCleanup: true })
  const tmpRepoPackagePath = join(tmpRepo.name, packageDetails.path)
  const tmpRepoNpmRoot = tmpRepoPackagePath.slice(
    0,
    -`/node_modules/${packageDetails.name}`.length,
  )

  const tmpRepoPackageJsonPath = join(tmpRepoNpmRoot, "package.json")

  try {
    console.info(chalk.grey("•"), "Creating temporary folder")

    // make a blank package.json
    mkdirpSync(tmpRepoNpmRoot)
    writeFileSync(
      tmpRepoPackageJsonPath,
      JSON.stringify({
        dependencies: {
          [packageDetails.name]: getPackageResolution({
            packageDetails,
            packageManager,
            appPath,
          }),
        },
        resolutions: resolveRelativeFileDependencies(
          appPath,
          appPackageJson.resolutions || {},
        ),
      }),
    )

    const packageVersion = getPackageVersion(
      join(resolve(packageDetails.path), "package.json"),
    )

    // copy .npmrc/.yarnrc in case packages are hosted in private registry
    // tslint:disable-next-line:align
    ;[".npmrc", ".yarnrc"].forEach((rcFile) => {
      const rcPath = join(appPath, rcFile)
      if (existsSync(rcPath)) {
        copySync(rcPath, join(tmpRepo.name, rcFile))
      }
    })

    if (packageManager === "yarn") {
      console.info(
        chalk.grey("•"),
        `Installing ${packageDetails.name}@${packageVersion} with yarn`,
      )
      try {
        // try first without ignoring scripts in case they are required
        // this works in 99.99% of cases
        spawnSafeSync(`yarn`, ["install", "--ignore-engines"], {
          cwd: tmpRepoNpmRoot,
          logStdErrOnError: false,
        })
      } catch (e) {
        // try again while ignoring scripts in case the script depends on
        // an implicit context which we havn't reproduced
        spawnSafeSync(
          `yarn`,
          ["install", "--ignore-engines", "--ignore-scripts"],
          {
            cwd: tmpRepoNpmRoot,
          },
        )
      }
    } else {
      console.info(
        chalk.grey("•"),
        `Installing ${packageDetails.name}@${packageVersion} with npm`,
      )
      try {
        // try first without ignoring scripts in case they are required
        // this works in 99.99% of cases
        spawnSafeSync(`npm`, ["i", "--force"], {
          cwd: tmpRepoNpmRoot,
          logStdErrOnError: false,
          stdio: "ignore",
        })
      } catch (e) {
        // try again while ignoring scripts in case the script depends on
        // an implicit context which we havn't reproduced
        spawnSafeSync(`npm`, ["i", "--ignore-scripts", "--force"], {
          cwd: tmpRepoNpmRoot,
          stdio: "ignore",
        })
      }
    }

    return {
      tmpRepo,
      tmpRepoPackagePath,
    }
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    tmpRepo.removeCallback()
  }
}
