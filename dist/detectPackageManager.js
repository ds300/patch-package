"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPackageManager = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = require("./path");
const chalk_1 = __importDefault(require("chalk"));
const process_1 = __importDefault(require("process"));
const find_yarn_workspace_root_1 = __importDefault(require("find-yarn-workspace-root"));
function printNoYarnLockfileError() {
    console.log(`
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red("The --use-yarn option was specified but there is no yarn.lock file")}
`);
}
function printNoLockfilesError() {
    console.log(`
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red("No package-lock.json, npm-shrinkwrap.json, yarn.lock, or pnpm-lock.yaml file.\n\nYou must use either npm@>=5, yarn, pnpm, or npm-shrinkwrap to manage this project's dependencies.")}
`);
}
function printSelectingDefaultMessage() {
    console.info(`${chalk_1.default.bold("patch-package")}: you have both yarn.lock and package-lock.json
Defaulting to using ${chalk_1.default.bold("npm")}
You can override this setting by passing --use-yarn or deleting
package-lock.json if you don't need it
`);
}
const detectPackageManager = (appRootPath, overridePackageManager) => {
    const packageLockExists = fs_extra_1.default.existsSync((0, path_1.join)(appRootPath, "package-lock.json"));
    const shrinkWrapExists = fs_extra_1.default.existsSync((0, path_1.join)(appRootPath, "npm-shrinkwrap.json"));
    const yarnLockExists = fs_extra_1.default.existsSync((0, path_1.join)(appRootPath, "yarn.lock"));
    const pnpmLockExists = fs_extra_1.default.existsSync((0, path_1.join)(process_1.default.cwd(), "pnpm-lock.yaml"));
    if ((packageLockExists || shrinkWrapExists) && yarnLockExists) {
        if (overridePackageManager) {
            return overridePackageManager;
        }
        else {
            printSelectingDefaultMessage();
            return shrinkWrapExists ? "npm-shrinkwrap" : "npm";
        }
    }
    else if (packageLockExists || shrinkWrapExists) {
        if (overridePackageManager === "yarn") {
            printNoYarnLockfileError();
            process_1.default.exit(1);
        }
        else {
            return shrinkWrapExists ? "npm-shrinkwrap" : "npm";
        }
    }
    else if (pnpmLockExists) {
        return "pnpm";
    }
    else if (yarnLockExists || (0, find_yarn_workspace_root_1.default)()) {
        return "yarn";
    }
    else {
        printNoLockfilesError();
        process_1.default.exit(1);
    }
    throw Error();
};
exports.detectPackageManager = detectPackageManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZWN0UGFja2FnZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZGV0ZWN0UGFja2FnZU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0RBQXlCO0FBQ3pCLGlDQUE2QjtBQUM3QixrREFBeUI7QUFDekIsc0RBQTZCO0FBQzdCLHdGQUF3RDtBQUl4RCxTQUFTLHdCQUF3QjtJQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDO0VBQ1osZUFBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksZUFBSyxDQUFDLEdBQUcsQ0FDdEMsb0VBQW9FLENBQ3JFO0NBQ0YsQ0FBQyxDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMscUJBQXFCO0lBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUM7RUFDWixlQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxlQUFLLENBQUMsR0FBRyxDQUN0QyxvTEFBb0wsQ0FDckw7Q0FDRixDQUFDLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyw0QkFBNEI7SUFDbkMsT0FBTyxDQUFDLElBQUksQ0FDVixHQUFHLGVBQUssQ0FBQyxJQUFJLENBQ1gsZUFBZSxDQUNoQjtzQkFDaUIsZUFBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7OztDQUd0QyxDQUNFLENBQUE7QUFDSCxDQUFDO0FBRU0sTUFBTSxvQkFBb0IsR0FBRyxDQUNsQyxXQUFtQixFQUNuQixzQkFBNkMsRUFDN0IsRUFBRTtJQUNsQixNQUFNLGlCQUFpQixHQUFHLGtCQUFFLENBQUMsVUFBVSxDQUNyQyxJQUFBLFdBQUksRUFBQyxXQUFXLEVBQUUsbUJBQW1CLENBQUMsQ0FDdkMsQ0FBQTtJQUNELE1BQU0sZ0JBQWdCLEdBQUcsa0JBQUUsQ0FBQyxVQUFVLENBQ3BDLElBQUEsV0FBSSxFQUFDLFdBQVcsRUFBRSxxQkFBcUIsQ0FBQyxDQUN6QyxDQUFBO0lBQ0QsTUFBTSxjQUFjLEdBQUcsa0JBQUUsQ0FBQyxVQUFVLENBQUMsSUFBQSxXQUFJLEVBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7SUFDcEUsTUFBTSxjQUFjLEdBQUcsa0JBQUUsQ0FBQyxVQUFVLENBQUMsSUFBQSxXQUFJLEVBQUMsaUJBQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7SUFDM0UsSUFBSSxDQUFDLGlCQUFpQixJQUFJLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7UUFDOUQsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1lBQzNCLE9BQU8sc0JBQXNCLENBQUE7UUFDL0IsQ0FBQzthQUFNLENBQUM7WUFDTiw0QkFBNEIsRUFBRSxDQUFBO1lBQzlCLE9BQU8sZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7UUFDcEQsQ0FBQztJQUNILENBQUM7U0FBTSxJQUFJLGlCQUFpQixJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDakQsSUFBSSxzQkFBc0IsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUN0Qyx3QkFBd0IsRUFBRSxDQUFBO1lBQzFCLGlCQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pCLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUNwRCxDQUFDO0lBQ0gsQ0FBQztTQUFNLElBQUksY0FBYyxFQUFFLENBQUM7UUFDMUIsT0FBTyxNQUFNLENBQUE7SUFDZixDQUFDO1NBQU0sSUFBSSxjQUFjLElBQUksSUFBQSxrQ0FBaUIsR0FBRSxFQUFFLENBQUM7UUFDakQsT0FBTyxNQUFNLENBQUE7SUFDZixDQUFDO1NBQU0sQ0FBQztRQUNOLHFCQUFxQixFQUFFLENBQUE7UUFDdkIsaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakIsQ0FBQztJQUNELE1BQU0sS0FBSyxFQUFFLENBQUE7QUFDZixDQUFDLENBQUE7QUFuQ1ksUUFBQSxvQkFBb0Isd0JBbUNoQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyBmcm9tIFwiZnMtZXh0cmFcIlxuaW1wb3J0IHsgam9pbiB9IGZyb20gXCIuL3BhdGhcIlxuaW1wb3J0IGNoYWxrIGZyb20gXCJjaGFsa1wiXG5pbXBvcnQgcHJvY2VzcyBmcm9tIFwicHJvY2Vzc1wiXG5pbXBvcnQgZmluZFdvcmtzcGFjZVJvb3QgZnJvbSBcImZpbmQteWFybi13b3Jrc3BhY2Utcm9vdFwiXG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VNYW5hZ2VyID0gXCJ5YXJuXCIgfCBcIm5wbVwiIHwgXCJucG0tc2hyaW5rd3JhcFwiIHwgXCJwbnBtXCJcblxuZnVuY3Rpb24gcHJpbnROb1lhcm5Mb2NrZmlsZUVycm9yKCkge1xuICBjb25zb2xlLmxvZyhgXG4ke2NoYWxrLnJlZC5ib2xkKFwiKipFUlJPUioqXCIpfSAke2NoYWxrLnJlZChcbiAgICBcIlRoZSAtLXVzZS15YXJuIG9wdGlvbiB3YXMgc3BlY2lmaWVkIGJ1dCB0aGVyZSBpcyBubyB5YXJuLmxvY2sgZmlsZVwiLFxuICApfVxuYClcbn1cblxuZnVuY3Rpb24gcHJpbnROb0xvY2tmaWxlc0Vycm9yKCkge1xuICBjb25zb2xlLmxvZyhgXG4ke2NoYWxrLnJlZC5ib2xkKFwiKipFUlJPUioqXCIpfSAke2NoYWxrLnJlZChcbiAgICBcIk5vIHBhY2thZ2UtbG9jay5qc29uLCBucG0tc2hyaW5rd3JhcC5qc29uLCB5YXJuLmxvY2ssIG9yIHBucG0tbG9jay55YW1sIGZpbGUuXFxuXFxuWW91IG11c3QgdXNlIGVpdGhlciBucG1APj01LCB5YXJuLCBwbnBtLCBvciBucG0tc2hyaW5rd3JhcCB0byBtYW5hZ2UgdGhpcyBwcm9qZWN0J3MgZGVwZW5kZW5jaWVzLlwiLFxuICApfVxuYClcbn1cblxuZnVuY3Rpb24gcHJpbnRTZWxlY3RpbmdEZWZhdWx0TWVzc2FnZSgpIHtcbiAgY29uc29sZS5pbmZvKFxuICAgIGAke2NoYWxrLmJvbGQoXG4gICAgICBcInBhdGNoLXBhY2thZ2VcIixcbiAgICApfTogeW91IGhhdmUgYm90aCB5YXJuLmxvY2sgYW5kIHBhY2thZ2UtbG9jay5qc29uXG5EZWZhdWx0aW5nIHRvIHVzaW5nICR7Y2hhbGsuYm9sZChcIm5wbVwiKX1cbllvdSBjYW4gb3ZlcnJpZGUgdGhpcyBzZXR0aW5nIGJ5IHBhc3NpbmcgLS11c2UteWFybiBvciBkZWxldGluZ1xucGFja2FnZS1sb2NrLmpzb24gaWYgeW91IGRvbid0IG5lZWQgaXRcbmAsXG4gIClcbn1cblxuZXhwb3J0IGNvbnN0IGRldGVjdFBhY2thZ2VNYW5hZ2VyID0gKFxuICBhcHBSb290UGF0aDogc3RyaW5nLFxuICBvdmVycmlkZVBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlciB8IG51bGwsXG4pOiBQYWNrYWdlTWFuYWdlciA9PiB7XG4gIGNvbnN0IHBhY2thZ2VMb2NrRXhpc3RzID0gZnMuZXhpc3RzU3luYyhcbiAgICBqb2luKGFwcFJvb3RQYXRoLCBcInBhY2thZ2UtbG9jay5qc29uXCIpLFxuICApXG4gIGNvbnN0IHNocmlua1dyYXBFeGlzdHMgPSBmcy5leGlzdHNTeW5jKFxuICAgIGpvaW4oYXBwUm9vdFBhdGgsIFwibnBtLXNocmlua3dyYXAuanNvblwiKSxcbiAgKVxuICBjb25zdCB5YXJuTG9ja0V4aXN0cyA9IGZzLmV4aXN0c1N5bmMoam9pbihhcHBSb290UGF0aCwgXCJ5YXJuLmxvY2tcIikpXG4gIGNvbnN0IHBucG1Mb2NrRXhpc3RzID0gZnMuZXhpc3RzU3luYyhqb2luKHByb2Nlc3MuY3dkKCksIFwicG5wbS1sb2NrLnlhbWxcIikpXG4gIGlmICgocGFja2FnZUxvY2tFeGlzdHMgfHwgc2hyaW5rV3JhcEV4aXN0cykgJiYgeWFybkxvY2tFeGlzdHMpIHtcbiAgICBpZiAob3ZlcnJpZGVQYWNrYWdlTWFuYWdlcikge1xuICAgICAgcmV0dXJuIG92ZXJyaWRlUGFja2FnZU1hbmFnZXJcbiAgICB9IGVsc2Uge1xuICAgICAgcHJpbnRTZWxlY3RpbmdEZWZhdWx0TWVzc2FnZSgpXG4gICAgICByZXR1cm4gc2hyaW5rV3JhcEV4aXN0cyA/IFwibnBtLXNocmlua3dyYXBcIiA6IFwibnBtXCJcbiAgICB9XG4gIH0gZWxzZSBpZiAocGFja2FnZUxvY2tFeGlzdHMgfHwgc2hyaW5rV3JhcEV4aXN0cykge1xuICAgIGlmIChvdmVycmlkZVBhY2thZ2VNYW5hZ2VyID09PSBcInlhcm5cIikge1xuICAgICAgcHJpbnROb1lhcm5Mb2NrZmlsZUVycm9yKClcbiAgICAgIHByb2Nlc3MuZXhpdCgxKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc2hyaW5rV3JhcEV4aXN0cyA/IFwibnBtLXNocmlua3dyYXBcIiA6IFwibnBtXCJcbiAgICB9XG4gIH0gZWxzZSBpZiAocG5wbUxvY2tFeGlzdHMpIHtcbiAgICByZXR1cm4gXCJwbnBtXCJcbiAgfSBlbHNlIGlmICh5YXJuTG9ja0V4aXN0cyB8fCBmaW5kV29ya3NwYWNlUm9vdCgpKSB7XG4gICAgcmV0dXJuIFwieWFyblwiXG4gIH0gZWxzZSB7XG4gICAgcHJpbnROb0xvY2tmaWxlc0Vycm9yKClcbiAgICBwcm9jZXNzLmV4aXQoMSlcbiAgfVxuICB0aHJvdyBFcnJvcigpXG59XG4iXX0=