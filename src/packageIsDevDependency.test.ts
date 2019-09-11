import { packageIsDevDependency } from "./packageIsDevDependency"
import { join } from "./path"
import { normalize } from "path"
import { getPackageDetailsFromPatchFilename } from "./PackageDetails"
import { existsSync } from "fs"

const appPath = normalize(join(__dirname, "../"))

describe(packageIsDevDependency, () => {
  it("returns true if package is a dev dependency", () => {
    expect(
      packageIsDevDependency({
        appPath,
        packageDetails: getPackageDetailsFromPatchFilename(
          "typescript+3.0.1.patch",
        )!,
      }),
    ).toBe(true)
  })
  it("returns false if package is not a dev dependency", () => {
    expect(
      packageIsDevDependency({
        appPath,
        packageDetails: getPackageDetailsFromPatchFilename(
          "chalk+3.0.1.patch",
        )!,
      }),
    ).toBe(false)
  })
  it("returns false if package is a transitive dependency of a dev dependency", () => {
    expect(existsSync(join(appPath, "node_modules/cosmiconfig"))).toBe(true)
    expect(
      packageIsDevDependency({
        appPath,
        packageDetails: getPackageDetailsFromPatchFilename(
          // cosmiconfig is a transitive dep of lint-staged
          "cosmiconfig+3.0.1.patch",
        )!,
      }),
    ).toBe(false)
  })
})
