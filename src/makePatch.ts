import { green } from "chalk"
import { join, dirname, resolve } from "./path"
import { spawnSafeSync } from "./spawnSafe"
import { PackageManager } from "./detectPackageManager"
import { removeIgnoredFiles } from "./filterFiles"
import { writeFileSync, existsSync, mkdirSync } from "fs-extra"
import { sync as rimraf } from "rimraf"
import { copySync } from "fs-extra"
import { dirSync } from "tmp"

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
  patchDir: string = "patches",
) => {
  const nodeModulesPath = join(appPath, "node_modules")
  const appPackageJson = require(join(appPath, "package.json"))
  const packagePath = join(nodeModulesPath, packageName)
  const packageJsonPath = join(packagePath, "package.json")

  if (!existsSync(packageJsonPath)) {
    printNoPackageFoundError(packageName, packageJsonPath)
    process.exit(1)
  }

  let packageVersionSpecifier =
    appPackageJson.dependencies[packageName] ||
    appPackageJson.devDependencies[packageName]

  if (
    packageVersionSpecifier &&
    packageVersionSpecifier.startsWith("file:") &&
    packageVersionSpecifier[5] !== "/"
  ) {
    packageVersionSpecifier =
      "file:" + resolve(appPath, packageVersionSpecifier.slice(5))
  } else {
    packageVersionSpecifier = null
  }

  const packageVersion = require(packageJsonPath).version

  const tmpRepo = dirSync({ unsafeCleanup: true })
  const tmpRepoNodeModulesPath = join(tmpRepo.name, "node_modules")
  const tmpRepoPackageJsonPath = join(tmpRepo.name, "package.json")
  const tmpRepoPackagePath = join(tmpRepoNodeModulesPath, packageName)

  try {
    const patchesDir = join(appPath, patchDir)

    console.info(green("✔"), "Creating temporary folder")

    const tmpExec = (command: string, args?: string[]) =>
      spawnSafeSync(command, args, { cwd: tmpRepo.name })

    // make a blank package.json
    console.info(green("✔"), "Making tmp package.json")
    writeFileSync(
      tmpRepoPackageJsonPath,
      JSON.stringify({
        dependencies: {
          [packageName]: packageVersionSpecifier || packageVersion,
        },
      }),
    )

    if (packageManager === "yarn") {
      console.info(
        green("✔"),
        `Installing ${packageName}@${packageVersion} with yarn`,
      )
      tmpExec(`yarn`)
    } else {
      console.info(
        green("✔"),
        `Installing ${packageName}@${packageVersion} with npm`,
      )
      tmpExec("npm", ["i"])
    }

    // remove nested node_modules just to be safe
    rimraf(join(tmpRepoPackagePath, "node_modules"))

    // commit the package
    console.info(green("✔"), "Diffing your files with clean files")
    writeFileSync(join(tmpRepo.name, ".gitignore"), "!/node_modules\n\n")
    tmpExec("git", ["init"])

    // remove ignored files first
    removeIgnoredFiles(tmpRepoPackagePath, includePaths, excludePaths)

    tmpExec("git", ["add", "-f", join("node_modules", packageName)])
    tmpExec("git", ["commit", "--allow-empty", "-m", "init"])

    // replace package with user's version
    rimraf(tmpRepoPackagePath)

    copySync(packagePath, tmpRepoPackagePath)

    // remove nested node_modules just to be safe
    rimraf(join(tmpRepoPackagePath, "node_modules"))

    // also remove ignored files like before
    removeIgnoredFiles(tmpRepoPackagePath, includePaths, excludePaths)

    // stage all files
    tmpExec("git", ["add", "-f", join("node_modules", packageName)])

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
      if (!existsSync(dirname(patchPath))) {
        // scoped package
        mkdirSync(dirname(patchPath))
      }
      writeFileSync(patchPath, patch)
      console.log(`${green("✔")} Created file ${patchDir}/${patchFileName}`)
    }
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    tmpRepo.removeCallback()
  }
}
