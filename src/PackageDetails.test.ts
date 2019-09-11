import {
  getPackageDetailsFromPatchFilename,
  getPatchDetailsFromCliString,
} from "./PackageDetails"

describe("getPackageDetailsFromPatchFilename", () => {
  it("parses old-style patch filenames", () => {
    expect(
      getPackageDetailsFromPatchFilename("@types/banana:3.4.2-beta.2.patch"),
    ).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@types/banana",
  "isDevOnly": false,
  "isNested": false,
  "name": "@types/banana",
  "packageNames": Array [
    "@types/banana",
  ],
  "patchFilename": "@types/banana:3.4.2-beta.2.patch",
  "path": "node_modules/@types/banana",
  "pathSpecifier": "@types/banana",
  "version": "3.4.2-beta.2",
}
`)

    expect(getPackageDetailsFromPatchFilename("banana:0.4.2.patch"))
      .toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "banana",
  "isDevOnly": false,
  "isNested": false,
  "name": "banana",
  "packageNames": Array [
    "banana",
  ],
  "patchFilename": "banana:0.4.2.patch",
  "path": "node_modules/banana",
  "pathSpecifier": "banana",
  "version": "0.4.2",
}
`)

    expect(getPackageDetailsFromPatchFilename("banana+0.4.2.patch"))
      .toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "banana",
  "isDevOnly": false,
  "isNested": false,
  "name": "banana",
  "packageNames": Array [
    "banana",
  ],
  "patchFilename": "banana+0.4.2.patch",
  "path": "node_modules/banana",
  "pathSpecifier": "banana",
  "version": "0.4.2",
}
`)

    expect(getPackageDetailsFromPatchFilename("banana-0.4.2.patch")).toBe(null)

    expect(
      getPackageDetailsFromPatchFilename("@types+banana-0.4.2.patch"),
    ).toBe(null)

    expect(getPackageDetailsFromPatchFilename("banana+0.4.2.dev.patch"))
      .toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "banana",
  "isDevOnly": true,
  "isNested": false,
  "name": "banana",
  "packageNames": Array [
    "banana",
  ],
  "patchFilename": "banana+0.4.2.dev.patch",
  "path": "node_modules/banana",
  "pathSpecifier": "banana",
  "version": "0.4.2.dev",
}
`)
  })

  it("parses new-style patch filenames", () => {
    expect(getPackageDetailsFromPatchFilename("banana++apple+0.4.2.patch"))
      .toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "banana => apple",
  "isDevOnly": false,
  "isNested": true,
  "name": "apple",
  "packageNames": Array [
    "banana",
    "apple",
  ],
  "patchFilename": "banana++apple+0.4.2.patch",
  "path": "node_modules/banana/node_modules/apple",
  "pathSpecifier": "banana/apple",
  "version": "0.4.2",
}
`)

    expect(
      getPackageDetailsFromPatchFilename(
        "@types+banana++@types+apple++@mollusc+man+0.4.2-banana-tree.patch",
      ),
    ).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@types/banana => @types/apple => @mollusc/man",
  "isDevOnly": false,
  "isNested": true,
  "name": "@mollusc/man",
  "packageNames": Array [
    "@types/banana",
    "@types/apple",
    "@mollusc/man",
  ],
  "patchFilename": "@types+banana++@types+apple++@mollusc+man+0.4.2-banana-tree.patch",
  "path": "node_modules/@types/banana/node_modules/@types/apple/node_modules/@mollusc/man",
  "pathSpecifier": "@types/banana/@types/apple/@mollusc/man",
  "version": "0.4.2-banana-tree",
}
`)

    expect(
      getPackageDetailsFromPatchFilename(
        "@types+banana.patch++hello+0.4.2-banana-tree.patch",
      ),
    ).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@types/banana.patch => hello",
  "isDevOnly": false,
  "isNested": true,
  "name": "hello",
  "packageNames": Array [
    "@types/banana.patch",
    "hello",
  ],
  "patchFilename": "@types+banana.patch++hello+0.4.2-banana-tree.patch",
  "path": "node_modules/@types/banana.patch/node_modules/hello",
  "pathSpecifier": "@types/banana.patch/hello",
  "version": "0.4.2-banana-tree",
}
`)

    expect(
      getPackageDetailsFromPatchFilename(
        "@types+banana.patch++hello+0.4.2-banana-tree.dev.patch",
      ),
    ).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@types/banana.patch => hello",
  "isDevOnly": true,
  "isNested": true,
  "name": "hello",
  "packageNames": Array [
    "@types/banana.patch",
    "hello",
  ],
  "patchFilename": "@types+banana.patch++hello+0.4.2-banana-tree.dev.patch",
  "path": "node_modules/@types/banana.patch/node_modules/hello",
  "pathSpecifier": "@types/banana.patch/hello",
  "version": "0.4.2-banana-tree",
}
`)
  })
})

