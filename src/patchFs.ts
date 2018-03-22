import * as fs from "fs-extra"
import * as path from "./path"
import * as tmp from "tmp"

function _getPatchFiles(
  rootPatchesDir: string,
  scopedDir: string = "",
  acc: string[] = [],
) {
  fs.readdirSync(path.join(rootPatchesDir, scopedDir)).forEach(filename => {
    if (filename.endsWith(".patch")) {
      acc.push(path.join(scopedDir, filename))
    } else if (
      filename.startsWith("@") &&
      fs.statSync(path.join(rootPatchesDir, filename)).isDirectory()
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

export function removeGitHeadersFromSource(patchFileSource: string) {
  return patchFileSource
    .split(/\r?\n/)
    .filter(line => !line.startsWith("diff") && !line.startsWith("index"))
    .join("\n")
}

export function removeGitHeadersFromPath(patchFilePath: string): string {
  const tmpFile = tmp.fileSync({ unsafeCleanup: true })
  fs.writeFileSync(
    tmpFile.name,
    removeGitHeadersFromSource(fs.readFileSync(patchFilePath).toString()),
  )
  return tmpFile.name
}
