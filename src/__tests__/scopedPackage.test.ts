import { initTestProject } from "./testProjects"

describe("patch-package", () => {
  const project = initTestProject("scoped-package")
  project.install()

  it("applies patches to scoped packages", () => {
    const typingsContent = project.readFileSync(
      "node_modules",
      "@types",
      "left-pad",
      "index.d.ts",
    )

    expect(typingsContent.includes("patch-package")).toBe(true)
  })

  it("creates patches for scoped packages", () => {
    project.writeFileSync(
      ["node_modules", "@types", "lodash", "add.d.ts"],
      `import { add } from "./index";
export = patch-package;`,
    )
    project.spawnSync("yarn", ["patch-package", "@types/lodash"])
    expect(project.readFileSync("patches", "@types", "lodash+4.14.72.patch"))
  })
})
