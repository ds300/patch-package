import chalk from "chalk"
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
  readdirSync,
} from "fs-extra"
import { sync as rimraf } from "rimraf"
import { copySync } from "fs-extra"
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
import readline from "readline"
import { dirSync } from "tmp"

function printNoPackageFoundError(
  packageName: string,
  packageJsonPath: string,
) {
  console.error(
    `No such package ${packageName}

  File not found: ${packageJsonPath}`,
  )
  process.exit(1)
}

function printNoUnpluggedPackageFound({
  packageName,
  unpluggedDir,
}: {
  packageName: string
  unpluggedDir: string
}) {
  console.error(
    `Could not find an unnplugged version of ${packageName} in ${unpluggedDir}`,
  )
  process.exit(1)
}

async function findRelativePackagePath({
  appPath,
  packageDetails,
  packageManager,
}: {
  appPath: string
  packageDetails: PackageDetails
  packageManager: PackageManager
}): Promise<string> {
  if (packageManager === "berry") {
    const unpluggedDir = join(appPath, ".yarn/unplugged")
    if (!existsSync(unpluggedDir)) {
      printNoUnpluggedPackageFound({
        packageName: packageDetails.name,
        unpluggedDir,
      })
    }
    const dirs = readdirSync(unpluggedDir).filter(
      name =>
        name.startsWith(packageDetails.name) &&
        name
          .slice(packageDetails.name.length)
          // optional protocol (e.g. npm) - optional version - hash
          .match(/^(-\w+)?(-\d+\.\d+\.\d+.*?)?-[0-9a-f]+$/),
    )
    if (dirs.length === 0) {
      printNoUnpluggedPackageFound({
        packageName: packageDetails.name,
        unpluggedDir,
      })
    }
    if (dirs.length > 1) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      return new Promise<string>(resolvePromise => {
        rl.question(
          `There are mulitple unplugged versions of ${chalk.bold(
            packageDetails.name,
          )}\n\n` +
            dirs
              .map(
                (dir, index) =>
                  `${chalk.cyan.bold(index.toString())}${chalk.gray(
                    ")",
                  )} ${dir}`,
              )
              .join("\n") +
            "\n\n" +
            `Please select a ${chalk.cyan.bold("version")} ` +
            chalk.yellow.bold(">> "),
          answer => {
            const index = Number(answer.trim())
            if (index != null && index >= 0 && index < dirs.length) {
              resolvePromise(
                join(
                  ".yarn/unplugged",
                  dirs[index],
                  "node_modules",
                  packageDetails.name,
                ),
              )
            } else {
              console.error(chalk.red.bold("That didn't work."))
              console.error(
                `Please try again and provide a number in the range 0-${dirs.length -
                  1}`,
              )
              process.exit(1)
            }
          },
        )
      })
    }
    return join(".yarn/unplugged", dirs[0], "node_modules", packageDetails.name)
  }

  return packageDetails.path
}

export async function makePatch({
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
  const appJson = require(join(appPath, "package.json"))
  const relativePackagePath = await findRelativePackagePath({
    appPath,
    packageDetails,
    packageManager,
  })

  const appPackageJsonPath = join(appPath, relativePackagePath, "package.json")

  if (!existsSync(appPackageJsonPath)) {
    // won't happen with berry
    printNoPackageFoundError(packagePathSpecifier, appPackageJsonPath)
  }

  const tmpRepo = dirSync({ unsafeCleanup: true })
  const tmpRepoPackagePath = join(tmpRepo.name, relativePackagePath)
  const tmpRepoNpmRoot = tmpRepoPackagePath.slice(
    0,
    -`/node_modules/${packageDetails.name}`.length,
  )

  const tmpRepoPackageJsonPath = join(tmpRepoNpmRoot, "package.json")

  try {
    const patchesDir = resolve(join(appPath, patchDir))

    console.info(chalk.grey("•"), "Creating temporary folder")

    // make a blank package.json
    mkdirpSync(tmpRepoNpmRoot)
    writeFileSync(
      tmpRepoPackageJsonPath,
      JSON.stringify({
        dependencies: {
          [packageDetails.name]: getPackageResolution({
            packageDetails,
            packageManager,
            appPath,
          }),
        },
        resolutions: resolveRelativeFileDependencies(
          appPath,
          appJson.resolutions || {},
        ),
      }),
    )

    const packageVersion = require(join(
      resolve(packageDetails.path),
      "package.json",
    )).version as string

    // copy .npmrc in case if packages are hosted in private registry
    const npmrcPath = join(appPath, ".npmrc")
    if (existsSync(npmrcPath)) {
      copySync(npmrcPath, join(tmpRepo.name, ".npmrc"))
    }

    if (packageManager === "yarn") {
      console.info(
        chalk.grey("•"),
        `Installing ${packageDetails.name}@${packageVersion} with yarn`,
      )
      try {
        // try first without ignoring scripts in case they are required
        // this works in 99.99% of cases
        spawnSafeSync(`yarn`, ["install", "--ignore-engines"], {
          cwd: tmpRepoNpmRoot,
          logStdErrOnError: false,
        })
      } catch (e) {
        // try again while ignoring scripts in case the script depends on
        // an implicit context which we havn't reproduced
        spawnSafeSync(
          `yarn`,
          ["install", "--ignore-engines", "--ignore-scripts"],
          {
            cwd: tmpRepoNpmRoot,
          },
        )
      }
    } else {
      console.info(
        chalk.grey("•"),
        `Installing ${packageDetails.name}@${packageVersion} with npm`,
      )
      try {
        // try first without ignoring scripts in case they are required
        // this works in 99.99% of cases
        spawnSafeSync(`npm`, ["i"], {
          cwd: tmpRepoNpmRoot,
          logStdErrOnError: false,
        })
      } catch (e) {
        // try again while ignoring scripts in case the script depends on
        // an implicit context which we havn't reproduced
        spawnSafeSync(`npm`, ["i", "--ignore-scripts"], {
          cwd: tmpRepoNpmRoot,
        })
      }
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
