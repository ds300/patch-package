import { join } from "./path"
import { removeSync } from "fs-extra"
import klawSync from "klaw-sync"

export function removeIgnoredFiles(
  dir: string,
  includePaths: RegExp,
  excludePaths: RegExp,
) {
  klawSync(dir, { nodir: true })
    .map(item => item.path.slice(`${dir}/`.length))
    .filter(
      relativePath =>
        !relativePath.match(includePaths) || relativePath.match(excludePaths),
    )
    .forEach(relativePath => removeSync(join(dir, relativePath)))
}
