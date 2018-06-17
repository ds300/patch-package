import { PackageJsonBuilder } from "./PackageJsonBuilder"

describe("Builder without base path", () => {
  ;[
    // type,          input,                            expected
    ["version", "^434.34.34", "^434.34.34"],
    [
      "git repo",
      "git+https://blah.com/blah.git",
      "git+https://blah.com/blah.git",
    ],
    ["relative path", "file:../baz", "file:../baz"],
    ["absolute path", "file:/not-foo/bar", "file:/not-foo/bar"],
  ].map(testData => {
    it(`handles dependencies with ${testData[0]}`, () => {
      const expected = {
        dependency: testData[2],
      }

      expect(
        new PackageJsonBuilder()
          .withDependency("dependency", testData[1])
          .build().dependencies,
      ).toEqual(expected)
    })

    it(`handles dev dependencies with ${testData[0]}`, () => {
      const expected = {
        dependency: testData[2],
      }

      expect(
        new PackageJsonBuilder()
          .withDevDependency("dependency", testData[1])
          .build().devDependencies,
      ).toEqual(expected)
    })
  })
})

describe("Builder with base path", () => {
  ;[
    ["version", "^434.34.34", "^434.34.34"],
    [
      "git repo",
      "git+https://blah.com/blah.git",
      "git+https://blah.com/blah.git",
    ],
    ["relative path", "file:../baz", "file:/foo/baz"],
    ["absolute path", "file:/not-foo/bar", "file:/not-foo/bar"],
  ].map(testData => {
    it(`handles dependencies with ${testData[0]}`, () => {
      const expected = {
        dependency: testData[2],
      }

      expect(
        new PackageJsonBuilder()
          .withDependency("dependency", testData[1])
          .relativeTo("/foo/bar")
          .build().dependencies,
      ).toEqual(expected)
    })

    it(`handles dev dependencies with ${testData[0]}`, () => {
      const expected = {
        dependency: testData[2],
      }

      expect(
        new PackageJsonBuilder()
          .withDevDependency("dependency", testData[1])
          .relativeTo("/foo/bar")
          .build().devDependencies,
      ).toEqual(expected)
    })
  })
})
