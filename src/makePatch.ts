import { green } from "chalk"
import * as fs from "fs"
import { dirname, join } from "./path"
import * as rimraf from "rimraf"
import { spawnSafeSync } from "./spawnSafe"
import * as fsExtra from "fs-extra"
import * as slash from "slash"
import * as klawSync from "klaw-sync"

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
  appPath: string,
  packageName: string,
  includePaths: RegExp,
  excludePaths: RegExp,
  tempDirectoryPath: string,
) => {
  const originalNodeModulesPath = join(appPath, "node_modules")
  const originalPackagePath = join(originalNodeModulesPath, packageName)
  const originalPackageJsonPath = join(originalPackagePath, "package.json")
  const packageVersion = require(originalPackageJsonPath).version

  if (!fs.existsSync(originalPackageJsonPath)) {
    printNoPackageFoundError(packageName, originalPackageJsonPath)
    process.exit(1)
  }

  const tempNodeModulesPath = join(tempDirectoryPath, "node_modules")
  const tempPackagePath = join(tempNodeModulesPath, packageName)

  const tmpExec = (command: string, args?: string[]) =>
    spawnSafeSync(command, args, { cwd: tempDirectoryPath })

  console.info(green("☑"), "Diffing your files with clean files")

  fs.writeFileSync(join(tempDirectoryPath, ".gitignore"), "!/node_modules\n\n")

  tmpExec("git", ["init"])

  klawSync(tempPackagePath, { nodir: true })
    .map(item => item.path.slice(`${tempPackagePath}/`.length))
    .filter(
      relativePath =>
        !relativePath.match(includePaths) || relativePath.match(excludePaths),
    )
    .forEach(relativePath =>
      fsExtra.removeSync(slash(join(tempPackagePath, relativePath))),
    )

  tmpExec("git", ["add", "-f", slash(join("node_modules", packageName))])
  tmpExec("git", ["commit", "--allow-empty", "-m", "init"])

  // replace package with user's version
  rimraf.sync(tempPackagePath)

  klawSync(originalPackagePath, { nodir: true })
    .map(item => item.path.slice(`${originalPackagePath}/`.length))
    .filter(
      relativePath =>
        relativePath.match(includePaths) && !relativePath.match(excludePaths),
    )
    .forEach(relativePath =>
      fsExtra.copySync(
        slash(join(originalPackagePath, relativePath)),
        slash(join(tempPackagePath, relativePath)),
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
