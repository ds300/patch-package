import { green } from "chalk"
import * as fs from "fs"
import { join, dirname, relative } from "./path"
import * as rimraf from "rimraf"
import * as tmp from "tmp"
import {
  resolveRelativeFileDependenciesInPackageJson,
  resolveRelativeFileDependenciesInPackageLock,
} from "./resolveRelativeFileDependencies"
import { spawnSafeSync } from "./spawnSafe"
import { getPatchFiles } from "./patchFs"
import * as fsExtra from "fs-extra"
import { PackageManager } from "./detectPackageManager"
import * as slash from "slash"

function deleteScripts(json: any) {
  delete json.scripts
  return json
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

export const makePatch = (
  packageName: string,
  appPath: string,
  packageManager: PackageManager,
  includePaths: RegExp,
  excludePaths: RegExp,
) => {
  const nodeModulesPath = join(appPath, "node_modules")
  const packagePath = join(nodeModulesPath, packageName)
  const packageJsonPath = join(packagePath, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    printNoPackageFoundError(packageName, packageJsonPath)
    process.exit(1)
  }

  const packageVersion = require(packageJsonPath).version

  const tmpRepo = tmp.dirSync({ unsafeCleanup: true })
  const tmpRepoNodeModulesPath = join(tmpRepo.name, "node_modules")
  const tmpRepoPackageJsonPath = join(tmpRepo.name, "package.json")
  const tmpRepoPackagePath = join(tmpRepoNodeModulesPath, packageName)

  try {
    const patchesDir = join(appPath, "patches")

    if (!fs.existsSync(patchesDir)) {
      fs.mkdirSync(patchesDir)
    } else {
      // remove exsiting patch for this package, if any
      getPatchFiles(patchesDir).forEach(fileName => {
        if (
          fileName.startsWith(packageName + ":") ||
          fileName.startsWith(packageName + "+")
        ) {
          console.info(
            green("☑"),
            "Removing existing",
            relative(process.cwd(), join(patchesDir, fileName)),
          )
          fs.unlinkSync(join(patchesDir, fileName))
        }
      })
    }

    console.info(green("☑"), "Creating temporary folder")

    const tmpExec = (command: string, args?: string[]) =>
      spawnSafeSync(command, args, { cwd: tmpRepo.name })
    // reinstall a clean version of the user's node_modules in our tmp location
    fsExtra.copySync(
      join(appPath, "package.json"),
      join(tmpRepo.name, "package.json"),
    )
    // resolve relative file paths in package.json
    // also delete scripts
    fs.writeFileSync(
      tmpRepoPackageJsonPath,
      JSON.stringify(
        deleteScripts(
          resolveRelativeFileDependenciesInPackageJson(
            appPath,
            require(join(tmpRepo.name, "package.json")),
          ),
        ),
      ),
    )

    if (packageManager === "yarn") {
      fsExtra.copySync(
        join(appPath, "yarn.lock"),
        join(tmpRepo.name, "yarn.lock"),
      )
      console.info(green("☑"), "Building clean node_modules with yarn")
      tmpExec(`yarn`)
    } else {
      const lockFileName =
        packageManager === "npm-shrinkwrap"
          ? "npm-shrinkwrap.json"
          : "package-lock.json"

      const lockFileContents = JSON.parse(
        fsExtra.readFileSync(join(appPath, lockFileName)).toString(),
      )
      const resolvedLockFileContents = resolveRelativeFileDependenciesInPackageLock(
        appPath,
        lockFileContents,
      )
      fs.writeFileSync(
        join(tmpRepo.name, lockFileName),
        JSON.stringify(resolvedLockFileContents),
      )
      console.info(green("☑"), "Building clean node_modules with npm")
      tmpExec("npm", ["i"])
    }

    // commit the package
    console.info(green("☑"), "Diffing your files with clean files")
    fs.writeFileSync(join(tmpRepo.name, ".gitignore"), "!/node_modules\n\n")
    tmpExec("git", ["init"])
    // don't commit package.json though
    tmpExec("git", ["add", "-f", slash(join("node_modules", packageName))])

    tmpExec("git", ["commit", "-m", "init"])

    // replace package with user's version
    rimraf.sync(tmpRepoPackagePath)
    fsExtra.copySync(packagePath, tmpRepoPackagePath, { recursive: true })

    // stage all files
    tmpExec("git", ["add", "-f", slash(join("node_modules", packageName))])

    // unstage any ignored files so they don't show up in the diff
    tmpExec("git", ["diff", "--cached", "--name-only"])
      .stdout.toString()
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach(fileName => {
        const scopedFileName = fileName.slice(
          `node_modules/${packageName}/`.length,
        )
        if (
          !scopedFileName.match(includePaths) ||
          scopedFileName.match(excludePaths)
        ) {
          tmpExec("git", ["reset", "HEAD", fileName])
        }
      })

    // get diff of changes
    const patch = tmpExec("git", [
      "diff",
      "--cached",
      "--no-color",
      "--ignore-space-at-eol",
      "--no-ext-diff",
    ]).stdout.toString()

    if (patch.trim() === "") {
      console.warn(`⁉️  Not creating patch file for package '${packageName}'`)
      console.warn(`⁉️  There don't appear to be any changes.`)
      process.exit(1)
    } else {
      const patchFileName = `${packageName}+${packageVersion}.patch`
      const patchPath = join(patchesDir, patchFileName)
      if (!fs.existsSync(dirname(patchPath))) {
        // scoped package
        fs.mkdirSync(dirname(patchPath))
      }
      fs.writeFileSync(patchPath, patch)
      console.log(`${green("✔")} Created file patches/${patchFileName}`)
    }
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    tmpRepo.removeCallback()
  }
}
