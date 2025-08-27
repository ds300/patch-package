"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PackageDetails_1 = require("./PackageDetails");
describe("getPackageDetailsFromPatchFilename", () => {
    it("parses new-style patch filenames", () => {
        expect((0, PackageDetails_1.getPackageDetailsFromPatchFilename)("banana++apple+0.4.2.patch"))
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
`);
        expect((0, PackageDetails_1.getPackageDetailsFromPatchFilename)("@types+banana++@types+apple++@mollusc+man+0.4.2-banana-tree.patch")).toMatchInlineSnapshot(`
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
`);
        expect((0, PackageDetails_1.getPackageDetailsFromPatchFilename)("@types+banana.patch++hello+0.4.2-banana-tree.patch")).toMatchInlineSnapshot(`
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
`);
        expect((0, PackageDetails_1.getPackageDetailsFromPatchFilename)("@types+banana.patch++hello+0.4.2-banana-tree.dev.patch")).toMatchInlineSnapshot(`
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
`);
    });
    it("works for ordered patches", () => {
        expect((0, PackageDetails_1.getPackageDetailsFromPatchFilename)("left-pad+1.3.0+02+world"))
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
`);
        expect((0, PackageDetails_1.getPackageDetailsFromPatchFilename)("@microsoft/api-extractor+2.0.0+01+FixThing")).toMatchInlineSnapshot(`
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
`);
    });
});
describe("getPatchDetailsFromCliString", () => {
    it("handles a minimal package name", () => {
        expect((0, PackageDetails_1.getPatchDetailsFromCliString)("patch-package")).toMatchInlineSnapshot(`
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
`);
    });
    it("handles a scoped package name", () => {
        expect((0, PackageDetails_1.getPatchDetailsFromCliString)("@david/patch-package")).toMatchInlineSnapshot(`
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
`);
    });
    it("handles a nested package name", () => {
        expect((0, PackageDetails_1.getPatchDetailsFromCliString)("david/patch-package")).toMatchInlineSnapshot(`
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
`);
    });
    it("handles a nested package name with scopes", () => {
        expect((0, PackageDetails_1.getPatchDetailsFromCliString)("@david/patch-package/banana")).toMatchInlineSnapshot(`
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
`);
        expect((0, PackageDetails_1.getPatchDetailsFromCliString)("@david/patch-package/@david/banana")).toMatchInlineSnapshot(`
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
`);
        expect((0, PackageDetails_1.getPatchDetailsFromCliString)("david/patch-package/@david/banana")).toMatchInlineSnapshot(`
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
`);
    });
});
describe("parseNameAndVersion", () => {
    it("works for good-looking names", () => {
        expect((0, PackageDetails_1.parseNameAndVersion)("lodash+2.3.4")).toMatchInlineSnapshot(`
Object {
  "packageName": "lodash",
  "version": "2.3.4",
}
`);
        expect((0, PackageDetails_1.parseNameAndVersion)("patch-package+2.0.0-alpha.3"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "patch-package",
  "version": "2.0.0-alpha.3",
}
`);
    });
    it("works for scoped package names", () => {
        expect((0, PackageDetails_1.parseNameAndVersion)("@react-spring+rafz+2.0.0-alpha.3"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@react-spring/rafz",
  "version": "2.0.0-alpha.3",
}
`);
        expect((0, PackageDetails_1.parseNameAndVersion)("@microsoft+api-extractor+2.2.3"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@microsoft/api-extractor",
  "version": "2.2.3",
}
`);
    });
    it("works for ordered patches", () => {
        expect((0, PackageDetails_1.parseNameAndVersion)("patch-package+2.0.0+01"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "patch-package",
  "sequenceNumber": 1,
  "version": "2.0.0",
}
`);
        expect((0, PackageDetails_1.parseNameAndVersion)("@react-spring+rafz+2.0.0-alpha.3+23"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@react-spring/rafz",
  "sequenceNumber": 23,
  "version": "2.0.0-alpha.3",
}
`);
        expect((0, PackageDetails_1.parseNameAndVersion)("@microsoft+api-extractor+2.0.0+001"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@microsoft/api-extractor",
  "sequenceNumber": 1,
  "version": "2.0.0",
}
`);
    });
    it("works for ordered patches with names", () => {
        expect((0, PackageDetails_1.parseNameAndVersion)("patch-package+2.0.0+021+FixImportantThing"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "patch-package",
  "sequenceName": "FixImportantThing",
  "sequenceNumber": 21,
  "version": "2.0.0",
}
`);
        expect((0, PackageDetails_1.parseNameAndVersion)("@react-spring+rafz+2.0.0-alpha.3+000023+Foo"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@react-spring/rafz",
  "sequenceName": "Foo",
  "sequenceNumber": 23,
  "version": "2.0.0-alpha.3",
}
`);
        expect((0, PackageDetails_1.parseNameAndVersion)("@microsoft+api-extractor+2.0.0+001+Bar"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@microsoft/api-extractor",
  "sequenceName": "Bar",
  "sequenceNumber": 1,
  "version": "2.0.0",
}
`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGFja2FnZURldGFpbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9QYWNrYWdlRGV0YWlscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEscURBSXlCO0FBRXpCLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7SUFDbEQsRUFBRSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtRQUMxQyxNQUFNLENBQUMsSUFBQSxtREFBa0MsRUFBQywyQkFBMkIsQ0FBQyxDQUFDO2FBQ3BFLHFCQUFxQixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7OztDQWlCNUIsQ0FBQyxDQUFBO1FBRUUsTUFBTSxDQUNKLElBQUEsbURBQWtDLEVBQ2hDLG1FQUFtRSxDQUNwRSxDQUNGLENBQUMscUJBQXFCLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQWtCM0IsQ0FBQyxDQUFBO1FBRUUsTUFBTSxDQUNKLElBQUEsbURBQWtDLEVBQ2hDLG9EQUFvRCxDQUNyRCxDQUNGLENBQUMscUJBQXFCLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBaUIzQixDQUFDLENBQUE7UUFFRSxNQUFNLENBQ0osSUFBQSxtREFBa0MsRUFDaEMsd0RBQXdELENBQ3pELENBQ0YsQ0FBQyxxQkFBcUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FpQjNCLENBQUMsQ0FBQTtJQUNBLENBQUMsQ0FBQyxDQUFBO0lBRUYsRUFBRSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUNuQyxNQUFNLENBQUMsSUFBQSxtREFBa0MsRUFBQyx5QkFBeUIsQ0FBQyxDQUFDO2FBQ2xFLHFCQUFxQixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7O0NBZ0I1QixDQUFDLENBQUE7UUFFRSxNQUFNLENBQ0osSUFBQSxtREFBa0MsRUFDaEMsNENBQTRDLENBQzdDLENBQ0YsQ0FBQyxxQkFBcUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7OztDQWdCM0IsQ0FBQyxDQUFBO0lBQ0EsQ0FBQyxDQUFDLENBQUE7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OztDQU81QixDQUFDLENBQUE7UUFDRSxNQUFNLENBQUMsSUFBQSxvQ0FBbUIsRUFBQyw2Q0FBNkMsQ0FBQyxDQUFDO2FBQ3ZFLHFCQUFxQixDQUFDOzs7Ozs7O0NBTzVCLENBQUMsQ0FBQTtRQUNFLE1BQU0sQ0FBQyxJQUFBLG9DQUFtQixFQUFDLHdDQUF3QyxDQUFDLENBQUM7YUFDbEUscUJBQXFCLENBQUM7Ozs7Ozs7Q0FPNUIsQ0FBQyxDQUFBO0lBQ0EsQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGdldFBhY2thZ2VEZXRhaWxzRnJvbVBhdGNoRmlsZW5hbWUsXG4gIGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcsXG4gIHBhcnNlTmFtZUFuZFZlcnNpb24sXG59IGZyb20gXCIuL1BhY2thZ2VEZXRhaWxzXCJcblxuZGVzY3JpYmUoXCJnZXRQYWNrYWdlRGV0YWlsc0Zyb21QYXRjaEZpbGVuYW1lXCIsICgpID0+IHtcbiAgaXQoXCJwYXJzZXMgbmV3LXN0eWxlIHBhdGNoIGZpbGVuYW1lc1wiLCAoKSA9PiB7XG4gICAgZXhwZWN0KGdldFBhY2thZ2VEZXRhaWxzRnJvbVBhdGNoRmlsZW5hbWUoXCJiYW5hbmErK2FwcGxlKzAuNC4yLnBhdGNoXCIpKVxuICAgICAgLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5PYmplY3Qge1xuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwiYmFuYW5hID0+IGFwcGxlXCIsXG4gIFwiaXNEZXZPbmx5XCI6IGZhbHNlLFxuICBcImlzTmVzdGVkXCI6IHRydWUsXG4gIFwibmFtZVwiOiBcImFwcGxlXCIsXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcbiAgICBcImJhbmFuYVwiLFxuICAgIFwiYXBwbGVcIixcbiAgXSxcbiAgXCJwYXRjaEZpbGVuYW1lXCI6IFwiYmFuYW5hKythcHBsZSswLjQuMi5wYXRjaFwiLFxuICBcInBhdGhcIjogXCJub2RlX21vZHVsZXMvYmFuYW5hL25vZGVfbW9kdWxlcy9hcHBsZVwiLFxuICBcInBhdGhTcGVjaWZpZXJcIjogXCJiYW5hbmEvYXBwbGVcIixcbiAgXCJzZXF1ZW5jZU5hbWVcIjogdW5kZWZpbmVkLFxuICBcInNlcXVlbmNlTnVtYmVyXCI6IHVuZGVmaW5lZCxcbiAgXCJ2ZXJzaW9uXCI6IFwiMC40LjJcIixcbn1cbmApXG5cbiAgICBleHBlY3QoXG4gICAgICBnZXRQYWNrYWdlRGV0YWlsc0Zyb21QYXRjaEZpbGVuYW1lKFxuICAgICAgICBcIkB0eXBlcytiYW5hbmErK0B0eXBlcythcHBsZSsrQG1vbGx1c2MrbWFuKzAuNC4yLWJhbmFuYS10cmVlLnBhdGNoXCIsXG4gICAgICApLFxuICAgICkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbk9iamVjdCB7XG4gIFwiaHVtYW5SZWFkYWJsZVBhdGhTcGVjaWZpZXJcIjogXCJAdHlwZXMvYmFuYW5hID0+IEB0eXBlcy9hcHBsZSA9PiBAbW9sbHVzYy9tYW5cIixcbiAgXCJpc0Rldk9ubHlcIjogZmFsc2UsXG4gIFwiaXNOZXN0ZWRcIjogdHJ1ZSxcbiAgXCJuYW1lXCI6IFwiQG1vbGx1c2MvbWFuXCIsXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcbiAgICBcIkB0eXBlcy9iYW5hbmFcIixcbiAgICBcIkB0eXBlcy9hcHBsZVwiLFxuICAgIFwiQG1vbGx1c2MvbWFuXCIsXG4gIF0sXG4gIFwicGF0Y2hGaWxlbmFtZVwiOiBcIkB0eXBlcytiYW5hbmErK0B0eXBlcythcHBsZSsrQG1vbGx1c2MrbWFuKzAuNC4yLWJhbmFuYS10cmVlLnBhdGNoXCIsXG4gIFwicGF0aFwiOiBcIm5vZGVfbW9kdWxlcy9AdHlwZXMvYmFuYW5hL25vZGVfbW9kdWxlcy9AdHlwZXMvYXBwbGUvbm9kZV9tb2R1bGVzL0Btb2xsdXNjL21hblwiLFxuICBcInBhdGhTcGVjaWZpZXJcIjogXCJAdHlwZXMvYmFuYW5hL0B0eXBlcy9hcHBsZS9AbW9sbHVzYy9tYW5cIixcbiAgXCJzZXF1ZW5jZU5hbWVcIjogdW5kZWZpbmVkLFxuICBcInNlcXVlbmNlTnVtYmVyXCI6IHVuZGVmaW5lZCxcbiAgXCJ2ZXJzaW9uXCI6IFwiMC40LjItYmFuYW5hLXRyZWVcIixcbn1cbmApXG5cbiAgICBleHBlY3QoXG4gICAgICBnZXRQYWNrYWdlRGV0YWlsc0Zyb21QYXRjaEZpbGVuYW1lKFxuICAgICAgICBcIkB0eXBlcytiYW5hbmEucGF0Y2grK2hlbGxvKzAuNC4yLWJhbmFuYS10cmVlLnBhdGNoXCIsXG4gICAgICApLFxuICAgICkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbk9iamVjdCB7XG4gIFwiaHVtYW5SZWFkYWJsZVBhdGhTcGVjaWZpZXJcIjogXCJAdHlwZXMvYmFuYW5hLnBhdGNoID0+IGhlbGxvXCIsXG4gIFwiaXNEZXZPbmx5XCI6IGZhbHNlLFxuICBcImlzTmVzdGVkXCI6IHRydWUsXG4gIFwibmFtZVwiOiBcImhlbGxvXCIsXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcbiAgICBcIkB0eXBlcy9iYW5hbmEucGF0Y2hcIixcbiAgICBcImhlbGxvXCIsXG4gIF0sXG4gIFwicGF0Y2hGaWxlbmFtZVwiOiBcIkB0eXBlcytiYW5hbmEucGF0Y2grK2hlbGxvKzAuNC4yLWJhbmFuYS10cmVlLnBhdGNoXCIsXG4gIFwicGF0aFwiOiBcIm5vZGVfbW9kdWxlcy9AdHlwZXMvYmFuYW5hLnBhdGNoL25vZGVfbW9kdWxlcy9oZWxsb1wiLFxuICBcInBhdGhTcGVjaWZpZXJcIjogXCJAdHlwZXMvYmFuYW5hLnBhdGNoL2hlbGxvXCIsXG4gIFwic2VxdWVuY2VOYW1lXCI6IHVuZGVmaW5lZCxcbiAgXCJzZXF1ZW5jZU51bWJlclwiOiB1bmRlZmluZWQsXG4gIFwidmVyc2lvblwiOiBcIjAuNC4yLWJhbmFuYS10cmVlXCIsXG59XG5gKVxuXG4gICAgZXhwZWN0KFxuICAgICAgZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcbiAgICAgICAgXCJAdHlwZXMrYmFuYW5hLnBhdGNoKytoZWxsbyswLjQuMi1iYW5hbmEtdHJlZS5kZXYucGF0Y2hcIixcbiAgICAgICksXG4gICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuT2JqZWN0IHtcbiAgXCJodW1hblJlYWRhYmxlUGF0aFNwZWNpZmllclwiOiBcIkB0eXBlcy9iYW5hbmEucGF0Y2ggPT4gaGVsbG9cIixcbiAgXCJpc0Rldk9ubHlcIjogdHJ1ZSxcbiAgXCJpc05lc3RlZFwiOiB0cnVlLFxuICBcIm5hbWVcIjogXCJoZWxsb1wiLFxuICBcInBhY2thZ2VOYW1lc1wiOiBBcnJheSBbXG4gICAgXCJAdHlwZXMvYmFuYW5hLnBhdGNoXCIsXG4gICAgXCJoZWxsb1wiLFxuICBdLFxuICBcInBhdGNoRmlsZW5hbWVcIjogXCJAdHlwZXMrYmFuYW5hLnBhdGNoKytoZWxsbyswLjQuMi1iYW5hbmEtdHJlZS5kZXYucGF0Y2hcIixcbiAgXCJwYXRoXCI6IFwibm9kZV9tb2R1bGVzL0B0eXBlcy9iYW5hbmEucGF0Y2gvbm9kZV9tb2R1bGVzL2hlbGxvXCIsXG4gIFwicGF0aFNwZWNpZmllclwiOiBcIkB0eXBlcy9iYW5hbmEucGF0Y2gvaGVsbG9cIixcbiAgXCJzZXF1ZW5jZU5hbWVcIjogdW5kZWZpbmVkLFxuICBcInNlcXVlbmNlTnVtYmVyXCI6IHVuZGVmaW5lZCxcbiAgXCJ2ZXJzaW9uXCI6IFwiMC40LjItYmFuYW5hLXRyZWVcIixcbn1cbmApXG4gIH0pXG5cbiAgaXQoXCJ3b3JrcyBmb3Igb3JkZXJlZCBwYXRjaGVzXCIsICgpID0+IHtcbiAgICBleHBlY3QoZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcImxlZnQtcGFkKzEuMy4wKzAyK3dvcmxkXCIpKVxuICAgICAgLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5PYmplY3Qge1xuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwibGVmdC1wYWRcIixcbiAgXCJpc0Rldk9ubHlcIjogZmFsc2UsXG4gIFwiaXNOZXN0ZWRcIjogZmFsc2UsXG4gIFwibmFtZVwiOiBcImxlZnQtcGFkXCIsXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcbiAgICBcImxlZnQtcGFkXCIsXG4gIF0sXG4gIFwicGF0Y2hGaWxlbmFtZVwiOiBcImxlZnQtcGFkKzEuMy4wKzAyK3dvcmxkXCIsXG4gIFwicGF0aFwiOiBcIm5vZGVfbW9kdWxlcy9sZWZ0LXBhZFwiLFxuICBcInBhdGhTcGVjaWZpZXJcIjogXCJsZWZ0LXBhZFwiLFxuICBcInNlcXVlbmNlTmFtZVwiOiBcIndvcmxkXCIsXG4gIFwic2VxdWVuY2VOdW1iZXJcIjogMixcbiAgXCJ2ZXJzaW9uXCI6IFwiMS4zLjBcIixcbn1cbmApXG5cbiAgICBleHBlY3QoXG4gICAgICBnZXRQYWNrYWdlRGV0YWlsc0Zyb21QYXRjaEZpbGVuYW1lKFxuICAgICAgICBcIkBtaWNyb3NvZnQvYXBpLWV4dHJhY3RvcisyLjAuMCswMStGaXhUaGluZ1wiLFxuICAgICAgKSxcbiAgICApLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5PYmplY3Qge1xuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwiQG1pY3Jvc29mdC9hcGktZXh0cmFjdG9yXCIsXG4gIFwiaXNEZXZPbmx5XCI6IGZhbHNlLFxuICBcImlzTmVzdGVkXCI6IGZhbHNlLFxuICBcIm5hbWVcIjogXCJAbWljcm9zb2Z0L2FwaS1leHRyYWN0b3JcIixcbiAgXCJwYWNrYWdlTmFtZXNcIjogQXJyYXkgW1xuICAgIFwiQG1pY3Jvc29mdC9hcGktZXh0cmFjdG9yXCIsXG4gIF0sXG4gIFwicGF0Y2hGaWxlbmFtZVwiOiBcIkBtaWNyb3NvZnQvYXBpLWV4dHJhY3RvcisyLjAuMCswMStGaXhUaGluZ1wiLFxuICBcInBhdGhcIjogXCJub2RlX21vZHVsZXMvQG1pY3Jvc29mdC9hcGktZXh0cmFjdG9yXCIsXG4gIFwicGF0aFNwZWNpZmllclwiOiBcIkBtaWNyb3NvZnQvYXBpLWV4dHJhY3RvclwiLFxuICBcInNlcXVlbmNlTmFtZVwiOiBcIkZpeFRoaW5nXCIsXG4gIFwic2VxdWVuY2VOdW1iZXJcIjogMSxcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4wLjBcIixcbn1cbmApXG4gIH0pXG59KVxuXG5kZXNjcmliZShcImdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmdcIiwgKCkgPT4ge1xuICBpdChcImhhbmRsZXMgYSBtaW5pbWFsIHBhY2thZ2UgbmFtZVwiLCAoKSA9PiB7XG4gICAgZXhwZWN0KGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcoXCJwYXRjaC1wYWNrYWdlXCIpKS50b01hdGNoSW5saW5lU25hcHNob3QoXG4gICAgICBgXG5PYmplY3Qge1xuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwicGF0Y2gtcGFja2FnZVwiLFxuICBcImlzTmVzdGVkXCI6IGZhbHNlLFxuICBcIm5hbWVcIjogXCJwYXRjaC1wYWNrYWdlXCIsXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcbiAgICBcInBhdGNoLXBhY2thZ2VcIixcbiAgXSxcbiAgXCJwYXRoXCI6IFwibm9kZV9tb2R1bGVzL3BhdGNoLXBhY2thZ2VcIixcbiAgXCJwYXRoU3BlY2lmaWVyXCI6IFwicGF0Y2gtcGFja2FnZVwiLFxufVxuYCxcbiAgICApXG4gIH0pXG5cbiAgaXQoXCJoYW5kbGVzIGEgc2NvcGVkIHBhY2thZ2UgbmFtZVwiLCAoKSA9PiB7XG4gICAgZXhwZWN0KFxuICAgICAgZ2V0UGF0Y2hEZXRhaWxzRnJvbUNsaVN0cmluZyhcIkBkYXZpZC9wYXRjaC1wYWNrYWdlXCIpLFxuICAgICkudG9NYXRjaElubGluZVNuYXBzaG90KFxuICAgICAgYFxuT2JqZWN0IHtcbiAgXCJodW1hblJlYWRhYmxlUGF0aFNwZWNpZmllclwiOiBcIkBkYXZpZC9wYXRjaC1wYWNrYWdlXCIsXG4gIFwiaXNOZXN0ZWRcIjogZmFsc2UsXG4gIFwibmFtZVwiOiBcIkBkYXZpZC9wYXRjaC1wYWNrYWdlXCIsXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcbiAgICBcIkBkYXZpZC9wYXRjaC1wYWNrYWdlXCIsXG4gIF0sXG4gIFwicGF0aFwiOiBcIm5vZGVfbW9kdWxlcy9AZGF2aWQvcGF0Y2gtcGFja2FnZVwiLFxuICBcInBhdGhTcGVjaWZpZXJcIjogXCJAZGF2aWQvcGF0Y2gtcGFja2FnZVwiLFxufVxuYCxcbiAgICApXG4gIH0pXG5cbiAgaXQoXCJoYW5kbGVzIGEgbmVzdGVkIHBhY2thZ2UgbmFtZVwiLCAoKSA9PiB7XG4gICAgZXhwZWN0KFxuICAgICAgZ2V0UGF0Y2hEZXRhaWxzRnJvbUNsaVN0cmluZyhcImRhdmlkL3BhdGNoLXBhY2thZ2VcIiksXG4gICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoXG4gICAgICBgXG5PYmplY3Qge1xuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwiZGF2aWQgPT4gcGF0Y2gtcGFja2FnZVwiLFxuICBcImlzTmVzdGVkXCI6IHRydWUsXG4gIFwibmFtZVwiOiBcInBhdGNoLXBhY2thZ2VcIixcbiAgXCJwYWNrYWdlTmFtZXNcIjogQXJyYXkgW1xuICAgIFwiZGF2aWRcIixcbiAgICBcInBhdGNoLXBhY2thZ2VcIixcbiAgXSxcbiAgXCJwYXRoXCI6IFwibm9kZV9tb2R1bGVzL2RhdmlkL25vZGVfbW9kdWxlcy9wYXRjaC1wYWNrYWdlXCIsXG4gIFwicGF0aFNwZWNpZmllclwiOiBcImRhdmlkL3BhdGNoLXBhY2thZ2VcIixcbn1cbmAsXG4gICAgKVxuICB9KVxuXG4gIGl0KFwiaGFuZGxlcyBhIG5lc3RlZCBwYWNrYWdlIG5hbWUgd2l0aCBzY29wZXNcIiwgKCkgPT4ge1xuICAgIGV4cGVjdChcbiAgICAgIGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcoXCJAZGF2aWQvcGF0Y2gtcGFja2FnZS9iYW5hbmFcIiksXG4gICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoXG4gICAgICBgXG5PYmplY3Qge1xuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwiQGRhdmlkL3BhdGNoLXBhY2thZ2UgPT4gYmFuYW5hXCIsXG4gIFwiaXNOZXN0ZWRcIjogdHJ1ZSxcbiAgXCJuYW1lXCI6IFwiYmFuYW5hXCIsXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcbiAgICBcIkBkYXZpZC9wYXRjaC1wYWNrYWdlXCIsXG4gICAgXCJiYW5hbmFcIixcbiAgXSxcbiAgXCJwYXRoXCI6IFwibm9kZV9tb2R1bGVzL0BkYXZpZC9wYXRjaC1wYWNrYWdlL25vZGVfbW9kdWxlcy9iYW5hbmFcIixcbiAgXCJwYXRoU3BlY2lmaWVyXCI6IFwiQGRhdmlkL3BhdGNoLXBhY2thZ2UvYmFuYW5hXCIsXG59XG5gLFxuICAgIClcblxuICAgIGV4cGVjdChcbiAgICAgIGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcoXCJAZGF2aWQvcGF0Y2gtcGFja2FnZS9AZGF2aWQvYmFuYW5hXCIpLFxuICAgICkudG9NYXRjaElubGluZVNuYXBzaG90KFxuICAgICAgYFxuT2JqZWN0IHtcbiAgXCJodW1hblJlYWRhYmxlUGF0aFNwZWNpZmllclwiOiBcIkBkYXZpZC9wYXRjaC1wYWNrYWdlID0+IEBkYXZpZC9iYW5hbmFcIixcbiAgXCJpc05lc3RlZFwiOiB0cnVlLFxuICBcIm5hbWVcIjogXCJAZGF2aWQvYmFuYW5hXCIsXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcbiAgICBcIkBkYXZpZC9wYXRjaC1wYWNrYWdlXCIsXG4gICAgXCJAZGF2aWQvYmFuYW5hXCIsXG4gIF0sXG4gIFwicGF0aFwiOiBcIm5vZGVfbW9kdWxlcy9AZGF2aWQvcGF0Y2gtcGFja2FnZS9ub2RlX21vZHVsZXMvQGRhdmlkL2JhbmFuYVwiLFxuICBcInBhdGhTcGVjaWZpZXJcIjogXCJAZGF2aWQvcGF0Y2gtcGFja2FnZS9AZGF2aWQvYmFuYW5hXCIsXG59XG5gLFxuICAgIClcblxuICAgIGV4cGVjdChcbiAgICAgIGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcoXCJkYXZpZC9wYXRjaC1wYWNrYWdlL0BkYXZpZC9iYW5hbmFcIiksXG4gICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoXG4gICAgICBgXG5PYmplY3Qge1xuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwiZGF2aWQgPT4gcGF0Y2gtcGFja2FnZSA9PiBAZGF2aWQvYmFuYW5hXCIsXG4gIFwiaXNOZXN0ZWRcIjogdHJ1ZSxcbiAgXCJuYW1lXCI6IFwiQGRhdmlkL2JhbmFuYVwiLFxuICBcInBhY2thZ2VOYW1lc1wiOiBBcnJheSBbXG4gICAgXCJkYXZpZFwiLFxuICAgIFwicGF0Y2gtcGFja2FnZVwiLFxuICAgIFwiQGRhdmlkL2JhbmFuYVwiLFxuICBdLFxuICBcInBhdGhcIjogXCJub2RlX21vZHVsZXMvZGF2aWQvbm9kZV9tb2R1bGVzL3BhdGNoLXBhY2thZ2Uvbm9kZV9tb2R1bGVzL0BkYXZpZC9iYW5hbmFcIixcbiAgXCJwYXRoU3BlY2lmaWVyXCI6IFwiZGF2aWQvcGF0Y2gtcGFja2FnZS9AZGF2aWQvYmFuYW5hXCIsXG59XG5gLFxuICAgIClcbiAgfSlcbn0pXG5cbmRlc2NyaWJlKFwicGFyc2VOYW1lQW5kVmVyc2lvblwiLCAoKSA9PiB7XG4gIGl0KFwid29ya3MgZm9yIGdvb2QtbG9va2luZyBuYW1lc1wiLCAoKSA9PiB7XG4gICAgZXhwZWN0KHBhcnNlTmFtZUFuZFZlcnNpb24oXCJsb2Rhc2grMi4zLjRcIikpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5PYmplY3Qge1xuICBcInBhY2thZ2VOYW1lXCI6IFwibG9kYXNoXCIsXG4gIFwidmVyc2lvblwiOiBcIjIuMy40XCIsXG59XG5gKVxuICAgIGV4cGVjdChwYXJzZU5hbWVBbmRWZXJzaW9uKFwicGF0Y2gtcGFja2FnZSsyLjAuMC1hbHBoYS4zXCIpKVxuICAgICAgLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5PYmplY3Qge1xuICBcInBhY2thZ2VOYW1lXCI6IFwicGF0Y2gtcGFja2FnZVwiLFxuICBcInZlcnNpb25cIjogXCIyLjAuMC1hbHBoYS4zXCIsXG59XG5gKVxuICB9KVxuICBpdChcIndvcmtzIGZvciBzY29wZWQgcGFja2FnZSBuYW1lc1wiLCAoKSA9PiB7XG4gICAgZXhwZWN0KHBhcnNlTmFtZUFuZFZlcnNpb24oXCJAcmVhY3Qtc3ByaW5nK3JhZnorMi4wLjAtYWxwaGEuM1wiKSlcbiAgICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxuT2JqZWN0IHtcbiAgXCJwYWNrYWdlTmFtZVwiOiBcIkByZWFjdC1zcHJpbmcvcmFmelwiLFxuICBcInZlcnNpb25cIjogXCIyLjAuMC1hbHBoYS4zXCIsXG59XG5gKVxuICAgIGV4cGVjdChwYXJzZU5hbWVBbmRWZXJzaW9uKFwiQG1pY3Jvc29mdCthcGktZXh0cmFjdG9yKzIuMi4zXCIpKVxuICAgICAgLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5PYmplY3Qge1xuICBcInBhY2thZ2VOYW1lXCI6IFwiQG1pY3Jvc29mdC9hcGktZXh0cmFjdG9yXCIsXG4gIFwidmVyc2lvblwiOiBcIjIuMi4zXCIsXG59XG5gKVxuICB9KVxuICBpdChcIndvcmtzIGZvciBvcmRlcmVkIHBhdGNoZXNcIiwgKCkgPT4ge1xuICAgIGV4cGVjdChwYXJzZU5hbWVBbmRWZXJzaW9uKFwicGF0Y2gtcGFja2FnZSsyLjAuMCswMVwiKSlcbiAgICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxuT2JqZWN0IHtcbiAgXCJwYWNrYWdlTmFtZVwiOiBcInBhdGNoLXBhY2thZ2VcIixcbiAgXCJzZXF1ZW5jZU51bWJlclwiOiAxLFxuICBcInZlcnNpb25cIjogXCIyLjAuMFwiLFxufVxuYClcbiAgICBleHBlY3QocGFyc2VOYW1lQW5kVmVyc2lvbihcIkByZWFjdC1zcHJpbmcrcmFmeisyLjAuMC1hbHBoYS4zKzIzXCIpKVxuICAgICAgLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5PYmplY3Qge1xuICBcInBhY2thZ2VOYW1lXCI6IFwiQHJlYWN0LXNwcmluZy9yYWZ6XCIsXG4gIFwic2VxdWVuY2VOdW1iZXJcIjogMjMsXG4gIFwidmVyc2lvblwiOiBcIjIuMC4wLWFscGhhLjNcIixcbn1cbmApXG4gICAgZXhwZWN0KHBhcnNlTmFtZUFuZFZlcnNpb24oXCJAbWljcm9zb2Z0K2FwaS1leHRyYWN0b3IrMi4wLjArMDAxXCIpKVxuICAgICAgLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5PYmplY3Qge1xuICBcInBhY2thZ2VOYW1lXCI6IFwiQG1pY3Jvc29mdC9hcGktZXh0cmFjdG9yXCIsXG4gIFwic2VxdWVuY2VOdW1iZXJcIjogMSxcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4wLjBcIixcbn1cbmApXG4gIH0pXG5cbiAgaXQoXCJ3b3JrcyBmb3Igb3JkZXJlZCBwYXRjaGVzIHdpdGggbmFtZXNcIiwgKCkgPT4ge1xuICAgIGV4cGVjdChwYXJzZU5hbWVBbmRWZXJzaW9uKFwicGF0Y2gtcGFja2FnZSsyLjAuMCswMjErRml4SW1wb3J0YW50VGhpbmdcIikpXG4gICAgICAudG9NYXRjaElubGluZVNuYXBzaG90KGBcbk9iamVjdCB7XG4gIFwicGFja2FnZU5hbWVcIjogXCJwYXRjaC1wYWNrYWdlXCIsXG4gIFwic2VxdWVuY2VOYW1lXCI6IFwiRml4SW1wb3J0YW50VGhpbmdcIixcbiAgXCJzZXF1ZW5jZU51bWJlclwiOiAyMSxcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4wLjBcIixcbn1cbmApXG4gICAgZXhwZWN0KHBhcnNlTmFtZUFuZFZlcnNpb24oXCJAcmVhY3Qtc3ByaW5nK3JhZnorMi4wLjAtYWxwaGEuMyswMDAwMjMrRm9vXCIpKVxuICAgICAgLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5PYmplY3Qge1xuICBcInBhY2thZ2VOYW1lXCI6IFwiQHJlYWN0LXNwcmluZy9yYWZ6XCIsXG4gIFwic2VxdWVuY2VOYW1lXCI6IFwiRm9vXCIsXG4gIFwic2VxdWVuY2VOdW1iZXJcIjogMjMsXG4gIFwidmVyc2lvblwiOiBcIjIuMC4wLWFscGhhLjNcIixcbn1cbmApXG4gICAgZXhwZWN0KHBhcnNlTmFtZUFuZFZlcnNpb24oXCJAbWljcm9zb2Z0K2FwaS1leHRyYWN0b3IrMi4wLjArMDAxK0JhclwiKSlcbiAgICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxuT2JqZWN0IHtcbiAgXCJwYWNrYWdlTmFtZVwiOiBcIkBtaWNyb3NvZnQvYXBpLWV4dHJhY3RvclwiLFxuICBcInNlcXVlbmNlTmFtZVwiOiBcIkJhclwiLFxuICBcInNlcXVlbmNlTnVtYmVyXCI6IDEsXG4gIFwidmVyc2lvblwiOiBcIjIuMC4wXCIsXG59XG5gKVxuICB9KVxufSlcbiJdfQ==