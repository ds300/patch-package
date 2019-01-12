import { join } from "path"

interface PackageDetails {
  humanReadablePathSpecifier: string
  pathSpecifier: string
  path: string
  name: string
  isNested: boolean
  packageNames: string[]
}

interface PatchedPackageDetails extends PackageDetails {
  version: string
  patchFilename: string
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

export function getPackageDetailsFromPatchFilename(
  patchFilename: string,
): PatchedPackageDetails | null {
  const legacyMatch = patchFilename.match(
    /^([^+=]+?)(:|\+)(\d+\.\d+\.\d+.*)\.patch$/,
  )

  if (legacyMatch) {
    const name = legacyMatch[1]
    const version = legacyMatch[3]

    return {
      packageNames: [name],
      pathSpecifier: name,
      humanReadablePathSpecifier: name,
      path: join("node_modules", name),
      name,
      version,
      isNested: false,
      patchFilename,
    }
  }

  const parts = patchFilename
    .replace(/\.patch$/, "")
    .split("++")
    .map(parseNameAndVersion)
    .filter((x): x is NonNullable<typeof x> => x !== null)

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
    path: join(
      "node_modules",
      parts.map(({ name }) => name).join("/node_modules/"),
    ),
    patchFilename,
    pathSpecifier: parts.map(({ name }) => name).join("/"),
    humanReadablePathSpecifier: parts.map(({ name }) => name).join(" => "),
    isNested: parts.length > 1,
    packageNames: parts.map(({ name }) => name),
  }
}

export function getPatchDetailsFromCliString(
  specifier: string,
): PackageDetails | null {
  const parts = specifier.split("/")

  const packageNames = []

  let scope: string | null = null

  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith("@")) {
      if (scope) {
        return null
      }
      scope = parts[i]
    } else {
      if (scope) {
        packageNames.push(`${scope}/${parts[i]}`)
        scope = null
      } else {
        packageNames.push(parts[i])
      }
    }
  }

  const path = join("node_modules", packageNames.join("/node_modules/"))

  return {
    packageNames,
    path,
    name: packageNames[packageNames.length - 1],
    humanReadablePathSpecifier: packageNames.join(" => "),
    isNested: packageNames.length > 1,
    pathSpecifier: specifier,
  }
}
