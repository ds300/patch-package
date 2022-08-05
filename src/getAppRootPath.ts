import { join, resolve } from "./path"
import { existsSync } from "fs-extra"
import { realpathCwd } from "./realpathCwd"

export const getAppRootPath = (): string => {
  let cwd = realpathCwd().replace("\\", "/")
  while (!existsSync(join(cwd, "package.json"))) {
    const up = resolve(cwd, "../").replace("\\", "/")
    if (up === cwd) {
      throw new Error("no package.json found for this project")
    }
    cwd = up
  }
  return cwd
}
