import { initTestProject } from "./testProjects"

describe("patch-package", () => {
  // copy left-pad-breakage repo to temp folder
  const project = initTestProject("left-pad-breakage")

  project.install()

  function patchWasApplied() {
    return project
      .readFileSync("node_modules", "left-pad", "index.js")
      .includes("patch-package")
  }

  // assert patch was applied to 1.1.1
  it("definitely applies patches", () => {
    expect(patchWasApplied()).toBe(true)
  })
  // bump version to 1.1.2
  it("gives a warning when the patch is applied successfully but the version changed", () => {
    expect(
      project.spawnSync("yarn", ["add", "left-pad@1.1.2"]).stderr.toString(),
    ).toMatchSnapshot()

    expect(patchWasApplied()).toBe(true)
  })
  // bump version to 1.1.3
  it("raises an error when the patch is applied", () => {
    const result = project.spawnSync("yarn", ["add", "left-pad@1.1.3"], {
      logStdErrOnError: false,
      throwOnError: false,
    })
    expect(result.stderr.toString()).toMatchSnapshot()
    expect(patchWasApplied()).toBe(false)
  })
})
