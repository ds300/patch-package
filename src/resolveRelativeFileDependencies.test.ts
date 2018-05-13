import {
  resolveRelativeFileDependenciesInPackageJson,
  resolveRelativeFileDependenciesInPackageLock,
} from "./resolveRelativeFileDependencies"

describe("resolveRelativeFileDependencies", () => {
  it("works for package.json", () => {
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
      resolveRelativeFileDependenciesInPackageJson(
        appRootPath,
        JSON.parse(JSON.stringify(packageJson)),
      ),
    ).toEqual(expected)
  })
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
