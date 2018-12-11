import * as fs from "fs-extra"
import { join, relative } from "./path"

function _getPatchFiles(
  currentPatchesDir: string,
  scopedDir: string = "",
  acc: string[] = [],
  rootPatchesDir: string,
) {
  fs.readdirSync(join(currentPatchesDir, scopedDir)).forEach(filename => {
    if (filename.endsWith(".patch")) {
      acc.push(
        relative(rootPatchesDir, join(currentPatchesDir, scopedDir, filename)),
      )
    } else if (fs.statSync(join(currentPatchesDir, filename)).isDirectory()) {
      _getPatchFiles(join(currentPatchesDir, filename), "", acc, rootPatchesDir)
    }
  })
  return acc
}

export const getPatchFiles = (patchesDir: string) => {
  return _getPatchFiles(patchesDir, undefined, [], patchesDir).filter(
    filename => filename.match(/^.+(:|\+).+\.patch$/),
  )
}
