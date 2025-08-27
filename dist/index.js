"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const process_1 = __importDefault(require("process"));
const minimist_1 = __importDefault(require("minimist"));
const applyPatches_1 = require("./applyPatches");
const getAppRootPath_1 = require("./getAppRootPath");
const makePatch_1 = require("./makePatch");
const makeRegExp_1 = require("./makeRegExp");
const detectPackageManager_1 = require("./detectPackageManager");
const path_1 = require("./path");
const path_2 = require("path");
const slash = require("slash");
const ci_info_1 = require("ci-info");
const rebase_1 = require("./rebase");
const appPath = (0, getAppRootPath_1.getAppRootPath)();
const argv = (0, minimist_1.default)(process_1.default.argv.slice(2), {
    boolean: [
        "use-yarn",
        "case-sensitive-path-filtering",
        "reverse",
        "help",
        "version",
        "error-on-fail",
        "error-on-warn",
        "create-issue",
        "partial",
        "",
    ],
    string: ["patch-dir", "append", "rebase"],
});
const packageNames = argv._;
console.log(chalk_1.default.bold("patch-package"), 
// tslint:disable-next-line:no-var-requires
require((0, path_1.join)(__dirname, "../package.json")).version);
if (argv.version || argv.v) {
    // noop
}
else if (argv.help || argv.h) {
    printHelp();
}
else {
    const patchDir = slash((0, path_2.normalize)((argv["patch-dir"] || "patches") + path_2.sep));
    if (patchDir.startsWith("/")) {
        throw new Error("--patch-dir must be a relative path");
    }
    if ("rebase" in argv) {
        if (!argv.rebase) {
            console.log(chalk_1.default.red("You must specify a patch file name or number when rebasing patches"));
            process_1.default.exit(1);
        }
        if (packageNames.length !== 1) {
            console.log(chalk_1.default.red("You must specify exactly one package name when rebasing patches"));
            process_1.default.exit(1);
        }
        (0, rebase_1.rebase)({
            appPath,
            packagePathSpecifier: packageNames[0],
            patchDir,
            targetPatch: argv.rebase,
        });
    }
    else if (packageNames.length) {
        const includePaths = (0, makeRegExp_1.makeRegExp)(argv.include, "include", /.*/, argv["case-sensitive-path-filtering"]);
        const excludePaths = (0, makeRegExp_1.makeRegExp)(argv.exclude, "exclude", /^package\.json$/, argv["case-sensitive-path-filtering"]);
        const packageManager = (0, detectPackageManager_1.detectPackageManager)(appPath, argv["use-yarn"] ? "yarn" : null);
        const createIssue = argv["create-issue"];
        packageNames.forEach((packagePathSpecifier) => {
            (0, makePatch_1.makePatch)({
                packagePathSpecifier,
                appPath,
                packageManager,
                includePaths,
                excludePaths,
                patchDir,
                createIssue,
                mode: "append" in argv
                    ? { type: "append", name: argv.append || undefined }
                    : { type: "overwrite_last" },
            });
        });
    }
    else {
        console.log("Applying patches...");
        const reverse = !!argv["reverse"];
        // don't want to exit(1) on postinstall locally.
        // see https://github.com/ds300/patch-package/issues/86
        const shouldExitWithError = !!argv["error-on-fail"] ||
            (process_1.default.env.NODE_ENV === "production" && ci_info_1.isCI) ||
            (ci_info_1.isCI && !process_1.default.env.PATCH_PACKAGE_INTEGRATION_TEST) ||
            process_1.default.env.NODE_ENV === "test";
        const shouldExitWithWarning = !!argv["error-on-warn"];
        (0, applyPatches_1.applyPatchesForApp)({
            appPath,
            reverse,
            patchDir,
            shouldExitWithError,
            shouldExitWithWarning,
            bestEffort: argv.partial,
        });
    }
}
function printHelp() {
    console.log(`
Usage:

  1. Patching packages
  ====================

    ${chalk_1.default.bold("patch-package")}

  Without arguments, the ${chalk_1.default.bold("patch-package")} command will attempt to find and apply
  patch files to your project. It looks for files named like

     ./patches/<package-name>+<version>.patch

  Options:

    ${chalk_1.default.bold("--patch-dir <dirname>")}

      Specify the name for the directory in which the patch files are located.
      
    ${chalk_1.default.bold("--error-on-fail")}
    
      Forces patch-package to exit with code 1 after failing.
    
      When running locally patch-package always exits with 0 by default.
      This happens even after failing to apply patches because otherwise 
      yarn.lock and package.json might get out of sync with node_modules,
      which can be very confusing.
      
      --error-on-fail is ${chalk_1.default.bold("switched on")} by default on CI.
      
      See https://github.com/ds300/patch-package/issues/86 for background.
      
    ${chalk_1.default.bold("--error-on-warn")}
    
      Forces patch-package to exit with code 1 after warning.
      
      See https://github.com/ds300/patch-package/issues/314 for background.

    ${chalk_1.default.bold("--reverse")}
        
      Un-applies all patches.

      Note that this will fail if the patched files have changed since being
      patched. In that case, you'll probably need to re-install 'node_modules'.

      This option was added to help people using CircleCI avoid an issue around caching
      and patch file updates (https://github.com/ds300/patch-package/issues/37),
      but might be useful in other contexts too.
      

  2. Creating patch files
  =======================

    ${chalk_1.default.bold("patch-package")} <package-name>${chalk_1.default.italic("[ <package-name>]")}

  When given package names as arguments, patch-package will create patch files
  based on any changes you've made to the versions installed by yarn/npm.

  Options:
  
    ${chalk_1.default.bold("--create-issue")}
    
       For packages whose source is hosted on GitHub this option opens a web
       browser with a draft issue based on your diff.

    ${chalk_1.default.bold("--use-yarn")}

        By default, patch-package checks whether you use npm or yarn based on
        which lockfile you have. If you have both, it uses npm by default.
        Set this option to override that default and always use yarn.

    ${chalk_1.default.bold("--exclude <regexp>")}

        Ignore paths matching the regexp when creating patch files.
        Paths are relative to the root dir of the package to be patched.

        Default: 'package\\.json$'

    ${chalk_1.default.bold("--include <regexp>")}

        Only consider paths matching the regexp when creating patch files.
        Paths are relative to the root dir of the package to be patched.

        Default '.*'

    ${chalk_1.default.bold("--case-sensitive-path-filtering")}

        Make regexps used in --include or --exclude filters case-sensitive.
    
    ${chalk_1.default.bold("--patch-dir")}

        Specify the name for the directory in which to put the patch files.
`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxrREFBeUI7QUFDekIsc0RBQTZCO0FBQzdCLHdEQUErQjtBQUUvQixpREFBbUQ7QUFDbkQscURBQWlEO0FBQ2pELDJDQUF1QztBQUN2Qyw2Q0FBeUM7QUFDekMsaUVBQTZEO0FBQzdELGlDQUE2QjtBQUM3QiwrQkFBcUM7QUFDckMsK0JBQStCO0FBQy9CLHFDQUE4QjtBQUM5QixxQ0FBaUM7QUFFakMsTUFBTSxPQUFPLEdBQUcsSUFBQSwrQkFBYyxHQUFFLENBQUE7QUFDaEMsTUFBTSxJQUFJLEdBQUcsSUFBQSxrQkFBUSxFQUFDLGlCQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUMzQyxPQUFPLEVBQUU7UUFDUCxVQUFVO1FBQ1YsK0JBQStCO1FBQy9CLFNBQVM7UUFDVCxNQUFNO1FBQ04sU0FBUztRQUNULGVBQWU7UUFDZixlQUFlO1FBQ2YsY0FBYztRQUNkLFNBQVM7UUFDVCxFQUFFO0tBQ0g7SUFDRCxNQUFNLEVBQUUsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQztDQUMxQyxDQUFDLENBQUE7QUFDRixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO0FBRTNCLE9BQU8sQ0FBQyxHQUFHLENBQ1QsZUFBSyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7QUFDM0IsMkNBQTJDO0FBQzNDLE9BQU8sQ0FBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FDcEQsQ0FBQTtBQUVELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDM0IsT0FBTztBQUNULENBQUM7S0FBTSxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsRUFB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QUFLLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDOzs7O01BSTdDLGVBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDOzs7Q0FHOUIsQ0FBQyxDQUFBO0FBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tIFwiY2hhbGtcIlxuaW1wb3J0IHByb2Nlc3MgZnJvbSBcInByb2Nlc3NcIlxuaW1wb3J0IG1pbmltaXN0IGZyb20gXCJtaW5pbWlzdFwiXG5cbmltcG9ydCB7IGFwcGx5UGF0Y2hlc0ZvckFwcCB9IGZyb20gXCIuL2FwcGx5UGF0Y2hlc1wiXG5pbXBvcnQgeyBnZXRBcHBSb290UGF0aCB9IGZyb20gXCIuL2dldEFwcFJvb3RQYXRoXCJcbmltcG9ydCB7IG1ha2VQYXRjaCB9IGZyb20gXCIuL21ha2VQYXRjaFwiXG5pbXBvcnQgeyBtYWtlUmVnRXhwIH0gZnJvbSBcIi4vbWFrZVJlZ0V4cFwiXG5pbXBvcnQgeyBkZXRlY3RQYWNrYWdlTWFuYWdlciB9IGZyb20gXCIuL2RldGVjdFBhY2thZ2VNYW5hZ2VyXCJcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwiLi9wYXRoXCJcbmltcG9ydCB7IG5vcm1hbGl6ZSwgc2VwIH0gZnJvbSBcInBhdGhcIlxuaW1wb3J0IHNsYXNoID0gcmVxdWlyZShcInNsYXNoXCIpXG5pbXBvcnQgeyBpc0NJIH0gZnJvbSBcImNpLWluZm9cIlxuaW1wb3J0IHsgcmViYXNlIH0gZnJvbSBcIi4vcmViYXNlXCJcblxuY29uc3QgYXBwUGF0aCA9IGdldEFwcFJvb3RQYXRoKClcbmNvbnN0IGFyZ3YgPSBtaW5pbWlzdChwcm9jZXNzLmFyZ3Yuc2xpY2UoMiksIHtcbiAgYm9vbGVhbjogW1xuICAgIFwidXNlLXlhcm5cIixcbiAgICBcImNhc2Utc2Vuc2l0aXZlLXBhdGgtZmlsdGVyaW5nXCIsXG4gICAgXCJyZXZlcnNlXCIsXG4gICAgXCJoZWxwXCIsXG4gICAgXCJ2ZXJzaW9uXCIsXG4gICAgXCJlcnJvci1vbi1mYWlsXCIsXG4gICAgXCJlcnJvci1vbi13YXJuXCIsXG4gICAgXCJjcmVhdGUtaXNzdWVcIixcbiAgICBcInBhcnRpYWxcIixcbiAgICBcIlwiLFxuICBdLFxuICBzdHJpbmc6IFtcInBhdGNoLWRpclwiLCBcImFwcGVuZFwiLCBcInJlYmFzZVwiXSxcbn0pXG5jb25zdCBwYWNrYWdlTmFtZXMgPSBhcmd2Ll9cblxuY29uc29sZS5sb2coXG4gIGNoYWxrLmJvbGQoXCJwYXRjaC1wYWNrYWdlXCIpLFxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tdmFyLXJlcXVpcmVzXG4gIHJlcXVpcmUoam9pbihfX2Rpcm5hbWUsIFwiLi4vcGFja2FnZS5qc29uXCIpKS52ZXJzaW9uLFxuKVxuXG5pZiAoYXJndi52ZXJzaW9uIHx8IGFyZ3Yudikge1xuICAvLyBub29wXG59IGVsc2UgaWYgKGFyZ3YuaGVscCB8fCBhcmd2LmgpIHtcbiAgcHJpbnRIZWxwKClcbn0gZWxzZSB7XG4gIGNvbnN0IHBhdGNoRGlyID0gc2xhc2gobm9ybWFsaXplKChhcmd2W1wicGF0Y2gtZGlyXCJdIHx8IFwicGF0Y2hlc1wiKSArIHNlcCkpXG4gIGlmIChwYXRjaERpci5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIi0tcGF0Y2gtZGlyIG11c3QgYmUgYSByZWxhdGl2ZSBwYXRoXCIpXG4gIH1cbiAgaWYgKFwicmViYXNlXCIgaW4gYXJndikge1xuICAgIGlmICghYXJndi5yZWJhc2UpIHtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBjaGFsay5yZWQoXG4gICAgICAgICAgXCJZb3UgbXVzdCBzcGVjaWZ5IGEgcGF0Y2ggZmlsZSBuYW1lIG9yIG51bWJlciB3aGVuIHJlYmFzaW5nIHBhdGNoZXNcIixcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICAgIHByb2Nlc3MuZXhpdCgxKVxuICAgIH1cbiAgICBpZiAocGFja2FnZU5hbWVzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgIGNoYWxrLnJlZChcbiAgICAgICAgICBcIllvdSBtdXN0IHNwZWNpZnkgZXhhY3RseSBvbmUgcGFja2FnZSBuYW1lIHdoZW4gcmViYXNpbmcgcGF0Y2hlc1wiLFxuICAgICAgICApLFxuICAgICAgKVxuICAgICAgcHJvY2Vzcy5leGl0KDEpXG4gICAgfVxuICAgIHJlYmFzZSh7XG4gICAgICBhcHBQYXRoLFxuICAgICAgcGFja2FnZVBhdGhTcGVjaWZpZXI6IHBhY2thZ2VOYW1lc1swXSxcbiAgICAgIHBhdGNoRGlyLFxuICAgICAgdGFyZ2V0UGF0Y2g6IGFyZ3YucmViYXNlLFxuICAgIH0pXG4gIH0gZWxzZSBpZiAocGFja2FnZU5hbWVzLmxlbmd0aCkge1xuICAgIGNvbnN0IGluY2x1ZGVQYXRocyA9IG1ha2VSZWdFeHAoXG4gICAgICBhcmd2LmluY2x1ZGUsXG4gICAgICBcImluY2x1ZGVcIixcbiAgICAgIC8uKi8sXG4gICAgICBhcmd2W1wiY2FzZS1zZW5zaXRpdmUtcGF0aC1maWx0ZXJpbmdcIl0sXG4gICAgKVxuICAgIGNvbnN0IGV4Y2x1ZGVQYXRocyA9IG1ha2VSZWdFeHAoXG4gICAgICBhcmd2LmV4Y2x1ZGUsXG4gICAgICBcImV4Y2x1ZGVcIixcbiAgICAgIC9ecGFja2FnZVxcLmpzb24kLyxcbiAgICAgIGFyZ3ZbXCJjYXNlLXNlbnNpdGl2ZS1wYXRoLWZpbHRlcmluZ1wiXSxcbiAgICApXG4gICAgY29uc3QgcGFja2FnZU1hbmFnZXIgPSBkZXRlY3RQYWNrYWdlTWFuYWdlcihcbiAgICAgIGFwcFBhdGgsXG4gICAgICBhcmd2W1widXNlLXlhcm5cIl0gPyBcInlhcm5cIiA6IG51bGwsXG4gICAgKVxuICAgIGNvbnN0IGNyZWF0ZUlzc3VlID0gYXJndltcImNyZWF0ZS1pc3N1ZVwiXVxuICAgIHBhY2thZ2VOYW1lcy5mb3JFYWNoKChwYWNrYWdlUGF0aFNwZWNpZmllcjogc3RyaW5nKSA9PiB7XG4gICAgICBtYWtlUGF0Y2goe1xuICAgICAgICBwYWNrYWdlUGF0aFNwZWNpZmllcixcbiAgICAgICAgYXBwUGF0aCxcbiAgICAgICAgcGFja2FnZU1hbmFnZXIsXG4gICAgICAgIGluY2x1ZGVQYXRocyxcbiAgICAgICAgZXhjbHVkZVBhdGhzLFxuICAgICAgICBwYXRjaERpcixcbiAgICAgICAgY3JlYXRlSXNzdWUsXG4gICAgICAgIG1vZGU6XG4gICAgICAgICAgXCJhcHBlbmRcIiBpbiBhcmd2XG4gICAgICAgICAgICA/IHsgdHlwZTogXCJhcHBlbmRcIiwgbmFtZTogYXJndi5hcHBlbmQgfHwgdW5kZWZpbmVkIH1cbiAgICAgICAgICAgIDogeyB0eXBlOiBcIm92ZXJ3cml0ZV9sYXN0XCIgfSxcbiAgICAgIH0pXG4gICAgfSlcbiAgfSBlbHNlIHtcbiAgICBjb25zb2xlLmxvZyhcIkFwcGx5aW5nIHBhdGNoZXMuLi5cIilcbiAgICBjb25zdCByZXZlcnNlID0gISFhcmd2W1wicmV2ZXJzZVwiXVxuICAgIC8vIGRvbid0IHdhbnQgdG8gZXhpdCgxKSBvbiBwb3N0aW5zdGFsbCBsb2NhbGx5LlxuICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vZHMzMDAvcGF0Y2gtcGFja2FnZS9pc3N1ZXMvODZcbiAgICBjb25zdCBzaG91bGRFeGl0V2l0aEVycm9yID1cbiAgICAgICEhYXJndltcImVycm9yLW9uLWZhaWxcIl0gfHxcbiAgICAgIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gXCJwcm9kdWN0aW9uXCIgJiYgaXNDSSkgfHxcbiAgICAgIChpc0NJICYmICFwcm9jZXNzLmVudi5QQVRDSF9QQUNLQUdFX0lOVEVHUkFUSU9OX1RFU1QpIHx8XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gXCJ0ZXN0XCJcblxuICAgIGNvbnN0IHNob3VsZEV4aXRXaXRoV2FybmluZyA9ICEhYXJndltcImVycm9yLW9uLXdhcm5cIl1cblxuICAgIGFwcGx5UGF0Y2hlc0ZvckFwcCh7XG4gICAgICBhcHBQYXRoLFxuICAgICAgcmV2ZXJzZSxcbiAgICAgIHBhdGNoRGlyLFxuICAgICAgc2hvdWxkRXhpdFdpdGhFcnJvcixcbiAgICAgIHNob3VsZEV4aXRXaXRoV2FybmluZyxcbiAgICAgIGJlc3RFZmZvcnQ6IGFyZ3YucGFydGlhbCxcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIHByaW50SGVscCgpIHtcbiAgY29uc29sZS5sb2coYFxuVXNhZ2U6XG5cbiAgMS4gUGF0Y2hpbmcgcGFja2FnZXNcbiAgPT09PT09PT09PT09PT09PT09PT1cblxuICAgICR7Y2hhbGsuYm9sZChcInBhdGNoLXBhY2thZ2VcIil9XG5cbiAgV2l0aG91dCBhcmd1bWVudHMsIHRoZSAke2NoYWxrLmJvbGQoXG4gICAgXCJwYXRjaC1wYWNrYWdlXCIsXG4gICl9IGNvbW1hbmQgd2lsbCBhdHRlbXB0IHRvIGZpbmQgYW5kIGFwcGx5XG4gIHBhdGNoIGZpbGVzIHRvIHlvdXIgcHJvamVjdC4gSXQgbG9va3MgZm9yIGZpbGVzIG5hbWVkIGxpa2VcblxuICAgICAuL3BhdGNoZXMvPHBhY2thZ2UtbmFtZT4rPHZlcnNpb24+LnBhdGNoXG5cbiAgT3B0aW9uczpcblxuICAgICR7Y2hhbGsuYm9sZChcIi0tcGF0Y2gtZGlyIDxkaXJuYW1lPlwiKX1cblxuICAgICAgU3BlY2lmeSB0aGUgbmFtZSBmb3IgdGhlIGRpcmVjdG9yeSBpbiB3aGljaCB0aGUgcGF0Y2ggZmlsZXMgYXJlIGxvY2F0ZWQuXG4gICAgICBcbiAgICAke2NoYWxrLmJvbGQoXCItLWVycm9yLW9uLWZhaWxcIil9XG4gICAgXG4gICAgICBGb3JjZXMgcGF0Y2gtcGFja2FnZSB0byBleGl0IHdpdGggY29kZSAxIGFmdGVyIGZhaWxpbmcuXG4gICAgXG4gICAgICBXaGVuIHJ1bm5pbmcgbG9jYWxseSBwYXRjaC1wYWNrYWdlIGFsd2F5cyBleGl0cyB3aXRoIDAgYnkgZGVmYXVsdC5cbiAgICAgIFRoaXMgaGFwcGVucyBldmVuIGFmdGVyIGZhaWxpbmcgdG8gYXBwbHkgcGF0Y2hlcyBiZWNhdXNlIG90aGVyd2lzZSBcbiAgICAgIHlhcm4ubG9jayBhbmQgcGFja2FnZS5qc29uIG1pZ2h0IGdldCBvdXQgb2Ygc3luYyB3aXRoIG5vZGVfbW9kdWxlcyxcbiAgICAgIHdoaWNoIGNhbiBiZSB2ZXJ5IGNvbmZ1c2luZy5cbiAgICAgIFxuICAgICAgLS1lcnJvci1vbi1mYWlsIGlzICR7Y2hhbGsuYm9sZChcInN3aXRjaGVkIG9uXCIpfSBieSBkZWZhdWx0IG9uIENJLlxuICAgICAgXG4gICAgICBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2RzMzAwL3BhdGNoLXBhY2thZ2UvaXNzdWVzLzg2IGZvciBiYWNrZ3JvdW5kLlxuICAgICAgXG4gICAgJHtjaGFsay5ib2xkKFwiLS1lcnJvci1vbi13YXJuXCIpfVxuICAgIFxuICAgICAgRm9yY2VzIHBhdGNoLXBhY2thZ2UgdG8gZXhpdCB3aXRoIGNvZGUgMSBhZnRlciB3YXJuaW5nLlxuICAgICAgXG4gICAgICBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2RzMzAwL3BhdGNoLXBhY2thZ2UvaXNzdWVzLzMxNCBmb3IgYmFja2dyb3VuZC5cblxuICAgICR7Y2hhbGsuYm9sZChcIi0tcmV2ZXJzZVwiKX1cbiAgICAgICAgXG4gICAgICBVbi1hcHBsaWVzIGFsbCBwYXRjaGVzLlxuXG4gICAgICBOb3RlIHRoYXQgdGhpcyB3aWxsIGZhaWwgaWYgdGhlIHBhdGNoZWQgZmlsZXMgaGF2ZSBjaGFuZ2VkIHNpbmNlIGJlaW5nXG4gICAgICBwYXRjaGVkLiBJbiB0aGF0IGNhc2UsIHlvdSdsbCBwcm9iYWJseSBuZWVkIHRvIHJlLWluc3RhbGwgJ25vZGVfbW9kdWxlcycuXG5cbiAgICAgIFRoaXMgb3B0aW9uIHdhcyBhZGRlZCB0byBoZWxwIHBlb3BsZSB1c2luZyBDaXJjbGVDSSBhdm9pZCBhbiBpc3N1ZSBhcm91bmQgY2FjaGluZ1xuICAgICAgYW5kIHBhdGNoIGZpbGUgdXBkYXRlcyAoaHR0cHM6Ly9naXRodWIuY29tL2RzMzAwL3BhdGNoLXBhY2thZ2UvaXNzdWVzLzM3KSxcbiAgICAgIGJ1dCBtaWdodCBiZSB1c2VmdWwgaW4gb3RoZXIgY29udGV4dHMgdG9vLlxuICAgICAgXG5cbiAgMi4gQ3JlYXRpbmcgcGF0Y2ggZmlsZXNcbiAgPT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgICR7Y2hhbGsuYm9sZChcInBhdGNoLXBhY2thZ2VcIil9IDxwYWNrYWdlLW5hbWU+JHtjaGFsay5pdGFsaWMoXG4gICAgXCJbIDxwYWNrYWdlLW5hbWU+XVwiLFxuICApfVxuXG4gIFdoZW4gZ2l2ZW4gcGFja2FnZSBuYW1lcyBhcyBhcmd1bWVudHMsIHBhdGNoLXBhY2thZ2Ugd2lsbCBjcmVhdGUgcGF0Y2ggZmlsZXNcbiAgYmFzZWQgb24gYW55IGNoYW5nZXMgeW91J3ZlIG1hZGUgdG8gdGhlIHZlcnNpb25zIGluc3RhbGxlZCBieSB5YXJuL25wbS5cblxuICBPcHRpb25zOlxuICBcbiAgICAke2NoYWxrLmJvbGQoXCItLWNyZWF0ZS1pc3N1ZVwiKX1cbiAgICBcbiAgICAgICBGb3IgcGFja2FnZXMgd2hvc2Ugc291cmNlIGlzIGhvc3RlZCBvbiBHaXRIdWIgdGhpcyBvcHRpb24gb3BlbnMgYSB3ZWJcbiAgICAgICBicm93c2VyIHdpdGggYSBkcmFmdCBpc3N1ZSBiYXNlZCBvbiB5b3VyIGRpZmYuXG5cbiAgICAke2NoYWxrLmJvbGQoXCItLXVzZS15YXJuXCIpfVxuXG4gICAgICAgIEJ5IGRlZmF1bHQsIHBhdGNoLXBhY2thZ2UgY2hlY2tzIHdoZXRoZXIgeW91IHVzZSBucG0gb3IgeWFybiBiYXNlZCBvblxuICAgICAgICB3aGljaCBsb2NrZmlsZSB5b3UgaGF2ZS4gSWYgeW91IGhhdmUgYm90aCwgaXQgdXNlcyBucG0gYnkgZGVmYXVsdC5cbiAgICAgICAgU2V0IHRoaXMgb3B0aW9uIHRvIG92ZXJyaWRlIHRoYXQgZGVmYXVsdCBhbmQgYWx3YXlzIHVzZSB5YXJuLlxuXG4gICAgJHtjaGFsay5ib2xkKFwiLS1leGNsdWRlIDxyZWdleHA+XCIpfVxuXG4gICAgICAgIElnbm9yZSBwYXRocyBtYXRjaGluZyB0aGUgcmVnZXhwIHdoZW4gY3JlYXRpbmcgcGF0Y2ggZmlsZXMuXG4gICAgICAgIFBhdGhzIGFyZSByZWxhdGl2ZSB0byB0aGUgcm9vdCBkaXIgb2YgdGhlIHBhY2thZ2UgdG8gYmUgcGF0Y2hlZC5cblxuICAgICAgICBEZWZhdWx0OiAncGFja2FnZVxcXFwuanNvbiQnXG5cbiAgICAke2NoYWxrLmJvbGQoXCItLWluY2x1ZGUgPHJlZ2V4cD5cIil9XG5cbiAgICAgICAgT25seSBjb25zaWRlciBwYXRocyBtYXRjaGluZyB0aGUgcmVnZXhwIHdoZW4gY3JlYXRpbmcgcGF0Y2ggZmlsZXMuXG4gICAgICAgIFBhdGhzIGFyZSByZWxhdGl2ZSB0byB0aGUgcm9vdCBkaXIgb2YgdGhlIHBhY2thZ2UgdG8gYmUgcGF0Y2hlZC5cblxuICAgICAgICBEZWZhdWx0ICcuKidcblxuICAgICR7Y2hhbGsuYm9sZChcIi0tY2FzZS1zZW5zaXRpdmUtcGF0aC1maWx0ZXJpbmdcIil9XG5cbiAgICAgICAgTWFrZSByZWdleHBzIHVzZWQgaW4gLS1pbmNsdWRlIG9yIC0tZXhjbHVkZSBmaWx0ZXJzIGNhc2Utc2Vuc2l0aXZlLlxuICAgIFxuICAgICR7Y2hhbGsuYm9sZChcIi0tcGF0Y2gtZGlyXCIpfVxuXG4gICAgICAgIFNwZWNpZnkgdGhlIG5hbWUgZm9yIHRoZSBkaXJlY3RvcnkgaW4gd2hpY2ggdG8gcHV0IHRoZSBwYXRjaCBmaWxlcy5cbmApXG59XG4iXX0=