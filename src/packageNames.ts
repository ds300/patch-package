interface PackageName {
  scope?: string
  name: string
}

export function parsePackageName(name: string): PackageName {
  if (name.startsWith("@")) {
    return {
      scope: name.slice(1, name.indexOf("/")),
      name: name.slice(name.indexOf("/") + 1),
    }
  } else {
    return { name }
  }
}

export function renderPackageName(
  name: PackageName,
  opts: { urlSafe?: boolean },
): string {
  if (!name.scope) {
    return name.name
  }

  if (opts.urlSafe) {
    return `@${name.scope}+${name.name}`
  }

  return `@${name.scope}/${name.name}`
}
