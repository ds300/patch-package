import { PatchedPackageDetails } from "./PackageDetails"
import { join } from "./path"
import { existsSync } from "fs"

export function packageIsDevDependency({
  appPath,
  packageDetails,
}: {
  appPath: string
  packageDetails: PatchedPackageDetails
}) {
  const packageJsonPath = join(appPath, "package.json")
  if (!existsSync(packageJsonPath)) {
    return false
  }
  const { devDependencies } = require(packageJsonPath)
  return Boolean(devDependencies && devDependencies[packageDetails.packageNames[0]])
}
