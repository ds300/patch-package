import chalk from "chalk"
import { getPatchFiles } from "./patchFs"
import { executeEffects } from "./patch/apply"
import { existsSync } from "fs-extra"
import { join, resolve, relative } from "./path"
import { posix } from "path"
import {
  getPackageDetailsFromPatchFilename,
  PackageDetails,
} from "./PackageDetails"
import { reversePatch } from "./patch/reverse"
import isCi from "is-ci"
import semver from "semver"
import { readPatch } from "./patch/read"
import { packageIsDevDependency } from "./packageIsDevDependency"

// don't want to exit(1) on postinsall locally.
// see https://github.com/ds300/patch-package/issues/86
const shouldExitPostinstallWithError = isCi || process.env.NODE_ENV === "test"

const exit = () => process.exit(shouldExitPostinstallWithError ? 1 : 0)

function findPatchFiles(patchesDirectory: string): string[] {
  if (!existsSync(patchesDirectory)) {
    return []
  }

  return getPatchFiles(patchesDirectory) as string[]
}

function getInstalledPackageVersion({
  appPath,
  path,
  pathSpecifier,
  isDevOnly,
  patchFilename,
}: {
  appPath: string
  path: string
  pathSpecifier: string
  isDevOnly: boolean
  patchFilename: string
}): null | string {
  const packageDir = join(appPath, path)
  if (!existsSync(packageDir)) {
    if (process.env.NODE_ENV === "production" && isDevOnly) {
      return null
    }
    console.error(
      `${chalk.red("Error:")} Patch file found for package ${posix.basename(
        pathSpecifier,
      )}` + ` which is not present at ${relative(".", packageDir)}`,
    )

    if (!isDevOnly && process.env.NODE_ENV === "production") {
      console.error(
        `
  If this package is a dev dependency, rename the patch file to
  
    ${chalk.bold(patchFilename.replace(".patch", ".dev.patch"))}
`,
      )
    }

    exit()
  }

  const { version } = require(join(packageDir, "package.json"))
  // normalize version for `npm ci`
  const result = semver.valid(version)
  if (result === null) {
    console.error(
      `${chalk.red(
        "Error:",
      )} Version string '${version}' cannot be parsed from ${join(
        packageDir,
        "package.json",
      )}`,
    )

    exit()
  }

  return result as string
}

export function applyPatchesForApp({
  appPath,
  reverse,
  patchDir,
}: {
  appPath: string
  reverse: boolean
  patchDir: string
}): void {
  const patchesDirectory = join(appPath, patchDir)
  const files = findPatchFiles(patchesDirectory)

  if (files.length === 0) {
    console.error(chalk.red("No patch files found"))
    return
  }

  files.forEach((filename) => {
    const packageDetails = getPackageDetailsFromPatchFilename(filename)

    if (!packageDetails) {
      console.warn(`Unrecognized patch file in patches directory ${filename}`)
      return
    }

    const {
      name,
      version,
      path,
      pathSpecifier,
      isDevOnly,
      patchFilename,
    } = packageDetails

    const installedPackageVersion = getInstalledPackageVersion({
      appPath,
      path,
      pathSpecifier,
      isDevOnly:
        isDevOnly ||
        // check for direct-dependents in prod
        (process.env.NODE_ENV === "production" &&
          packageIsDevDependency({ appPath, packageDetails })),
      patchFilename,
    })
    if (!installedPackageVersion) {
      // it's ok we're in production mode and this is a dev only package
      console.log(
        `Skipping dev-only ${chalk.bold(pathSpecifier)}@${version} ${chalk.blue(
          "✔",
        )}`,
      )
      return
    }

    if (
      applyPatch({
        patchFilePath: resolve(patchesDirectory, filename) as string,
        reverse,
        packageDetails,
        patchDir,
      })
    ) {
      // yay patch was applied successfully
      // print warning if version mismatch
      if (installedPackageVersion !== version) {
        printVersionMismatchWarning({
          packageName: name,
          actualVersion: installedPackageVersion,
          originalVersion: version,
          pathSpecifier,
          path,
        })
      } else {
        console.log(
          `${chalk.bold(pathSpecifier)}@${version} ${chalk.green("✔")}`,
        )
      }
    } else {
      // completely failed to apply patch
      // TODO: propagate useful error messages from patch application
      if (installedPackageVersion === version) {
        printBrokenPatchFileError({
          packageName: name,
          patchFileName: filename,
          pathSpecifier,
          path,
        })
      } else {
        printPatchApplictionFailureError({
          packageName: name,
          actualVersion: installedPackageVersion,
          originalVersion: version,
          patchFileName: filename,
          path,
          pathSpecifier,
        })
      }

      exit()
    }
  })
}

