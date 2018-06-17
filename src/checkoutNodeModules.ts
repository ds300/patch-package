import { PackageManager } from "./detectPackageManager"
import { spawnSafeSync } from "./spawnSafe"
import * as fsExtra from "fs-extra"
import { join } from "./path"
import { green } from "chalk"
import { resolveRelativeFileDependenciesInPackageLock } from "./resolveRelativeFileDependencies"
import * as fs from "fs"

export const checkoutNodeModules = (
  appPath: string,
  tempDirectoryPath: string,
  packageManager: PackageManager,
) => {
  const tmpExec = (command: string, args?: string[]) =>
    spawnSafeSync(command, args, { cwd: tempDirectoryPath })

  if (packageManager === "yarn") {
    fsExtra.copySync(
      join(appPath, "yarn.lock"),
      join(tempDirectoryPath, "yarn.lock"),
    )
    console.info(green("☑"), "Building clean node_modules with yarn")
    tmpExec(`yarn`)
  } else {
    const lockFileName =
      packageManager === "npm-shrinkwrap"
        ? "npm-shrinkwrap.json"
        : "package-lock.json"

    const lockFileContents = JSON.parse(
      fsExtra.readFileSync(join(appPath, lockFileName)).toString(),
    )
    const resolvedLockFileContents = resolveRelativeFileDependenciesInPackageLock(
      appPath,
      lockFileContents,
    )
    fs.writeFileSync(
      join(tempDirectoryPath, lockFileName),
      JSON.stringify(resolvedLockFileContents),
    )
    console.info(green("☑"), "Building clean node_modules with npm")
    tmpExec("npm", ["i"])
  }
}
