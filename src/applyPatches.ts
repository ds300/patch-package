import chalk from "chalk"
import { existsSync } from "fs-extra"
import { posix } from "path"
import semver from "semver"
import { hashFile } from "./hash"
import { PackageDetails, PatchedPackageDetails } from "./PackageDetails"
import { packageIsDevDependency } from "./packageIsDevDependency"
import { executeEffects } from "./patch/apply"
import { readPatch } from "./patch/read"
import { reversePatch } from "./patch/reverse"
import { getGroupedPatches } from "./patchFs"
import { join, relative, resolve } from "./path"
import {
  getPatchApplicationState,
  PatchState,
  savePatchApplicationState,
} from "./stateFile"

class PatchApplicationError extends Error {
  constructor(msg: string) {
    super(msg)
  }
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

    let err =
      `${chalk.red("Error:")} Patch file found for package ${posix.basename(
        pathSpecifier,
      )}` + ` which is not present at ${relative(".", packageDir)}`

    if (!isDevOnly && process.env.NODE_ENV === "production") {
      err += `

  If this package is a dev dependency, rename the patch file to
  
    ${chalk.bold(patchFilename.replace(".patch", ".dev.patch"))}
`
    }
    throw new PatchApplicationError(err)
  }

  const { version } = require(join(packageDir, "package.json"))
  // normalize version for `npm ci`
  const result = semver.valid(version)
  if (result === null) {
    throw new PatchApplicationError(
      `${chalk.red(
        "Error:",
      )} Version string '${version}' cannot be parsed from ${join(
        packageDir,
        "package.json",
      )}`,
    )
  }

  return result as string
}

function logPatchApplication(patchDetails: PatchedPackageDetails) {
  const sequenceString =
    patchDetails.sequenceNumber != null
      ? ` (${patchDetails.sequenceNumber}${
          patchDetails.sequenceName ? " " + patchDetails.sequenceName : ""
        })`
      : ""
  console.log(
    `${chalk.bold(patchDetails.pathSpecifier)}@${
      patchDetails.version
    }${sequenceString} ${chalk.green("✔")}`,
  )
}

export function applyPatchesForApp({
  appPath,
  reverse,
  patchDir,
  shouldExitWithError,
  shouldExitWithWarning,
}: {
  appPath: string
  reverse: boolean
  patchDir: string
  shouldExitWithError: boolean
  shouldExitWithWarning: boolean
}): void {
  const patchesDirectory = join(appPath, patchDir)
  const groupedPatches = getGroupedPatches(patchesDirectory)

  if (groupedPatches.numPatchFiles === 0) {
    console.error(chalk.blueBright("No patch files found"))
    return
  }

  const errors: string[] = []
  const warnings: string[] = [...groupedPatches.warnings]

  for (const [pathSpecifier, patches] of Object.entries(
    groupedPatches.pathSpecifierToPatchFiles,
  )) {
    const state =
      patches.length > 1 ? getPatchApplicationState(patches[0]) : null
    const unappliedPatches = patches.slice(0)
    const newState: PatchState[] | null = patches.length > 1 ? [] : null
    // if there are multiple patches to apply, we can't rely on the reverse-patch-dry-run behavior to make this operation
    // idempotent, so instead we need to check the state file to see whether we have already applied any of the patches
    // todo: once this is battle tested we might want to use the same approach for single patches as well, but it's not biggie since the dry run thing is fast
    if (unappliedPatches && state) {
      for (let i = 0; i < state.patches.length; i++) {
        const patchThatWasApplied = state.patches[i]
        const patchToApply = unappliedPatches[0]
        const currentPatchHash = hashFile(
          join(appPath, patchDir, patchToApply.patchFilename),
        )
        if (patchThatWasApplied.patchContentHash === currentPatchHash) {
          // this patch was applied we can skip it
          unappliedPatches.shift()
        } else {
          console.error(
            chalk.red("Error:"),
            `The patches for ${chalk.bold(pathSpecifier)} have changed.`,
            `You should reinstall your node_modules folder to make sure the package is up to date`,
          )
          process.exit(1)
        }
      }
    }
    if (unappliedPatches.length === 0) {
      // all patches have already been applied
      patches.forEach(logPatchApplication)
      continue
    }
    packageLoop: for (const patchDetails of patches) {
      try {
        const { name, version, path, isDevOnly, patchFilename } = patchDetails

        const installedPackageVersion = getInstalledPackageVersion({
          appPath,
          path,
          pathSpecifier,
          isDevOnly:
            isDevOnly ||
            // check for direct-dependents in prod
            (process.env.NODE_ENV === "production" &&
              packageIsDevDependency({
                appPath,
                patchDetails,
              })),
          patchFilename,
        })
        if (!installedPackageVersion) {
          // it's ok we're in production mode and this is a dev only package
          console.log(
            `Skipping dev-only ${chalk.bold(
              pathSpecifier,
            )}@${version} ${chalk.blue("✔")}`,
          )
          continue
        }

        if (
          applyPatch({
            patchFilePath: resolve(patchesDirectory, patchFilename) as string,
            reverse,
            patchDetails,
            patchDir,
            cwd: process.cwd(),
          })
        ) {
          newState?.push({
            patchFilename,
            patchContentHash: hashFile(join(appPath, patchDir, patchFilename)),
            didApply: true,
          })
          // yay patch was applied successfully
          // print warning if version mismatch
          if (installedPackageVersion !== version) {
            warnings.push(
              createVersionMismatchWarning({
                packageName: name,
                actualVersion: installedPackageVersion,
                originalVersion: version,
                pathSpecifier,
                path,
              }),
            )
          }
          logPatchApplication(patchDetails)
        } else if (installedPackageVersion === version) {
          // completely failed to apply patch
          // TODO: propagate useful error messages from patch application
          errors.push(
            createBrokenPatchFileError({
              packageName: name,
              patchFilename,
              pathSpecifier,
              path,
            }),
          )
          // in case the package has multiple patches, we need to break out of this inner loop
          // because we don't want to apply more patches on top of the broken state
          break packageLoop
        } else {
          errors.push(
            createPatchApplicationFailureError({
              packageName: name,
              actualVersion: installedPackageVersion,
              originalVersion: version,
              patchFilename,
              path,
              pathSpecifier,
            }),
          )
          // in case the package has multiple patches, we need to break out of this inner loop
          // because we don't want to apply more patches on top of the broken state
          break packageLoop
        }
      } catch (error) {
        if (error instanceof PatchApplicationError) {
          errors.push(error.message)
        } else {
          errors.push(
            createUnexpectedError({
              filename: patchDetails.patchFilename,
              error: error as Error,
            }),
          )
        }
        // in case the package has multiple patches, we need to break out of this inner loop
        // because we don't want to apply more patches on top of the broken state
        break packageLoop
      }
    }

    if (newState) {
      savePatchApplicationState(patches[0], newState)
    }
  }

  for (const warning of warnings) {
    console.warn(warning)
  }
  for (const error of errors) {
    console.error(error)
  }

  const problemsSummary = []
  if (warnings.length) {
    problemsSummary.push(chalk.yellow(`${warnings.length} warning(s)`))
  }
  if (errors.length) {
    problemsSummary.push(chalk.red(`${errors.length} error(s)`))
  }

  if (problemsSummary.length) {
    console.error("---")
    console.error(
      "patch-package finished with",
      problemsSummary.join(", ") + ".",
    )
  }

  if (errors.length && shouldExitWithError) {
    process.exit(1)
  }

  if (warnings.length && shouldExitWithWarning) {
    process.exit(1)
  }

  process.exit(0)
}

