import { blue, bold, cyan, green, red } from "chalk"
import { execSync as exec } from "child_process"
import * as fs from "fs"
import * as path from "path"
import { env } from "process"

export default function findPatchFiles(appPath: string) {
  const patchesDirectory = path.join(appPath, "patches")
  if (!fs.existsSync(patchesDirectory)) {
    return []
  }
  const files = fs
    .readdirSync(patchesDirectory)
    .filter(filename => filename.match(/^.+:.+\.patch$/))

  if (files.length === 0) {
    console.log(cyan("No patch files found"))
  } else {
    console.log("Applying patches to node_modules...")
  }
  files.forEach(filename => {
    const [packageName, version] = filename.slice(0, -6).split(":")
    const packageDir = path.join(appPath, "node_modules", packageName)

    if (!fs.existsSync(packageDir)) {
      console.warn(
        `${red("Warning:")} Patch file found for package ${packageName}` +
          ` which is not present at ${packageDir}`,
      )
      return null
    }

    const packageJson = require(path.join(packageDir, "package.json"))

    try {
      applyPatch(path.resolve(patchesDirectory, filename), packageName)

      if (packageJson.version !== version) {
        printVersionMismatchWarning(packageName, packageJson.version, version)
      } else {
        console.log(`${bold(packageName)}@${version} ${green("✔")}`)
      }
    } catch (e) {
      // completely failed to apply patch
      printPatchApplictionFailureError(
        packageName,
        packageJson.version,
        version,
        filename,
      )
      process.exit(1)
    }
  })
}

export function applyPatch(patchFilePath: string, packageName: string) {
  try {
    exec("patch -p1 --dry-run -i " + patchFilePath)
    exec("patch -p1 --no-backup-if-mismatch -i " + patchFilePath)
  } catch (e) {
    // patch cli tool has no way to fail gracefully if patch was already
    // applied, so to check, we need to try a dry-run of applying the patch in
    // reverse, and if that works it means the patch was already applied
    // sucessfully. Otherwise the patch just failed for some reason.
    exec("patch --reverse --dry-run -p1 -i " + patchFilePath)
  }
}

function printVersionMismatchWarning(
  packageName: string,
  actualVersion: string,
  originalVersion: string,
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

function printPatchApplictionFailureError(
  packageName: string,
  actualVersion: string,
  originalVersion: string,
  patchFileName: string,
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

    diff --git a/node_modules/thing/thing.js b/node_modules/thing/thing.json

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
