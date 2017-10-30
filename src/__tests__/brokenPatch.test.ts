import { initTestProject } from "./testProjects"

describe("patch-package", () => {
  it("complains without windows error when the patch can't be applied on macOS", () => {
    const project = initTestProject("broken-patch-file", "yarn")
    project.install()

    const result = project.runPatchPackage({
      logStdErrOnError: false,
      throwOnError: false,
    })

    expect(result.stderr.toString()).toMatchSnapshot()
  })
})
