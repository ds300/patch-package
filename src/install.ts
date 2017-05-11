import { red } from "chalk"
import { existsSync } from "fs"
import { join } from "path"
import { applyPatch } from "./applyPatches"

const yarnPatchFile = join(__dirname, "../yarn.patch")

export default function install(appPath: string) {
  try {
    applyPatch(yarnPatchFile, "yarn")
  } catch (e) {
    if (existsSync(join(appPath, "node_modules", "yarn"))) {
      printIncompatibleYarnError()
    } else {
      printNoYarnError()
    }
  }
}

function printIncompatibleYarnError() {
  console.error(`
${red.bold("***ERROR***")}
${red(`This version of patch-package in incompatible with your current local
version of yarn. Please update both.`)}
`)
}

function printNoYarnError() {
  console.error(`
${red.bold("***ERROR***")}
${red(`patch-package requires yarn as a local peer-dependency`)}
`)
}
