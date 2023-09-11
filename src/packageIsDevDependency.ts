import { PatchedPackageDetails } from "./PackageDetails"
import { join } from "./path"
import { existsSync } from "fs"

export function packageIsDevDependency({
  appPath,
  patchDetails,
}: {
  appPath: string
  patchDetails: PatchedPackageDetails
}) {
  const packageJsonPath = join(appPath, "package.json")
  if (!existsSync(packageJsonPath)) {
    return false
  }
  const { devDependencies } = require(packageJsonPath)
  return Boolean(
    devDependencies && devDependencies[patchDetails.packageNames[0]],
  )
}
