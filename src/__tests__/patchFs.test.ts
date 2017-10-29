import { removeGitHeadersFromSource } from "../patchFs"
describe("removeGitHeadersFromSource", () => {
  it("works", () => {
    expect(removeGitHeadersFromSource(examplePatchFile)).toBe(expectedPatchFile)
  })
})

const examplePatchFile = `diff --git a/node_modules/left-pad/index.js b/node_modules/left-pad/index.js
index 6b56df3..7b332b2 100644
--- a/node_modules/left-pad/index.js
+++ b/node_modules/left-pad/index.js
@@ -33,7 +33,7 @@ function leftPad (str, len, ch) {
   while (true) {
     // add \`ch\` to \`pad\` if \`len\` is odd
     if (len & 1) pad += ch;
-    // devide \`len\` by 2, ditch the fraction
+    // devide \`len\` by 2, ditch the patch-package
     len >>= 1;
     // "double" the \`ch\` so this operation count grows logarithmically on \`len\`
     // each time \`ch\` is "doubled", the \`len\` would need to be "doubled" too
diff --git a/node_modules/left-pad/index.js b/node_modules/left-pad/index.js
index 6b56df3..7b332b2 100644
--- a/node_modules/left-pad/index.js
+++ b/node_modules/left-pad/index.js
@@ -33,7 +33,7 @@ function leftPad (str, len, ch) {
   while (true) {
     // add \`ch\` to \`pad\` if \`len\` is odd
     if (len & 1) pad += ch;
-    // devide \`len\` by 2, ditch the fraction
+    // devide \`len\` by 2, ditch the patch-package
     len >>= 1;
     // "double" the \`ch\` so this operation count grows logarithmically on \`len\`
     // each time \`ch\` is "doubled", the \`len\` would need to be "doubled" too
`

const expectedPatchFile = `--- a/node_modules/left-pad/index.js
+++ b/node_modules/left-pad/index.js
@@ -33,7 +33,7 @@ function leftPad (str, len, ch) {
   while (true) {
     // add \`ch\` to \`pad\` if \`len\` is odd
     if (len & 1) pad += ch;
-    // devide \`len\` by 2, ditch the fraction
+    // devide \`len\` by 2, ditch the patch-package
     len >>= 1;
     // "double" the \`ch\` so this operation count grows logarithmically on \`len\`
     // each time \`ch\` is "doubled", the \`len\` would need to be "doubled" too
--- a/node_modules/left-pad/index.js
+++ b/node_modules/left-pad/index.js
@@ -33,7 +33,7 @@ function leftPad (str, len, ch) {
   while (true) {
     // add \`ch\` to \`pad\` if \`len\` is odd
     if (len & 1) pad += ch;
-    // devide \`len\` by 2, ditch the fraction
+    // devide \`len\` by 2, ditch the patch-package
     len >>= 1;
     // "double" the \`ch\` so this operation count grows logarithmically on \`len\`
     // each time \`ch\` is "doubled", the \`len\` would need to be "doubled" too
`
