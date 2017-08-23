import spawnSync from "../spawnSafe"
import { patchPackageTarballPath } from "./testProjects"
import * as fs from "fs"
import * as path from "path"

import * as tmp from "tmp"

describe("patch-package", () => {
  const patchPackageBin = "./node_modules/.bin/patch-package"
  it("should produce patches which can be applied with yarn", () => {
    // create temp dir
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })

    // create package json
    fs.writeFileSync(
      path.join(tmpDir.name, "package.json"),
      `
    {
      "name": "test",
      "private": true,
      "dependencies": {
        "patch-package": "file:${patchPackageTarballPath}",
        "left-pad": "1.1.3"
      },
      "scripts": {
        "prepare": "patch-package"
      }
    }
    `,
    )

    const tmpSpawn = (command: string, args: string[]) =>
      spawnSync(command, args, { cwd: tmpDir.name })

    // install
    tmpSpawn("yarn", ["install"])

    // mutate
    const leftPadPath = path.join(tmpDir.name, "node_modules/left-pad/index.js")
    const mutatedLeftPadSource = fs
      .readFileSync(leftPadPath)
      .toString()
      .replace(/pad/g, "yarn")

    fs.writeFileSync(leftPadPath, mutatedLeftPadSource)

    // make patch
    tmpSpawn(patchPackageBin, ["left-pad"])

    // snapshot it
    const patchContents = fs
      .readFileSync(path.join(tmpDir.name, "patches/left-pad+1.1.3.patch"))
      .toString()

    expect(patchContents).toMatchSnapshot()

    // remove node_modules
    tmpSpawn("rm", ["-rf", "node_modules"])

    // run yarn
    tmpSpawn("yarn", ["install"])

    // check that the file was patched
    expect(fs.readFileSync(leftPadPath).toString()).toEqual(
      mutatedLeftPadSource,
    )
  })

  it("should produce patches which can be applied with npm", () => {
    // make sure we're using npm >= 5
    if (spawnSync("npm", ["--version"]).stdout.toString()[0] !== "5") {
      throw new Error("npm 5 is required to run npm tests")
    }
    // make sure it's installed
    spawnSync("yarn", ["link"])

    // create temp dir
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })

    // create package json
    fs.writeFileSync(
      path.join(tmpDir.name, "package.json"),
      `
    {
      "name": "test",
      "private": true,
      "dependencies": {
        "patch-package": "file:${patchPackageTarballPath}",
        "left-pad": "1.1.3"
      },
      "scripts": {
        "prepare": "patch-package"
      }
    }
    `,
    )

    const tmpSpawn = (command: string, args: string[]) =>
      spawnSync(command, args, { cwd: tmpDir.name })

    // install
    tmpSpawn("npm", ["install"])

    // mutate
    const leftPadPath = path.join(tmpDir.name, "node_modules/left-pad/index.js")
    const mutatedLeftPadSource = fs
      .readFileSync(leftPadPath)
      .toString()
      .replace(/pad/g, "npm")

    fs.writeFileSync(leftPadPath, mutatedLeftPadSource)

    // make patch
    tmpSpawn(patchPackageBin, ["left-pad"])

    // snapshot it
    const patchContents = fs
      .readFileSync(path.join(tmpDir.name, "patches/left-pad+1.1.3.patch"))
      .toString()

    expect(patchContents).toMatchSnapshot()

    // remove node_modules
    tmpSpawn("rm", ["-rf", "node_modules"])

    // run yarn
    tmpSpawn("npm", ["install"])

    // check that the file was patched
    expect(fs.readFileSync(leftPadPath).toString()).toEqual(
      mutatedLeftPadSource,
    )
  })
})
