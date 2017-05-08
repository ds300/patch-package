import { argv } from "process"
import applyPatch from "./applyPatch"
import findPatches from "./findPatches"
import getAppRootPath from "./getAppRootPath"
import makePatch from "./makePatch"

const appPath = getAppRootPath()
if (argv.length === 2) {
  console.log("Applying patches...")
  findPatches(appPath)
    .forEach(({ patchFilePath, packageName }) => {
      applyPatch(patchFilePath, packageName)
    })
} else {
  console.log("Making patches")
  const packageNames = [].slice.call(argv, 2)
  packageNames.forEach((packageName: string) => {
    makePatch(packageName, appPath)
  })
}
