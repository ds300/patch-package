import { join, resolve } from "./path"
import process from "process"
import { AppPath } from "./applyPatches"
import { existsSync } from "fs-extra"

export const getAppRootPath = (): AppPath => {
  let cwd = process.cwd()
  while (!existsSync(join(cwd, "package.json"))) {
    cwd = resolve(cwd, "../")
  }
  return cwd as AppPath
}
