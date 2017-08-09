import spawnSync from "../spawnSafe"
import * as tmp from "tmp"
import * as path from "path"
import * as fs from "fs-extra"
import * as rimraf from "rimraf"

// make sure patch-package is installed
spawnSync("yarn", ["link"])

describe("patch-package", () => {
  // copy left-pad-breakage repo to temp folder
  const tmpDir = tmp.dirSync({ unsafeCleanup: true })

  function patchWasApplied() {
    return fs
      .readFileSync(path.join(tmpDir.name, "node_modules/left-pad/index.js"))
      .toString()
      .includes("patch-package")
  }

  fs.copySync("src/__tests__/test-projects/left-pad-breakage", tmpDir.name, {
    recursive: true,
  })

  // remove node_modules if present
  rimraf.sync(path.join(tmpDir.name, "node_modules"))

  // yarn install
  const tmpSpawn: typeof spawnSync = (command, args, options?) =>
    spawnSync(command, args, Object.assign({ cwd: tmpDir.name }, options))
  tmpSpawn("yarn", ["install"])

  // assert patch was applied to 1.1.1
  it("definitely applies patches", () => {
    expect(patchWasApplied()).toBe(true)
  })
  // bump version to 1.1.2
  it("gives a warning when the patch is applied successfully but the version changed", () => {
    expect(
      tmpSpawn("yarn", ["add", "left-pad@1.1.2"]).stderr.toString(),
    ).toMatchSnapshot()

    expect(patchWasApplied()).toBe(true)
  })
  // bump version to 1.1.3
  it("raises an error when the patch is applied", () => {
    const result = tmpSpawn("yarn", ["add", "left-pad@1.1.3"], {
      logStdErrOnError: false,
      throwOnError: false,
    })
    expect(result.stderr.toString()).toMatchSnapshot()
    expect(patchWasApplied()).toBe(false)
  })
})
