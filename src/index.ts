import { bold, cyan, italic } from "chalk"
import { argv } from "process"
import applyPatches from "./applyPatches"
import getAppRootPath from "./getAppRootPath"
import makePatch from "./makePatch"

const appPath = getAppRootPath()
if (argv.length === 2) {
  applyPatches(appPath)
} else {
  const packageNames = [].slice.call(argv, 2)
  if (packageNames.indexOf("--help") > -1 || packageNames.indexOf("-h") > -1) {
    printHelp()
  } else {
    packageNames.forEach((packageName: string) => {
      makePatch(packageName, appPath)
    })
  }
}

function printHelp() {
  console.log(`
Usage:

    ${bold("patch-package")}${italic("[ <package-name>]")}


  Without arguments, the ${bold("patch-package")} command will attempt to find and apply
  patch files to your project. It looks for files named like

     ./patches/<package-name>:<version>.patch

  When given package names as arguments, patch-package will create patch files
  based on any changes you've made to the version installed by yarn/npm.

  Add the following to your package.json to ensure that these patches are
  gracefully applied whenever yarn or npm make changes to node_modules:

    "scripts": {
      "prepare": "patch-package"
    }
`)
}
