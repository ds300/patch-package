import { getPackageVersion } from "./getPackageVersion"

describe("getPackageVersion", () => {
  beforeEach(() => {
    jest.resetModules()
  })

  const packagePath = "../package.json"

  it("should return version without change when already valid", () => {
    const packageJSON = {
      version: "1.2.3",
    }
    jest.mock(packagePath, () => {
      return packageJSON
    })

    const expected = "1.2.3"

    expect(getPackageVersion(packagePath)).toEqual(expected)
  })

  it("should return version with prefix", () => {
    const packageJSON = {
      version: "v1.2.3",
    }
    jest.mock(packagePath, () => {
      return packageJSON
    })

    const expected = "v1.2.3"

    expect(getPackageVersion(packagePath)).toEqual(expected)
  })

  it("should return invalid version without change", () => {
    const packageJSON = {
      version: "a.b.c",
    }
    jest.mock(packagePath, () => {
      return packageJSON
    })

    const expected = "a.b.c"

    expect(getPackageVersion(packagePath)).toEqual(expected)
  })

  it("should return invalid version without build metadata", () => {
    const packageJSON = {
      version: "a.b.c+asd1234",
    }
    jest.mock(packagePath, () => {
      return packageJSON
    })

    const expected = "a.b.c"

    expect(getPackageVersion(packagePath)).toEqual(expected)
  })

  it("should return version without build metadata", () => {
    const packageJSON = {
      version: "1.2.3+asd1234",
    }
    jest.mock(packagePath, () => {
      return packageJSON
    })

    const expected = "1.2.3"

    expect(getPackageVersion(packagePath)).toEqual(expected)
  })

  it("should return version with prefix but without build metadata", () => {
    const packageJSON = {
      version: "v1.2.3+asd1234",
    }
    jest.mock(packagePath, () => {
      return packageJSON
    })

    const expected = "v1.2.3"

    expect(getPackageVersion(packagePath)).toEqual(expected)
  })
})
