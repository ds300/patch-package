import { green } from "chalk"
import { join, dirname, resolve } from "./path"
import { spawnSafeSync } from "./spawnSafe"
import { PackageManager } from "./detectPackageManager"
import { removeIgnoredFiles } from "./filterFiles"
import {
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  mkdirpSync,
} from "fs-extra"
import { sync as rimraf } from "rimraf"
import { copySync } from "fs-extra"
import { dirSync } from "tmp"
import { getPatchFiles } from "./patchFs"
import {
  getPatchDetailsFromCliString,
  getPackageDetailsFromPatchFilename,
} from "./PackageDetails"

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
  packagePathSpecifier: string,
  appPath: string,
  packageManager: PackageManager,
  includePaths: RegExp,
  excludePaths: RegExp,
  patchDir: string = "patches",
) => {
  const packageDetails = getPatchDetailsFromCliString(packagePathSpecifier)

  if (!packageDetails) {
    console.error("No such package", packagePathSpecifier)
    return
  }
  const appPackageJson = require(join(appPath, "package.json"))
  const packagePath = join(appPath, packageDetails.path)
  const packageJsonPath = join(packagePath, "package.json")

  if (!existsSync(packageJsonPath)) {
    printNoPackageFoundError(packagePathSpecifier, packageJsonPath)
    process.exit(1)
  }

  const packageVersion = require(packageJsonPath).version as string

  // packageVersionSpecifier is the version string used by the app package.json
  // it won't be present for nested deps.
  // We need it only for patching deps specified with file:./
  // which I think only happens in tests
  // but might happen in real life too.
  let packageVersionSpecifier: null | string = packageDetails.isNested
    ? null
    : appPackageJson.dependencies[packageDetails.name] ||
      appPackageJson.devDependencies[packageDetails.name] ||
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
  const tmpRepoPackagePath = join(tmpRepo.name, packageDetails.path)
  const tmpRepoNpmRoot = tmpRepoPackagePath.slice(
    0,
    -`/node_modules/${packageDetails.name}`.length,
  )

  const tmpRepoPackageJsonPath = join(tmpRepoNpmRoot, "package.json")

  try {
    const patchesDir = join(appPath, patchDir)

    console.info(green("✔"), "Creating temporary folder")

    // make a blank package.json
    console.info(green("✔"), "Making tmp package.json")
    mkdirpSync(tmpRepoNpmRoot)
    writeFileSync(
      tmpRepoPackageJsonPath,
      JSON.stringify({
        dependencies: {
          [packageDetails.name]: packageVersionSpecifier || packageVersion,
        },
      }),
    )

    if (packageManager === "yarn") {
      console.info(
        green("✔"),
        `Installing ${packageDetails.name}@${packageVersion} with yarn`,
      )
      spawnSafeSync(`yarn`, ["install", "--ignore-engines"], {
        cwd: tmpRepoNpmRoot,
      })
    } else {
      console.info(
        green("✔"),
        `Installing ${packageDetails.name}@${packageVersion} with npm`,
      )
      spawnSafeSync(`npm`, ["i"], { cwd: tmpRepoNpmRoot })
    }

    const git = (...args: string[]) =>
      spawnSafeSync("git", args, {
        cwd: tmpRepo.name,
        env: { HOME: tmpRepo.name },
      })

    // remove nested node_modules just to be safe
    rimraf(join(tmpRepoPackagePath, "node_modules"))
    // remove .git just to be safe
    rimraf(join(tmpRepoPackagePath, "node_modules"))

    // commit the package
    console.info(green("✔"), "Diffing your files with clean files")
    writeFileSync(join(tmpRepo.name, ".gitignore"), "!/node_modules\n\n")
    git("init")
    git("config", "--local", "user.name", "patch-package")
    git("config", "--local", "user.email", "patch@pack.age")

    // remove ignored files first
    removeIgnoredFiles(tmpRepoPackagePath, includePaths, excludePaths)

    git("add", "-f", packageDetails.path)
    git("commit", "--allow-empty", "-m", "init")

    // replace package with user's version
    rimraf(tmpRepoPackagePath)

    copySync(packagePath, tmpRepoPackagePath)

    // remove nested node_modules just to be safe
    rimraf(join(tmpRepoPackagePath, "node_modules"))
    // remove .git just to be safe
    rimraf(join(tmpRepoPackagePath, "node_modules"))

    // also remove ignored files like before
    removeIgnoredFiles(tmpRepoPackagePath, includePaths, excludePaths)

    // stage all files
    git("add", "-f", packageDetails.path)

    // get diff of changes
    const diffResult = git(
      "diff",
      "--cached",
      "--no-color",
      "--ignore-space-at-eol",
      "--no-ext-diff",
    )

    if (diffResult.stdout.length === 0) {
      console.warn(
        `⁉️  Not creating patch file for package '${packagePathSpecifier}'`,
      )
      console.warn(`⁉️  There don't appear to be any changes.`)
      process.exit(1)
    } else {
      const packageNames = packageDetails.packageNames
        .map(name => name.replace(/\//g, "+"))
        .join("++")

      // maybe delete existing
      getPatchFiles(patchDir).forEach(filename => {
        const deets = getPackageDetailsFromPatchFilename(filename)
        if (deets && deets.path === packageDetails.path) {
          unlinkSync(join(patchDir, filename))
        }
      })

      const patchFileName = `${packageNames}+${packageVersion}.patch`

      const patchPath = join(patchesDir, patchFileName)
      if (!existsSync(dirname(patchPath))) {
        // scoped package
        mkdirSync(dirname(patchPath))
      }
      writeFileSync(patchPath, diffResult.stdout)
      console.log(`${green("✔")} Created file ${patchDir}/${patchFileName}`)
    }
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    tmpRepo.removeCallback()
  }
}
