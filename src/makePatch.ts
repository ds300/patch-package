import chalk from "chalk"
import {
  copySync,
  existsSync,
  mkdirSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "fs-extra"
import { sync as rimraf } from "rimraf"
import { gzipSync } from "zlib"
import {
  maybePrintIssueCreationPrompt,
  openIssueCreationLink,
} from "./createIssue"
import { PackageManager } from "./detectPackageManager"
import { downloadPackage } from "./downloadPackage"
import { removeIgnoredFiles } from "./filterFiles"
import { getPackageVersion } from "./getPackageVersion"
import {
  getPackageDetailsFromPatchFilename,
  getPatchDetailsFromCliString,
  PackageDetails,
} from "./PackageDetails"
import { parsePatchFile } from "./patch/parse"
import { getPatchFiles } from "./patchFs"
import { dirname, join, resolve } from "./path"
import { spawnSafeSync } from "./spawnSafe"

function printNoPackageFoundError(
  packageName: string,
  packageJsonPath: string,
) {
  console.error(
    `No such package ${packageName}

  File not found: ${packageJsonPath}`,
  )
}

export function makePatch({
  packagePathSpecifier,
  appPath,
  packageManager,
  includePaths,
  excludePaths,
  patchDir,
  createIssue,
}: {
  packagePathSpecifier: string
  appPath: string
  packageManager: PackageManager
  includePaths: RegExp
  excludePaths: RegExp
  patchDir: string
  createIssue: boolean
}) {
  const packageDetails = getPatchDetailsFromCliString(packagePathSpecifier)

  if (!packageDetails) {
    console.error("No such package", packagePathSpecifier)
    return
  }

  const packagePath = join(appPath, packageDetails.path)
  const packageJsonPath = join(packagePath, "package.json")

  if (!existsSync(packageJsonPath)) {
    printNoPackageFoundError(packagePathSpecifier, packageJsonPath)
    process.exit(1)
  }

  const { tmpRepo, tmpRepoPackagePath } = downloadPackage({
    packageDetails,
    appPath,
    packageManager,
  })

  const patchesDir = resolve(join(appPath, patchDir))
  const packageVersion = getPackageVersion(
    join(resolve(packageDetails.path), "package.json"),
  )

  const git = (...args: string[]) =>
    spawnSafeSync("git", args, {
      cwd: tmpRepo.name,
      env: { ...process.env, HOME: tmpRepo.name },
      maxBuffer: 1024 * 1024 * 100,
    })

  // remove nested node_modules just to be safe
  rimraf(join(tmpRepoPackagePath, "node_modules"))
  // remove .git just to be safe
  rimraf(join(tmpRepoPackagePath, ".git"))

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

  // pnpm installs packages as symlinks, copySync would copy only the symlink
  copySync(realpathSync(packagePath), tmpRepoPackagePath)

  // remove nested node_modules just to be safe
  rimraf(join(tmpRepoPackagePath, "node_modules"))
  // remove .git just to be safe
  rimraf(join(tmpRepoPackagePath, ".git"))

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
    if ((e as Error).message.includes("Unexpected file mode string: 120000")) {
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

  // maybe delete existing
  getPatchFiles(patchDir).forEach((filename) => {
    const deets = getPackageDetailsFromPatchFilename(filename)
    if (deets && deets.path === packageDetails.path) {
      unlinkSync(join(patchDir, filename))
    }
  })

  const patchFileName = createPatchFileName({
    packageDetails,
    packageVersion,
  })

  const patchPath = join(patchesDir, patchFileName)
  if (!existsSync(dirname(patchPath))) {
    // scoped package
    mkdirSync(dirname(patchPath))
  }
  writeFileSync(patchPath, diffResult.stdout)
  console.log(
    `${chalk.green("✔")} Created file ${join(patchDir, patchFileName)}\n`,
  )
  if (createIssue) {
    openIssueCreationLink({
      packageDetails,
      patchFileContents: diffResult.stdout.toString(),
      packageVersion,
    })
  } else {
    maybePrintIssueCreationPrompt(packageDetails, packageManager)
  }
}

function createPatchFileName({
  packageDetails,
  packageVersion,
}: {
  packageDetails: PackageDetails
  packageVersion: string
}) {
  const packageNames = packageDetails.packageNames
    .map((name) => name.replace(/\//g, "+"))
    .join("++")

  return `${packageNames}+${packageVersion}.patch`
}
