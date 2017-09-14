import { resolve } from "path"

interface PackageJson {
  dependencies?: {
    [packageName: string]: string
  }
  devDependencies?: {
    [packageName: string]: string
  }
}

interface PackageLock {
  dependencies: {
    [packageName: string]: {
      version: string
    }
  }
}

export function resolveRelativeFileDependenciesInPackageJson<
  T extends PackageJson
>(appRootPath: string, pkg: T): PackageJson {
  _resolveRelativeFileDependencies(appRootPath, pkg.dependencies)
  _resolveRelativeFileDependencies(appRootPath, pkg.devDependencies)
  return pkg
}

export function resolveRelativeFileDependenciesInPackageLock<
  T extends PackageLock
>(appRootPath: string, pkg: T): PackageLock {
  for (const packageName of Object.keys(pkg.dependencies)) {
    pkg.dependencies[packageName].version = transformVersionString(
      pkg.dependencies[packageName].version,
      appRootPath,
    )
  }
  return pkg
}

function transformVersionString(version: string, appRootPath: string) {
  if (version.startsWith("file:") && version[5] !== "/") {
    return "file:" + resolve(appRootPath, version.slice(5))
  } else {
    return version
  }
}

function _resolveRelativeFileDependencies(
  appRootPath: string,
  dependencies?: { [packageName: string]: string },
) {
  if (dependencies) {
    for (const packageName of Object.keys(dependencies)) {
      dependencies[packageName] = transformVersionString(
        dependencies[packageName],
        appRootPath,
      )
    }
  }
}
