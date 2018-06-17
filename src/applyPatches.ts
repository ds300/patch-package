import { bold, cyan, green, red } from "chalk"
import * as fs from "fs"
import * as path from "path"
import { getPatchFiles } from "./patchFs"
import { patch } from "./patch"
import { executeEffects } from "./patch/apply"

type OpaqueString<S extends string> = string & { type: S }
export type AppPath = OpaqueString<"AppPath">
type PatchesDirectory = OpaqueString<"PatchesDirectory">
type FileName = OpaqueString<"FileName">
type PackageName = OpaqueString<"PackageName">
type PackageVersion = OpaqueString<"PackageVersion">

function findPatchFiles(patchesDirectory: PatchesDirectory): FileName[] {
  if (!fs.existsSync(patchesDirectory)) {
    return []
  }

  return getPatchFiles(patchesDirectory) as FileName[]
}

function getPatchDetailsFromFilename(filename: FileName) {
  // ok to coerce this, since we already filtered for valid package file names
  // in getPatchFiles
  const match = filename.match(/^(.+?)(:|\+)(.+)\.patch$/) as string[]
  const packageName = match[1] as PackageName
  const version = match[3] as PackageVersion

  return {
    packageName,
    version,
  }
}

function getInstalledPackageVersion(
  appPath: AppPath,
  packageName: PackageName,
) {
  const packageDir = path.join(appPath, "node_modules", packageName)
  if (!fs.existsSync(packageDir)) {
    console.warn(
      `${red("Warning:")} Patch file found for package ${path.posix.basename(
        packageDir,
      )}` + ` which is not present at ${packageDir}`,
    )

    return null
  }

  return require(path.join(packageDir, "package.json"))
    .version as PackageVersion
}

export const applyPatchesForApp = (
  appPath: AppPath,
  reverse: boolean,
): void => {
  const patchesDirectory = path.join(appPath, "patches") as PatchesDirectory
  const files = findPatchFiles(patchesDirectory)

  if (files.length === 0) {
    console.log(cyan("No patch files found"))
  }

  files.forEach(filename => {
    const { packageName, version } = getPatchDetailsFromFilename(filename)

    const installedPackageVersion = getInstalledPackageVersion(
      appPath,
      packageName,
    )

    if (!installedPackageVersion) {
      return
    }

    if (
      applyPatch(path.resolve(patchesDirectory, filename) as FileName, reverse)
    ) {
      // yay patch was applied successfully
      // print warning if version mismatch
      if (installedPackageVersion !== version) {
        printVersionMismatchWarning(
          packageName,
          installedPackageVersion,
          version,
        )
      } else {
        console.log(`${bold(packageName)}@${version} ${green("✔")}`)
      }
    } else {
      // completely failed to apply patch
      // TODO: propagate useful error messages from patch application
      if (installedPackageVersion === version) {
        printBrokenPatchFileError(packageName, filename)
      } else {
        printPatchApplictionFailureError(
          packageName,
          installedPackageVersion,
          version,
          filename,
        )
      }
      process.exit(1)
    }
  })
}

export const applyPatch = (
  patchFilePath: string,
  reverse: boolean,
): boolean => {
  const patchFileContents = fs.readFileSync(patchFilePath).toString()
  try {
    const result = patch(patchFileContents, {
      reverse,
    })
    executeEffects(result)
  } catch (e) {
    try {
      patch(patchFileContents, { reverse: !reverse })
    } catch (e) {
      return false
    }
  }

  return true
}

function printVersionMismatchWarning(
  packageName: PackageName,
  actualVersion: PackageVersion,
  originalVersion: PackageVersion,
) {
  console.warn(`
${red("Warning:")} patch-package detected a patch file version mismatch

  Don't worry! This is probably fine. The patch was still applied
  successfully. Here's the deets:

  Patch file created for

    ${packageName}@${bold(originalVersion)}

  applied to

    ${packageName}@${bold(actualVersion)}

  This warning is just to give you a heads-up. There is a small chance of
  breakage even though the patch was applied successfully. Make sure the package
  still behaves like you expect (you wrote tests, right?) and then run

    ${bold(`patch-package ${packageName}`)}

  to update the version in the patch file name and make this warning go away.
`)
}

function printBrokenPatchFileError(
  packageName: PackageName,
  patchFileName: FileName,
) {
  console.error(`
${red.bold("**ERROR**")} ${red(
    `Failed to apply patch for package ${bold(packageName)}`,
  )}

  This error was caused because patch-package cannot apply the following patch file:

    patches/${patchFileName}

  If removing node_modules and trying again doesn't fix this, maybe there was
  an accidental change made to the patch file? If not, then it's probably a bug
  in patch-package, so please submit a bug report. Thanks!

    https://github.com/ds300/patch-package/issues

`)
}

function printPatchApplictionFailureError(
  packageName: PackageName,
  actualVersion: PackageVersion,
  originalVersion: PackageVersion,
  patchFileName: FileName,
) {
  console.error(`
${red.bold("**ERROR**")} ${red(
    `Failed to apply patch for package ${bold(packageName)}`,
  )}

  This error was caused because ${bold(packageName)} has changed since you
  made the patch file for it. This introduced conflicts with your patch,
  just like a merge conflict in Git when separate incompatible changes are
  made to the same piece of code.

  Maybe this means your patch file is no longer necessary, in which case
  hooray! Just delete it!

  Otherwise, you need to manually fix the patch file. Or generate a new one

  To generate a new one, just repeat the steps you made to generate the first
  one, but accounting for the changes in ${packageName}.

  i.e. make changes, run \`patch-package ${packageName}\`, and commit.

  To manually fix a patch file, Run:

     ${bold(`patch -p1 -i patches/${patchFileName} --verbose --dry-run`)}

  To list rejected hunks. A 'hunk' is a section of patch file that describes
  one contiguous area of changes. They are numbered from 1 and begin with lines
  that look like this:

    @@ -48,5 +49,6 @@ function foo(bar) {

  Remove the conflicting hunks, then manually edit files in

    node_modules/${packageName}

  to reflect the changes that the conflicting hunks were supposed to make.

  Then run \`patch-package ${packageName}\`

  Info:
    Patch was made for version ${green.bold(originalVersion)}
    Meanwhile node_modules/${bold(packageName)} is version ${red.bold(
    actualVersion,
  )}
`)
}
