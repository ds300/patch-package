import { resolveRelativeFileDependenciesInPackageLock } from "./resolveRelativeFileDependencies"

describe("resolveRelativeFileDependencies", () => {
  it("works for package-lock.json", () => {
    const appRootPath = "/bloo/far"

    const packageLock = {
      dependencies: {
        absolute: {
          otherProperty: "doesn't get touched",
          version: "file:/not-foo/bar",
        },
        relative: { version: "file:../baz" },
        remote: { version: "git+https://blah.com/blah.git" },
        version: { version: "^434.34.34" },
      },
    }
    const expected = {
      dependencies: {
        absolute: {
          otherProperty: "doesn't get touched",
          version: "file:/not-foo/bar",
        },
        relative: { version: "file:/bloo/baz" },
        remote: { version: "git+https://blah.com/blah.git" },
        version: { version: "^434.34.34" },
      },
    }

    expect(
      resolveRelativeFileDependenciesInPackageLock(appRootPath, packageLock),
    ).toEqual(expected)
  })
})
