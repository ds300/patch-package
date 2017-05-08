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
        console.warn(`
${red("Warning:")} Patch file version mismatch

  Patch file applied to ${packageName}@${bold(packageJson.version)} but was created for ${packageName}@${bold(version)}

  This is probably OK. Check that your stuff still works and then run

    ${bold(`patch-package ${packageName}`)}

  to make this warning disappear
`)
      } else {
        console.log(`${bold(packageName)}@${version} ${green("✔")}`)
      }
    } catch (e) {
      // completely failed to apply patch
      console.error(`
${red.bold("**ERROR**")} ${red(`Failed to apply patch for package ${bold(packageName)}`)}

  Patch was made for version ${green.bold(version)}
  Meanwhile node_modules/${bold(packageName)} is version ${red.bold(packageJson.version)}

  Run:

     ${bold(`patch --forward -p1 -i patches/${filename}`)}

  To generate rejection files and see just what the heck happened.
`)
    }
  })
  process.exit(1)
}

function applyPatch(patchFilePath: string, packageName: string) {
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
