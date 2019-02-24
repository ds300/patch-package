import { resolveRelativeFileDependencies } from "./resolveRelativeFileDependencies"

describe("resolveRelativeFileDependencies", () => {
  it("works for package.json", () => {
    const appRootPath = "/foo/bar"

    const resolutions = {
      absolute: "file:/not-foo/bar",
      relative: "file:../baz",
      remote: "git+https://blah.com/blah.git",
      version: "^434.34.34",
    }

    const expected = {
      absolute: "file:/not-foo/bar",
      relative: "file:/foo/baz",
      remote: "git+https://blah.com/blah.git",
      version: "^434.34.34",
    }

    expect(
      resolveRelativeFileDependencies(
        appRootPath,
        JSON.parse(JSON.stringify(resolutions)),
      ),
    ).toEqual(expected)
  })
})
