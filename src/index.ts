import { argv } from "process"
import applyPatches from "./applyPatches"
import getAppRootPath from "./getAppRootPath"
import makePatch from "./makePatch"

const appPath = getAppRootPath()
if (argv.length === 2) {
  applyPatches(appPath)
} else {
  const packageNames = [].slice.call(argv, 2)
  packageNames.forEach((packageName: string) => {
    makePatch(packageName, appPath)
  })
}
