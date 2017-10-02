import { bold, italic } from "chalk"
import * as process from "process"
import * as minimist from "minimist"

import applyPatches from "./applyPatches"
import getAppRootPath from "./getAppRootPath"
import patchYarn from "./patchYarn"
import makePatch from "./makePatch"
import makeRegExp from "./makeRegExp"
import detectPackageManager from "./detectPackageManager"

const appPath = getAppRootPath()
const argv = minimist(process.argv.slice(2), {
  boolean: ["use-yarn", "patch-yarn", "case-sensitive-path-filtering"],
})
const packageNames = argv._

if (argv.help || argv.h) {
  printHelp()
} else {
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
      /^$/,
      argv["case-sensitive-path-filtering"],
    )
    packageNames.forEach((packageName: string) => {
      makePatch(
        packageName,
        appPath,
        detectPackageManager(appPath, argv["use-yarn"] ? "yarn" : null),
        include,
        exclude,
      )
    })
  } else {
    console.log("patch-package: Applying patches...")
    if (argv["patch-yarn"]) {
      patchYarn(appPath)
    }
    applyPatches(appPath)
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

  Options:

     ${bold("--patch-yarn")}

         If you have a local copy of yarn installed for the project, this
         option causes it to be patched so that it runs the 'prepare'
         lifecycle hook after \`yarn remove\`.

         See https://github.com/ds300/patch-package#why-patch-yarn

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

     ${bold("--include <regexp>")}

         Only consider paths matching the regexp when creating patch files.
         Paths are relative to the root dir of the package to be patched.

     ${bold("--case-sensitive-path-filtering")}

         Make regexps used in --include or --exclude filters case-sensitive.
`)
}
