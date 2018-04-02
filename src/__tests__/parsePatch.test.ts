// tslint:disable

import { parsePatch } from "../patch/parse"

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

describe("the patch parser", () => {
  it("works for a simple case", () => {
    expect(parsePatch(patch)).toMatchSnapshot()
  })
  it("fails when the patch file has invalid headers", () => {
    expect(() => parsePatch(invalidHeaders1)).toThrow()
    expect(() => parsePatch(invalidHeaders2)).toThrow()
    expect(() => parsePatch(invalidHeaders3)).toThrow()
    expect(() => parsePatch(invalidHeaders4)).toThrow()
    expect(() => parsePatch(invalidHeaders5)).toThrow()
  })
  it("fails when blank lines are accidentally created", () => {
    expect(() => parsePatch(accidentalBlankLine)).toThrow()
  })
})
