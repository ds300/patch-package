import { join } from "path"

interface PackageDetails {
  pathSpecifier: string
  path: string
  name: string
  version: string
}

function parseNameAndVersion(
  s: string,
): {
  name: string
  version?: string
} | null {
  const parts = s.split("+")
  switch (parts.length) {
    case 1: {
      return { name: parts[0] }
    }
    case 2: {
      const [nameOrScope, versionOrName] = parts
      if (versionOrName.match(/^\d+/)) {
        return {
          name: nameOrScope,
          version: versionOrName,
        }
      }
      return { name: `${nameOrScope}/${versionOrName}` }
    }
    case 3: {
      const [scope, name, version] = parts
      return { name: `${scope}/${name}`, version }
    }
  }
  return null
}

export function getPatchDetailsFromFilename(
  filename: string,
): PackageDetails | null {
  // ok to coerce this, since we already filtered for valid package file names
  // in getPatchFiles

  const legacyMatch = filename.match(
    /^([^+=]+?)(:|\+)(\d+\.\d+\.\d+.*)\.patch$/,
  ) as string[] | null
  if (legacyMatch) {
    const name = legacyMatch[1]
    const version = legacyMatch[3]

    return {
      pathSpecifier: name,
      path: join("node_modules", name),
      name,
      version,
    }
  }

  const parts = filename
    .replace(/\.patch$/, "")
    .split("=>")
    .map(parseNameAndVersion)
    .filter((x): x is PackageDetails => x !== null)

  if (parts.length === 0) {
    return null
  }

  const lastPart = parts[parts.length - 1]

  if (!lastPart.version) {
    return null
  }

  return {
    name: lastPart.name,
    version: lastPart.version,
    path: parts.map(({ name }) => name).join("/node_modules/"),
    pathSpecifier: parts.map(({ name }) => name).join("=>"),
  }
}
