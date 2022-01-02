import chalk from "chalk"
import { join, dirname, resolve } from "./path"
import { basename } from "path"
import { spawnSafeSync } from "./spawnSafe"
import { PackageManager } from "./detectPackageManager"
import { removeIgnoredFiles } from "./filterFiles"
import {
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  mkdirpSync,
  realpathSync,
  renameSync,
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
import { getPackageVersion } from "./getPackageVersion"
import {
  maybePrintIssueCreationPrompt,
  openIssueCreationLink,
} from "./createIssue"
import { quote as shlexQuote } from "shlex"

const isVerbose = global.patchPackageIsVerbose
const isDebug = global.patchPackageIsDebug
const isTest = process.env.NODE_ENV == 'test'

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
  const appPackageJson = require(join(appPath, "package.json"))
  const packagePath = join(appPath, packageDetails.path)
  const packageJsonPath = join(packagePath, "package.json")

  if (isDebug) {
    console.log(`patch-package/makePatch: appPath = ${appPath}`)
    console.log(`patch-package/makePatch: packagePath = ${packagePath}`)
    console.log(`patch-package/makePatch: appPackageJson:`)
    console.dir(appPackageJson)
  }

  if (!existsSync(packageJsonPath)) {
    printNoPackageFoundError(packagePathSpecifier, packageJsonPath)
    process.exit(1)
  }

  const tmpRepo = dirSync({
    unsafeCleanup: true,
    prefix: "patch-package.tmpRepo.",
  })

  function cleanup() {
    tmpRepo.removeCallback()
  }

  try {
    // finally: cleanup()

    const tmpRepoPackagePath = join(tmpRepo.name, packageDetails.path)
    const tmpRepoNpmRoot = tmpRepoPackagePath.slice(
      0,
      -`/node_modules/${packageDetails.name}`.length,
    )

    const tmpRepoPackageJsonPath = join(tmpRepoNpmRoot, "package.json")

    const patchesDir = resolve(join(appPath, patchDir))

    console.info(chalk.grey("•"), "Creating temporary folder")

    if (isDebug) {
      console.log(
        `patch-package/makePatch: tmpRepoNpmRoot = ${tmpRepoNpmRoot}`,
      )
    }

    const resolvedVersion = getPackageResolution({
      packageDetails,
      packageManager,
      appPath,
      appPackageJson,
    })

    // make a blank package.json
    mkdirpSync(tmpRepoNpmRoot)
    writeFileSync(
      tmpRepoPackageJsonPath,
      JSON.stringify({
        dependencies: {
          [packageDetails.name]: resolvedVersion.version,
        },
        resolutions: resolveRelativeFileDependencies(
          appPath,
          appPackageJson.resolutions || {},
        ),
      }),
    )

    const declaredVersion = (() => {
      var v = resolvedVersion.version
      // https://docs.npmjs.com/cli/v7/configuring-npm/package-json
      // <protocol>://[<user>[:<password>]@]<hostname>[:<port>][:][/]<path>[#<commit-ish> | #semver:<semver>]
      // pnpm uses link: protocol instead of file:
      // TODO add more protocols?
      var m = v.match(/^(file|link|http|https|git|git\+https|git\+http|git\+ssh|git\+file|github):(.+)$/)
      if (m) {
        var protocol = m[1]
        var location = m[2]
        var isGit = protocol.startsWith('git')
        var gitCommit = isGit ? location.split('#').slice(-1)[0] : null
        if (isGit && !gitCommit) {
          throw new Error(`error: found wildcard git version ${v}. package.json must pin the exact version of ${packageDetails.name} in the format <protocol>:<packagePath>#<commitHash>`)
        }
        if (isGit) {
          return { full: v, protocol, location, gitCommit }
        }
        else {
          // sample: https://registry.yarnpkg.com/left-pad/-/left-pad-1.3.0.tgz#5b8a3a7765dfe001261dde915589e782f8c94d1e
          // hash is sha1sum of tgz file
          // -> use version number from package's package.json
          var version = getPackageVersion(join(resolve(packageDetails.path), "package.json"))
          if (isVerbose) {
            console.log(`patch-package/makePatch: warning: using version ${version} from ${packageDetails.name}/package.json`)
          }
          return { version }
        }
      }
      if (!v.match(/^[0-9]+\.[0-9]+\.[0-9]+/)) {
        throw new Error(`error: found wildcard version. package.json must pin the exact version of ${packageDetails.name} in the format <package>@<major>.<minor>.<patch>`)
      }
      return { full: v, version: v }
    })()

    const packageVersion = (
      declaredVersion.version || declaredVersion.gitCommit || declaredVersion.full
    )

    // originCommit is more precise than pkg.version
    if (isDebug) {
      //console.log(`patch-package/makePatch: resolvedVersion.originCommit = ${resolvedVersion.originCommit}`)
      console.log(`patch-package/makePatch: resolvedVersion.version = ${resolvedVersion.version}`)
      console.log(`patch-package/makePatch: packageVersion = ${packageVersion}`)
    }

    //const packageVersion =
    //  resolvedVersion.originCommit ||
    //  getPackageVersion(join(resolve(packageDetails.path), "package.json"))

    // this is broken when installing from git -> version can be a pseudo-version like 1.0.0-canary
    //const packageVersion = getPackageVersion(join(resolve(packageDetails.path), "package.json"))

    // TODO rename resolvedVersion -> declaredVersion

    // FIXME false positive
    // test integration-tests/create-issue/create-issue.test.ts
    // -> patching left-pad prompts to submit an issue
    // https://registry.yarnpkg.com/left-pad/-/left-pad-1.3.0.tgz#5b8a3a7765dfe001261dde915589e782f8c94d1e
    // hash is sha checksum of tgz file -> just use the version 1.3.0
    /*
    const packageVersion = (
      !resolvedVersion.version.match(/^(file:|link:)/) ? resolvedVersion.version :
      getPackageVersion(join(resolve(packageDetails.path), "package.json"))
    )
    */

    if (isDebug) {
      console.log(`patch-package/makePatch: resolvedVersion.version = ${resolvedVersion.version}`)
      console.log(`patch-package/makePatch: getPackageVersion -> ${getPackageVersion(join(resolve(packageDetails.path), "package.json"))}`)
      console.log(`patch-package/makePatch: packageVersion = ${packageVersion}`)
      console.log(`patch-package/makePatch: package path = ${packageDetails.path}`)
      console.log(`patch-package/makePatch: package path resolved = ${resolve(packageDetails.path)}`)
    }

    // copy .npmrc/.yarnrc in case packages are hosted in private registry
    // tslint:disable-next-line:align
    ;[".npmrc", ".yarnrc"].forEach((rcFile) => {
      const rcPath = join(appPath, rcFile)
      if (existsSync(rcPath)) {
        copySync(rcPath, join(tmpRepo.name, rcFile))
      }
    })

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
      } catch (e: any) {
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
      const npmCmd = packageManager === "pnpm" ? "pnpm" : "npm"
      console.info(
        chalk.grey("•"),
        `Installing ${packageDetails.name}@${packageVersion} with ${npmCmd}`,
      )
      try {
        // try first without ignoring scripts in case they are required
        // this works in 99.99% of cases
        if (isVerbose) {
          console.log(
            `patch-package/makePatch: run "${npmCmd} install --force" in ${tmpRepoNpmRoot}`,
          )
        }
        spawnSafeSync(npmCmd, ["install", "--force"], {
          cwd: tmpRepoNpmRoot,
          logStdErrOnError: false,
          stdio: isVerbose ? "inherit" : "ignore",
        })
      } catch (e: any) {
        // try again while ignoring scripts in case the script depends on
        // an implicit context which we havn't reproduced
        if (isVerbose) {
          console.log(
            `patch-package/makePatch: run "${npmCmd} install --ignore-scripts --force" in ${tmpRepoNpmRoot}`,
          )
        }
        spawnSafeSync(npmCmd, ["install", "--ignore-scripts", "--force"], {
          cwd: tmpRepoNpmRoot,
          stdio: isVerbose ? "inherit" : "ignore",
        })
      }
      if (packageManager === "pnpm") {
        // workaround for `git diff`: replace symlink with hardlink
        const pkgPath = tmpRepoNpmRoot + "/node_modules/" + packageDetails.name
        const realPath = realpathSync(pkgPath)
        unlinkSync(pkgPath) // rm symlink
        renameSync(realPath, pkgPath)
      }
    }

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
    // use CLI options --exclude and --include
    removeIgnoredFiles(tmpRepoPackagePath, includePaths, excludePaths)

    git("add", "-f", packageDetails.path)
    git("commit", "--allow-empty", "-m", "init")

    // replace package with user's version
    rimraf(tmpRepoPackagePath)

    if (isVerbose) {
      console.log(
        `patch-package/makePatch: copy ${realpathSync(
          packagePath,
        )} to ${tmpRepoPackagePath}`,
      )
    }

    // pnpm installs packages as symlinks, copySync would copy only the symlink
    const srcPath = realpathSync(packagePath)
    copySync(srcPath, tmpRepoPackagePath, {
      filter: (path) => {
        return !path.startsWith(srcPath + "/node_modules/")
      },
    })

    // remove nested node_modules just to be safe
    rimraf(join(tmpRepoPackagePath, "node_modules"))
    // remove .git just to be safe
    rimraf(join(tmpRepoPackagePath, ".git"))

    // also remove ignored files like before
    // use CLI options --exclude and --include
    removeIgnoredFiles(tmpRepoPackagePath, includePaths, excludePaths)

    // stage all files
    git("add", "-f", packageDetails.path)

    const ignorePaths = ["package-lock.json", "pnpm-lock.yaml"]

    // get diff of changes
    const diffResult = git(
      "diff",
      "--cached",
      "--no-color",
      "--ignore-space-at-eol",
      "--no-ext-diff",
      ...ignorePaths.map(
        (path) => `:(exclude,top)${packageDetails.path}/${path}`,
      ),
    )

    if (diffResult.stdout.length === 0) {
      console.warn(
        `⁉️  Not creating patch file for package '${packagePathSpecifier}'`,
      )
      console.warn(`⁉️  There don't appear to be any changes.`)
      cleanup()
      process.exit(1)
      return
    }

    try {
      parsePatchFile(diffResult.stdout.toString())
    } catch (e: any) {
      if (!(e instanceof Error)) return
      if (
        e.message.includes("Unexpected file mode string: 120000")
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
      cleanup()
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

    const patchPackageVersion = require("../package.json").version

    // patchfiles are parsed in patch/parse.ts function parsePatchLines
    // -> header comments are ignored
    let diffHeader = ""
    const dateStr = (
      isTest ? '1980-01-01 00:00:00' : // mock date
      new Date().toLocaleString("lt")
    )
    diffHeader += `# generated by patch-package ${patchPackageVersion} on ${dateStr}\n`
    diffHeader += `#\n`
    const prettyArgv = process.argv.slice()
    if (prettyArgv[0].match(/node/)) {
      prettyArgv[0] = "npx"
    }
    if (prettyArgv[1].match(/patch-package/)) {
      prettyArgv[1] = "patch-package"
    }
    diffHeader += `# command:\n`
    diffHeader += `#   ${prettyArgv.map((a) => shlexQuote(a)).join(" ")}\n`
    diffHeader += `#\n`
    diffHeader += `# declared package:\n`
    // TODO rename resolvedVersion.version to declaredVersion
    const declaredPackageStr = (
      isTest ? (() => {
        const v = resolvedVersion.version
        const b = basename(v)
        if (b != v) return `file:/mocked/path/to/${b}` // mock path // TODO keep the relative path? as declared in /package.json. see getPackageResolution "resolve relative file path"
        return v
      })() :
      resolvedVersion.version
    )
    diffHeader += `#   ${packageDetails.name}: ${declaredPackageStr}\n`
    /* redundant. this is visible from command, sample: npx patch-package wrap-ansi/string-width -> packageNames: wrap-ansi, string-width
    if (packageDetails.packageNames.length > 1) {
      diffHeader += `#\n`
      diffHeader += `# package names:\n`
      packageDetails.packageNames.forEach((packageName) => {
        diffHeader += `#   ${packageName}\n`
      })
    }
    */
    diffHeader += `#\n`

    const patchFileName = createPatchFileName({
      packageDetails,
      packageVersion,
    })

    const patchPath = join(patchesDir, patchFileName)
    if (!existsSync(dirname(patchPath))) {
      // scoped package
      mkdirSync(dirname(patchPath))
    }
    writeFileSync(patchPath, diffHeader + diffResult.stdout)
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
  } catch (e: any) {
    console.error(e)
    throw e
  } finally {
    cleanup()
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
