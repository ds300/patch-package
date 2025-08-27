"use strict";
// tslint:disable
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("../patch/parse");
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
`;
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
`;
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
`;
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
`;
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
`;
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
`;
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
`;
const crlfLineBreaks = `diff --git a/banana.ts b/banana.ts
new file mode 100644
index 0000000..3e1267f
--- /dev/null
+++ b/banana.ts
@@ -0,0 +1 @@
+this is a new file
`.replace(/\n/g, "\r\n");
const modeChangeAndModifyAndRename = `diff --git a/numbers.txt b/banana.txt
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
 
`;
const oldStylePatch = `patch-package
--- a/node_modules/graphql/utilities/assertValidName.js
+++ b/node_modules/graphql/utilities/assertValidName.js
@@ -41,10 +41,11 @@ function assertValidName(name) {
  */
 function isValidNameError(name, node) {
   !(typeof name === 'string') ? (0, _invariant2.default)(0, 'Expected string') : void 0;
-  if (name.length > 1 && name[0] === '_' && name[1] === '_') {
-    return new _GraphQLError.GraphQLError('Name "' + name + '" must not begin with "__", which is reserved by ' + 'GraphQL introspection.', node);
-  }
+  // if (name.length > 1 && name[0] === '_' && name[1] === '_') {
+  //   return new _GraphQLError.GraphQLError('Name "' + name + '" must not begin with "__", which is reserved by ' + 'GraphQL introspection.', node);
+  // }
   if (!NAME_RX.test(name)) {
     return new _GraphQLError.GraphQLError('Names must match /^[_a-zA-Z][_a-zA-Z0-9]*$/ but "' + name + '" does not.', node);
   }
+
 }
\\ No newline at end of file
--- a/node_modules/graphql/utilities/assertValidName.mjs
+++ b/node_modules/graphql/utilities/assertValidName.mjs
@@ -29,9 +29,9 @@ export function assertValidName(name) {
  */
 export function isValidNameError(name, node) {
   !(typeof name === 'string') ? invariant(0, 'Expected string') : void 0;
-  if (name.length > 1 && name[0] === '_' && name[1] === '_') {
-    return new GraphQLError('Name "' + name + '" must not begin with "__", which is reserved by ' + 'GraphQL introspection.', node);
-  }
+  // if (name.length > 1 && name[0] === '_' && name[1] === '_') {
+  //   return new GraphQLError('Name "' + name + '" must not begin with "__", which is reserved by ' + 'GraphQL introspection.', node);
+  // }
   if (!NAME_RX.test(name)) {
     return new GraphQLError('Names must match /^[_a-zA-Z][_a-zA-Z0-9]*$/ but "' + name + '" does not.', node);
   }
`;
describe("the patch parser", () => {
    it("works for a simple case", () => {
        expect((0, parse_1.parsePatchFile)(patch)).toMatchSnapshot();
    });
    it("fails when the patch file has invalid headers", () => {
        expect(() => (0, parse_1.parsePatchFile)(invalidHeaders1)).toThrow();
        expect(() => (0, parse_1.parsePatchFile)(invalidHeaders2)).toThrow();
        expect(() => (0, parse_1.parsePatchFile)(invalidHeaders3)).toThrow();
        expect(() => (0, parse_1.parsePatchFile)(invalidHeaders4)).toThrow();
        expect(() => (0, parse_1.parsePatchFile)(invalidHeaders5)).toThrow();
    });
    it("is OK when blank lines are accidentally created", () => {
        expect((0, parse_1.parsePatchFile)(accidentalBlankLine)).toEqual((0, parse_1.parsePatchFile)(patch));
    });
    it(`can handle files with CRLF line breaks`, () => {
        expect((0, parse_1.parsePatchFile)(crlfLineBreaks)).toMatchSnapshot();
    });
    it("works", () => {
        expect((0, parse_1.parsePatchFile)(modeChangeAndModifyAndRename)).toMatchSnapshot();
        expect((0, parse_1.parsePatchFile)(accidentalBlankLine)).toMatchSnapshot();
        expect((0, parse_1.parsePatchFile)(modeChangeAndModifyAndRename)).toMatchSnapshot();
    });
    it.only("parses old-style patches", () => {
        expect((0, parse_1.parsePatchFile)(oldStylePatch)).toMatchSnapshot();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpQkFBaUI7O0FBRWpCLDBDQUErQztBQUUvQyxNQUFNLEtBQUssR0FBRzs7Ozs7Ozs7Ozs7Q0FXYixDQUFBO0FBQ0QsTUFBTSxlQUFlLEdBQUc7Ozs7Ozs7Ozs7O0NBV3ZCLENBQUE7QUFFRCxNQUFNLGVBQWUsR0FBRzs7Ozs7Ozs7Ozs7Q0FXdkIsQ0FBQTtBQUVELE1BQU0sZUFBZSxHQUFHOzs7Ozs7Ozs7OztDQVd2QixDQUFBO0FBQ0QsTUFBTSxlQUFlLEdBQUc7Ozs7Ozs7Ozs7O0NBV3ZCLENBQUE7QUFFRCxNQUFNLGVBQWUsR0FBRzs7Ozs7Ozs7Ozs7Q0FXdkIsQ0FBQTtBQUVELE1BQU0sbUJBQW1CLEdBQUc7Ozs7Ozs7Ozs7O0NBVzNCLENBQUE7QUFFRCxNQUFNLGNBQWMsR0FBRzs7Ozs7OztDQU90QixDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7QUFFeEIsTUFBTSw0QkFBNEIsR0FBRzs7Ozs7Ozs7Ozs7Ozs7O0NBZXBDLENBQUE7QUFFRCxNQUFNLGFBQWEsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQWtDckIsQ0FBQTtBQUVELFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsRUFBRSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUNqQyxNQUFNLENBQUMsSUFBQSxzQkFBYyxFQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDakQsQ0FBQyxDQUFDLENBQUE7SUFDRixFQUFFLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFBLHNCQUFjLEVBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN2RCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBQSxzQkFBYyxFQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDdkQsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUEsc0JBQWMsRUFBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFBLHNCQUFjLEVBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN2RCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBQSxzQkFBYyxFQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDekQsQ0FBQyxDQUFDLENBQUE7SUFDRixFQUFFLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBQ3pELE1BQU0sQ0FBQyxJQUFBLHNCQUFjLEVBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFBLHNCQUFjLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUM1RSxDQUFDLENBQUMsQ0FBQTtJQUNGLEVBQUUsQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxDQUFDLElBQUEsc0JBQWMsRUFBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDZixNQUFNLENBQUMsSUFBQSxzQkFBYyxFQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUV0RSxNQUFNLENBQUMsSUFBQSxzQkFBYyxFQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUM3RCxNQUFNLENBQUMsSUFBQSxzQkFBYyxFQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUN4RSxDQUFDLENBQUMsQ0FBQTtJQUVGLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxJQUFBLHNCQUFjLEVBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUN6RCxDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGVcblxuaW1wb3J0IHsgcGFyc2VQYXRjaEZpbGUgfSBmcm9tIFwiLi4vcGF0Y2gvcGFyc2VcIlxuXG5jb25zdCBwYXRjaCA9IGBkaWZmIC0tZ2l0IGEvYmFuYW5hLnRzIGIvYmFuYW5hLnRzXG5pbmRleCAyZGU4M2RkLi44NDI2NTJjIDEwMDY0NFxuLS0tIGEvYmFuYW5hLnRzXG4rKysgYi9iYW5hbmEudHNcbkBAIC0xLDUgKzEsNSBAQFxuIHRoaXNcbiBpc1xuIFxuLWFcbitcbiBmaWxlXG5gXG5jb25zdCBpbnZhbGlkSGVhZGVyczEgPSBgZGlmZiAtLWdpdCBhL2JhbmFuYS50cyBiL2JhbmFuYS50c1xuaW5kZXggMmRlODNkZC4uODQyNjUyYyAxMDA2NDRcbi0tLSBhL2JhbmFuYS50c1xuKysrIGIvYmFuYW5hLnRzXG5AQCAtMSw1ICsxLDQgQEBcbiB0aGlzXG4gaXNcbiBcbi1hXG4rXG4gZmlsZVxuYFxuXG5jb25zdCBpbnZhbGlkSGVhZGVyczIgPSBgZGlmZiAtLWdpdCBhL2JhbmFuYS50cyBiL2JhbmFuYS50c1xuaW5kZXggMmRlODNkZC4uODQyNjUyYyAxMDA2NDRcbi0tLSBhL2JhbmFuYS50c1xuKysrIGIvYmFuYW5hLnRzXG5AQCAtMSw0ICsxLDUgQEBcbiB0aGlzXG4gaXNcbiBcbi1hXG4rXG4gZmlsZVxuYFxuXG5jb25zdCBpbnZhbGlkSGVhZGVyczMgPSBgZGlmZiAtLWdpdCBhL2JhbmFuYS50cyBiL2JhbmFuYS50c1xuaW5kZXggMmRlODNkZC4uODQyNjUyYyAxMDA2NDRcbi0tLSBhL2JhbmFuYS50c1xuKysrIGIvYmFuYW5hLnRzXG5AQCAtMSwwICsxLDUgQEBcbiB0aGlzXG4gaXNcbiBcbi1hXG4rXG4gZmlsZVxuYFxuY29uc3QgaW52YWxpZEhlYWRlcnM0ID0gYGRpZmYgLS1naXQgYS9iYW5hbmEudHMgYi9iYW5hbmEudHNcbmluZGV4IDJkZTgzZGQuLjg0MjY1MmMgMTAwNjQ0XG4tLS0gYS9iYW5hbmEudHNcbisrKyBiL2JhbmFuYS50c1xuQEAgLTEsNSArMSwwIEBAXG4gdGhpc1xuIGlzXG4gXG4tYVxuK1xuIGZpbGVcbmBcblxuY29uc3QgaW52YWxpZEhlYWRlcnM1ID0gYGRpZmYgLS1naXQgYS9iYW5hbmEudHMgYi9iYW5hbmEudHNcbmluZGV4IDJkZTgzZGQuLjg0MjY1MmMgMTAwNjQ0XG4tLS0gYS9iYW5hbmEudHNcbisrKyBiL2JhbmFuYS50c1xuQEAgLTEsNSArMSw1QEBcbiB0aGlzXG4gaXNcbiBcbi1hXG4rXG4gZmlsZVxuYFxuXG5jb25zdCBhY2NpZGVudGFsQmxhbmtMaW5lID0gYGRpZmYgLS1naXQgYS9iYW5hbmEudHMgYi9iYW5hbmEudHNcbmluZGV4IDJkZTgzZGQuLjg0MjY1MmMgMTAwNjQ0XG4tLS0gYS9iYW5hbmEudHNcbisrKyBiL2JhbmFuYS50c1xuQEAgLTEsNSArMSw1IEBAXG4gdGhpc1xuIGlzXG5cbi1hXG4rXG4gZmlsZVxuYFxuXG5jb25zdCBjcmxmTGluZUJyZWFrcyA9IGBkaWZmIC0tZ2l0IGEvYmFuYW5hLnRzIGIvYmFuYW5hLnRzXG5uZXcgZmlsZSBtb2RlIDEwMDY0NFxuaW5kZXggMDAwMDAwMC4uM2UxMjY3ZlxuLS0tIC9kZXYvbnVsbFxuKysrIGIvYmFuYW5hLnRzXG5AQCAtMCwwICsxIEBAXG4rdGhpcyBpcyBhIG5ldyBmaWxlXG5gLnJlcGxhY2UoL1xcbi9nLCBcIlxcclxcblwiKVxuXG5jb25zdCBtb2RlQ2hhbmdlQW5kTW9kaWZ5QW5kUmVuYW1lID0gYGRpZmYgLS1naXQgYS9udW1iZXJzLnR4dCBiL2JhbmFuYS50eHRcbm9sZCBtb2RlIDEwMDY0NFxubmV3IG1vZGUgMTAwNzU1XG5zaW1pbGFyaXR5IGluZGV4IDk2JVxucmVuYW1lIGZyb20gbnVtYmVycy50eHRcbnJlbmFtZSB0byBiYW5hbmEudHh0XG5pbmRleCBmYmYxNzg1Li45MmQyYzVmXG4tLS0gYS9udW1iZXJzLnR4dFxuKysrIGIvYmFuYW5hLnR4dFxuQEAgLTEsNCArMSw0IEBAXG4tb25lXG4rbmVcbiBcbiB0d29cbiBcbmBcblxuY29uc3Qgb2xkU3R5bGVQYXRjaCA9IGBwYXRjaC1wYWNrYWdlXG4tLS0gYS9ub2RlX21vZHVsZXMvZ3JhcGhxbC91dGlsaXRpZXMvYXNzZXJ0VmFsaWROYW1lLmpzXG4rKysgYi9ub2RlX21vZHVsZXMvZ3JhcGhxbC91dGlsaXRpZXMvYXNzZXJ0VmFsaWROYW1lLmpzXG5AQCAtNDEsMTAgKzQxLDExIEBAIGZ1bmN0aW9uIGFzc2VydFZhbGlkTmFtZShuYW1lKSB7XG4gICovXG4gZnVuY3Rpb24gaXNWYWxpZE5hbWVFcnJvcihuYW1lLCBub2RlKSB7XG4gICAhKHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJykgPyAoMCwgX2ludmFyaWFudDIuZGVmYXVsdCkoMCwgJ0V4cGVjdGVkIHN0cmluZycpIDogdm9pZCAwO1xuLSAgaWYgKG5hbWUubGVuZ3RoID4gMSAmJiBuYW1lWzBdID09PSAnXycgJiYgbmFtZVsxXSA9PT0gJ18nKSB7XG4tICAgIHJldHVybiBuZXcgX0dyYXBoUUxFcnJvci5HcmFwaFFMRXJyb3IoJ05hbWUgXCInICsgbmFtZSArICdcIiBtdXN0IG5vdCBiZWdpbiB3aXRoIFwiX19cIiwgd2hpY2ggaXMgcmVzZXJ2ZWQgYnkgJyArICdHcmFwaFFMIGludHJvc3BlY3Rpb24uJywgbm9kZSk7XG4tICB9XG4rICAvLyBpZiAobmFtZS5sZW5ndGggPiAxICYmIG5hbWVbMF0gPT09ICdfJyAmJiBuYW1lWzFdID09PSAnXycpIHtcbisgIC8vICAgcmV0dXJuIG5ldyBfR3JhcGhRTEVycm9yLkdyYXBoUUxFcnJvcignTmFtZSBcIicgKyBuYW1lICsgJ1wiIG11c3Qgbm90IGJlZ2luIHdpdGggXCJfX1wiLCB3aGljaCBpcyByZXNlcnZlZCBieSAnICsgJ0dyYXBoUUwgaW50cm9zcGVjdGlvbi4nLCBub2RlKTtcbisgIC8vIH1cbiAgIGlmICghTkFNRV9SWC50ZXN0KG5hbWUpKSB7XG4gICAgIHJldHVybiBuZXcgX0dyYXBoUUxFcnJvci5HcmFwaFFMRXJyb3IoJ05hbWVzIG11c3QgbWF0Y2ggL15bX2EtekEtWl1bX2EtekEtWjAtOV0qJC8gYnV0IFwiJyArIG5hbWUgKyAnXCIgZG9lcyBub3QuJywgbm9kZSk7XG4gICB9XG4rXG4gfVxuXFxcXCBObyBuZXdsaW5lIGF0IGVuZCBvZiBmaWxlXG4tLS0gYS9ub2RlX21vZHVsZXMvZ3JhcGhxbC91dGlsaXRpZXMvYXNzZXJ0VmFsaWROYW1lLm1qc1xuKysrIGIvbm9kZV9tb2R1bGVzL2dyYXBocWwvdXRpbGl0aWVzL2Fzc2VydFZhbGlkTmFtZS5tanNcbkBAIC0yOSw5ICsyOSw5IEBAIGV4cG9ydCBmdW5jdGlvbiBhc3NlcnRWYWxpZE5hbWUobmFtZSkge1xuICAqL1xuIGV4cG9ydCBmdW5jdGlvbiBpc1ZhbGlkTmFtZUVycm9yKG5hbWUsIG5vZGUpIHtcbiAgICEodHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnKSA/IGludmFyaWFudCgwLCAnRXhwZWN0ZWQgc3RyaW5nJykgOiB2b2lkIDA7XG4tICBpZiAobmFtZS5sZW5ndGggPiAxICYmIG5hbWVbMF0gPT09ICdfJyAmJiBuYW1lWzFdID09PSAnXycpIHtcbi0gICAgcmV0dXJuIG5ldyBHcmFwaFFMRXJyb3IoJ05hbWUgXCInICsgbmFtZSArICdcIiBtdXN0IG5vdCBiZWdpbiB3aXRoIFwiX19cIiwgd2hpY2ggaXMgcmVzZXJ2ZWQgYnkgJyArICdHcmFwaFFMIGludHJvc3BlY3Rpb24uJywgbm9kZSk7XG4tICB9XG4rICAvLyBpZiAobmFtZS5sZW5ndGggPiAxICYmIG5hbWVbMF0gPT09ICdfJyAmJiBuYW1lWzFdID09PSAnXycpIHtcbisgIC8vICAgcmV0dXJuIG5ldyBHcmFwaFFMRXJyb3IoJ05hbWUgXCInICsgbmFtZSArICdcIiBtdXN0IG5vdCBiZWdpbiB3aXRoIFwiX19cIiwgd2hpY2ggaXMgcmVzZXJ2ZWQgYnkgJyArICdHcmFwaFFMIGludHJvc3BlY3Rpb24uJywgbm9kZSk7XG4rICAvLyB9XG4gICBpZiAoIU5BTUVfUlgudGVzdChuYW1lKSkge1xuICAgICByZXR1cm4gbmV3IEdyYXBoUUxFcnJvcignTmFtZXMgbXVzdCBtYXRjaCAvXltfYS16QS1aXVtfYS16QS1aMC05XSokLyBidXQgXCInICsgbmFtZSArICdcIiBkb2VzIG5vdC4nLCBub2RlKTtcbiAgIH1cbmBcblxuZGVzY3JpYmUoXCJ0aGUgcGF0Y2ggcGFyc2VyXCIsICgpID0+IHtcbiAgaXQoXCJ3b3JrcyBmb3IgYSBzaW1wbGUgY2FzZVwiLCAoKSA9PiB7XG4gICAgZXhwZWN0KHBhcnNlUGF0Y2hGaWxlKHBhdGNoKSkudG9NYXRjaFNuYXBzaG90KClcbiAgfSlcbiAgaXQoXCJmYWlscyB3aGVuIHRoZSBwYXRjaCBmaWxlIGhhcyBpbnZhbGlkIGhlYWRlcnNcIiwgKCkgPT4ge1xuICAgIGV4cGVjdCgoKSA9PiBwYXJzZVBhdGNoRmlsZShpbnZhbGlkSGVhZGVyczEpKS50b1Rocm93KClcbiAgICBleHBlY3QoKCkgPT4gcGFyc2VQYXRjaEZpbGUoaW52YWxpZEhlYWRlcnMyKSkudG9UaHJvdygpXG4gICAgZXhwZWN0KCgpID0+IHBhcnNlUGF0Y2hGaWxlKGludmFsaWRIZWFkZXJzMykpLnRvVGhyb3coKVxuICAgIGV4cGVjdCgoKSA9PiBwYXJzZVBhdGNoRmlsZShpbnZhbGlkSGVhZGVyczQpKS50b1Rocm93KClcbiAgICBleHBlY3QoKCkgPT4gcGFyc2VQYXRjaEZpbGUoaW52YWxpZEhlYWRlcnM1KSkudG9UaHJvdygpXG4gIH0pXG4gIGl0KFwiaXMgT0sgd2hlbiBibGFuayBsaW5lcyBhcmUgYWNjaWRlbnRhbGx5IGNyZWF0ZWRcIiwgKCkgPT4ge1xuICAgIGV4cGVjdChwYXJzZVBhdGNoRmlsZShhY2NpZGVudGFsQmxhbmtMaW5lKSkudG9FcXVhbChwYXJzZVBhdGNoRmlsZShwYXRjaCkpXG4gIH0pXG4gIGl0KGBjYW4gaGFuZGxlIGZpbGVzIHdpdGggQ1JMRiBsaW5lIGJyZWFrc2AsICgpID0+IHtcbiAgICBleHBlY3QocGFyc2VQYXRjaEZpbGUoY3JsZkxpbmVCcmVha3MpKS50b01hdGNoU25hcHNob3QoKVxuICB9KVxuXG4gIGl0KFwid29ya3NcIiwgKCkgPT4ge1xuICAgIGV4cGVjdChwYXJzZVBhdGNoRmlsZShtb2RlQ2hhbmdlQW5kTW9kaWZ5QW5kUmVuYW1lKSkudG9NYXRjaFNuYXBzaG90KClcblxuICAgIGV4cGVjdChwYXJzZVBhdGNoRmlsZShhY2NpZGVudGFsQmxhbmtMaW5lKSkudG9NYXRjaFNuYXBzaG90KClcbiAgICBleHBlY3QocGFyc2VQYXRjaEZpbGUobW9kZUNoYW5nZUFuZE1vZGlmeUFuZFJlbmFtZSkpLnRvTWF0Y2hTbmFwc2hvdCgpXG4gIH0pXG5cbiAgaXQub25seShcInBhcnNlcyBvbGQtc3R5bGUgcGF0Y2hlc1wiLCAoKSA9PiB7XG4gICAgZXhwZWN0KHBhcnNlUGF0Y2hGaWxlKG9sZFN0eWxlUGF0Y2gpKS50b01hdGNoU25hcHNob3QoKVxuICB9KVxufSlcbiJdfQ==