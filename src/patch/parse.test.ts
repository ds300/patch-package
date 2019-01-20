// tslint:disable

import { parsePatchFile } from "../patch/parse"

const patch = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,5 @@
 this
 is
 
-a
+
 file
`
const invalidHeaders1 = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,4 @@
 this
 is
 
-a
+
 file
`

const invalidHeaders2 = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,4 +1,5 @@
 this
 is
 
-a
+
 file
`

const invalidHeaders3 = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,0 +1,5 @@
 this
 is
 
-a
+
 file
`
const invalidHeaders4 = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,0 @@
 this
 is
 
-a
+
 file
`

const invalidHeaders5 = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,5@@
 this
 is
 
-a
+
 file
`

const accidentalBlankLine = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,5 @@
 this
 is

-a
+
 file
`

const crlfLineBreaks = `diff --git a/banana.ts b/banana.ts
new file mode 100644
index 0000000..3e1267f
--- /dev/null
+++ b/banana.ts
@@ -0,0 +1 @@
+this is a new file
`.replace(/\n/g, "\r\n")

const modeChangeAndModifyAndRename = `
diff --git a/numbers.txt b/banana.txt
old mode 100644
new mode 100755
similarity index 96%
rename from numbers.txt
rename to banana.txt
index fbf1785..92d2c5f
--- a/numbers.txt
+++ b/banana.txt
@@ -1,4 +1,4 @@
-one
+ne
 
 two
 
`

describe("the patch parser", () => {
  it("works for a simple case", () => {
    expect(parsePatchFile(patch)).toMatchSnapshot()
  })
  it("fails when the patch file has invalid headers", () => {
    expect(() => parsePatchFile(invalidHeaders1)).toThrow()
    expect(() => parsePatchFile(invalidHeaders2)).toThrow()
    expect(() => parsePatchFile(invalidHeaders3)).toThrow()
    expect(() => parsePatchFile(invalidHeaders4)).toThrow()
    expect(() => parsePatchFile(invalidHeaders5)).toThrow()
  })
  it("is OK when blank lines are accidentally created", () => {
    expect(parsePatchFile(accidentalBlankLine)).toEqual(parsePatchFile(patch))
  })
  it(`can handle files with CRLF line breaks`, () => {
    expect(parsePatchFile(crlfLineBreaks)).toMatchSnapshot()
  })

  it("works", () => {
    expect(parsePatchFile(modeChangeAndModifyAndRename)).toMatchSnapshot()

    expect(parsePatchFile(accidentalBlankLine)).toMatchSnapshot()
    expect(parsePatchFile(modeChangeAndModifyAndRename)).toMatchSnapshot()
  })
})
