import {
  getPackageDetailsFromPatchFilename,
  getPatchDetailsFromCliString,
  parseNameAndVersion,
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
  "version": "0.4.2",
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
  "sequenceName": undefined,
  "sequenceNumber": undefined,
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
  "sequenceName": undefined,
  "sequenceNumber": undefined,
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
  "sequenceName": undefined,
  "sequenceNumber": undefined,
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
  "sequenceName": undefined,
  "sequenceNumber": undefined,
  "version": "0.4.2-banana-tree",
}
`)
  })

  it("works for ordered patches", () => {
    expect(getPackageDetailsFromPatchFilename("left-pad+1.3.0+02+world"))
      .toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "left-pad",
  "isDevOnly": false,
  "isNested": false,
  "name": "left-pad",
  "packageNames": Array [
    "left-pad",
  ],
  "patchFilename": "left-pad+1.3.0+02+world",
  "path": "node_modules/left-pad",
  "pathSpecifier": "left-pad",
  "sequenceName": "world",
  "sequenceNumber": 2,
  "version": "1.3.0",
}
`)

    expect(
      getPackageDetailsFromPatchFilename(
        "@microsoft/api-extractor+2.0.0+01+FixThing",
      ),
    ).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@microsoft/api-extractor",
  "isDevOnly": false,
  "isNested": false,
  "name": "@microsoft/api-extractor",
  "packageNames": Array [
    "@microsoft/api-extractor",
  ],
  "patchFilename": "@microsoft/api-extractor+2.0.0+01+FixThing",
  "path": "node_modules/@microsoft/api-extractor",
  "pathSpecifier": "@microsoft/api-extractor",
  "sequenceName": "FixThing",
  "sequenceNumber": 1,
  "version": "2.0.0",
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

describe("parseNameAndVersion", () => {
  it("works for good-looking names", () => {
    expect(parseNameAndVersion("lodash+2.3.4")).toMatchInlineSnapshot(`
Object {
  "packageName": "lodash",
  "version": "2.3.4",
}
`)
    expect(parseNameAndVersion("patch-package+2.0.0-alpha.3"))
      .toMatchInlineSnapshot(`
Object {
  "packageName": "patch-package",
  "version": "2.0.0-alpha.3",
}
`)
  })
  it("works for scoped package names", () => {
    expect(parseNameAndVersion("@react-spring+rafz+2.0.0-alpha.3"))
      .toMatchInlineSnapshot(`
Object {
  "packageName": "@react-spring/rafz",
  "version": "2.0.0-alpha.3",
}
`)
    expect(parseNameAndVersion("@microsoft+api-extractor+2.2.3"))
      .toMatchInlineSnapshot(`
Object {
  "packageName": "@microsoft/api-extractor",
  "version": "2.2.3",
}
`)
  })
  it("works for ordered patches", () => {
    expect(parseNameAndVersion("patch-package+2.0.0+01"))
      .toMatchInlineSnapshot(`
Object {
  "packageName": "patch-package",
  "sequenceNumber": 1,
  "version": "2.0.0",
}
`)
    expect(parseNameAndVersion("@react-spring+rafz+2.0.0-alpha.3+23"))
      .toMatchInlineSnapshot(`
Object {
  "packageName": "@react-spring/rafz",
  "sequenceNumber": 23,
  "version": "2.0.0-alpha.3",
}
`)
    expect(parseNameAndVersion("@microsoft+api-extractor+2.0.0+001"))
      .toMatchInlineSnapshot(`
Object {
  "packageName": "@microsoft/api-extractor",
  "sequenceNumber": 1,
  "version": "2.0.0",
}
`)
  })

  it("works for ordered patches with names", () => {
    expect(parseNameAndVersion("patch-package+2.0.0+021+FixImportantThing"))
      .toMatchInlineSnapshot(`
Object {
  "packageName": "patch-package",
  "sequenceName": "FixImportantThing",
  "sequenceNumber": 21,
  "version": "2.0.0",
}
`)
    expect(parseNameAndVersion("@react-spring+rafz+2.0.0-alpha.3+000023+Foo"))
      .toMatchInlineSnapshot(`
Object {
  "packageName": "@react-spring/rafz",
  "sequenceName": "Foo",
  "sequenceNumber": 23,
  "version": "2.0.0-alpha.3",
}
`)
    expect(parseNameAndVersion("@microsoft+api-extractor+2.0.0+001+Bar"))
      .toMatchInlineSnapshot(`
Object {
  "packageName": "@microsoft/api-extractor",
  "sequenceName": "Bar",
  "sequenceNumber": 1,
  "version": "2.0.0",
}
`)
  })
})
