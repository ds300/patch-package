import * as fs from "fs-extra"
import { join } from "./path"

function _getPatchFilesLegacy(
  rootPatchesDir: string,
  scopedDir: string = "",
  acc: string[] = [],
) {
  fs.readdirSync(join(rootPatchesDir, scopedDir)).forEach(filename => {
    if (filename.endsWith(".patch")) {
      acc.push(join(scopedDir, filename))
    } else if (
      filename.startsWith("@") &&
      fs.statSync(join(rootPatchesDir, filename)).isDirectory()
    ) {
      _getPatchFilesLegacy(rootPatchesDir, filename, acc)
    }
  })
  return acc
}

export const getPatchFiles = (patchesDir: string) => {
  return _getPatchFilesLegacy(patchesDir).filter(filename =>
    filename.match(/^.+(:|\+).+\.patch$/),
  )
}

// /patches
// /patches/@types~patch-package+4.3.5.patch
// /patches/@types~patch-package+4.3.5=>@types~banana+2.4.3.patch
