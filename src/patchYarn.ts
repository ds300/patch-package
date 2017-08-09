import { red, yellow } from "chalk"
import { existsSync } from "fs"
import { join } from "path"
import { applyPatch } from "./applyPatches"
import { bold, green } from "chalk"

const yarnPatchFile = join(__dirname, "../yarn.patch")

export default function patchYarn(appPath: string) {
  try {
    applyPatch(yarnPatchFile)
    const yarnVersion = require(join(
      appPath,
      "node_modules",
      "yarn",
      "package.json",
    )).version
    console.log(`${bold("yarn")}@${yarnVersion} ${green("✔")}`)
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
You asked patch-package to patch yarn, but you don't seem to have yarn installed
`)
}
