import { initTestProject } from "./testProjects"

describe("patch-package", () => {
  const project = initTestProject("shrinkwrap", "npm")
  project.install()

  it("works with npm shrinkwrap", () => {
    const leftPadSource = project.readFileSync("node_modules", "left-pad", "index.js")

    expect(leftPadSource.includes("patch-package")).toBe(true)
  })
})
