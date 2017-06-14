import { resolve } from "path"

interface PackageJson {
  dependencies?: {
    [packageName: string]: string
  }
  devDependencies?: {
    [packageName: string]: string
  }
}

export default function resolveRelativeFileDependencies<T extends PackageJson>(
  appRootPath: string,
  pkg: T,
): PackageJson {
  _resolveRelativeFileDependencies(appRootPath, pkg.dependencies)
  _resolveRelativeFileDependencies(appRootPath, pkg.devDependencies)
  return pkg
}

function _resolveRelativeFileDependencies(
  appRootPath: string,
  dependencies?: { [packageName: string]: string },
) {
  if (dependencies) {
    for (const packageName of Object.keys(dependencies)) {
      const version = dependencies[packageName]

      if (version.startsWith("file:") && version[5] !== "/") {
        dependencies[packageName] =
          "file:" + resolve(appRootPath, version.slice(5))
      }
    }
  }
}
