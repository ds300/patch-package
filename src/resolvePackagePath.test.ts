import { mkdirpSync, realpathSync, symlinkSync, writeFileSync } from "fs-extra"
import { dirname, relative } from "path"
import { dirSync } from "tmp"
import { getPatchDetailsFromCliString } from "./PackageDetails"
import { join } from "./path"
import { resolvePackagePath } from "./resolvePackagePath"

describe("resolvePackagePath", () => {
  let appPath: string
  let cleanup: () => void

  beforeEach(() => {
    const tmp = dirSync({ unsafeCleanup: true })
    appPath = realpathSync(tmp.name)
    cleanup = tmp.removeCallback
  })

  afterEach(() => {
    cleanup()
  })

  function addStoreEntry(entry: string, name: string, version: string) {
    const packageDir = join(
      appPath,
      "node_modules/.store",
      entry,
      "node_modules",
      name,
    )
    mkdirpSync(packageDir)
    writeFileSync(join(packageDir, "package.json"), JSON.stringify({ version }))
    return join("node_modules/.store", entry, "node_modules", name)
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
    addStoreEntry("some-package@1.0.0-hash", "some-package", "1.0.0")

    expect(resolve("some-package")).toBe("node_modules/some-package")
  })

  it("returns the original path when there is no .store directory", () => {
    expect(resolve("some-package")).toBe("node_modules/some-package")
  })

  it("returns the original path when the package is not in .store", () => {
    addStoreEntry("other@1.0.0-hash", "other", "1.0.0")

    expect(resolve("some-package")).toBe("node_modules/some-package")
  })

  it("resolves a transitive package from .store", () => {
    const storePath = addStoreEntry("ms@2.1.2-hash", "ms", "2.1.2")

    expect(resolve("ms")).toBe(storePath)
  })

  it("does not match packages sharing a name prefix", () => {
    addStoreEntry("ms-extra@1.0.0-hash", "ms-extra", "1.0.0")

    expect(resolve("ms")).toBe("node_modules/ms")
  })

  it("resolves a scoped transitive package from .store", () => {
    const storePath = addStoreEntry(
      "@babel/highlight@7.25.9-hash",
      "@babel/highlight",
      "7.25.9",
    )

    expect(resolve("@babel/highlight")).toBe(storePath)
  })

  it("picks the lockfile version when .store has several versions", () => {
    addStoreEntry("ms@2.0.0-hash", "ms", "2.0.0")
    const storePath = addStoreEntry("ms@2.1.2-hash", "ms", "2.1.2")
    writeLockfile({ "node_modules/ms": { version: "2.1.2" } })

    expect(resolve("ms")).toBe(storePath)
    expect(resolve("ms", "2.0.0")).toBe(storePath)
  })

  it("falls back to the given version without a lockfile entry", () => {
    addStoreEntry("ms@2.0.0-hash", "ms", "2.0.0")
    const storePath = addStoreEntry("ms@2.1.2-hash", "ms", "2.1.2")

    expect(resolve("ms", "2.1.2")).toBe(storePath)
  })

  it("does not guess between several versions", () => {
    addStoreEntry("ms@2.0.0-hash", "ms", "2.0.0")
    addStoreEntry("ms@2.1.2-hash", "ms", "2.1.2")

    expect(resolve("ms")).toBe("node_modules/ms")
    expect(resolve("ms", "3.0.0")).toBe("node_modules/ms")
  })

  it("resolves a nested package through its parent's store entry", () => {
    const parentPath = addStoreEntry(
      "finalhandler@1.2.0-hash",
      "finalhandler",
      "1.2.0",
    )
    addStoreEntry("ms@2.1.2-hash", "ms", "2.1.2")
    const nestedPath = addStoreEntry("ms@2.0.0-hash", "ms", "2.0.0")
    link("node_modules/finalhandler", parentPath)
    link(
      "node_modules/.store/finalhandler@1.2.0-hash/node_modules/ms",
      nestedPath,
    )

    expect(resolve("finalhandler/ms")).toBe(nestedPath)
  })

  it("resolves a nested package whose lockfile parent is not its dependent", () => {
    const parentPath = addStoreEntry(
      "finalhandler@1.2.0-hash",
      "finalhandler",
      "1.2.0",
    )
    const directPath = addStoreEntry("ms@2.1.2-hash", "ms", "2.1.2")
    const nestedPath = addStoreEntry("ms@2.0.0-hash", "ms", "2.0.0")
    link("node_modules/finalhandler", parentPath)
    link("node_modules/ms", directPath)
    writeLockfile({
      "node_modules/ms": { version: "2.1.2" },
      "node_modules/finalhandler/node_modules/ms": { version: "2.0.0" },
    })

    expect(resolve("finalhandler/ms")).toBe(nestedPath)
  })

  it("does not substitute another version for the lockfile version", () => {
    addStoreEntry("ms@2.0.0-hash", "ms", "2.0.0")
    writeLockfile({ "node_modules/ms": { version: "2.1.2" } })

    expect(resolve("ms", "2.0.0")).toBe("node_modules/ms")
  })

  it("resolves a scoped nested package through a scoped parent", () => {
    const parentPath = addStoreEntry(
      "@babel/code-frame@7.24.7-hash",
      "@babel/code-frame",
      "7.24.7",
    )
    const nestedPath = addStoreEntry(
      "@babel/highlight@7.25.9-hash",
      "@babel/highlight",
      "7.25.9",
    )
    link("node_modules/@babel/code-frame", parentPath)
    link(
      "node_modules/.store/@babel/code-frame@7.24.7-hash/node_modules/@babel/highlight",
      nestedPath,
    )

    expect(resolve("@babel/code-frame/@babel/highlight")).toBe(nestedPath)
  })

  it("returns the original path when a nested package is missing", () => {
    const parentPath = addStoreEntry("parent@1.0.0-hash", "parent", "1.0.0")
    link("node_modules/parent", parentPath)

    expect(resolve("parent/child")).toBe(
      "node_modules/parent/node_modules/child",
    )
  })

  it("does not resolve nested packages outside appPath", () => {
    appPath = join(appPath, "app")
    const parentPath = addStoreEntry("parent@1.0.0-hash", "parent", "1.0.0")
    link("node_modules/parent", parentPath)
    mkdirpSync(join(appPath, "../node_modules/child"))

    expect(resolve("parent/child")).toBe(
      "node_modules/parent/node_modules/child",
    )
  })
})