export function applyPatch({
  patchFilePath,
  reverse,
  packageDetails,
  patchDir,
}: {
  patchFilePath: string
  reverse: boolean
  packageDetails: PackageDetails
  patchDir: string
}): boolean {
  const patch = readPatch({ patchFilePath, packageDetails, patchDir })
  try {
    executeEffects(reverse ? reversePatch(patch) : patch, { dryRun: false })
  } catch (e) {
    try {
      executeEffects(reverse ? patch : reversePatch(patch), { dryRun: true })
    } catch (e) {
      return false
    }
  }

  return true
}

function printVersionMismatchWarning({
  packageName,
  actualVersion,
  originalVersion,
  pathSpecifier,
  path,
}: {
  packageName: string
  actualVersion: string
  originalVersion: string
  pathSpecifier: string
  path: string
}) {
  console.warn(`
${chalk.red("Warning:")} patch-package detected a patch file version mismatch

  Don't worry! This is probably fine. The patch was still applied
  successfully. Here's the deets:

  Patch file created for

    ${packageName}@${chalk.bold(originalVersion)}

  applied to

    ${packageName}@${chalk.bold(actualVersion)}
  
  At path
  
    ${path}

  This warning is just to give you a heads-up. There is a small chance of
  breakage even though the patch was applied successfully. Make sure the package
  still behaves like you expect (you wrote tests, right?) and then run

    ${chalk.bold(`patch-package ${pathSpecifier}`)}

  to update the version in the patch file name and make this warning go away.
`)
}

function printBrokenPatchFileError({
  packageName,
  patchFileName,
  path,
  pathSpecifier,
}: {
  packageName: string
  patchFileName: string
  path: string
  pathSpecifier: string
}) {
  console.error(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
    `Failed to apply patch for package ${chalk.bold(packageName)} at path`,
  )}
  
    ${path}

  This error was caused because patch-package cannot apply the following patch file:

    patches/${patchFileName}

  Try removing node_modules and trying again. If that doesn't work, maybe there was
  an accidental change made to the patch file? Try recreating it by manually
  editing the appropriate files and running:
  
    patch-package ${pathSpecifier}
  
  If that doesn't work, then it's a bug in patch-package, so please submit a bug
  report. Thanks!

    https://github.com/ds300/patch-package/issues
    
`)
}

function printPatchApplictionFailureError({
  packageName,
  actualVersion,
  originalVersion,
  patchFileName,
  path,
  pathSpecifier,
}: {
  packageName: string
  actualVersion: string
  originalVersion: string
  patchFileName: string
  path: string
  pathSpecifier: string
}) {
  console.error(`
${chalk.red.bold("**ERROR**")} ${chalk.red(
    `Failed to apply patch for package ${chalk.bold(packageName)} at path`,
  )}
  
    ${path}

  This error was caused because ${chalk.bold(packageName)} has changed since you
  made the patch file for it. This introduced conflicts with your patch,
  just like a merge conflict in Git when separate incompatible changes are
  made to the same piece of code.

  Maybe this means your patch file is no longer necessary, in which case
  hooray! Just delete it!

  Otherwise, you need to generate a new patch file.

  To generate a new one, just repeat the steps you made to generate the first
  one.

  i.e. manually make the appropriate file changes, then run 

    patch-package ${pathSpecifier}

  Info:
    Patch file: patches/${patchFileName}
    Patch was made for version: ${chalk.green.bold(originalVersion)}
    Installed version: ${chalk.red.bold(actualVersion)}
`)
}
