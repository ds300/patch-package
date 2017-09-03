import * as fs from "fs-extra"
import * as path from "path"
import * as tmp from "tmp"
import * as slash from "slash"

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
  return _getPatchFiles(patchesDir)
}

function relativeToGitRoot(
  gitRoot: string,
  appRoot: string,
  filePath: string,
): string {
  return slash(path.relative(gitRoot, path.resolve(appRoot, filePath)))
}

// only exported for testing
export function resolvePathsInPatchFile(
  gitRoot: string,
  appRoot: string,
  patchFileContents: string,
): string {
  // only need to replace lines starting with `---` and `+++` since
  // git ignores lines starting with `diff`
  return patchFileContents
    .split("\n")
    .map(line => {
      if (line.startsWith("+++") || line.startsWith("---")) {
        return (
          line.slice(0, 6) + relativeToGitRoot(gitRoot, appRoot, line.slice(6))
        )
      } else {
        return line
      }
    })
    .join("\n")
}

export function temporarilyResolvePathsAgainstGitRoot(
  gitRootPath: string,
  appRootPath: string,
  patchFilePath: string,
): string {
  const existingPatchFileContents = fs.readFileSync(patchFilePath).toString()
  const resolvedPatchFileContents = resolvePathsInPatchFile(
    gitRootPath,
    appRootPath,
    existingPatchFileContents,
  )

  const tmpFile = tmp.fileSync({ unsafeCleanup: true })
  fs.writeFileSync(tmpFile.name, resolvedPatchFileContents)
  return tmpFile.name
}
