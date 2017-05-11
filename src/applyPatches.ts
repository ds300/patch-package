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
    .filter((filename) => filename.match(/^.+:.+\.patch$/))

  if (files.length === 0) {
    console.log(cyan("No patch files found"))
  } else {
    console.log("Applying patches to node_modules...")
  }
  files.forEach((filename) => {
    const [packageName, version] = filename.slice(0, -6).split(":")
    const packageDir = path.join(appPath, "node_modules", packageName)

    if (!fs.existsSync(packageDir)) {
      console.warn(
        `${red("Warning:")} Patch file found for package ${packageName}`
        + ` which is not present at ${packageDir}`,
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
      printPatchApplictionFailureError(packageName, packageJson.version, version, filename)
      process.exit(1)
    }
  })
}

export function applyPatch(patchFilePath: string, packageName: string) {
  try {
    exec("patch --forward -p1 --no-backup-if-mismatch -i " + patchFilePath)
  } catch (e) {
    // patch cli tool has no way to fail gracefully if patch was already applied,
    // so to check, we need to try a dry-run of applying the patch in reverse, and
    // if that works it means the patch was already applied sucessfully. Otherwise
    // the patch just failed for some reason.
    exec("patch --reverse --dry-run -p1 -i " + patchFilePath)
  }
}

function printVersionMismatchWarning(packageName: string, actualVersion: string, originalVersion: string) {
  console.warn(`
${red("Warning:")} Patch file version mismatch

  Patch file created for

    ${packageName}@${bold(originalVersion)}

  applied to

    ${packageName}@${bold(actualVersion)}

  This is probably OK, but to be safe, please check that your patch still makes
  sense and fix the patched files if not. Then run

    ${bold(`patch-package ${packageName}`)}

  to update the patch and make this warning disappear.
`)
}

function printPatchApplictionFailureError(
  packageName: string,
  actualVersion: string,
  originalVersion: string,
  patchFileName: string,
) {
  console.error(`
${red.bold("**ERROR**")} ${red(`Failed to apply patch for package ${bold(packageName)}`)}

  Patch was made for version ${green.bold(originalVersion)}
  Meanwhile node_modules/${bold(packageName)} is version ${red.bold(actualVersion)}

  Run:

     ${bold(`patch --forward -p1 -i patches/${patchFileName}`)}

  To generate rejection files and see just what the heck happened.
`)
}
