import * as fsExtra from "fs-extra"
import { join } from "./path"
import * as fs from "fs"
import { resolveRelativeFileDependenciesInPackageJson } from "./resolveRelativeFileDependencies"

function deleteScripts(json: any) {
  delete json.scripts
  return json
}

export const preparePackageJson = (
  appDirectoryPath: string,
  tempDirectoryPath: string,
) => {
  fsExtra.copySync(
    join(appDirectoryPath, "package.json"),
    join(tempDirectoryPath, "package.json"),
  )

  const tempPackageJsonPath = join(tempDirectoryPath, "package.json")

  fs.writeFileSync(
    tempPackageJsonPath,
    JSON.stringify(
      deleteScripts(
        resolveRelativeFileDependenciesInPackageJson(
          appDirectoryPath,
          require(join(tempDirectoryPath, "package.json")),
        ),
      ),
    ),
  )
}