export function applyPatch({
  patchFilePath,
  reverse,
  patchDetails,
  patchDir,
  cwd,
}: {
  patchFilePath: string
  reverse: boolean
  patchDetails: PackageDetails
  patchDir: string
  cwd: string
}): boolean {
  const patch = readPatch({
    patchFilePath,
    patchDetails,
    patchDir,
  })
  try {
    executeEffects(reverse ? reversePatch(patch) : patch, {
      dryRun: false,
      cwd,
    })
  } catch (e) {
    try {
      executeEffects(reverse ? patch : reversePatch(patch), {
        dryRun: true,
        cwd,
      })
    } catch (e) {
      return false
    }
  }

  return true
}

function createVersionMismatchWarning({
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
  return `
${chalk.yellow("Warning:")} patch-package detected a patch file version mismatch

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
`
}

function createBrokenPatchFileError({
  packageName,
  patchFilename,
  path,
  pathSpecifier,
}: {
  packageName: string
  patchFilename: string
  path: string
  pathSpecifier: string
}) {
  return `
${chalk.red.bold("**ERROR**")} ${chalk.red(
    `Failed to apply patch for package ${chalk.bold(packageName)} at path`,
  )}
  
    ${path}

  This error was caused because patch-package cannot apply the following patch file:

    patches/${patchFilename}

  Try removing node_modules and trying again. If that doesn't work, maybe there was
  an accidental change made to the patch file? Try recreating it by manually
  editing the appropriate files and running:
  
    patch-package ${pathSpecifier}
  
  If that doesn't work, then it's a bug in patch-package, so please submit a bug
  report. Thanks!

    https://github.com/ds300/patch-package/issues
    
`
}

function createPatchApplicationFailureError({
  packageName,
  actualVersion,
  originalVersion,
  patchFilename,
  path,
  pathSpecifier,
}: {
  packageName: string
  actualVersion: string
  originalVersion: string
  patchFilename: string
  path: string
  pathSpecifier: string
}) {
  return `
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
    Patch file: patches/${patchFilename}
    Patch was made for version: ${chalk.green.bold(originalVersion)}
    Installed version: ${chalk.red.bold(actualVersion)}
`
}

function createUnexpectedError({
  filename,
  error,
}: {
  filename: string
  error: Error
}) {
  return `
${chalk.red.bold("**ERROR**")} ${chalk.red(
    `Failed to apply patch file ${chalk.bold(filename)}`,
  )}
  
${error.stack}

  `
}
