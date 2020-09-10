import chalk from "chalk"
import process from "process"
import minimist from "minimist"

import { applyPatchesForApp } from "./applyPatches"
import { getAppRootPath } from "./getAppRootPath"
import { makePatch } from "./makePatch"
import { makeRegExp } from "./makeRegExp"
import { detectPackageManager } from "./detectPackageManager"
import { join } from "./path"
import { normalize, sep } from "path"
import slash = require("slash")

const appPath = getAppRootPath()
const argv = minimist(process.argv.slice(2), {
  boolean: [
    "use-yarn",
    "case-sensitive-path-filtering",
    "reverse",
    "help",
    "version",
    "git-ignore",
  ],
  string: ["patch-dir"],
})
const packageNames = argv._

console.log(
  chalk.bold("patch-package"),
  // tslint:disable-next-line:no-var-requires
  require(join(__dirname, "../package.json")).version,
)

if (argv.version || argv.v) {
  // noop
} else if (argv.help || argv.h) {
  printHelp()
} else {
  const patchDir = slash(normalize((argv["patch-dir"] || "patches") + sep))
  if (patchDir.startsWith("/")) {
    throw new Error("--patch-dir must be a relative path")
  }
  if (packageNames.length) {
    const includePaths = makeRegExp(
      argv.include,
      "include",
      /.*/,
      argv["case-sensitive-path-filtering"],
    )
    const excludePaths = makeRegExp(
      argv.exclude,
      "exclude",
      /package\.json$/,
      argv["case-sensitive-path-filtering"],
    )
    const packageManager = detectPackageManager(
      appPath,
      argv["use-yarn"] ? "yarn" : null,
    )
    const gitignore = argv["git-ignore"]
    packageNames.forEach((packagePathSpecifier: string) => {
      makePatch({
        packagePathSpecifier,
        appPath,
        packageManager,
        includePaths,
        excludePaths,
        patchDir,
        gitignore,
      })
    })
  } else {
    console.log("Applying patches...")
    const reverse = !!argv["reverse"]
    applyPatchesForApp({ appPath, reverse, patchDir })
  }
}

function printHelp() {
  console.log(`
Usage:

  1. Patching packages
  ====================

    ${chalk.bold("patch-package")}

  Without arguments, the ${chalk.bold(
    "patch-package",
  )} command will attempt to find and apply
  patch files to your project. It looks for files named like

     ./patches/<package-name>+<version>.patch

  2. Creating patch files
  =======================

    ${chalk.bold("patch-package")} <package-name>${chalk.italic(
    "[ <package-name>]",
  )}

  When given package names as arguments, patch-package will create patch files
  based on any changes you've made to the versions installed by yarn/npm.

  Options:

     ${chalk.bold("--use-yarn")}

         By default, patch-package checks whether you use npm or yarn based on
         which lockfile you have. If you have both, it uses npm by default.
         Set this option to override that default and always use yarn.

     ${chalk.bold("--exclude <regexp>")}

         Ignore paths matching the regexp when creating patch files.
         Paths are relative to the root dir of the package to be patched.

         Default: 'package\\.json$'

     ${chalk.bold("--include <regexp>")}

         Only consider paths matching the regexp when creating patch files.
         Paths are relative to the root dir of the package to be patched.

         Default '.*'

     ${chalk.bold("--case-sensitive-path-filtering")}

         Make regexps used in --include or --exclude filters case-sensitive.

     ${chalk.bold("--patch-dir")}

         Specify the name for the directory in which to put the patch files.

     ${chalk.bold("--git-ignore")}

         By default, patch-package creates patches disregarding your git-ignore
         settings. Set this option to exclude git-ignored files from patches.

`)
}
