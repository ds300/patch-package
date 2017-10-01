import * as tmp from "tmp"
import * as fs from "fs-extra"
import * as rimraf from "rimraf"
import * as path from "../path"

import spawnSafe, { SpawnSafeOptions } from "../spawnSafe"

export const patchPackageTarballPath = path.resolve(
  fs
    .readdirSync(".")
    .filter(nm => nm.match(/^patch-package\.test\.\d+\.tgz$/))[0],
)

export function initTestProject(
  testProjectName: string,
  packageManager: "yarn" | "npm" = "yarn",
) {
  // copy left-pad-breakage repo to temp folder
  const tmpDir = tmp.dirSync({
    unsafeCleanup: true,
  })

  fs.copySync("src/__tests__/test-projects/" + testProjectName, tmpDir.name, {
    recursive: true,
  })

  // remove node_modules if present
  rimraf.sync(path.join(tmpDir.name, "node_modules"))

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
    runPatchPackage(options?: SpawnSafeOptions) {
      if (packageManager === "yarn") {
        return spawnSync("yarn", ["patch-package"], options)
      } else {
        return spawnSync("./node_modules/.bin/patch-package", [], options)
      }
    },
    install(options?: SpawnSafeOptions) {
      if (packageManager === "yarn") {
        spawnSync("yarn", ["add", "file:" + patchPackageTarballPath], options)
        return spawnSync("yarn", ["install"], options)
      } else {
        spawnSync("npm", ["i"], options)
        return spawnSync(
          "npm",
          ["i", "file:" + patchPackageTarballPath],
          options,
        )
      }
    },
  }
}
