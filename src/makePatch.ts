import { green } from "chalk"
import * as fs from "fs"
import * as path from "path"
import * as rimraf from "rimraf"
import * as tmp from "tmp"
import resolveRelativeFileDependencies from "./resolveRelativeFileDependencies"
import spawnSafeSync from "./spawnSafe"
import { getPatchFiles } from "./patchFs"
import * as fsExtra from "fs-extra"

export default function makePatch(
  packageName: string,
  appPath: string,
  packageManager: "yarn" | "npm",
) {
  const nodeModulesPath = path.join(appPath, "node_modules")
  const packagePath = path.join(nodeModulesPath, packageName)
  const packageJsonPath = path.join(packagePath, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    printNoPackageFoundError(packageName, packageJsonPath)
    process.exit(1)
  }

  const packageVersion = require(packageJsonPath).version

  const tmpRepo = tmp.dirSync({ unsafeCleanup: true })
  const tmpRepoNodeModulesPath = path.join(tmpRepo.name, "node_modules")
  const tmpRepoPackageJsonPath = path.join(tmpRepo.name, "package.json")
  const tmpRepoPackagePath = path.join(tmpRepoNodeModulesPath, packageName)

  try {
    const patchesDir = path.join(appPath, "patches")

    if (!fs.existsSync(patchesDir)) {
      fs.mkdirSync(patchesDir)
    } else {
      // remove exsiting patch for this package, if any
      getPatchFiles(patchesDir).forEach(fileName => {
        if (
          fileName.startsWith(packageName + ":") ||
          fileName.startsWith(packageName + "+")
        ) {
          console.log("removing", path.join(patchesDir, fileName))
          fs.unlinkSync(path.join(patchesDir, fileName))
        }
      })
    }

    const tmpExec = (command: string, args?: string[]) =>
      spawnSafeSync(command, args, { cwd: tmpRepo.name })
    // reinstall a clean version of the user's node_modules in our tmp location
    fsExtra.copySync(
      path.join(appPath, "package.json"),
      path.join(tmpRepo.name, "package.json"),
    )
    // resolve relative file paths in package.json
    fs.writeFileSync(
      tmpRepoPackageJsonPath,
      JSON.stringify(
        resolveRelativeFileDependencies(
          appPath,
          require(tmpRepoPackageJsonPath),
        ),
      ),
    )

    if (packageManager === "yarn") {
      fsExtra.copySync(
        path.join(appPath, "yarn.lock"),
        path.join(tmpRepo.name, "yarn.lock"),
      )
      tmpExec(`yarn`)
    } else {
      fsExtra.copySync(
        path.join(appPath, "package-lock.json"),
        path.join(tmpRepo.name, "package-lock.json"),
      )
      tmpExec("npm", ["i"])
    }

    // commit the package
    fs.writeFileSync(
      path.join(tmpRepo.name, ".gitignore"),
      "!/node_modules\n\n",
    )
    tmpExec("git", ["init"])
    const stageFiles = () => {
      tmpExec("git", ["add", "-f", path.join("node_modules", packageName)])
      tmpExec("git", [
        "rm",
        "--cached",
        path.join("node_modules", packageName, "package.json"),
      ])
    }
    stageFiles()
    tmpExec("git", ["commit", "-m", "init"])

    // replace package with user's version
    rimraf.sync(tmpRepoPackagePath)
    fsExtra.copySync(packagePath, tmpRepoPackagePath, { recursive: true })

    // add their files to the index
    stageFiles()

    // get diff of changes
    const patch = tmpExec("git", ["diff", "HEAD"]).stdout.toString()

    if (patch.trim() === "") {
      console.warn(`⁉️  Not creating patch file for package '${packageName}'`)
      console.warn(`⁉️  There don't appear to be any changes.`)
    } else {
      const patchFileName = `${packageName}+${packageVersion}.patch`
      const patchPath = path.join(patchesDir, patchFileName)
      if (!fs.existsSync(path.dirname(patchPath))) {
        // scoped package
        fs.mkdirSync(path.dirname(patchPath))
      }
      fs.writeFileSync(patchPath, patch)
      console.log(`Created file patches/${patchFileName} ${green("✔")}`)
    }
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    tmpRepo.removeCallback()
  }
}

function printNoPackageFoundError(
  packageName: string,
  packageJsonPath: string,
) {
  console.error(
    `No such package ${packageName}

  File not found: ${packageJsonPath}`,
  )
}
