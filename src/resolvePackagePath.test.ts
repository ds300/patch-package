import { mkdirpSync, realpathSync, symlinkSync, writeFileSync } from "fs-extra"
import { dirname, relative } from "path"
import { dirSync } from "tmp"
import { getPatchDetailsFromCliString } from "./PackageDetails"
import { join } from "./path"
import { resolvePackagePath } from "./resolvePackagePath"

const HASH = "hXErYF6ZrdpweGIFH-nM4Q"
const OTHER_HASH = "4cO0ZloNu8RvnBPVrlAb_Q"

describe("resolvePackagePath", () => {
  let rootPath: string
  let appPath: string
  let cleanup: () => void

  beforeEach(() => {
    const tmp = dirSync({ unsafeCleanup: true })
    rootPath = realpathSync(tmp.name)
    appPath = rootPath
    cleanup = tmp.removeCallback
  })

  afterEach(() => {
    cleanup()
  })

  function addStoreEntry(name: string, version: string, hash = HASH) {
    const storePath = join(
      "node_modules/.store",
      `${name}@${version}-${hash}`,
      "node_modules",
      name,
    )
    mkdirpSync(join(appPath, storePath))
    writeFileSync(
      join(appPath, storePath, "package.json"),
      JSON.stringify({ name, version }),
    )
    return storePath
  }

  function link(from: string, to: string) {
    const fromPath = join(appPath, from)
    mkdirpSync(dirname(fromPath))
    symlinkSync(relative(dirname(fromPath), join(appPath, to)), fromPath)
  }

  function writeLockfile(packages: Record<string, { version: string }>) {
    writeFileSync(
      join(appPath, "package-lock.json"),
      JSON.stringify({ lockfileVersion: 3, packages }),
    )
  }

  function resolve(pathSpecifier: string, version?: string) {
    return resolvePackagePath({
      appPath,
      packageDetails: getPatchDetailsFromCliString(pathSpecifier)!,
      version,
    })
  }

  it("returns the original path when the package exists", () => {
    mkdirpSync(join(appPath, "node_modules/some-package"))
    addStoreEntry("some-package", "1.0.0")

    expect(resolve("some-package")).toBe("node_modules/some-package")
  })

  it("returns the original path when there is no .store directory", () => {
    expect(resolve("some-package")).toBe("node_modules/some-package")
  })

  it("returns the original path when the package is not in .store", () => {
    addStoreEntry("other", "1.0.0")

    expect(resolve("some-package")).toBe("node_modules/some-package")
  })

  it("resolves a transitive package from .store", () => {
    const storePath = addStoreEntry("ms", "2.1.2")

    expect(resolve("ms")).toBe(storePath)
  })

  it("does not match packages sharing a name prefix", () => {
    addStoreEntry("ms-extra", "1.0.0")

    expect(resolve("ms")).toBe("node_modules/ms")
  })

  it("resolves a scoped transitive package from .store", () => {
    const storePath = addStoreEntry("@babel/highlight", "7.25.9")

    expect(resolve("@babel/highlight")).toBe(storePath)
  })

  it("resolves prerelease versions from the store entry name", () => {
    const storePath = addStoreEntry("ms", "3.0.0-canary.1")

    expect(resolve("ms", "3.0.0-canary.1")).toBe(storePath)
  })

  it("picks the lockfile version when .store has several versions", () => {
    addStoreEntry("ms", "2.0.0", OTHER_HASH)
    const storePath = addStoreEntry("ms", "2.1.2")
    writeLockfile({ "node_modules/ms": { version: "2.1.2" } })

    expect(resolve("ms")).toBe(storePath)
    expect(resolve("ms", "2.0.0")).toBe(storePath)
  })

  it("falls back to the given version without a lockfile entry", () => {
    addStoreEntry("ms", "2.0.0", OTHER_HASH)
    const storePath = addStoreEntry("ms", "2.1.2")

    expect(resolve("ms", "2.1.2")).toBe(storePath)
  })

  it("does not guess between several versions", () => {
    addStoreEntry("ms", "2.0.0", OTHER_HASH)
    addStoreEntry("ms", "2.1.2")

    expect(resolve("ms")).toBe("node_modules/ms")
    expect(resolve("ms", "3.0.0")).toBe("node_modules/ms")
  })

  it("does not substitute another version for the lockfile version", () => {
    addStoreEntry("ms", "2.0.0")
    writeLockfile({ "node_modules/ms": { version: "2.1.2" } })

    expect(resolve("ms", "2.0.0")).toBe("node_modules/ms")
  })

  it("does not guess between same-version entries", () => {
    addStoreEntry("ms", "2.1.2")
    addStoreEntry("ms", "2.1.2", OTHER_HASH)
    writeLockfile({ "node_modules/ms": { version: "2.1.2" } })

    expect(resolve("ms")).toBe("node_modules/ms")
  })

  it("keeps resolving after a patch changes the package.json version", () => {
    const storePath = addStoreEntry("ms", "2.1.2")
    addStoreEntry("ms", "2.0.0", OTHER_HASH)
    writeFileSync(
      join(appPath, storePath, "package.json"),
      JSON.stringify({ version: "2.1.2-patched" }),
    )
    writeLockfile({ "node_modules/ms": { version: "2.1.2" } })

    expect(resolve("ms")).toBe(storePath)
  })

  it("resolves a nested package through its parent's store entry", () => {
    const parentPath = addStoreEntry("finalhandler", "1.2.0")
    addStoreEntry("ms", "2.1.2")
    const nestedPath = addStoreEntry("ms", "2.0.0", OTHER_HASH)
    link("node_modules/finalhandler", parentPath)
    link(
      `node_modules/.store/finalhandler@1.2.0-${HASH}/node_modules/ms`,
      nestedPath,
    )

    expect(resolve("finalhandler/ms")).toBe(nestedPath)
  })

  it("resolves a nested package whose lockfile parent is not its dependent", () => {
    const parentPath = addStoreEntry("finalhandler", "1.2.0")
    const directPath = addStoreEntry("ms", "2.1.2")
    const nestedPath = addStoreEntry("ms", "2.0.0", OTHER_HASH)
    link("node_modules/finalhandler", parentPath)
    link("node_modules/ms", directPath)
    writeLockfile({
      "node_modules/ms": { version: "2.1.2" },
      "node_modules/finalhandler/node_modules/ms": { version: "2.0.0" },
    })

    expect(resolve("finalhandler/ms")).toBe(nestedPath)
  })

  it("resolves a scoped nested package through a scoped parent", () => {
    const parentPath = addStoreEntry("@babel/code-frame", "7.24.7")
    const nestedPath = addStoreEntry("@babel/highlight", "7.25.9")
    link("node_modules/@babel/code-frame", parentPath)
    link(
      `node_modules/.store/@babel/code-frame@7.24.7-${HASH}/node_modules/@babel/highlight`,
      nestedPath,
    )

    expect(resolve("@babel/code-frame/@babel/highlight")).toBe(nestedPath)
  })

  it("resolves a nested package in a workspace linked to the root .store", () => {
    const parentPath = addStoreEntry("parent", "1.0.0")
    const childPath = addStoreEntry("child", "1.0.0")
    link(
      `node_modules/.store/parent@1.0.0-${HASH}/node_modules/child`,
      childPath,
    )
    link("packages/a/node_modules/parent", parentPath)
    appPath = join(rootPath, "packages/a")

    expect(resolve("parent/child")).toBe(join("../..", childPath))
  })

  it("resolves an aliased transitive package by its lockfile name", () => {
    addStoreEntry("string-width", "5.1.2", OTHER_HASH)
    const storePath = addStoreEntry("string-width", "4.2.3")
    writeFileSync(
      join(appPath, "package-lock.json"),
      JSON.stringify({
        packages: {
          "node_modules/string-width-cjs": {
            name: "string-width",
            version: "4.2.3",
          },
        },
      }),
    )

    expect(resolve("string-width-cjs")).toBe(storePath)
  })

  it("resolves an aliased nested package through its parent's store entry", () => {
    const parentPath = addStoreEntry("@isaacs/cliui", "8.0.2")
    const aliasedPath = addStoreEntry("string-width", "4.2.3")
    link("node_modules/@isaacs/cliui", parentPath)
    link(
      `node_modules/.store/@isaacs/cliui@8.0.2-${HASH}/node_modules/string-width-cjs`,
      aliasedPath,
    )

    expect(resolve("@isaacs/cliui/string-width-cjs")).toBe(aliasedPath)
  })

  it("returns the original path when a nested package is missing", () => {
    const parentPath = addStoreEntry("parent", "1.0.0")
    link("node_modules/parent", parentPath)

    expect(resolve("parent/child")).toBe(
      "node_modules/parent/node_modules/child",
    )
  })

  it("leaves regular installs untouched", () => {
    mkdirpSync(join(appPath, "node_modules/parent"))
    mkdirpSync(join(appPath, "node_modules/child"))
    addStoreEntry("other", "1.0.0")

    expect(resolve("parent/child")).toBe(
      "node_modules/parent/node_modules/child",
    )
  })

  it("does not resolve nested packages outside appPath", () => {
    appPath = join(rootPath, "app")
    const parentPath = addStoreEntry("parent", "1.0.0")
    link("node_modules/parent", parentPath)
    mkdirpSync(join(rootPath, "node_modules/child"))

    expect(resolve("parent/child")).toBe(
      "node_modules/parent/node_modules/child",
    )
  })
})
