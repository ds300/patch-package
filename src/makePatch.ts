import { green } from "chalk"
import { join, dirname, resolve } from "./path"
import { spawnSafeSync } from "./spawnSafe"
import { PackageManager } from "./detectPackageManager"
import { removeIgnoredFiles } from "./filterFiles"
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs-extra"
import { sync as rimraf } from "rimraf"
import { copySync } from "fs-extra"
import { dirSync } from "tmp"
import { renderPackageName, parsePackageName } from "./packageNames"
import { getPatchFiles } from "./patchFs"
import { relative } from "path"

function printNoPackageFoundError(
  unsafePackageName: string,
  packageJsonPath: string,
) {
  console.error(
    `No such package ${unsafePackageName}

  File not found: ${packageJsonPath}`,
  )
}

export const makePatch = (
  packagePathSpecifier: string,
  appPath: string,
  packageManager: PackageManager,
  includePaths: RegExp,
  excludePaths: RegExp,
  patchDir: string = "patches",
) => {
  const relativePackagePath = packagePathSpecifier.replace(
    "=>",
    "/node_modules/",
  )
  const isNested = relativePackagePath.includes("/node_modules/")
  const nodeModulesPath = join(appPath, "node_modules")
  const appPackageJson = require(join(appPath, "package.json"))
  const packagePath = join(nodeModulesPath, relativePackagePath)
  const packageJsonPath = join(packagePath, "package.json")

  if (!existsSync(packageJsonPath)) {
    printNoPackageFoundError(packagePathSpecifier, packageJsonPath)
    process.exit(1)
  }

  const unsafePackageName = require(packageJsonPath).name as string
  const packageVersion = require(packageJsonPath).version as string

  // packageVersionSpecifier is the version string used by the app package.json
  // it won't be present for nested deps.
  // We need it only for patching deps specified with file:./
  // which I think only happens in tests
  // but might happen in real life too.
  let packageVersionSpecifier: null | string = isNested
    ? null
    : appPackageJson.dependencies[unsafePackageName] ||
      appPackageJson.devDependencies[unsafePackageName] ||
      null

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

  const tmpRepo = dirSync({ unsafeCleanup: true })
  const tmpRepoNodeModulesPath = join(tmpRepo.name, "node_modules")
  const tmpRepoPackageJsonPath = join(tmpRepo.name, "package.json")
  const tmpRepoPackagePath = join(tmpRepoNodeModulesPath, unsafePackageName)

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
          [unsafePackageName]: packageVersionSpecifier || packageVersion,
        },
      }),
    )

    if (packageManager === "yarn") {
      console.info(
        green("✔"),
        `Installing ${unsafePackageName}@${packageVersion} with yarn`,
      )
      tmpExec(`yarn`)
    } else {
      console.info(
        green("✔"),
        `Installing ${unsafePackageName}@${packageVersion} with npm`,
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

    tmpExec("git", ["add", "-f", join("node_modules", unsafePackageName)])
    tmpExec("git", ["commit", "--allow-empty", "-m", "init"])

    // replace package with user's version
    rimraf(tmpRepoPackagePath)

    copySync(packagePath, tmpRepoPackagePath)

    // remove nested node_modules just to be safe
    rimraf(join(tmpRepoPackagePath, "node_modules"))

    // also remove ignored files like before
    removeIgnoredFiles(tmpRepoPackagePath, includePaths, excludePaths)

    // stage all files
    tmpExec("git", ["add", "-f", join("node_modules", unsafePackageName)])

    // get diff of changes
    const patch = tmpExec("git", [
      "diff",
      "--cached",
      "--no-color",
      "--ignore-space-at-eol",
      "--no-ext-diff",
    ]).stdout.toString()

    if (patch.trim() === "") {
      console.warn(
        `⁉️  Not creating patch file for package '${packagePathSpecifier}'`,
      )
      console.warn(`⁉️  There don't appear to be any changes.`)
      process.exit(1)
    } else {
      const packageNames = packagePathSpecifier
        .split("=>")
        .map(parsePackageName)
        .map(name => renderPackageName(name, { urlSafe: true }))
        .join("=>")

      // maybe delete existing
      getPatchFiles(patchDir).forEach(filename => {
        const relativeFilename = relative(patchDir, filename)
        if (
          // add '+'s to avoid deleting nested patches when parent is being patched
          relativeFilename.startsWith(packageNames + "+") ||
          relativeFilename.startsWith(unsafePackageName + "+") ||
          relativeFilename.startsWith(unsafePackageName + ":") // legacy
        ) {
          unlinkSync(filename)
        }
      })

      const patchFileName = `${packageNames}+${packageVersion}.patch`

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
