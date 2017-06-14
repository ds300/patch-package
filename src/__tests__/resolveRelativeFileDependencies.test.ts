import resolveRelativeFileDependencies from "../resolveRelativeFileDependencies"

describe("resolveRelativeFileDependencies", () =>
  it("works", () => {
    const appRootPath = "/foo/bar"

    const packageJson = {
      dependencies: {
        absolute: "file:/not-foo/bar",
        relative: "file:../baz",
        remote: "git+https://blah.com/blah.git",
        version: "^434.34.34",
      },
      devDependencies: {
        absolute: "file:/not-foo/bar",
        relative: "file:../baz",
        remote: "git+https://blah.com/blah.git",
        version: "^434.34.34",
      },
    }

    const expected = {
      dependencies: {
        absolute: "file:/not-foo/bar",
        relative: "file:/foo/baz",
        remote: "git+https://blah.com/blah.git",
        version: "^434.34.34",
      },
      devDependencies: {
        absolute: "file:/not-foo/bar",
        relative: "file:/foo/baz",
        remote: "git+https://blah.com/blah.git",
        version: "^434.34.34",
      },
    }

    expect(
      resolveRelativeFileDependencies(
        appRootPath,
        JSON.parse(JSON.stringify(packageJson)),
      ),
    ).toEqual(expected)
  }))
