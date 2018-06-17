import { bold, green, italic } from "chalk"
import * as process from "process"
import * as minimist from "minimist"

import { applyPatchesForApp } from "./applyPatches"
import { getAppRootPath } from "./getAppRootPath"
import { makePatch } from "./makePatch"
import { makeRegExp } from "./makeRegExp"
import { detectPackageManager } from "./detectPackageManager"
import { createTempDirectory } from "./createTempDirectory"
import { preparePackageJson } from "./preparePackageJson"
import { cleanExistingPatch } from "./cleanExistingPatch"

const appPath = getAppRootPath()
const argv = minimist(process.argv.slice(2), {
  boolean: ["use-yarn", "case-sensitive-path-filtering", "reverse"],
})
const packageNames = argv._

if (argv.help || argv.h) {
  printHelp()
} else {
  console.info(green("☑"), "Creating temporary folder")
  const tempDirectory = createTempDirectory()
  const tempDirectoryPath = tempDirectory.name

  try {
    const packageManager = detectPackageManager(
      appPath,
      argv["use-yarn"] ? "yarn" : null,
    )

    preparePackageJson(appPath, tempDirectoryPath)

    if (packageNames.length) {
      const include = makeRegExp(
        argv.include,
        "include",
        /.*/,
        argv["case-sensitive-path-filtering"],
      )
      const exclude = makeRegExp(
        argv.exclude,
        "exclude",
        /package\.json$/,
        argv["case-sensitive-path-filtering"],
      )
      packageNames.forEach((packageName: string) => {
        cleanExistingPatch(appPath, packageName)
        makePatch(
          packageName,
          appPath,
          packageManager,
          include,
          exclude,
          tempDirectoryPath,
        )
      })
    } else {
      console.log("patch-package: Applying patches...")
      applyPatchesForApp(appPath, !!argv["reverse"])
    }
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    tempDirectory.removeCallback()
  }
}

function printHelp() {
  console.log(`
Usage:

  1. Patching packages
  ====================

    ${bold("patch-package")}

  Without arguments, the ${bold(
    "patch-package",
  )} command will attempt to find and apply
  patch files to your project. It looks for files named like

     ./patches/<package-name>+<version>.patch

  2. Creating patch files
  =======================

    ${bold("patch-package")} <package-name>${italic("[ <package-name>]")}

  When given package names as arguments, patch-package will create patch files
  based on any changes you've made to the versions installed by yarn/npm.

  Options:

     ${bold("--use-yarn")}

         By default, patch-package checks whether you use npm or yarn based on
         which lockfile you have. If you have both, it uses npm by default.
         Set this option to override that default and always use yarn.

     ${bold("--exclude <regexp>")}

         Ignore paths matching the regexp when creating patch files.
         Paths are relative to the root dir of the package to be patched.

         Default: 'package\\.json$'

     ${bold("--include <regexp>")}

         Only consider paths matching the regexp when creating patch files.
         Paths are relative to the root dir of the package to be patched.

         Default '.*'

     ${bold("--case-sensitive-path-filtering")}

         Make regexps used in --include or --exclude filters case-sensitive.
`)
}
