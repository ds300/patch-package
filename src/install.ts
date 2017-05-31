import { red, yellow } from "chalk"
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
      printNoYarnWarning()
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

function printNoYarnWarning() {
  console.warn(`
${yellow.bold("***Warning***")}
${`patch-package currently only works after \`yarn remove\` when you install a
project-local copy of yarn.`}
See https://github.com/ds300/patch-package#why-patch-yarn for details
`)
}
