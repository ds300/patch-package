"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var chalk = require("chalk");
var process = require("process");
function detectPackageManager(appRootPath, overridePackageManager) {
    var packageLockExists = fs.existsSync(path.join(appRootPath, "package-lock.json"));
    var shrinkWrapExists = fs.existsSync(path.join(appRootPath, "npm-shrinkwrap.json"));
    var yarnLockExists = fs.existsSync(path.join(appRootPath, "yarn.lock"));
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
            process.exit(1);
        }
        else {
            return shrinkWrapExists ? "npm-shrinkwrap" : "npm";
        }
    }
    else if (yarnLockExists) {
        return "yarn";
    }
    else {
        printNoLockfilesError();
        process.exit(1);
    }
    throw Error();
}
exports.default = detectPackageManager;
function printNoYarnLockfileError() {
    console.error("\n" + chalk.red.bold("**ERROR**") + " " + chalk.red("The --use-yarn option was specified but there is no yarn.lock file") + "\n");
}
function printNoLockfilesError() {
    console.error("\n" + chalk.red.bold("**ERROR**") + " " + chalk.red("No package-lock.json, npm-shrinkwrap.json, or yarn.lock file.\n\nYou must use either npm@>=5, yarn, or npm-shrinkwrap to manage this project's\ndependencies.") + "\n");
}
function printSelectingDefaultMessage() {
    console.info(chalk.bold("patch-package") + ": you have both yarn.lock and package-lock.json\nDefaulting to using " + chalk.bold("npm") + "\nYou can override this setting by passing --use-yarn or deleting\npackage-lock.json if you don't need it\n");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZWN0UGFja2FnZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZGV0ZWN0UGFja2FnZU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1QkFBd0I7QUFDeEIsMkJBQTRCO0FBQzVCLDZCQUE4QjtBQUM5QixpQ0FBa0M7QUFJbEMsOEJBQ0UsV0FBbUIsRUFDbkIsc0JBQTZDO0lBRTdDLElBQU0saUJBQWlCLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsbUJBQW1CLENBQUMsQ0FDNUMsQ0FBQTtJQUNELElBQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUscUJBQXFCLENBQUMsQ0FDOUMsQ0FBQTtJQUNELElBQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUN6RSxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixJQUFJLGdCQUFnQixDQUFDLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQztRQUM5RCxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7WUFDM0IsTUFBTSxDQUFDLHNCQUFzQixDQUFBO1FBQy9CLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLDRCQUE0QixFQUFFLENBQUE7WUFDOUIsTUFBTSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtRQUNwRCxDQUFDO0lBQ0gsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDakQsRUFBRSxDQUFDLENBQUMsc0JBQXNCLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN0Qyx3QkFBd0IsRUFBRSxDQUFBO1lBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sTUFBTSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtRQUNwRCxDQUFDO0lBQ0gsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxNQUFNLENBQUE7SUFDZixDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixxQkFBcUIsRUFBRSxDQUFBO1FBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakIsQ0FBQztJQUNELE1BQU0sS0FBSyxFQUFFLENBQUE7QUFDZixDQUFDO0FBaENELHVDQWdDQztBQUVEO0lBQ0UsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUNkLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFJLEtBQUssQ0FBQyxHQUFHLENBQ3RDLG9FQUFvRSxDQUNyRSxPQUNGLENBQUMsQ0FBQTtBQUNGLENBQUM7QUFFRDtJQUNFLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FDZCxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBSSxLQUFLLENBQUMsR0FBRyxDQUN0QywrSkFHVSxDQUNYLE9BQ0YsQ0FBQyxDQUFBO0FBQ0YsQ0FBQztBQUVEO0lBQ0UsT0FBTyxDQUFDLElBQUksQ0FDUCxLQUFLLENBQUMsSUFBSSxDQUNYLGVBQWUsQ0FDaEIsNkVBQ2lCLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdIQUd0QyxDQUNFLENBQUE7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIlxuaW1wb3J0ICogYXMgY2hhbGsgZnJvbSBcImNoYWxrXCJcbmltcG9ydCAqIGFzIHByb2Nlc3MgZnJvbSBcInByb2Nlc3NcIlxuXG5leHBvcnQgdHlwZSBQYWNrYWdlTWFuYWdlciA9IFwieWFyblwiIHwgXCJucG1cIiB8IFwibnBtLXNocmlua3dyYXBcIlxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkZXRlY3RQYWNrYWdlTWFuYWdlcihcbiAgYXBwUm9vdFBhdGg6IHN0cmluZyxcbiAgb3ZlcnJpZGVQYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXIgfCBudWxsLFxuKTogUGFja2FnZU1hbmFnZXIge1xuICBjb25zdCBwYWNrYWdlTG9ja0V4aXN0cyA9IGZzLmV4aXN0c1N5bmMoXG4gICAgcGF0aC5qb2luKGFwcFJvb3RQYXRoLCBcInBhY2thZ2UtbG9jay5qc29uXCIpLFxuICApXG4gIGNvbnN0IHNocmlua1dyYXBFeGlzdHMgPSBmcy5leGlzdHNTeW5jKFxuICAgIHBhdGguam9pbihhcHBSb290UGF0aCwgXCJucG0tc2hyaW5rd3JhcC5qc29uXCIpLFxuICApXG4gIGNvbnN0IHlhcm5Mb2NrRXhpc3RzID0gZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oYXBwUm9vdFBhdGgsIFwieWFybi5sb2NrXCIpKVxuICBpZiAoKHBhY2thZ2VMb2NrRXhpc3RzIHx8IHNocmlua1dyYXBFeGlzdHMpICYmIHlhcm5Mb2NrRXhpc3RzKSB7XG4gICAgaWYgKG92ZXJyaWRlUGFja2FnZU1hbmFnZXIpIHtcbiAgICAgIHJldHVybiBvdmVycmlkZVBhY2thZ2VNYW5hZ2VyXG4gICAgfSBlbHNlIHtcbiAgICAgIHByaW50U2VsZWN0aW5nRGVmYXVsdE1lc3NhZ2UoKVxuICAgICAgcmV0dXJuIHNocmlua1dyYXBFeGlzdHMgPyBcIm5wbS1zaHJpbmt3cmFwXCIgOiBcIm5wbVwiXG4gICAgfVxuICB9IGVsc2UgaWYgKHBhY2thZ2VMb2NrRXhpc3RzIHx8IHNocmlua1dyYXBFeGlzdHMpIHtcbiAgICBpZiAob3ZlcnJpZGVQYWNrYWdlTWFuYWdlciA9PT0gXCJ5YXJuXCIpIHtcbiAgICAgIHByaW50Tm9ZYXJuTG9ja2ZpbGVFcnJvcigpXG4gICAgICBwcm9jZXNzLmV4aXQoMSlcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHNocmlua1dyYXBFeGlzdHMgPyBcIm5wbS1zaHJpbmt3cmFwXCIgOiBcIm5wbVwiXG4gICAgfVxuICB9IGVsc2UgaWYgKHlhcm5Mb2NrRXhpc3RzKSB7XG4gICAgcmV0dXJuIFwieWFyblwiXG4gIH0gZWxzZSB7XG4gICAgcHJpbnROb0xvY2tmaWxlc0Vycm9yKClcbiAgICBwcm9jZXNzLmV4aXQoMSlcbiAgfVxuICB0aHJvdyBFcnJvcigpXG59XG5cbmZ1bmN0aW9uIHByaW50Tm9ZYXJuTG9ja2ZpbGVFcnJvcigpIHtcbiAgY29uc29sZS5lcnJvcihgXG4ke2NoYWxrLnJlZC5ib2xkKFwiKipFUlJPUioqXCIpfSAke2NoYWxrLnJlZChcbiAgICBgVGhlIC0tdXNlLXlhcm4gb3B0aW9uIHdhcyBzcGVjaWZpZWQgYnV0IHRoZXJlIGlzIG5vIHlhcm4ubG9jayBmaWxlYCxcbiAgKX1cbmApXG59XG5cbmZ1bmN0aW9uIHByaW50Tm9Mb2NrZmlsZXNFcnJvcigpIHtcbiAgY29uc29sZS5lcnJvcihgXG4ke2NoYWxrLnJlZC5ib2xkKFwiKipFUlJPUioqXCIpfSAke2NoYWxrLnJlZChcbiAgICBgTm8gcGFja2FnZS1sb2NrLmpzb24sIG5wbS1zaHJpbmt3cmFwLmpzb24sIG9yIHlhcm4ubG9jayBmaWxlLlxuXG5Zb3UgbXVzdCB1c2UgZWl0aGVyIG5wbUA+PTUsIHlhcm4sIG9yIG5wbS1zaHJpbmt3cmFwIHRvIG1hbmFnZSB0aGlzIHByb2plY3Qnc1xuZGVwZW5kZW5jaWVzLmAsXG4gICl9XG5gKVxufVxuXG5mdW5jdGlvbiBwcmludFNlbGVjdGluZ0RlZmF1bHRNZXNzYWdlKCkge1xuICBjb25zb2xlLmluZm8oXG4gICAgYCR7Y2hhbGsuYm9sZChcbiAgICAgIFwicGF0Y2gtcGFja2FnZVwiLFxuICAgICl9OiB5b3UgaGF2ZSBib3RoIHlhcm4ubG9jayBhbmQgcGFja2FnZS1sb2NrLmpzb25cbkRlZmF1bHRpbmcgdG8gdXNpbmcgJHtjaGFsay5ib2xkKFwibnBtXCIpfVxuWW91IGNhbiBvdmVycmlkZSB0aGlzIHNldHRpbmcgYnkgcGFzc2luZyAtLXVzZS15YXJuIG9yIGRlbGV0aW5nXG5wYWNrYWdlLWxvY2suanNvbiBpZiB5b3UgZG9uJ3QgbmVlZCBpdFxuYCxcbiAgKVxufVxuIl19