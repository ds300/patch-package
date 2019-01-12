import { join, resolve } from "./path"
import process from "process"
import { existsSync } from "fs-extra"

export const getAppRootPath = (): string => {
  let cwd = process.cwd()
  while (!existsSync(join(cwd, "package.json"))) {
    cwd = resolve(cwd, "../")
  }
  return cwd
}
