import { bold, green, red, yellow } from "chalk"
import { getPatchFiles } from "./patchFs"
import { executeEffects } from "./patch/apply"
import { existsSync, readFileSync } from "fs-extra"
import { join, resolve } from "./path"
import { posix } from "path"
import { getPackageDetailsFromPatchFilename } from "./PackageDetails"
import { parsePatchFile } from "./patch/parse"
import { reversePatch } from "./patch/reverse"
import isCi from "is-ci"

// don't want to exit(1) on postinsall locally.
// see https://github.com/ds300/patch-package/issues/86
const shouldExitPostinstallWithError = isCi || process.env.NODE_ENV === "test"

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
}: {
  appPath: string
  path: string
  pathSpecifier: string
}): string | null {
  const packageDir = join(appPath, path)
  if (!existsSync(packageDir)) {
    console.log(
      `${yellow("Warning:")} Patch file found for package ${posix.basename(
        pathSpecifier,
      )}` + ` which is not present at ${packageDir}`,
    )

    return null
  }

  return require(join(packageDir, "package.json")).version
}

export const applyPatchesForApp = (
  appPath: string,
  reverse: boolean,
  patchDir: string = "patches",
): void => {
  const patchesDirectory = join(appPath, patchDir)
  const files = findPatchFiles(patchesDirectory)

  if (files.length === 0) {
    console.error(red("No patch files found"))
    return
  }

  files.forEach(filename => {
    const details = getPackageDetailsFromPatchFilename(filename)

    if (!details) {
      console.warn(`Unrecognized patch file in patches directory ${filename}`)
      return
    }

    const { name, version, path, pathSpecifier } = details

    const installedPackageVersion = getInstalledPackageVersion({
      appPath,
      path,
      pathSpecifier,
    })

    if (!installedPackageVersion) {
      return
    }

    if (applyPatch(resolve(patchesDirectory, filename) as string, reverse)) {
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
        console.log(`${bold(pathSpecifier)}@${version} ${green("✔")}`)
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
      process.exit(shouldExitPostinstallWithError ? 1 : 0)
    }
  })
}

export const applyPatch = (
  patchFilePath: string,
  reverse: boolean,
): boolean => {
  const patchFileContents = readFileSync(patchFilePath).toString()
  const patch = parsePatchFile(patchFileContents)
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
${red("Warning:")} patch-package detected a patch file version mismatch

  Don't worry! This is probably fine. The patch was still applied
  successfully. Here's the deets:

  Patch file created for

    ${packageName}@${bold(originalVersion)}

  applied to

    ${packageName}@${bold(actualVersion)}
  
  At path
  
    ${path}

  This warning is just to give you a heads-up. There is a small chance of
  breakage even though the patch was applied successfully. Make sure the package
  still behaves like you expect (you wrote tests, right?) and then run

    ${bold(`patch-package ${pathSpecifier}`)}

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
${red.bold("**ERROR**")} ${red(
    `Failed to apply patch for package ${bold(packageName)} at path`,
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
${red.bold("**ERROR**")} ${red(
    `Failed to apply patch for package ${bold(packageName)} at path`,
  )}
  
    ${path}

  This error was caused because ${bold(packageName)} has changed since you
  made the patch file for it. This introduced conflicts with your patch,
  just like a merge conflict in Git when separate incompatible changes are
  made to the same piece of code.

  Maybe this means your patch file is no longer necessary, in which case
  hooray! Just delete it!

  Otherwise, you need generate a new patch file.

  To generate a new one, just repeat the steps you made to generate the first
  one.

  i.e. manually make the appropriate file changes, then run 

    patch-package ${pathSpecifier}

  Info:
    Patch file: patches/${patchFileName}
    Patch was made for version: ${green.bold(originalVersion)}
    Installed version: ${red.bold(actualVersion)}
`)
}
