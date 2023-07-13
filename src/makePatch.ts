import chalk from "chalk"
import console from "console"
import { renameSync } from "fs"
import {
  copySync,
  existsSync,
  mkdirpSync,
  mkdirSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "fs-extra"
import { sync as rimraf } from "rimraf"
import { dirSync } from "tmp"
import { gzipSync } from "zlib"
import { applyPatch } from "./applyPatches"
import {
  getPackageVCSDetails,
  maybePrintIssueCreationPrompt,
  openIssueCreationLink,
  shouldRecommendIssue,
} from "./createIssue"
import { PackageManager } from "./detectPackageManager"
import { removeIgnoredFiles } from "./filterFiles"
import { getPackageResolution } from "./getPackageResolution"
import { getPackageVersion } from "./getPackageVersion"
import { hashFile } from "./hash"
import {
  getPatchDetailsFromCliString,
  PackageDetails,
  PatchedPackageDetails,
} from "./PackageDetails"
import { parsePatchFile } from "./patch/parse"
import { getGroupedPatches } from "./patchFs"
import { dirname, join, resolve } from "./path"
import { resolveRelativeFileDependencies } from "./resolveRelativeFileDependencies"
import { spawnSafeSync } from "./spawnSafe"
import {
  clearPatchApplicationState,
  getPatchApplicationState,
  PatchState,
  savePatchApplicationState,
  STATE_FILE_NAME,
} from "./stateFile"

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
  mode,
}: {
  packagePathSpecifier: string
  appPath: string
  packageManager: PackageManager
  includePaths: RegExp
  excludePaths: RegExp
  patchDir: string
  createIssue: boolean
  mode: { type: "overwrite_last" } | { type: "append"; name?: string }
}) {
  const packageDetails = getPatchDetailsFromCliString(packagePathSpecifier)

  if (!packageDetails) {
    console.error("No such package", packagePathSpecifier)
    return
  }

  const state = getPatchApplicationState(packageDetails)
  const isRebasing = state?.isRebasing ?? false
  // TODO: verify applied patch hashes
  // TODO: handle case for --rebase 0
  // TODO: handle empty diffs while rebasing
  if (
    mode.type === "overwrite_last" &&
    isRebasing &&
    state?.patches.length === 0
  ) {
    mode = { type: "append", name: "initial" }
  }

  const existingPatches =
    getGroupedPatches(patchDir).pathSpecifierToPatchFiles[
      packageDetails.pathSpecifier
    ] || []

  // apply all existing patches if appending
  // otherwise apply all but the last
  const previouslyAppliedPatches = state?.patches.filter((p) => p.didApply)
  const patchesToApplyBeforeDiffing: PatchedPackageDetails[] = isRebasing
    ? mode.type === "append"
      ? existingPatches.slice(0, previouslyAppliedPatches!.length)
      : state!.patches[state!.patches.length - 1].didApply
      ? existingPatches.slice(0, previouslyAppliedPatches!.length - 1)
      : existingPatches.slice(0, previouslyAppliedPatches!.length)
    : mode.type === "append"
    ? existingPatches
    : existingPatches.slice(0, -1)

  if (createIssue && mode.type === "append") {
    console.error("--create-issue is not compatible with --append.")
    process.exit(1)
  }

  if (createIssue && isRebasing) {
    console.error("--create-issue is not compatible with rebasing.")
    process.exit(1)
  }

  const numPatchesAfterCreate =
    mode.type === "append" || existingPatches.length === 0
      ? existingPatches.length + 1
      : existingPatches.length
  const vcs = getPackageVCSDetails(packageDetails)
  const canCreateIssue =
    !isRebasing &&
    shouldRecommendIssue(vcs) &&
    numPatchesAfterCreate === 1 &&
    mode.type !== "append"

  const appPackageJson = require(join(appPath, "package.json"))
  const packagePath = join(appPath, packageDetails.path)
  const packageJsonPath = join(packagePath, "package.json")

  if (!existsSync(packageJsonPath)) {
    printNoPackageFoundError(packagePathSpecifier, packageJsonPath)
    process.exit(1)
  }

  const tmpRepo = dirSync({ unsafeCleanup: true })
  const tmpRepoPackagePath = join(tmpRepo.name, packageDetails.path)
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
          appPackageJson.resolutions || {},
        ),
      }),
    )

    const packageVersion = getPackageVersion(
      join(resolve(packageDetails.path), "package.json"),
    )

    // copy .npmrc/.yarnrc in case packages are hosted in private registry
    // copy .yarn directory as well to ensure installations work in yarn 2
    // tslint:disable-next-line:align
    ;[".npmrc", ".yarnrc", ".yarn"].forEach((rcFile) => {
      const rcPath = join(appPath, rcFile)
      if (existsSync(rcPath)) {
        copySync(rcPath, join(tmpRepo.name, rcFile), { dereference: true })
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
        spawnSafeSync(`npm`, ["i", "--force"], {
          cwd: tmpRepoNpmRoot,
          logStdErrOnError: false,
          stdio: "ignore",
        })
      } catch (e) {
        // try again while ignoring scripts in case the script depends on
        // an implicit context which we havn't reproduced
        spawnSafeSync(`npm`, ["i", "--ignore-scripts", "--force"], {
          cwd: tmpRepoNpmRoot,
          stdio: "ignore",
        })
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
    // remove patch-package state file
    rimraf(join(tmpRepoPackagePath, STATE_FILE_NAME))

    // commit the package
    console.info(chalk.grey("•"), "Diffing your files with clean files")
    writeFileSync(join(tmpRepo.name, ".gitignore"), "!/node_modules\n\n")
    git("init")
    git("config", "--local", "user.name", "patch-package")
    git("config", "--local", "user.email", "patch@pack.age")

    // remove ignored files first
    removeIgnoredFiles(tmpRepoPackagePath, includePaths, excludePaths)

    for (const patchDetails of patchesToApplyBeforeDiffing) {
      if (
        !applyPatch({
          patchDetails,
          patchDir,
          patchFilePath: join(appPath, patchDir, patchDetails.patchFilename),
          reverse: false,
          cwd: tmpRepo.name,
        })
      ) {
        // TODO: add better error message once --rebase is implemented
        console.error(
          `Failed to apply patch ${patchDetails.patchFilename} to ${packageDetails.pathSpecifier}`,
        )
        process.exit(1)
      }
    }
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
    // remove patch-package state file
    rimraf(join(tmpRepoPackagePath, STATE_FILE_NAME))

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
      "--src-prefix=a/",
      "--dst-prefix=b/",
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

    // maybe delete existing
    if (!isRebasing && mode.type === "overwrite_last") {
      const prevPatch = patchesToApplyBeforeDiffing[
        patchesToApplyBeforeDiffing.length - 1
      ] as PatchedPackageDetails | undefined
      if (prevPatch) {
        const patchFilePath = join(appPath, patchDir, prevPatch.patchFilename)
        try {
          unlinkSync(patchFilePath)
        } catch (e) {
          // noop
        }
      }
    } else if (!isRebasing && existingPatches.length === 1) {
      // if we are appending to an existing patch that doesn't have a sequence number let's rename it
      const prevPatch = existingPatches[0]
      if (prevPatch.sequenceNumber === undefined) {
        const newFileName = createPatchFileName({
          packageDetails,
          packageVersion,
          sequenceNumber: 1,
          sequenceName: prevPatch.sequenceName ?? "initial",
        })
        const oldPath = join(appPath, patchDir, prevPatch.patchFilename)
        const newPath = join(appPath, patchDir, newFileName)
        renameSync(oldPath, newPath)
        prevPatch.sequenceNumber = 1
        prevPatch.patchFilename = newFileName
        prevPatch.sequenceName = prevPatch.sequenceName ?? "initial"
      }
    }

    const lastPatch = existingPatches[
      state ? state.patches.length - 1 : existingPatches.length - 1
    ] as PatchedPackageDetails | undefined
    const sequenceName =
      mode.type === "append" ? mode.name : lastPatch?.sequenceName
    const sequenceNumber =
      mode.type === "append"
        ? (lastPatch?.sequenceNumber ?? 0) + 1
        : lastPatch?.sequenceNumber

    const patchFileName = createPatchFileName({
      packageDetails,
      packageVersion,
      sequenceName,
      sequenceNumber,
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

    // if we inserted a new patch into a sequence we may need to update the sequence numbers
    if (isRebasing && mode.type === "append") {
      const patchesToNudge = existingPatches.slice(state!.patches.length)
      if (sequenceNumber === undefined) {
        throw new Error("sequenceNumber is undefined while rebasing")
      }
      if (
        patchesToNudge[0]?.sequenceNumber !== undefined &&
        patchesToNudge[0].sequenceNumber <= sequenceNumber
      ) {
        let next = sequenceNumber + 1
        for (const p of patchesToNudge) {
          const newName = createPatchFileName({
            packageDetails,
            packageVersion,
            sequenceName: p.sequenceName,
            sequenceNumber: next++,
          })
          const oldPath = join(appPath, patchDir, p.patchFilename)
          const newPath = join(appPath, patchDir, newName)
          renameSync(oldPath, newPath)
        }
      }
    }

    const prevState: PatchState[] = patchesToApplyBeforeDiffing.map(
      (p): PatchState => ({
        patchFilename: p.patchFilename,
        didApply: true,
        patchContentHash: hashFile(join(appPath, patchDir, p.patchFilename)),
      }),
    )
    const nextState: PatchState[] = [
      ...prevState,
      {
        patchFilename: patchFileName,
        didApply: true,
        patchContentHash: hashFile(patchPath),
      },
    ]

    // if any patches come after this one we just made, we should reapply them
    let didFailWhileFinishingRebase = false
    if (isRebasing) {
      const previouslyUnappliedPatches = existingPatches.slice(
        // if we overwrote a previously failing patch we should not include that in here
        previouslyAppliedPatches!.length +
          (mode.type === "overwrite_last" &&
          !state?.patches[state.patches.length - 1].didApply
            ? 1
            : 0),
      )
      if (previouslyUnappliedPatches.length) {
        console.log(`Fast forwarding...`)
        for (const patch of previouslyUnappliedPatches) {
          const patchFilePath = join(appPath, patchDir, patch.patchFilename)
          if (
            !applyPatch({
              patchDetails: patch,
              patchDir,
              patchFilePath,
              reverse: false,
              cwd: tmpRepo.name,
            })
          ) {
            didFailWhileFinishingRebase = true
            logPatchSequenceError({ patchDetails: patch })
            nextState.push({
              patchFilename: patch.patchFilename,
              didApply: false,
              patchContentHash: hashFile(patchFilePath),
            })
            break
          } else {
            console.log(`  ${chalk.green("✔")} ${patch.patchFilename}`)
            nextState.push({
              patchFilename: patch.patchFilename,
              didApply: true,
              patchContentHash: hashFile(patchFilePath),
            })
          }
        }
      }
    }

    if (isRebasing || numPatchesAfterCreate > 1) {
      savePatchApplicationState({
        packageDetails,
        patches: nextState,
        isRebasing: didFailWhileFinishingRebase,
      })
    } else {
      clearPatchApplicationState(packageDetails)
    }

    if (canCreateIssue) {
      if (createIssue) {
        openIssueCreationLink({
          packageDetails,
          patchFileContents: diffResult.stdout.toString(),
          packageVersion,
        })
      } else {
        maybePrintIssueCreationPrompt(vcs, packageDetails, packageManager)
      }
    }
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    tmpRepo.removeCallback()
  }
}

function createPatchFileName({
  packageDetails,
  packageVersion,
  sequenceNumber,
  sequenceName,
}: {
  packageDetails: PackageDetails
  packageVersion: string
  sequenceNumber?: number
  sequenceName?: string
}) {
  const packageNames = packageDetails.packageNames
    .map((name) => name.replace(/\//g, "+"))
    .join("++")

  const nameAndVersion = `${packageNames}+${packageVersion}`
  const num =
    sequenceNumber === undefined
      ? ""
      : `+${sequenceNumber.toString().padStart(3, "0")}`
  const name = !sequenceName ? "" : `+${sequenceName}`

  return `${nameAndVersion}${num}${name}.patch`
}

export function logPatchSequenceError({
  patchDetails,
}: {
  patchDetails: PatchedPackageDetails
}) {
  console.log(`
${chalk.red.bold("⛔ ERROR")}

Failed to apply patch file ${chalk.bold(patchDetails.patchFilename)}.

If this patch file is no longer useful, delete it and run

  ${chalk.bold(`patch-package`)}
  
Otherwise you should open ${
    patchDetails.path
  }, manually apply the changes from the patch file, and run

  ${chalk.bold(`patch-package ${patchDetails.pathSpecifier}`)}

to update the patch file.
`)
}
