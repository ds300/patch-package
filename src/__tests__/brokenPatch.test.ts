import { initTestProject } from "./testProjects"
import { env } from "process"

describe("patch-package", () => {
  it("complains with windows error when the patch can't be applied on windows", () => {
    const project = initTestProject("broken-patch-file", "yarn")
    project.install()

    const result = project.runPatchPackage({
      env: Object.assign({}, env, { PATCH_PACKAGE_TEST_WINDOWS: "yes" }),
      logStdErrOnError: false,
      throwOnError: false,
    })

    expect(result.stderr.toString()).toMatchSnapshot()
  })
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
