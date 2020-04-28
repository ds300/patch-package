import chalk from "chalk"
import { join, dirname, resolve } from "./path"
import { spawnSafeSync } from "./spawnSafe"
import { PackageManager, installPackage } from "./detectPackageManager"
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
  PackageDetails,
} from "./PackageDetails"
import { resolveRelativeFileDependencies } from "./resolveRelativeFileDependencies"
import { getPackageResolution } from "./getPackageResolution"
import { parsePatchFile } from "./patch/parse"
import { gzipSync } from "zlib"
import { printPatchingProgress } from "./applyPatches"

function printNoPackageFoundError(
  packageName: string,
  packageJsonPath: string,
) {
  console.error(
    `No such package ${packageName}

  File not found: ${packageJsonPath}`,
  )
}

export function downloadModule({
  tmpRepo,
  appPath,
  packageDetails,
  packageManager,
  appPackageJson,
  reuseConfig,
}: {
  tmpRepo: any
  appPath: string
  packageDetails: PackageDetails
  packageManager: PackageManager
  appPackageJson: any
  reuseConfig: boolean
}): string {
  const tmpRepoPackagePath = join(tmpRepo.name, packageDetails.path)
  const tmpRepoNpmRoot = tmpRepoPackagePath.slice(
    0,
    -`/node_modules/${packageDetails.name}`.length,
  )
  const tmpRepoPackageJsonPath = join(tmpRepoNpmRoot, "package.json")

  printPatchingProgress({ progress: "creating_temp_folder" })

  // make a blank package.json
  mkdirpSync(tmpRepoNpmRoot)

  const packageResolution = getPackageResolution({
    packageDetails,
    packageManager,
    appPath,
  })

  writeFileSync(
    tmpRepoPackageJsonPath,
    JSON.stringify({
      dependencies: {
        [packageDetails.name]: packageResolution,
      },
      resolutions: resolveRelativeFileDependencies(
        appPath,
        appPackageJson.resolutions || {},
      ),
    }),
  )

  const packageVersion = require(join(
    resolve(packageDetails.path),
    "package.json",
  )).version as string

  if (reuseConfig) {
    // copy .npmrc/.yarnrc in case packages are hosted in private registry
    ;[".npmrc", ".yarnrc"].forEach(rcFile => {
      const rcPath = join(appPath, rcFile)
      if (existsSync(rcPath)) {
        copySync(rcPath, join(tmpRepo.name, rcFile))
      }
    })
  }

  installPackage({
    packageManager,
    repoRoot: tmpRepoNpmRoot,
    packageName: packageDetails.name,
    packageVersion,
  })

  return tmpRepoPackagePath
}

export function makePatch({
  packagePathSpecifier,
  appPath,
  packageManager,
  includePaths,
  excludePaths,
  patchDir,
}: {
  packagePathSpecifier: string
  appPath: string
  packageManager: PackageManager
  includePaths: RegExp
  excludePaths: RegExp
  patchDir: string
}) {
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

  const tmpRepo = dirSync({ unsafeCleanup: true })

  try {
    const patchesDir = resolve(join(appPath, patchDir))

    const tmpRepoPackagePath = downloadModule({
      tmpRepo,
      appPath,
      packageDetails,
      packageManager,
      appPackageJson,
      reuseConfig: true,
    })

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
    console.info(chalk.grey("•"), "Diffing your files with clean files")
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
      return
    }

    try {
      parsePatchFile(diffResult.stdout.toString())
    } catch (e) {
      if (
        (e as Error).message.includes("Unexpected file mode string: 120000")
      ) {
        console.error(`
⛔️ ${chalk.red.bold("ERROR")}

  Your changes involve creating symlinks. patch-package does not yet support
  symlinks.
  
  ️Please use ${chalk.bold("--include")} and/or ${chalk.bold(
          "--exclude",
        )} to narrow the scope of your patch if
  this was unintentional.
`)
      } else {
        const outPath = "./patch-package-error.json.gz"
        writeFileSync(
          outPath,
          gzipSync(
            JSON.stringify({
              error: { message: e.message, stack: e.stack },
              patch: diffResult.stdout.toString(),
            }),
          ),
        )
        console.error(`
⛔️ ${chalk.red.bold("ERROR")}
        
  patch-package was unable to read the patch-file made by git. This should not
  happen.
  
  A diagnostic file was written to
  
    ${outPath}
  
  Please attach it to a github issue
  
    https://github.com/ds300/patch-package/issues/new?title=New+patch+parse+failed&body=Please+attach+the+diagnostic+file+by+dragging+it+into+here+🙏
  
  Note that this diagnostic file will contain code from the package you were
  attempting to patch.

`)
      }
      process.exit(1)
      return
    }

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

    const packageVersion = require(join(
      resolve(packageDetails.path),
      "package.json",
    )).version as string

    const patchFileName = `${packageNames}+${packageVersion}.patch`

    const patchPath = join(patchesDir, patchFileName)
    if (!existsSync(dirname(patchPath))) {
      // scoped package
      mkdirSync(dirname(patchPath))
    }
    writeFileSync(patchPath, diffResult.stdout)
    console.log(
      `${chalk.green("✔")} Created file ${join(patchDir, patchFileName)}`,
    )
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    tmpRepo.removeCallback()
  }
}
