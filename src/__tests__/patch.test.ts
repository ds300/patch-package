// tslint:disable

import { parseHunkHeaderLine, patch } from "../patch"
import * as fs from "fs-extra"

const properReadFileSync = fs.readFileSync
const properWriteFileSync = fs.writeFileSync
const properUnlinkSync = fs.unlinkSync
const properMoveSync = fs.moveSync

describe("parseHunkHeaderLine", () => {
  it("parses hunk header lines", () => {
    expect(parseHunkHeaderLine("@@ -0,0 +1,21 @@")).toEqual({
      original: {
        length: 0,
        start: 0,
      },
      patched: {
        length: 21,
        start: 1,
      },
    })
  })
})

describe("patch", () => {
  let mockFs: null | Record<string, string> = null

  beforeEach(() => {
    mockFs = {
      "other/file.js": `once
upon
a
time
the
end`,
      "patch/file.patch": `diff --git a/other/file.js b/other/file.js
index b7cb24e..c152982 100644
--- a/other/file.js
+++ b/other/file.js
@@ -1,6 +1,6 @@
 once
 upon
-a
+the
 time
 the
 end
`,
      "other/file3.js": `somewhere
over
the
rainbow`,
      "delete/file.patch": `diff --git a/other/file3.js b/other/file3.js
deleted file mode 100644
index 9367e0d..0000000
--- a/other/file3.js
+++ /dev/null
@@ -1,4 +0,0 @@
-somewhere
-over
-the
-rainbow`,
      "create/file.patch": `diff --git a/other/newFile.js b/other/newFile.js
new file mode 100644
index 0000000..98043fb
--- /dev/null
+++ b/other/newFile.js
@@ -0,0 +1,5 @@
+this
+is
+a
+new
+file`,
      "rename/file.patch": `diff --git a/james.js b/peter.js
similarity index 100%
rename from james.js
rename to peter.js`,
      "james.js": "i am peter",
      "move-and-edit/file.patch": `diff --git a/banana.js b/orange.js
similarity index 68%
rename from banana.js
rename to orange.js
index 98043fb..f029e2f 100644
--- a/banana.js
+++ b/orange.js
@@ -1,5 +1,5 @@
 this
 is
 a
-new
+orange
 file`,
      "banana.js": `this
is
a
new
file`,
    }
    // tslint:disable
    ;(fs as any).readFileSync = jest.fn(path => {
      return mockFs && mockFs[path]
    })
    ;(fs as any).writeFileSync = jest.fn((path, data) => {
      mockFs && (mockFs[path] = data)
    })
    ;(fs as any).unlinkSync = jest.fn(path => {
      mockFs && delete mockFs[path]
    })
    ;(fs as any).moveSync = jest.fn((from, to) => {
      if (!mockFs) return

      mockFs[to] = mockFs[from]
      delete mockFs[from]
    })
  })

  afterEach(() => {
    ;(fs as any).readFileSync = properReadFileSync
    ;(fs as any).writeFileSync = properWriteFileSync
    ;(fs as any).unlinkSync = properUnlinkSync
    ;(fs as any).moveSync = properMoveSync
  })

  it("patches files", () => {
    patch("patch/file.patch")
    expect(mockFs && mockFs["other/file.js"]).toBe(`once
upon
the
time
the
end`)
  })

  it("deletes files", () => {
    patch("delete/file.patch")
    expect(mockFs && !mockFs["other/file3.js"])
  })

  it("creates new files", () => {
    patch("create/file.patch")
    expect(mockFs && mockFs["other/newFile.js"]).toBe(`this
is
a
new
file`)
  })

  it("renames files", () => {
    patch("rename/file.patch")
    expect(mockFs && !mockFs["james.js"])
    expect(mockFs && mockFs["peter.js"]).toBe("i am peter")
  })

  it("renames and modifies files", () => {
    patch("move-and-edit/file.patch")
    expect(mockFs && !mockFs["banana.js"])
    expect(mockFs && mockFs["orange.js"]).toBe(`this
is
a
orange
file`)
  })
})