describe("getPatchDetailsFromCliString", () => {
  it("handles a minimal package name", () => {
    expect(getPatchDetailsFromCliString("patch-package")).toMatchInlineSnapshot(
      `
Object {
  "humanReadablePathSpecifier": "patch-package",
  "isNested": false,
  "name": "patch-package",
  "packageNames": Array [
    "patch-package",
  ],
  "path": "node_modules/patch-package",
  "pathSpecifier": "patch-package",
}
`,
    )
  })

  it("handles a scoped package name", () => {
    expect(
      getPatchDetailsFromCliString("@david/patch-package"),
    ).toMatchInlineSnapshot(
      `
Object {
  "humanReadablePathSpecifier": "@david/patch-package",
  "isNested": false,
  "name": "@david/patch-package",
  "packageNames": Array [
    "@david/patch-package",
  ],
  "path": "node_modules/@david/patch-package",
  "pathSpecifier": "@david/patch-package",
}
`,
    )
  })

  it("handles a nested package name", () => {
    expect(
      getPatchDetailsFromCliString("david/patch-package"),
    ).toMatchInlineSnapshot(
      `
Object {
  "humanReadablePathSpecifier": "david => patch-package",
  "isNested": true,
  "name": "patch-package",
  "packageNames": Array [
    "david",
    "patch-package",
  ],
  "path": "node_modules/david/node_modules/patch-package",
  "pathSpecifier": "david/patch-package",
}
`,
    )
  })

  it("handles a nested package name with scopes", () => {
    expect(
      getPatchDetailsFromCliString("@david/patch-package/banana"),
    ).toMatchInlineSnapshot(
      `
Object {
  "humanReadablePathSpecifier": "@david/patch-package => banana",
  "isNested": true,
  "name": "banana",
  "packageNames": Array [
    "@david/patch-package",
    "banana",
  ],
  "path": "node_modules/@david/patch-package/node_modules/banana",
  "pathSpecifier": "@david/patch-package/banana",
}
`,
    )

    expect(
      getPatchDetailsFromCliString("@david/patch-package/@david/banana"),
    ).toMatchInlineSnapshot(
      `
Object {
  "humanReadablePathSpecifier": "@david/patch-package => @david/banana",
  "isNested": true,
  "name": "@david/banana",
  "packageNames": Array [
    "@david/patch-package",
    "@david/banana",
  ],
  "path": "node_modules/@david/patch-package/node_modules/@david/banana",
  "pathSpecifier": "@david/patch-package/@david/banana",
}
`,
    )

    expect(
      getPatchDetailsFromCliString("david/patch-package/@david/banana"),
    ).toMatchInlineSnapshot(
      `
Object {
  "humanReadablePathSpecifier": "david => patch-package => @david/banana",
  "isNested": true,
  "name": "@david/banana",
  "packageNames": Array [
    "david",
    "patch-package",
    "@david/banana",
  ],
  "path": "node_modules/david/node_modules/patch-package/node_modules/@david/banana",
  "pathSpecifier": "david/patch-package/@david/banana",
}
`,
    )
  })
})
