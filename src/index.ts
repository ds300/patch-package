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
import { isCI } from "ci-info"

const appPath = getAppRootPath()
const argv = minimist(process.argv.slice(2), {
  boolean: [
    "use-yarn",
    "case-sensitive-path-filtering",
    "reverse",
    "help",
    "version",
    "error-on-fail",
    "error-on-warn",
    "create-issue",
    "ignore-missing",
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
      /^package\.json$/,
      argv["case-sensitive-path-filtering"],
    )
    const packageManager = detectPackageManager(
      appPath,
      argv["use-yarn"] ? "yarn" : null,
    )
    const createIssue = argv["create-issue"]
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
    const reverse = !!argv["reverse"]
    // don't want to exit(1) on postinstall locally.
    // see https://github.com/ds300/patch-package/issues/86
    const shouldExitWithError =
      !!argv["error-on-fail"] ||
      (process.env.NODE_ENV === "production" && isCI) ||
      (isCI && !process.env.PATCH_PACKAGE_INTEGRATION_TEST) ||
      process.env.NODE_ENV === "test"

    const shouldExitWithWarning = !!argv["error-on-warn"]

    const ignoreMissing =
      !!argv["ignore-missing"] || !!process.env.PATCH_PACKAGE_IGNORE_MISSING

    applyPatchesForApp({
      appPath,
      reverse,
      patchDir,
      shouldExitWithError,
      shouldExitWithWarning,
      ignoreMissing,
    })
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
      
    ${chalk.bold("--error-on-warn")}
    
      Forces patch-package to exit with code 1 after warning.
      
      See https://github.com/ds300/patch-package/issues/314 for background.

    ${chalk.bold("--reverse")}
        
      Un-applies all patches.

      Note that this will fail if the patched files have changed since being
      patched. In that case, you'll probably need to re-install 'node_modules'.

      This option was added to help people using CircleCI avoid an issue around caching
      and patch file updates (https://github.com/ds300/patch-package/issues/37),
      but might be useful in other contexts too.
      
    ${chalk.bold("--ignore-missing")}

      Ignores patches for packages that are not present in node_modules.
      This is useful when working with monorepos and wanting to install sub-packages
      separately from the root package, with pruned dependencies.

      This option is can also be set via the environment variable
      PATCH_PACKAGE_IGNORE_MISSING=1. Setting this env variable during the deployment
      build process is recommended instead of using the --ignore-missing command option
      when we want to ignore missing packages during deployment (of a monorepo with
      pruned dependencies), but ensure we fail loudly during development if any
      dependencies are moved or removed without updating the patches accordingly.

      See https://github.com/ds300/patch-package/issues/339 for background.


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
