import chalk from "chalk"
import process from "process"
import dashdash from "dashdash"

import { getAppRootPath } from "./getAppRootPath"
import { join } from "./path"

const appPath = getAppRootPath()

var dashdashOptions = [
  { name: "use-yarn", type: "bool" },
  { name: "create-issue", type: "bool" },
  { name: "case-sensitive-path-filtering", type: "bool" },
  { name: "reverse", type: "bool" },
  { names: ["help", "h"], type: "bool" },
  { names: ["version", "v"], type: "bool" },
  { name: "error-on-fail", type: "bool" },
  { name: "verbose", type: "bool" },
  { name: "debug", type: "bool" },
  { name: "patch-dir", type: "string" },
  { name: "include", type: "string" },
  { name: "exclude", type: "string" },
];

const argv = dashdash.parse({ options: dashdashOptions });

const packageNames = argv._args

console.log(
  chalk.bold("patch-package"),
  // tslint:disable-next-line:no-var-requires
  require(join(__dirname, "../package.json")).version,
)

// used in imported modules
const isDebug = global.patchPackageIsDebug = argv.debug
global.patchPackageIsVerbose = isDebug || argv.verbose

if (isDebug) {
  console.log(`patch-package/index: argv:`)
  console.dir(argv)
}

import { applyPatchesForApp } from "./applyPatches"
import { makePatch } from "./makePatch"
import { makeRegExp } from "./makeRegExp"
import { detectPackageManager } from "./detectPackageManager"
import { normalize, sep } from "path"
import slash = require("slash")
import isCi from "is-ci"

if (argv.version) {
  // noop
} else if (argv.help) {
  printHelp()
} else {
  const patchDir = slash(normalize((argv.patch_dir || "patches") + sep))
  if (patchDir.startsWith("/")) {
    throw new Error("--patch-dir must be a relative path")
  }
  if (packageNames.length) {
    const includePaths = makeRegExp(
      argv.include,
      "include",
      /.*/,
      argv.case_sensitive_path_filtering,
    )
    const excludePaths = makeRegExp(
      argv.exclude,
      "exclude",
      /package\.json$/,
      argv.case_sensitive_path_filtering,
    )
    const packageManager = detectPackageManager(
      appPath,
      argv.use_yarn ? "yarn" : null,
    )
    if (isDebug) {
      console.log(`patch-package/index: packageManager = ${packageManager}`)
    }

    const createIssue = argv.create_issue
    packageNames.forEach((packagePathSpecifier: string) => {
      makePatch({
        packagePathSpecifier,
        appPath,
        packageManager,
        includePaths,
        excludePaths,
        patchDir,
        createIssue,
      })
    })
  } else {
    console.log("Applying patches...")
    const reverse = argv.reverse
    // don't want to exit(1) on postinsall locally.
    // see https://github.com/ds300/patch-package/issues/86
    const shouldExitWithError =
      argv.error_on_fail || isCi || process.env.NODE_ENV === "test"
    applyPatchesForApp({ appPath, reverse, patchDir, shouldExitWithError })
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

  Options:

    ${chalk.bold("--patch-dir <dirname>")}

      Specify the name for the directory in which the patch files are located.
      
    ${chalk.bold("--error-on-fail")}
    
      Forces patch-package to exit with code 1 after failing.
    
      When running locally patch-package always exits with 0 by default.
      This happens even after failing to apply patches because otherwise 
      yarn.lock and package.json might get out of sync with node_modules,
      which can be very confusing.
      
      --error-on-fail is ${chalk.bold("switched on")} by default on CI.
      
      See https://github.com/ds300/patch-package/issues/86 for background.

    ${chalk.bold("--reverse")}
        
      Un-applies all patches.

      Note that this will fail if the patched files have changed since being
      patched. In that case, you'll probably need to re-install 'node_modules'.

      This option was added to help people using CircleCI avoid an issue around caching
      and patch file updates (https://github.com/ds300/patch-package/issues/37),
      but might be useful in other contexts too.
      

  2. Creating patch files
  =======================

    ${chalk.bold("patch-package")} <package-name>${chalk.italic(
    "[ <package-name>]",
  )}

  When given package names as arguments, patch-package will create patch files
  based on any changes you've made to the versions installed by yarn/npm.

  Options:
  
    ${chalk.bold("--create-issue")}
    
       For packages whose source is hosted on GitHub this option opens a web
       browser with a draft issue based on your diff.

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
`)
}
