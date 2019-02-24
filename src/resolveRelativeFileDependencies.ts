import { resolve } from "./path"

function transformVersionString(version: string, appRootPath: string) {
  if (version.startsWith("file:") && version[5] !== "/") {
    return "file:" + resolve(appRootPath, version.slice(5))
  } else {
    return version
  }
}

export function resolveRelativeFileDependencies(
  appRootPath: string,
  resolutions: { [packageName: string]: string },
) {
  const result = {} as { [packageName: string]: string }
  for (const packageName of Object.keys(resolutions)) {
    result[packageName] = transformVersionString(
      resolutions[packageName],
      appRootPath,
    )
  }
  return result
}
