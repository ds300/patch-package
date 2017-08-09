import * as tmp from "tmp"
import * as fs from "fs-extra"
import * as rimraf from "rimraf"
import * as path from "path"

import spawnSafe from "../spawnSafe"

export function initTestProject(testProjectName: string) {
  // copy left-pad-breakage repo to temp folder
  const tmpDir = tmp.dirSync({
    unsafeCleanup: true,
  })

  fs.copySync("src/__tests__/test-projects/" + testProjectName, tmpDir.name, {
    recursive: true,
  })

  // remove node_modules if present
  rimraf.sync(path.join(tmpDir.name, "node_modules"))

  // yarn install
  const spawnSync: typeof spawnSafe = (command, args, options?) =>
    spawnSafe(command, args, Object.assign({ cwd: tmpDir.name }, options))

  return {
    path: tmpDir.name,
    spawnSync,
    readFileSync(...parts: string[]) {
      return fs.readFileSync(path.join(tmpDir.name, ...parts)).toString()
    },
    writeFileSync(filePath: string[] | string, data: string) {
      fs.writeFileSync(
        path.join(
          tmpDir.name,
          Array.isArray(filePath) ? path.join(...filePath) : filePath,
        ),
        data,
      )
    },
    install() {
      return spawnSync("yarn", ["install"])
    },
  }
}
