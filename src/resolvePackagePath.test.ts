import { resolvePackagePath } from "./resolvePackagePath"
import { mkdirpSync, writeFileSync } from "fs-extra"
import { join } from "./path"
import { dirSync } from "tmp"

describe("resolvePackagePath", () => {
  let tmpDir: string
  let cleanup: () => void

  beforeEach(() => {
    const tmp = dirSync({ unsafeCleanup: true })
    tmpDir = tmp.name
    cleanup = tmp.removeCallback
  })

  afterEach(() => {
    cleanup()
  })

  it("returns the original path when the package exists at the expected location", () => {
    const pkgDir = join(tmpDir, "node_modules", "some-package")
    mkdirpSync(pkgDir)
    writeFileSync(join(pkgDir, "package.json"), '{"version":"1.0.0"}')

    const result = resolvePackagePath({
      appPath: tmpDir,
      packagePath: "node_modules/some-package",
      packageName: "some-package",
    })

    expect(result).toBe("node_modules/some-package")
  })

  it("resolves from .store when the expected path does not exist", () => {
    const storeDir = join(
      tmpDir,
      "node_modules",
      ".store",
      "some-package@1.0.0-abc123",
      "node_modules",
      "some-package",
    )
    mkdirpSync(storeDir)
    writeFileSync(join(storeDir, "package.json"), '{"version":"1.0.0"}')

    const result = resolvePackagePath({
      appPath: tmpDir,
      packagePath: "node_modules/some-package",
      packageName: "some-package",
    })

    expect(result).toBe(
      "node_modules/.store/some-package@1.0.0-abc123/node_modules/some-package",
    )
  })

  it("prefers version-specific match in .store", () => {
    // Create two versions in .store
    const storeDir1 = join(
      tmpDir,
      "node_modules",
      ".store",
      "pkg@1.0.0-hash1",
      "node_modules",
      "pkg",
    )
    const storeDir2 = join(
      tmpDir,
      "node_modules",
      ".store",
      "pkg@2.0.0-hash2",
      "node_modules",
      "pkg",
    )
    mkdirpSync(storeDir1)
    mkdirpSync(storeDir2)
    writeFileSync(join(storeDir1, "package.json"), '{"version":"1.0.0"}')
    writeFileSync(join(storeDir2, "package.json"), '{"version":"2.0.0"}')

    const result = resolvePackagePath({
      appPath: tmpDir,
      packagePath: "node_modules/pkg",
      packageName: "pkg",
      version: "2.0.0",
    })

    expect(result).toBe("node_modules/.store/pkg@2.0.0-hash2/node_modules/pkg")
  })

  it("handles scoped packages in .store", () => {
    const storeDir = join(
      tmpDir,
      "node_modules",
      ".store",
      "@scope+pkg@1.0.0-hash",
      "node_modules",
      "@scope",
      "pkg",
    )
    mkdirpSync(storeDir)
    writeFileSync(join(storeDir, "package.json"), '{"version":"1.0.0"}')

    const result = resolvePackagePath({
      appPath: tmpDir,
      packagePath: "node_modules/@scope/pkg",
      packageName: "@scope/pkg",
      version: "1.0.0",
    })

    expect(result).toBe(
      "node_modules/.store/@scope+pkg@1.0.0-hash/node_modules/@scope/pkg",
    )
  })

  it("returns original path when package is not found anywhere", () => {
    const result = resolvePackagePath({
      appPath: tmpDir,
      packagePath: "node_modules/nonexistent",
      packageName: "nonexistent",
    })

    expect(result).toBe("node_modules/nonexistent")
  })

  it("returns original path when .store directory does not exist", () => {
    const result = resolvePackagePath({
      appPath: tmpDir,
      packagePath: "node_modules/some-package",
      packageName: "some-package",
    })

    expect(result).toBe("node_modules/some-package")
  })

  it("resolves nested package from .store", () => {
    // Simulate: parent exists but nested dep doesn't at expected path
    const parentDir = join(tmpDir, "node_modules", "parent")
    mkdirpSync(parentDir)

    // The nested dep is in .store
    const storeDir = join(
      tmpDir,
      "node_modules",
      ".store",
      "child@1.0.0-hash",
      "node_modules",
      "child",
    )
    mkdirpSync(storeDir)
    writeFileSync(join(storeDir, "package.json"), '{"version":"1.0.0"}')

    const result = resolvePackagePath({
      appPath: tmpDir,
      packagePath: "node_modules/parent/node_modules/child",
      packageName: "child",
      version: "1.0.0",
    })

    expect(result).toBe(
      "node_modules/.store/child@1.0.0-hash/node_modules/child",
    )
  })

  it("resolves from ancestor node_modules (monorepo hoisting)", () => {
    // Simulate monorepo: appPath is packages/a, package is hoisted to root
    const workspaceDir = join(tmpDir, "packages", "a")
    mkdirpSync(workspaceDir)

    // Package is hoisted to root node_modules
    const hoistedDir = join(tmpDir, "node_modules", "foo")
    mkdirpSync(hoistedDir)
    writeFileSync(join(hoistedDir, "package.json"), '{"version":"1.0.0"}')

    const result = resolvePackagePath({
      appPath: workspaceDir,
      packagePath: "node_modules/foo",
      packageName: "foo",
    })

    expect(result).toBe("../../node_modules/foo")
  })

  it("resolves scoped package from ancestor node_modules", () => {
    const workspaceDir = join(tmpDir, "packages", "a")
    mkdirpSync(workspaceDir)

    const hoistedDir = join(tmpDir, "node_modules", "@scope", "bar")
    mkdirpSync(hoistedDir)
    writeFileSync(join(hoistedDir, "package.json"), '{"version":"2.0.0"}')

    const result = resolvePackagePath({
      appPath: workspaceDir,
      packagePath: "node_modules/@scope/bar",
      packageName: "@scope/bar",
    })

    expect(result).toBe("../../node_modules/@scope/bar")
  })

  it("prefers .store over ancestor node_modules", () => {
    const workspaceDir = join(tmpDir, "packages", "a")
    mkdirpSync(workspaceDir)

    // Package in .store under workspace
    const storeDir = join(
      workspaceDir,
      "node_modules",
      ".store",
      "foo@1.0.0-hash",
      "node_modules",
      "foo",
    )
    mkdirpSync(storeDir)
    writeFileSync(join(storeDir, "package.json"), '{"version":"1.0.0"}')

    // Also in ancestor node_modules
    const hoistedDir = join(tmpDir, "node_modules", "foo")
    mkdirpSync(hoistedDir)
    writeFileSync(join(hoistedDir, "package.json"), '{"version":"1.0.0"}')

    const result = resolvePackagePath({
      appPath: workspaceDir,
      packagePath: "node_modules/foo",
      packageName: "foo",
      version: "1.0.0",
    })

    expect(result).toBe("node_modules/.store/foo@1.0.0-hash/node_modules/foo")
  })
})
