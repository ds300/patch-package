import { green } from "chalk"
import { execSync as exec } from "child_process"
import * as fs from "fs"
import * as path from "path"
import * as shellEscape from "shell-escape"
import * as tmp from "tmp"
import Npm from "./Npm"
import { PackageManager } from "./PackageManager"
import Yarn from "./Yarn"

export default function makePatch(packageName: string, appPath: string) {
  const packagePath = path.join(appPath, "node_modules", packageName)
  const packageJsonPath = path.join(packagePath, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Unable to find local ${packageName} package.json at ${packageJsonPath}`)
  }

  const packageVersion = require(packageJsonPath).version

  const tmpDir = tmp.dirSync({ unsafeCleanup: true })

  try {
    const packageManager = getPackageManager(tmpDir.name)

    packageManager.add(packageName, packageVersion)

    exec(`git init`, { cwd: tmpDir.name })
    exec(shellEscape(["git", "add", "-f", path.join("node_modules", packageName)]), { cwd: tmpDir.name })
    exec(shellEscape(["cp", "-RL", packagePath, path.join(tmpDir.name, "node_modules")]))
    const patch = exec(`git diff`, { cwd: tmpDir.name }).toString()

    const patchesDir = path.join(appPath, "patches")
    if (!fs.existsSync(patchesDir)) {
      fs.mkdirSync(patchesDir)
    }

    // remove exsiting patch for this package, if any
    fs.readdirSync(patchesDir).forEach((fileName) => {
      if (fileName.startsWith(packageName + ":")) {
        fs.unlinkSync(path.join(patchesDir, fileName))
      }
    })

    const patchFileName = `${packageName}:${packageVersion}.patch`
    fs.writeFileSync(path.join(patchesDir, patchFileName), patch)
    console.log(`Created patch file ${patchFileName} ${green("✔")}`)
  } finally {
    tmpDir.removeCallback()
  }
}

function getPackageManager(cwd: string): PackageManager {
  try {
    exec("which yarn")
    return new Yarn(cwd)
  } catch (e) {
    return new Npm(cwd)
  }
}
