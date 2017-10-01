import spawnSync from "../spawnSafe"
import { patchPackageTarballPath } from "./testProjects"
import * as fs from "fs-extra"
import * as path from "../path"

import * as tmp from "tmp"

describe("patch-package", () => {
  it("should be able to apply patch files even if the git root is different to the project root", () => {
    // create repo
    const repo = tmp.dirSync({ unsafeCleanup: true })
    spawnSync("git", ["init"], { cwd: repo.name })
    // make subfolder for app
    const appPath = path.join(repo.name, "subproject")
    // create app
    fs.copySync(
      path.join(__dirname, "test-projects", "left-pad-breakage"),
      appPath,
      { recursive: true, overwrite: true },
    )
    // install pp and everything
    spawnSync("yarn", ["add", "file:" + patchPackageTarballPath], {
      cwd: appPath,
    })
    spawnSync("yarn", ["install"], { cwd: appPath })

    // make sure file got patched
    const leftPadContents = fs
      .readFileSync(path.join(appPath, "node_modules/left-pad/index.js"))
      .toString()

    expect(leftPadContents.includes("patch-package")).toBe(true)
  })
})
