import { green } from "chalk"
import * as fs from "fs"
import { dirname, join } from "./path"
import * as rimraf from "rimraf"
import { spawnSafeSync } from "./spawnSafe"
import * as fsExtra from "fs-extra"
import { PackageManager } from "./detectPackageManager"
import * as slash from "slash"
import * as klawSync from "klaw-sync"
import { checkoutNodeModules } from "./checkoutNodeModules"

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
  tempDirectoryPath: string,
) => {
  const nodeModulesPath = join(appPath, "node_modules")
  const packagePath = join(nodeModulesPath, packageName)
  const packageJsonPath = join(packagePath, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    printNoPackageFoundError(packageName, packageJsonPath)
    process.exit(1)
  }

  const packageVersion = require(packageJsonPath).version
  const tmpRepoNodeModulesPath = join(tempDirectoryPath, "node_modules")
  const tmpRepoPackagePath = join(tmpRepoNodeModulesPath, packageName)

  const tmpExec = (command: string, args?: string[]) =>
    spawnSafeSync(command, args, { cwd: tempDirectoryPath })

  checkoutNodeModules(appPath, tempDirectoryPath, packageManager)

  // commit the package
  console.info(green("☑"), "Diffing your files with clean files")
  fs.writeFileSync(join(tempDirectoryPath, ".gitignore"), "!/node_modules\n\n")
  tmpExec("git", ["init"])

  klawSync(tmpRepoPackagePath, { nodir: true })
    .map(item => item.path.slice(`${tmpRepoPackagePath}/`.length))
    .filter(
      relativePath =>
        !relativePath.match(includePaths) || relativePath.match(excludePaths),
    )
    .forEach(relativePath =>
      fsExtra.removeSync(slash(join(tmpRepoPackagePath, relativePath))),
    )

  tmpExec("git", ["add", "-f", slash(join("node_modules", packageName))])
  tmpExec("git", ["commit", "--allow-empty", "-m", "init"])

  // replace package with user's version
  rimraf.sync(tmpRepoPackagePath)

  klawSync(packagePath, { nodir: true })
    .map(item => item.path.slice(`${packagePath}/`.length))
    .filter(
      relativePath =>
        relativePath.match(includePaths) && !relativePath.match(excludePaths),
    )
    .forEach(relativePath =>
      fsExtra.copySync(
        slash(join(packagePath, relativePath)),
        slash(join(tmpRepoPackagePath, relativePath)),
      ),
    )

  // stage all files
  tmpExec("git", ["add", "-f", slash(join("node_modules", packageName))])

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
    const patchesDir = join(appPath, "patches")
    const patchFileName = `${packageName}+${packageVersion}.patch`
    const patchPath = join(patchesDir, patchFileName)
    if (!fs.existsSync(dirname(patchPath))) {
      // scoped package
      fs.mkdirSync(dirname(patchPath))
    }
    fs.writeFileSync(patchPath, patch)
    console.log(`${green("✔")} Created file patches/${patchFileName}`)
  }
}
