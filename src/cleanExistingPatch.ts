import { join, relative } from "./path"
import * as fs from "fs"
import { getPatchFiles } from "./patchFs"
import { green } from "chalk"

export const cleanExistingPatch = (appPath: string, packageName: string) => {
  const patchesDir = join(appPath, "patches")

  if (!fs.existsSync(patchesDir)) {
    fs.mkdirSync(patchesDir)
  } else {
    // remove exsiting patch for this package, if any
    getPatchFiles(patchesDir).forEach(fileName => {
      if (
        fileName.startsWith(packageName + ":") ||
        fileName.startsWith(packageName + "+")
      ) {
        console.info(
          green("☑"),
          "Removing existing",
          relative(process.cwd(), join(patchesDir, fileName)),
        )
        fs.unlinkSync(join(patchesDir, fileName))
      }
    })
  }
}
