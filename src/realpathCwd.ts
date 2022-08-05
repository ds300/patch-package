import fs from "fs"
import process from "process"

export const realpathCwd = (): string => {
  return fs.realpathSync(process.cwd())
}
