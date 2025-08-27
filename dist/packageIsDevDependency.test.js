"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const packageIsDevDependency_1 = require("./packageIsDevDependency");
const path_1 = require("./path");
const path_2 = require("path");
const PackageDetails_1 = require("./PackageDetails");
const fs_1 = require("fs");
const appPath = (0, path_2.normalize)((0, path_1.join)(__dirname, "../"));
describe(packageIsDevDependency_1.packageIsDevDependency, () => {
    it("returns true if package is a dev dependency", () => {
        expect((0, packageIsDevDependency_1.packageIsDevDependency)({
            appPath,
            patchDetails: (0, PackageDetails_1.getPackageDetailsFromPatchFilename)("typescript+3.0.1.patch"),
        })).toBe(true);
    });
    it("returns false if package is not a dev dependency", () => {
        expect((0, packageIsDevDependency_1.packageIsDevDependency)({
            appPath,
            patchDetails: (0, PackageDetails_1.getPackageDetailsFromPatchFilename)("chalk+3.0.1.patch"),
        })).toBe(false);
    });
    it("returns false if package is a transitive dependency of a dev dependency", () => {
        expect((0, fs_1.existsSync)((0, path_1.join)(appPath, "node_modules/cosmiconfig"))).toBe(true);
        expect((0, packageIsDevDependency_1.packageIsDevDependency)({
            appPath,
            patchDetails: (0, PackageDetails_1.getPackageDetailsFromPatchFilename)(
            // cosmiconfig is a transitive dep of lint-staged
            "cosmiconfig+3.0.1.patch"),
        })).toBe(false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZUlzRGV2RGVwZW5kZW5jeS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3BhY2thZ2VJc0RldkRlcGVuZGVuY3kudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFFQUFpRTtBQUNqRSxpQ0FBNkI7QUFDN0IsK0JBQWdDO0FBQ2hDLHFEQUFxRTtBQUNyRSwyQkFBK0I7QUFFL0IsTUFBTSxPQUFPLEdBQUcsSUFBQSxnQkFBUyxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO0FBRWpELFFBQVEsQ0FBQywrQ0FBc0IsRUFBRSxHQUFHLEVBQUU7SUFDcEMsRUFBRSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtRQUNyRCxNQUFNLENBQ0osSUFBQSwrQ0FBc0IsRUFBQztZQUNyQixPQUFPO1lBQ1AsWUFBWSxFQUFFLElBQUEsbURBQWtDLEVBQzlDLHdCQUF3QixDQUN4QjtTQUNILENBQUMsQ0FDSCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNkLENBQUMsQ0FBQyxDQUFBO0lBQ0YsRUFBRSxDQUFDLGtEQUFrRCxFQUFFLEdBQUcsRUFBRTtRQUMxRCxNQUFNLENBQ0osSUFBQSwrQ0FBc0IsRUFBQztZQUNyQixPQUFPO1lBQ1AsWUFBWSxFQUFFLElBQUEsbURBQWtDLEVBQUMsbUJBQW1CLENBQUU7U0FDdkUsQ0FBQyxDQUNILENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2YsQ0FBQyxDQUFDLENBQUE7SUFDRixFQUFFLENBQUMseUVBQXlFLEVBQUUsR0FBRyxFQUFFO1FBQ2pGLE1BQU0sQ0FBQyxJQUFBLGVBQVUsRUFBQyxJQUFBLFdBQUksRUFBQyxPQUFPLEVBQUUsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FDSixJQUFBLCtDQUFzQixFQUFDO1lBQ3JCLE9BQU87WUFDUCxZQUFZLEVBQUUsSUFBQSxtREFBa0M7WUFDOUMsaURBQWlEO1lBQ2pELHlCQUF5QixDQUN6QjtTQUNILENBQUMsQ0FDSCxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNmLENBQUMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwYWNrYWdlSXNEZXZEZXBlbmRlbmN5IH0gZnJvbSBcIi4vcGFja2FnZUlzRGV2RGVwZW5kZW5jeVwiXG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIi4vcGF0aFwiXG5pbXBvcnQgeyBub3JtYWxpemUgfSBmcm9tIFwicGF0aFwiXG5pbXBvcnQgeyBnZXRQYWNrYWdlRGV0YWlsc0Zyb21QYXRjaEZpbGVuYW1lIH0gZnJvbSBcIi4vUGFja2FnZURldGFpbHNcIlxuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJmc1wiXG5cbmNvbnN0IGFwcFBhdGggPSBub3JtYWxpemUoam9pbihfX2Rpcm5hbWUsIFwiLi4vXCIpKVxuXG5kZXNjcmliZShwYWNrYWdlSXNEZXZEZXBlbmRlbmN5LCAoKSA9PiB7XG4gIGl0KFwicmV0dXJucyB0cnVlIGlmIHBhY2thZ2UgaXMgYSBkZXYgZGVwZW5kZW5jeVwiLCAoKSA9PiB7XG4gICAgZXhwZWN0KFxuICAgICAgcGFja2FnZUlzRGV2RGVwZW5kZW5jeSh7XG4gICAgICAgIGFwcFBhdGgsXG4gICAgICAgIHBhdGNoRGV0YWlsczogZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcbiAgICAgICAgICBcInR5cGVzY3JpcHQrMy4wLjEucGF0Y2hcIixcbiAgICAgICAgKSEsXG4gICAgICB9KSxcbiAgICApLnRvQmUodHJ1ZSlcbiAgfSlcbiAgaXQoXCJyZXR1cm5zIGZhbHNlIGlmIHBhY2thZ2UgaXMgbm90IGEgZGV2IGRlcGVuZGVuY3lcIiwgKCkgPT4ge1xuICAgIGV4cGVjdChcbiAgICAgIHBhY2thZ2VJc0RldkRlcGVuZGVuY3koe1xuICAgICAgICBhcHBQYXRoLFxuICAgICAgICBwYXRjaERldGFpbHM6IGdldFBhY2thZ2VEZXRhaWxzRnJvbVBhdGNoRmlsZW5hbWUoXCJjaGFsayszLjAuMS5wYXRjaFwiKSEsXG4gICAgICB9KSxcbiAgICApLnRvQmUoZmFsc2UpXG4gIH0pXG4gIGl0KFwicmV0dXJucyBmYWxzZSBpZiBwYWNrYWdlIGlzIGEgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5IG9mIGEgZGV2IGRlcGVuZGVuY3lcIiwgKCkgPT4ge1xuICAgIGV4cGVjdChleGlzdHNTeW5jKGpvaW4oYXBwUGF0aCwgXCJub2RlX21vZHVsZXMvY29zbWljb25maWdcIikpKS50b0JlKHRydWUpXG4gICAgZXhwZWN0KFxuICAgICAgcGFja2FnZUlzRGV2RGVwZW5kZW5jeSh7XG4gICAgICAgIGFwcFBhdGgsXG4gICAgICAgIHBhdGNoRGV0YWlsczogZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcbiAgICAgICAgICAvLyBjb3NtaWNvbmZpZyBpcyBhIHRyYW5zaXRpdmUgZGVwIG9mIGxpbnQtc3RhZ2VkXG4gICAgICAgICAgXCJjb3NtaWNvbmZpZyszLjAuMS5wYXRjaFwiLFxuICAgICAgICApISxcbiAgICAgIH0pLFxuICAgICkudG9CZShmYWxzZSlcbiAgfSlcbn0pXG4iXX0=