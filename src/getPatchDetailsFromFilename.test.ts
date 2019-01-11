import { getPatchDetailsFromFilename } from "./getPatchDetailsFromFilename"

describe("getPatchDetailsFromFilename", () => {
  it("parses old-style patch filenames", () => {
    expect(getPatchDetailsFromFilename("@types/banana:3.4.2-beta.2.patch"))
      .toMatchInlineSnapshot(`
Object {
  "name": "@types/banana",
  "path": "node_modules/@types/banana",
  "pathSpecifier": "@types/banana",
  "version": "3.4.2-beta.2",
}
`)

    expect(getPatchDetailsFromFilename("banana:0.4.2.patch"))
      .toMatchInlineSnapshot(`
Object {
  "name": "banana",
  "path": "node_modules/banana",
  "pathSpecifier": "banana",
  "version": "0.4.2",
}
`)

    expect(getPatchDetailsFromFilename("banana+0.4.2.patch"))
      .toMatchInlineSnapshot(`
Object {
  "name": "banana",
  "path": "node_modules/banana",
  "pathSpecifier": "banana",
  "version": "0.4.2",
}
`)

    expect(getPatchDetailsFromFilename("banana-0.4.2.patch")).toBe(null)

    expect(getPatchDetailsFromFilename("@types+banana-0.4.2.patch")).toBe(null)
  })

  it("parses new-style patch filenames", () => {
    expect(getPatchDetailsFromFilename("banana=>apple+0.4.2.patch"))
      .toMatchInlineSnapshot(`
Object {
  "name": "apple",
  "path": "node_modules/banana/node_modules/apple",
  "pathSpecifier": "banana=>apple",
  "version": "0.4.2",
}
`)

    expect(
      getPatchDetailsFromFilename(
        "@types+banana=>@types+apple=>@mollusc+man+0.4.2-banana-tree.patch",
      ),
    ).toMatchInlineSnapshot(`
Object {
  "name": "@mollusc/man",
  "path": "node_modules/@types/banana/node_modules/@types/apple/node_modules/@mollusc/man",
  "pathSpecifier": "@types/banana=>@types/apple=>@mollusc/man",
  "version": "0.4.2-banana-tree",
}
`)
  })
})
