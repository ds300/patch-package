import * as fs from "fs"
import * as path from "path"
import { env } from "process"

export default function findPatchFiles(appPath: string): Array<{ patchFilePath: string, packageName: string }> {
  const patchesDirectory = path.join(appPath, "patches")
  if (!fs.existsSync(patchesDirectory)) {
    return []
  }
  return fs
    .readdirSync(patchesDirectory)
    .filter((filename) => filename.match(/^.+!!.+\.patch$/))
    .map((filename) => {
      const [packageName, version] = filename.slice(0, -6).split(":")
      const packageDir = path.join(appPath, "node_modules" + packageName)

      if (!fs.exists(packageDir)) {
        console.warn(`Patch file found for package ${packageName} which is not present in node_modules/`)
        return null
      }

      const packageJson = require(path.join(packageDir, "package.json"))

      if (packageJson.version !== version) {
        console.warn(
          `Patch file for package ${packageName}:${version} found,`
          + ` but node_modules/${packageName} has version ${packageJson.version}`,
        )
        console.warn(
          `Attempting to apply the patch anyway. Update the version number`
          + ` in the patch filename ${path.join(patchesDirectory, filename)} to silence this warning.`,
        )
      }

      return {
        patchFilePath: path.resolve(patchesDirectory, filename),
        packageName,
      }
    })
    .filter(Boolean) as any
}
