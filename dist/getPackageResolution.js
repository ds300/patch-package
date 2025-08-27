"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageResolution = getPackageResolution;
const path_1 = require("./path");
const PackageDetails_1 = require("./PackageDetails");
const detectPackageManager_1 = require("./detectPackageManager");
const fs_extra_1 = require("fs-extra");
const lockfile_1 = require("@yarnpkg/lockfile");
const yaml_1 = __importDefault(require("yaml"));
const find_yarn_workspace_root_1 = __importDefault(require("find-yarn-workspace-root"));
const getPackageVersion_1 = require("./getPackageVersion");
const coerceSemVer_1 = require("./coerceSemVer");
function getPackageResolution({ packageDetails, packageManager, appPath, }) {
    if (packageManager === "yarn") {
        let lockFilePath = "yarn.lock";
        if (!(0, fs_extra_1.existsSync)(lockFilePath)) {
            const workspaceRoot = (0, find_yarn_workspace_root_1.default)();
            if (!workspaceRoot) {
                throw new Error("Can't find yarn.lock file");
            }
            lockFilePath = (0, path_1.join)(workspaceRoot, "yarn.lock");
        }
        if (!(0, fs_extra_1.existsSync)(lockFilePath)) {
            throw new Error("Can't find yarn.lock file");
        }
        const lockFileString = (0, fs_extra_1.readFileSync)(lockFilePath).toString();
        let appLockFile;
        if (lockFileString.includes("yarn lockfile v1")) {
            const parsedYarnLockFile = (0, lockfile_1.parse)(lockFileString);
            if (parsedYarnLockFile.type !== "success") {
                throw new Error("Could not parse yarn v1 lock file");
            }
            else {
                appLockFile = parsedYarnLockFile.object;
            }
        }
        else {
            try {
                appLockFile = yaml_1.default.parse(lockFileString);
            }
            catch (e) {
                console.log(e);
                throw new Error("Could not parse yarn v2 lock file");
            }
        }
        const installedVersion = (0, getPackageVersion_1.getPackageVersion)((0, path_1.join)((0, path_1.resolve)(appPath, packageDetails.path), "package.json"));
        const entries = Object.entries(appLockFile).filter(([k, v]) => k.startsWith(packageDetails.name + "@") &&
            // @ts-ignore
            (0, coerceSemVer_1.coerceSemVer)(v.version) === (0, coerceSemVer_1.coerceSemVer)(installedVersion));
        const resolutions = entries.map(([_, v]) => {
            // @ts-ignore
            return v.resolved;
        });
        if (resolutions.length === 0) {
            throw new Error(`\`${packageDetails.pathSpecifier}\`'s installed version is ${installedVersion} but a lockfile entry for it couldn't be found. Your lockfile is likely to be corrupt or you forgot to reinstall your packages.`);
        }
        if (new Set(resolutions).size !== 1) {
            console.log(`Ambigious lockfile entries for ${packageDetails.pathSpecifier}. Using version ${installedVersion}`);
            return installedVersion;
        }
        if (resolutions[0]) {
            return resolutions[0];
        }
        const resolution = entries[0][0].slice(packageDetails.name.length + 1);
        // resolve relative file path
        if (resolution.startsWith("file:.")) {
            return `file:${(0, path_1.resolve)(appPath, resolution.slice("file:".length))}`;
        }
        if (resolution.startsWith("npm:")) {
            return resolution.replace("npm:", "");
        }
        return resolution;
    }
    else if (packageManager === "pnpm") {
        const lockFilePath = (0, path_1.join)(process.cwd(), "pnpm-lock.yaml");
        if (!(0, fs_extra_1.existsSync)(lockFilePath)) {
            throw new Error("Can't find pnpm-lock.yaml file");
        }
        const lockFileString = (0, fs_extra_1.readFileSync)(lockFilePath).toString();
        let appLockFile;
        try {
            appLockFile = yaml_1.default.parse(lockFileString);
        }
        catch (e) {
            console.log(e);
            throw new Error("Could not parse pnpm-lock.yaml file");
        }
        // pnpm v6+: packages: { '/pkg@version': { ... } }
        const installedVersion = (0, getPackageVersion_1.getPackageVersion)((0, path_1.join)((0, path_1.resolve)(appPath, packageDetails.path), "package.json"));
        const packages = appLockFile.packages || {};
        // Try to find the entry for the package
        const entryKey = Object.keys(packages).find((key) => {
            // поддержка ключей: '/pkg@version', 'pkg@version', '/@scope/pkg@version', '@scope/pkg@version', с/без (react@...) в конце
            const match = key.match(/^\/?((@[^/]+\/)?[^@]+)@([^()]+)(?:\(.*\))?$/);
            if (!match) {
                return false;
            }
            const [, name, , version] = match;
            return (name === packageDetails.name &&
                (0, coerceSemVer_1.coerceSemVer)(version) === (0, coerceSemVer_1.coerceSemVer)(installedVersion));
        });
        if (!entryKey) {
            throw new Error(`\`${packageDetails.pathSpecifier}\`'s installed version is ${installedVersion} but a pnpm-lock.yaml entry for it couldn't be found. Your lockfile is likely to be corrupt or you forgot to reinstall your packages.`);
        }
        const pkg = packages[entryKey];
        return pkg.resolved || pkg.version || installedVersion;
    }
    else {
        const lockfile = require((0, path_1.join)(appPath, packageManager === "npm-shrinkwrap"
            ? "npm-shrinkwrap.json"
            : "package-lock.json"));
        const lockFileStack = [lockfile];
        for (const name of packageDetails.packageNames.slice(0, -1)) {
            const child = lockFileStack[0].dependencies;
            if (child && name in child) {
                lockFileStack.push(child[name]);
            }
        }
        lockFileStack.reverse();
        const relevantStackEntry = lockFileStack.find((entry) => {
            if (entry.dependencies) {
                return entry.dependencies && packageDetails.name in entry.dependencies;
            }
            else if (entry.packages) {
                return entry.packages && packageDetails.path in entry.packages;
            }
            throw new Error("Cannot find dependencies or packages in lockfile");
        });
        const pkg = relevantStackEntry.dependencies
            ? relevantStackEntry.dependencies[packageDetails.name]
            : relevantStackEntry.packages[packageDetails.path];
        return pkg.resolved || pkg.version || pkg.from;
    }
}
if (require.main === module) {
    const packageDetails = (0, PackageDetails_1.getPatchDetailsFromCliString)(process.argv[2]);
    if (!packageDetails) {
        console.log(`Can't find package ${process.argv[2]}`);
        process.exit(1);
    }
    const useYarn = process.argv.includes("--use-yarn");
    console.log(getPackageResolution({
        appPath: process.cwd(),
        packageDetails,
        packageManager: (0, detectPackageManager_1.detectPackageManager)(process.cwd(), useYarn ? "yarn" : null),
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0UGFja2FnZVJlc29sdXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0UGFja2FnZVJlc29sdXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFVQSxvREFzSkM7QUFoS0QsaUNBQXNDO0FBQ3RDLHFEQUErRTtBQUMvRSxpRUFBNkU7QUFDN0UsdUNBQW1EO0FBQ25ELGdEQUE4RDtBQUM5RCxnREFBdUI7QUFDdkIsd0ZBQXdEO0FBQ3hELDJEQUF1RDtBQUN2RCxpREFBNkM7QUFFN0MsU0FBZ0Isb0JBQW9CLENBQUMsRUFDbkMsY0FBYyxFQUNkLGNBQWMsRUFDZCxPQUFPLEdBS1I7SUFDQyxJQUFJLGNBQWMsS0FBSyxNQUFNLEVBQUUsQ0FBQztRQUM5QixJQUFJLFlBQVksR0FBRyxXQUFXLENBQUE7UUFDOUIsSUFBSSxDQUFDLElBQUEscUJBQVUsRUFBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQzlCLE1BQU0sYUFBYSxHQUFHLElBQUEsa0NBQWlCLEdBQUUsQ0FBQTtZQUN6QyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1lBQ0QsWUFBWSxHQUFHLElBQUEsV0FBSSxFQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNqRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUEscUJBQVUsRUFBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQzlCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBQSx1QkFBWSxFQUFDLFlBQVksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzVELElBQUksV0FBVyxDQUFBO1FBQ2YsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztZQUNoRCxNQUFNLGtCQUFrQixH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QUFDLENBQUMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FDVCxvQkFBb0IsQ0FBQztRQUNuQixPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRTtRQUN0QixjQUFjO1FBQ2QsY0FBYyxFQUFFLElBQUEsMkNBQW9CLEVBQ2xDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFDYixPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUN4QjtLQUNGLENBQUMsQ0FDSCxDQUFBO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tIFwiLi9wYXRoXCJcbmltcG9ydCB7IFBhY2thZ2VEZXRhaWxzLCBnZXRQYXRjaERldGFpbHNGcm9tQ2xpU3RyaW5nIH0gZnJvbSBcIi4vUGFja2FnZURldGFpbHNcIlxuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIsIGRldGVjdFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSBcIi4vZGV0ZWN0UGFja2FnZU1hbmFnZXJcIlxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSBcImZzLWV4dHJhXCJcbmltcG9ydCB7IHBhcnNlIGFzIHBhcnNlWWFybkxvY2tGaWxlIH0gZnJvbSBcIkB5YXJucGtnL2xvY2tmaWxlXCJcbmltcG9ydCB5YW1sIGZyb20gXCJ5YW1sXCJcbmltcG9ydCBmaW5kV29ya3NwYWNlUm9vdCBmcm9tIFwiZmluZC15YXJuLXdvcmtzcGFjZS1yb290XCJcbmltcG9ydCB7IGdldFBhY2thZ2VWZXJzaW9uIH0gZnJvbSBcIi4vZ2V0UGFja2FnZVZlcnNpb25cIlxuaW1wb3J0IHsgY29lcmNlU2VtVmVyIH0gZnJvbSBcIi4vY29lcmNlU2VtVmVyXCJcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBhY2thZ2VSZXNvbHV0aW9uKHtcbiAgcGFja2FnZURldGFpbHMsXG4gIHBhY2thZ2VNYW5hZ2VyLFxuICBhcHBQYXRoLFxufToge1xuICBwYWNrYWdlRGV0YWlsczogUGFja2FnZURldGFpbHNcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyXG4gIGFwcFBhdGg6IHN0cmluZ1xufSkge1xuICBpZiAocGFja2FnZU1hbmFnZXIgPT09IFwieWFyblwiKSB7XG4gICAgbGV0IGxvY2tGaWxlUGF0aCA9IFwieWFybi5sb2NrXCJcbiAgICBpZiAoIWV4aXN0c1N5bmMobG9ja0ZpbGVQYXRoKSkge1xuICAgICAgY29uc3Qgd29ya3NwYWNlUm9vdCA9IGZpbmRXb3Jrc3BhY2VSb290KClcbiAgICAgIGlmICghd29ya3NwYWNlUm9vdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBmaW5kIHlhcm4ubG9jayBmaWxlXCIpXG4gICAgICB9XG4gICAgICBsb2NrRmlsZVBhdGggPSBqb2luKHdvcmtzcGFjZVJvb3QsIFwieWFybi5sb2NrXCIpXG4gICAgfVxuICAgIGlmICghZXhpc3RzU3luYyhsb2NrRmlsZVBhdGgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBmaW5kIHlhcm4ubG9jayBmaWxlXCIpXG4gICAgfVxuICAgIGNvbnN0IGxvY2tGaWxlU3RyaW5nID0gcmVhZEZpbGVTeW5jKGxvY2tGaWxlUGF0aCkudG9TdHJpbmcoKVxuICAgIGxldCBhcHBMb2NrRmlsZVxuICAgIGlmIChsb2NrRmlsZVN0cmluZy5pbmNsdWRlcyhcInlhcm4gbG9ja2ZpbGUgdjFcIikpIHtcbiAgICAgIGNvbnN0IHBhcnNlZFlhcm5Mb2NrRmlsZSA9IHBhcnNlWWFybkxvY2tGaWxlKGxvY2tGaWxlU3RyaW5nKVxuICAgICAgaWYgKHBhcnNlZFlhcm5Mb2NrRmlsZS50eXBlICE9PSBcInN1Y2Nlc3NcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgcGFyc2UgeWFybiB2MSBsb2NrIGZpbGVcIilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFwcExvY2tGaWxlID0gcGFyc2VkWWFybkxvY2tGaWxlLm9iamVjdFxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBhcHBMb2NrRmlsZSA9IHlhbWwucGFyc2UobG9ja0ZpbGVTdHJpbmcpXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBwYXJzZSB5YXJuIHYyIGxvY2sgZmlsZVwiKVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGluc3RhbGxlZFZlcnNpb24gPSBnZXRQYWNrYWdlVmVyc2lvbihcbiAgICAgIGpvaW4ocmVzb2x2ZShhcHBQYXRoLCBwYWNrYWdlRGV0YWlscy5wYXRoKSwgXCJwYWNrYWdlLmpzb25cIiksXG4gICAgKVxuXG4gICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKGFwcExvY2tGaWxlKS5maWx0ZXIoXG4gICAgICAoW2ssIHZdKSA9PlxuICAgICAgICBrLnN0YXJ0c1dpdGgocGFja2FnZURldGFpbHMubmFtZSArIFwiQFwiKSAmJlxuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIGNvZXJjZVNlbVZlcih2LnZlcnNpb24pID09PSBjb2VyY2VTZW1WZXIoaW5zdGFsbGVkVmVyc2lvbiksXG4gICAgKVxuXG4gICAgY29uc3QgcmVzb2x1dGlvbnMgPSBlbnRyaWVzLm1hcCgoW18sIHZdKSA9PiB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICByZXR1cm4gdi5yZXNvbHZlZFxuICAgIH0pXG5cbiAgICBpZiAocmVzb2x1dGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBcXGAke3BhY2thZ2VEZXRhaWxzLnBhdGhTcGVjaWZpZXJ9XFxgJ3MgaW5zdGFsbGVkIHZlcnNpb24gaXMgJHtpbnN0YWxsZWRWZXJzaW9ufSBidXQgYSBsb2NrZmlsZSBlbnRyeSBmb3IgaXQgY291bGRuJ3QgYmUgZm91bmQuIFlvdXIgbG9ja2ZpbGUgaXMgbGlrZWx5IHRvIGJlIGNvcnJ1cHQgb3IgeW91IGZvcmdvdCB0byByZWluc3RhbGwgeW91ciBwYWNrYWdlcy5gLFxuICAgICAgKVxuICAgIH1cblxuICAgIGlmIChuZXcgU2V0KHJlc29sdXRpb25zKS5zaXplICE9PSAxKSB7XG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgYEFtYmlnaW91cyBsb2NrZmlsZSBlbnRyaWVzIGZvciAke3BhY2thZ2VEZXRhaWxzLnBhdGhTcGVjaWZpZXJ9LiBVc2luZyB2ZXJzaW9uICR7aW5zdGFsbGVkVmVyc2lvbn1gLFxuICAgICAgKVxuICAgICAgcmV0dXJuIGluc3RhbGxlZFZlcnNpb25cbiAgICB9XG5cbiAgICBpZiAocmVzb2x1dGlvbnNbMF0pIHtcbiAgICAgIHJldHVybiByZXNvbHV0aW9uc1swXVxuICAgIH1cblxuICAgIGNvbnN0IHJlc29sdXRpb24gPSBlbnRyaWVzWzBdWzBdLnNsaWNlKHBhY2thZ2VEZXRhaWxzLm5hbWUubGVuZ3RoICsgMSlcblxuICAgIC8vIHJlc29sdmUgcmVsYXRpdmUgZmlsZSBwYXRoXG4gICAgaWYgKHJlc29sdXRpb24uc3RhcnRzV2l0aChcImZpbGU6LlwiKSkge1xuICAgICAgcmV0dXJuIGBmaWxlOiR7cmVzb2x2ZShhcHBQYXRoLCByZXNvbHV0aW9uLnNsaWNlKFwiZmlsZTpcIi5sZW5ndGgpKX1gXG4gICAgfVxuXG4gICAgaWYgKHJlc29sdXRpb24uc3RhcnRzV2l0aChcIm5wbTpcIikpIHtcbiAgICAgIHJldHVybiByZXNvbHV0aW9uLnJlcGxhY2UoXCJucG06XCIsIFwiXCIpXG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc29sdXRpb25cbiAgfSBlbHNlIGlmIChwYWNrYWdlTWFuYWdlciA9PT0gXCJwbnBtXCIpIHtcbiAgICBjb25zdCBsb2NrRmlsZVBhdGggPSBqb2luKHByb2Nlc3MuY3dkKCksIFwicG5wbS1sb2NrLnlhbWxcIilcbiAgICBpZiAoIWV4aXN0c1N5bmMobG9ja0ZpbGVQYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZmluZCBwbnBtLWxvY2sueWFtbCBmaWxlXCIpXG4gICAgfVxuICAgIGNvbnN0IGxvY2tGaWxlU3RyaW5nID0gcmVhZEZpbGVTeW5jKGxvY2tGaWxlUGF0aCkudG9TdHJpbmcoKVxuICAgIGxldCBhcHBMb2NrRmlsZVxuICAgIHRyeSB7XG4gICAgICBhcHBMb2NrRmlsZSA9IHlhbWwucGFyc2UobG9ja0ZpbGVTdHJpbmcpXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBwYXJzZSBwbnBtLWxvY2sueWFtbCBmaWxlXCIpXG4gICAgfVxuICAgIC8vIHBucG0gdjYrOiBwYWNrYWdlczogeyAnL3BrZ0B2ZXJzaW9uJzogeyAuLi4gfSB9XG4gICAgY29uc3QgaW5zdGFsbGVkVmVyc2lvbiA9IGdldFBhY2thZ2VWZXJzaW9uKFxuICAgICAgam9pbihyZXNvbHZlKGFwcFBhdGgsIHBhY2thZ2VEZXRhaWxzLnBhdGgpLCBcInBhY2thZ2UuanNvblwiKSxcbiAgICApXG4gICAgY29uc3QgcGFja2FnZXMgPSBhcHBMb2NrRmlsZS5wYWNrYWdlcyB8fCB7fVxuICAgIC8vIFRyeSB0byBmaW5kIHRoZSBlbnRyeSBmb3IgdGhlIHBhY2thZ2VcbiAgICBjb25zdCBlbnRyeUtleSA9IE9iamVjdC5rZXlzKHBhY2thZ2VzKS5maW5kKChrZXkpID0+IHtcbiAgICAgIC8vINC/0L7QtNC00LXRgNC20LrQsCDQutC70Y7Rh9C10Lk6ICcvcGtnQHZlcnNpb24nLCAncGtnQHZlcnNpb24nLCAnL0BzY29wZS9wa2dAdmVyc2lvbicsICdAc2NvcGUvcGtnQHZlcnNpb24nLCDRgS/QsdC10LcgKHJlYWN0QC4uLikg0LIg0LrQvtC90YbQtVxuICAgICAgY29uc3QgbWF0Y2ggPSBrZXkubWF0Y2goL15cXC8/KChAW14vXStcXC8pP1teQF0rKUAoW14oKV0rKSg/OlxcKC4qXFwpKT8kLylcbiAgICAgIGlmICghbWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgICBjb25zdCBbLCBuYW1lLCAsIHZlcnNpb25dID0gbWF0Y2hcbiAgICAgIHJldHVybiAoXG4gICAgICAgIG5hbWUgPT09IHBhY2thZ2VEZXRhaWxzLm5hbWUgJiZcbiAgICAgICAgY29lcmNlU2VtVmVyKHZlcnNpb24pID09PSBjb2VyY2VTZW1WZXIoaW5zdGFsbGVkVmVyc2lvbilcbiAgICAgIClcbiAgICB9KVxuICAgIGlmICghZW50cnlLZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFxcYCR7cGFja2FnZURldGFpbHMucGF0aFNwZWNpZmllcn1cXGAncyBpbnN0YWxsZWQgdmVyc2lvbiBpcyAke2luc3RhbGxlZFZlcnNpb259IGJ1dCBhIHBucG0tbG9jay55YW1sIGVudHJ5IGZvciBpdCBjb3VsZG4ndCBiZSBmb3VuZC4gWW91ciBsb2NrZmlsZSBpcyBsaWtlbHkgdG8gYmUgY29ycnVwdCBvciB5b3UgZm9yZ290IHRvIHJlaW5zdGFsbCB5b3VyIHBhY2thZ2VzLmAsXG4gICAgICApXG4gICAgfVxuICAgIGNvbnN0IHBrZyA9IHBhY2thZ2VzW2VudHJ5S2V5XVxuICAgIHJldHVybiBwa2cucmVzb2x2ZWQgfHwgcGtnLnZlcnNpb24gfHwgaW5zdGFsbGVkVmVyc2lvblxuICB9IGVsc2Uge1xuICAgIGNvbnN0IGxvY2tmaWxlID0gcmVxdWlyZShqb2luKFxuICAgICAgYXBwUGF0aCxcbiAgICAgIHBhY2thZ2VNYW5hZ2VyID09PSBcIm5wbS1zaHJpbmt3cmFwXCJcbiAgICAgICAgPyBcIm5wbS1zaHJpbmt3cmFwLmpzb25cIlxuICAgICAgICA6IFwicGFja2FnZS1sb2NrLmpzb25cIixcbiAgICApKVxuICAgIGNvbnN0IGxvY2tGaWxlU3RhY2sgPSBbbG9ja2ZpbGVdXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHBhY2thZ2VEZXRhaWxzLnBhY2thZ2VOYW1lcy5zbGljZSgwLCAtMSkpIHtcbiAgICAgIGNvbnN0IGNoaWxkID0gbG9ja0ZpbGVTdGFja1swXS5kZXBlbmRlbmNpZXNcbiAgICAgIGlmIChjaGlsZCAmJiBuYW1lIGluIGNoaWxkKSB7XG4gICAgICAgIGxvY2tGaWxlU3RhY2sucHVzaChjaGlsZFtuYW1lXSlcbiAgICAgIH1cbiAgICB9XG4gICAgbG9ja0ZpbGVTdGFjay5yZXZlcnNlKClcbiAgICBjb25zdCByZWxldmFudFN0YWNrRW50cnkgPSBsb2NrRmlsZVN0YWNrLmZpbmQoKGVudHJ5KSA9PiB7XG4gICAgICBpZiAoZW50cnkuZGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIHJldHVybiBlbnRyeS5kZXBlbmRlbmNpZXMgJiYgcGFja2FnZURldGFpbHMubmFtZSBpbiBlbnRyeS5kZXBlbmRlbmNpZXNcbiAgICAgIH0gZWxzZSBpZiAoZW50cnkucGFja2FnZXMpIHtcbiAgICAgICAgcmV0dXJuIGVudHJ5LnBhY2thZ2VzICYmIHBhY2thZ2VEZXRhaWxzLnBhdGggaW4gZW50cnkucGFja2FnZXNcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIGRlcGVuZGVuY2llcyBvciBwYWNrYWdlcyBpbiBsb2NrZmlsZVwiKVxuICAgIH0pXG4gICAgY29uc3QgcGtnID0gcmVsZXZhbnRTdGFja0VudHJ5LmRlcGVuZGVuY2llc1xuICAgICAgPyByZWxldmFudFN0YWNrRW50cnkuZGVwZW5kZW5jaWVzW3BhY2thZ2VEZXRhaWxzLm5hbWVdXG4gICAgICA6IHJlbGV2YW50U3RhY2tFbnRyeS5wYWNrYWdlc1twYWNrYWdlRGV0YWlscy5wYXRoXVxuICAgIHJldHVybiBwa2cucmVzb2x2ZWQgfHwgcGtnLnZlcnNpb24gfHwgcGtnLmZyb21cbiAgfVxufVxuXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgY29uc3QgcGFja2FnZURldGFpbHMgPSBnZXRQYXRjaERldGFpbHNGcm9tQ2xpU3RyaW5nKHByb2Nlc3MuYXJndlsyXSlcbiAgaWYgKCFwYWNrYWdlRGV0YWlscykge1xuICAgIGNvbnNvbGUubG9nKGBDYW4ndCBmaW5kIHBhY2thZ2UgJHtwcm9jZXNzLmFyZ3ZbMl19YClcbiAgICBwcm9jZXNzLmV4aXQoMSlcbiAgfVxuICBjb25zdCB1c2VZYXJuID0gcHJvY2Vzcy5hcmd2LmluY2x1ZGVzKFwiLS11c2UteWFyblwiKVxuICBjb25zb2xlLmxvZyhcbiAgICBnZXRQYWNrYWdlUmVzb2x1dGlvbih7XG4gICAgICBhcHBQYXRoOiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgcGFja2FnZURldGFpbHMsXG4gICAgICBwYWNrYWdlTWFuYWdlcjogZGV0ZWN0UGFja2FnZU1hbmFnZXIoXG4gICAgICAgIHByb2Nlc3MuY3dkKCksXG4gICAgICAgIHVzZVlhcm4gPyBcInlhcm5cIiA6IG51bGwsXG4gICAgICApLFxuICAgIH0pLFxuICApXG59XG4iXX0=