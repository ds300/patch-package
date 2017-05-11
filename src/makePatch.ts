import { green } from "chalk"
import { execSync as exec } from "child_process"
import * as fs from "fs"
import * as path from "path"
import * as rimraf from "rimraf"
import * as shellEscape from "shell-escape"
import * as tmp from "tmp"

export default function makePatch(packageName: string, appPath: string) {
  const nodeModulesPath = path.join(appPath, "node_modules")
  const packagePath = path.join(nodeModulesPath, packageName)
  const packageJsonPath = path.join(packagePath, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Unable to find local ${packageName} package.json at ${packageJsonPath}`)
  }

  const packageVersion = require(packageJsonPath).version

  const tmpRepo = tmp.dirSync({ unsafeCleanup: true })
  const tmpNodeModulesBackup = tmp.dirSync()

  try {
    const patchesDir = path.join(appPath, "patches")

    if (!fs.existsSync(patchesDir)) {
      fs.mkdirSync(patchesDir)
    } else {
      // remove exsiting patch for this package, if any
      fs.readdirSync(patchesDir).forEach((fileName) => {
        if (fileName.startsWith(packageName + ":")) {
          console.log("removing", path.join(patchesDir, fileName))
          fs.unlinkSync(path.join(patchesDir, fileName))
        }
      })
    }

    // back up the user's node_modules
    exec(shellEscape(["mv", path.join(appPath, "node_modules"), path.join(tmpNodeModulesBackup.name, "node_modules")]))

    // reinstall the user's node_modules without the changes for this package
    exec("yarn")

    // move the clean package to the tmp repo
    const tmpPackagePath = path.join(tmpRepo.name, "node_modules", packageName)
    fs.mkdirSync(path.join(tmpRepo.name, "node_modules"))
    exec(shellEscape(["mv", packagePath, tmpPackagePath]))

    // commit it
    fs.writeFileSync(path.join(tmpRepo.name, ".gitignore"), "!/node_modules\n")
    const tmpExec = (cmd: string) => exec(cmd, { cwd: tmpRepo.name })
    tmpExec(`git init`)
    tmpExec(shellEscape(["git", "add", "-f", path.join("node_modules", packageName)]))
    tmpExec(`git commit -m init`)

    // replace package with user's version
    rimraf.sync(tmpPackagePath)

    // copy user's custom version to temp repo
    tmpExec(
      shellEscape(
        [
          "cp",
          "-R",
          path.join(tmpNodeModulesBackup.name, "node_modules", packageName),
          tmpPackagePath,
        ],
      ),
    )
    // add their files to the index
    tmpExec(shellEscape(["git", "add", "-f", path.join("node_modules", packageName)]))
    // get diff of changes
    const patch = tmpExec(`git diff HEAD`).toString()

    const patchFileName = `${packageName}:${packageVersion}.patch`
    fs.writeFileSync(path.join(patchesDir, patchFileName), patch)
    console.log(`Created patch file ${patchFileName} ${green("✔")}`)
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    tmpRepo.removeCallback()
    rimraf.sync(nodeModulesPath)
    fs.renameSync(path.join(tmpNodeModulesBackup.name, "node_modules"), nodeModulesPath)
    tmpNodeModulesBackup.removeCallback()
  }
}
