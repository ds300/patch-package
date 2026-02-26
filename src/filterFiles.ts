import { join } from "./path"
import { rmSync } from "fs"
import klawSync from "klaw-sync"

export function removeIgnoredFiles(
  dir: string,
  includePaths: RegExp,
  excludePaths: RegExp,
) {
  klawSync(dir, { nodir: true })
    .map((item) => item.path.slice(`${dir}/`.length))
    .filter(
      (relativePath) =>
        !relativePath.match(includePaths) || relativePath.match(excludePaths),
    )
    .forEach((relativePath) => rmSync(join(dir, relativePath), { force: true }))
}
