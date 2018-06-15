import * as fs from "fs"
import { join, resolve } from "./path"
import * as process from "process"
import { AppPath } from "./applyPatches"

export const getAppRootPath = (): AppPath => {
  let cwd = process.cwd()
  while (!fs.existsSync(join(cwd, "package.json"))) {
    cwd = resolve(cwd, "../")
  }
  return cwd as AppPath
}
