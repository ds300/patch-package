import { resolve } from "./path"

interface PackageLock {
  dependencies: {
    [packageName: string]: {
      version: string
    }
  }
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
