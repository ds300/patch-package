"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resolveRelativeFileDependencies_1 = require("./resolveRelativeFileDependencies");
describe("resolveRelativeFileDependencies", () => {
    it("works for package.json", () => {
        const appRootPath = "/foo/bar";
        const resolutions = {
            absolute: "file:/not-foo/bar",
            relative: "file:../baz",
            remote: "git+https://blah.com/blah.git",
            version: "^434.34.34",
        };
        const expected = {
            absolute: "file:/not-foo/bar",
            relative: "file:/foo/baz",
            remote: "git+https://blah.com/blah.git",
            version: "^434.34.34",
        };
        expect((0, resolveRelativeFileDependencies_1.resolveRelativeFileDependencies)(appRootPath, JSON.parse(JSON.stringify(resolutions)))).toEqual(expected);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZVJlbGF0aXZlRmlsZURlcGVuZGVuY2llcy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Jlc29sdmVSZWxhdGl2ZUZpbGVEZXBlbmRlbmNpZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVGQUFtRjtBQUVuRixRQUFRLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBQy9DLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDaEMsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBRTlCLE1BQU0sV0FBVyxHQUFHO1lBQ2xCLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsUUFBUSxFQUFFLGFBQWE7WUFDdkIsTUFBTSxFQUFFLCtCQUErQjtZQUN2QyxPQUFPLEVBQUUsWUFBWTtTQUN0QixDQUFBO1FBRUQsTUFBTSxRQUFRLEdBQUc7WUFDZixRQUFRLEVBQUUsbUJBQW1CO1lBQzdCLFFBQVEsRUFBRSxlQUFlO1lBQ3pCLE1BQU0sRUFBRSwrQkFBK0I7WUFDdkMsT0FBTyxFQUFFLFlBQVk7U0FDdEIsQ0FBQTtRQUVELE1BQU0sQ0FDSixJQUFBLGlFQUErQixFQUM3QixXQUFXLEVBQ1gsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQ3hDLENBQ0YsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDckIsQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlc29sdmVSZWxhdGl2ZUZpbGVEZXBlbmRlbmNpZXMgfSBmcm9tIFwiLi9yZXNvbHZlUmVsYXRpdmVGaWxlRGVwZW5kZW5jaWVzXCJcblxuZGVzY3JpYmUoXCJyZXNvbHZlUmVsYXRpdmVGaWxlRGVwZW5kZW5jaWVzXCIsICgpID0+IHtcbiAgaXQoXCJ3b3JrcyBmb3IgcGFja2FnZS5qc29uXCIsICgpID0+IHtcbiAgICBjb25zdCBhcHBSb290UGF0aCA9IFwiL2Zvby9iYXJcIlxuXG4gICAgY29uc3QgcmVzb2x1dGlvbnMgPSB7XG4gICAgICBhYnNvbHV0ZTogXCJmaWxlOi9ub3QtZm9vL2JhclwiLFxuICAgICAgcmVsYXRpdmU6IFwiZmlsZTouLi9iYXpcIixcbiAgICAgIHJlbW90ZTogXCJnaXQraHR0cHM6Ly9ibGFoLmNvbS9ibGFoLmdpdFwiLFxuICAgICAgdmVyc2lvbjogXCJeNDM0LjM0LjM0XCIsXG4gICAgfVxuXG4gICAgY29uc3QgZXhwZWN0ZWQgPSB7XG4gICAgICBhYnNvbHV0ZTogXCJmaWxlOi9ub3QtZm9vL2JhclwiLFxuICAgICAgcmVsYXRpdmU6IFwiZmlsZTovZm9vL2JhelwiLFxuICAgICAgcmVtb3RlOiBcImdpdCtodHRwczovL2JsYWguY29tL2JsYWguZ2l0XCIsXG4gICAgICB2ZXJzaW9uOiBcIl40MzQuMzQuMzRcIixcbiAgICB9XG5cbiAgICBleHBlY3QoXG4gICAgICByZXNvbHZlUmVsYXRpdmVGaWxlRGVwZW5kZW5jaWVzKFxuICAgICAgICBhcHBSb290UGF0aCxcbiAgICAgICAgSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShyZXNvbHV0aW9ucykpLFxuICAgICAgKSxcbiAgICApLnRvRXF1YWwoZXhwZWN0ZWQpXG4gIH0pXG59KVxuIl19