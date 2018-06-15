import * as fs from "fs-extra"
import { join } from "./path"

function _getPatchFiles(
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
      _getPatchFiles(rootPatchesDir, filename, acc)
    }
  })
  return acc
}

export function getPatchFiles(patchesDir: string) {
  return _getPatchFiles(patchesDir).filter(filename =>
    filename.match(/^.+(:|\+).+\.patch$/),
  )
}
