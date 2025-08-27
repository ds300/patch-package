"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPatchesForApp = applyPatchesForApp;
exports.applyPatchesForPackage = applyPatchesForPackage;
exports.applyPatch = applyPatch;
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const semver_1 = __importDefault(require("semver"));
const hash_1 = require("./hash");
const makePatch_1 = require("./makePatch");
const packageIsDevDependency_1 = require("./packageIsDevDependency");
const apply_1 = require("./patch/apply");
const read_1 = require("./patch/read");
const reverse_1 = require("./patch/reverse");
const patchFs_1 = require("./patchFs");
const path_2 = require("./path");
const stateFile_1 = require("./stateFile");
class PatchApplicationError extends Error {
    constructor(msg) {
        super(msg);
    }
}
function getInstalledPackageVersion({ appPath, path, pathSpecifier, isDevOnly, patchFilename, }) {
    const packageDir = (0, path_2.join)(appPath, path);
    if (!(0, fs_extra_1.existsSync)(packageDir)) {
        if (process.env.NODE_ENV === "production" && isDevOnly) {
            return null;
        }
        let err = `${chalk_1.default.red("Error:")} Patch file found for package ${path_1.posix.basename(pathSpecifier)}` + ` which is not present at ${(0, path_2.relative)(".", packageDir)}`;
        if (!isDevOnly && process.env.NODE_ENV === "production") {
            err += `

  If this package is a dev dependency, rename the patch file to
  
    ${chalk_1.default.bold(patchFilename.replace(".patch", ".dev.patch"))}
`;
        }
        throw new PatchApplicationError(err);
    }
    const { version } = require((0, path_2.join)(packageDir, "package.json"));
    // normalize version for `npm ci`
    const result = semver_1.default.valid(version);
    if (result === null) {
        throw new PatchApplicationError(`${chalk_1.default.red("Error:")} Version string '${version}' cannot be parsed from ${(0, path_2.join)(packageDir, "package.json")}`);
    }
    return result;
}
function logPatchApplication(patchDetails) {
    const sequenceString = patchDetails.sequenceNumber != null
        ? ` (${patchDetails.sequenceNumber}${patchDetails.sequenceName ? " " + patchDetails.sequenceName : ""})`
        : "";
    console.log(`${chalk_1.default.bold(patchDetails.pathSpecifier)}@${patchDetails.version}${sequenceString} ${chalk_1.default.green("✔")}`);
}
function applyPatchesForApp({ appPath, reverse, patchDir, shouldExitWithError, shouldExitWithWarning, bestEffort, }) {
    const patchesDirectory = (0, path_2.join)(appPath, patchDir);
    const groupedPatches = (0, patchFs_1.getGroupedPatches)(patchesDirectory);
    if (groupedPatches.numPatchFiles === 0) {
        console.log(chalk_1.default.blueBright("No patch files found"));
        return;
    }
    const errors = [];
    const warnings = [...groupedPatches.warnings];
    for (const patches of Object.values(groupedPatches.pathSpecifierToPatchFiles)) {
        applyPatchesForPackage({
            patches,
            appPath,
            patchDir,
            reverse,
            warnings,
            errors,
            bestEffort,
        });
    }
    for (const warning of warnings) {
        console.log(warning);
    }
    for (const error of errors) {
        console.log(error);
    }
    const problemsSummary = [];
    if (warnings.length) {
        problemsSummary.push(chalk_1.default.yellow(`${warnings.length} warning(s)`));
    }
    if (errors.length) {
        problemsSummary.push(chalk_1.default.red(`${errors.length} error(s)`));
    }
    if (problemsSummary.length) {
        console.log("---");
        console.log("patch-package finished with", problemsSummary.join(", ") + ".");
    }
    if (errors.length && shouldExitWithError) {
        process.exit(1);
    }
    if (warnings.length && shouldExitWithWarning) {
        process.exit(1);
    }
    process.exit(0);
}
function applyPatchesForPackage({ patches, appPath, patchDir, reverse, warnings, errors, bestEffort, }) {
    const pathSpecifier = patches[0].pathSpecifier;
    const state = patches.length > 1 ? (0, stateFile_1.getPatchApplicationState)(patches[0]) : null;
    const unappliedPatches = patches.slice(0);
    const appliedPatches = [];
    // if there are multiple patches to apply, we can't rely on the reverse-patch-dry-run behavior to make this operation
    // idempotent, so instead we need to check the state file to see whether we have already applied any of the patches
    // todo: once this is battle tested we might want to use the same approach for single patches as well, but it's not biggie since the dry run thing is fast
    if (unappliedPatches && state) {
        for (let i = 0; i < state.patches.length; i++) {
            const patchThatWasApplied = state.patches[i];
            if (!patchThatWasApplied.didApply) {
                break;
            }
            const patchToApply = unappliedPatches[0];
            const currentPatchHash = (0, hash_1.hashFile)((0, path_2.join)(appPath, patchDir, patchToApply.patchFilename));
            if (patchThatWasApplied.patchContentHash === currentPatchHash) {
                // this patch was applied we can skip it
                appliedPatches.push(unappliedPatches.shift());
            }
            else {
                console.log(chalk_1.default.red("Error:"), `The patches for ${chalk_1.default.bold(pathSpecifier)} have changed.`, `You should reinstall your node_modules folder to make sure the package is up to date`);
                process.exit(1);
            }
        }
    }
    if (reverse && state) {
        // if we are reversing the patches we need to make the unappliedPatches array
        // be the reversed version of the appliedPatches array.
        // The applied patches array should then be empty because it is used differently
        // when outputting the state file.
        unappliedPatches.length = 0;
        unappliedPatches.push(...appliedPatches);
        unappliedPatches.reverse();
        appliedPatches.length = 0;
    }
    if (appliedPatches.length) {
        // some patches have already been applied
        appliedPatches.forEach(logPatchApplication);
    }
    if (!unappliedPatches.length) {
        return;
    }
    let failedPatch = null;
    packageLoop: for (const patchDetails of unappliedPatches) {
        try {
            const { name, version, path, isDevOnly, patchFilename } = patchDetails;
            const installedPackageVersion = getInstalledPackageVersion({
                appPath,
                path,
                pathSpecifier,
                isDevOnly: isDevOnly ||
                    // check for direct-dependents in prod
                    (process.env.NODE_ENV === "production" &&
                        (0, packageIsDevDependency_1.packageIsDevDependency)({
                            appPath,
                            patchDetails,
                        })),
                patchFilename,
            });
            if (!installedPackageVersion) {
                // it's ok we're in production mode and this is a dev only package
                console.log(`Skipping dev-only ${chalk_1.default.bold(pathSpecifier)}@${version} ${chalk_1.default.blue("✔")}`);
                continue;
            }
            if (applyPatch({
                patchFilePath: (0, path_2.join)(appPath, patchDir, patchFilename),
                reverse,
                patchDetails,
                patchDir,
                cwd: process.cwd(),
                bestEffort,
            })) {
                appliedPatches.push(patchDetails);
                // yay patch was applied successfully
                // print warning if version mismatch
                if (installedPackageVersion !== version) {
                    warnings.push(createVersionMismatchWarning({
                        packageName: name,
                        actualVersion: installedPackageVersion,
                        originalVersion: version,
                        pathSpecifier,
                        path,
                    }));
                }
                logPatchApplication(patchDetails);
            }
            else if (patches.length > 1) {
                (0, makePatch_1.logPatchSequenceError)({ patchDetails });
                // in case the package has multiple patches, we need to break out of this inner loop
                // because we don't want to apply more patches on top of the broken state
                failedPatch = patchDetails;
                break packageLoop;
            }
            else if (installedPackageVersion === version) {
                // completely failed to apply patch
                // TODO: propagate useful error messages from patch application
                errors.push(createBrokenPatchFileError({
                    packageName: name,
                    patchFilename,
                    pathSpecifier,
                    path,
                }));
                break packageLoop;
            }
            else {
                errors.push(createPatchApplicationFailureError({
                    packageName: name,
                    actualVersion: installedPackageVersion,
                    originalVersion: version,
                    patchFilename,
                    path,
                    pathSpecifier,
                }));
                // in case the package has multiple patches, we need to break out of this inner loop
                // because we don't want to apply more patches on top of the broken state
                break packageLoop;
            }
        }
        catch (error) {
            if (error instanceof PatchApplicationError) {
                errors.push(error.message);
            }
            else {
                errors.push(createUnexpectedError({
                    filename: patchDetails.patchFilename,
                    error: error,
                }));
            }
            // in case the package has multiple patches, we need to break out of this inner loop
            // because we don't want to apply more patches on top of the broken state
            break packageLoop;
        }
    }
    if (patches.length > 1) {
        if (reverse) {
            if (!state) {
                throw new Error("unexpected state: no state file found while reversing");
            }
            // if we removed all the patches that were previously applied we can delete the state file
            if (appliedPatches.length === patches.length) {
                (0, stateFile_1.clearPatchApplicationState)(patches[0]);
            }
            else {
                // We failed while reversing patches and some are still in the applied state.
                // We need to update the state file to reflect that.
                // appliedPatches is currently the patches that were successfully reversed, in the order they were reversed
                // So we need to find the index of the last reversed patch in the original patches array
                // and then remove all the patches after that. Sorry for the confusing code.
                const lastReversedPatchIndex = patches.indexOf(appliedPatches[appliedPatches.length - 1]);
                if (lastReversedPatchIndex === -1) {
                    throw new Error("unexpected state: failed to find last reversed patch in original patches array");
                }
                (0, stateFile_1.savePatchApplicationState)({
                    packageDetails: patches[0],
                    patches: patches.slice(0, lastReversedPatchIndex).map((patch) => ({
                        didApply: true,
                        patchContentHash: (0, hash_1.hashFile)((0, path_2.join)(appPath, patchDir, patch.patchFilename)),
                        patchFilename: patch.patchFilename,
                    })),
                    isRebasing: false,
                });
            }
        }
        else {
            const nextState = appliedPatches.map((patch) => ({
                didApply: true,
                patchContentHash: (0, hash_1.hashFile)((0, path_2.join)(appPath, patchDir, patch.patchFilename)),
                patchFilename: patch.patchFilename,
            }));
            if (failedPatch) {
                nextState.push({
                    didApply: false,
                    patchContentHash: (0, hash_1.hashFile)((0, path_2.join)(appPath, patchDir, failedPatch.patchFilename)),
                    patchFilename: failedPatch.patchFilename,
                });
            }
            (0, stateFile_1.savePatchApplicationState)({
                packageDetails: patches[0],
                patches: nextState,
                isRebasing: !!failedPatch,
            });
        }
        if (failedPatch) {
            process.exit(1);
        }
    }
}
function applyPatch({ patchFilePath, reverse, patchDetails, patchDir, cwd, bestEffort, }) {
    const patch = (0, read_1.readPatch)({
        patchFilePath,
        patchDetails,
        patchDir,
    });
    const forward = reverse ? (0, reverse_1.reversePatch)(patch) : patch;
    try {
        if (!bestEffort) {
            (0, apply_1.executeEffects)(forward, { dryRun: true, cwd, bestEffort: false });
        }
        const errors = bestEffort ? [] : undefined;
        (0, apply_1.executeEffects)(forward, { dryRun: false, cwd, bestEffort, errors });
        if (errors === null || errors === void 0 ? void 0 : errors.length) {
            console.log("Saving errors to", chalk_1.default.cyan.bold("./patch-package-errors.log"));
            (0, fs_1.writeFileSync)("patch-package-errors.log", errors.join("\n\n"));
            process.exit(0);
        }
    }
    catch (e) {
        try {
            const backward = reverse ? patch : (0, reverse_1.reversePatch)(patch);
            (0, apply_1.executeEffects)(backward, {
                dryRun: true,
                cwd,
                bestEffort: false,
            });
        }
        catch (e) {
            return false;
        }
    }
    return true;
}
function createVersionMismatchWarning({ packageName, actualVersion, originalVersion, pathSpecifier, path, }) {
    return `
${chalk_1.default.yellow("Warning:")} patch-package detected a patch file version mismatch

  Don't worry! This is probably fine. The patch was still applied
  successfully. Here's the deets:

  Patch file created for

    ${packageName}@${chalk_1.default.bold(originalVersion)}

  applied to

    ${packageName}@${chalk_1.default.bold(actualVersion)}
  
  At path
  
    ${path}

  This warning is just to give you a heads-up. There is a small chance of
  breakage even though the patch was applied successfully. Make sure the package
  still behaves like you expect (you wrote tests, right?) and then run

    ${chalk_1.default.bold(`patch-package ${pathSpecifier}`)}

  to update the version in the patch file name and make this warning go away.
`;
}
function createBrokenPatchFileError({ packageName, patchFilename, path, pathSpecifier, }) {
    return `
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red(`Failed to apply patch for package ${chalk_1.default.bold(packageName)} at path`)}
  
    ${path}

  This error was caused because patch-package cannot apply the following patch file:

    patches/${patchFilename}

  Try removing node_modules and trying again. If that doesn't work, maybe there was
  an accidental change made to the patch file? Try recreating it by manually
  editing the appropriate files and running:
  
    patch-package ${pathSpecifier}
  
  If that doesn't work, then it's a bug in patch-package, so please submit a bug
  report. Thanks!

    https://github.com/ds300/patch-package/issues
    
`;
}
function createPatchApplicationFailureError({ packageName, actualVersion, originalVersion, patchFilename, path, pathSpecifier, }) {
    return `
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red(`Failed to apply patch for package ${chalk_1.default.bold(packageName)} at path`)}
  
    ${path}

  This error was caused because ${chalk_1.default.bold(packageName)} has changed since you
  made the patch file for it. This introduced conflicts with your patch,
  just like a merge conflict in Git when separate incompatible changes are
  made to the same piece of code.

  Maybe this means your patch file is no longer necessary, in which case
  hooray! Just delete it!

  Otherwise, you need to generate a new patch file.

  To generate a new one, just repeat the steps you made to generate the first
  one.

  i.e. manually make the appropriate file changes, then run 

    patch-package ${pathSpecifier}

  Info:
    Patch file: patches/${patchFilename}
    Patch was made for version: ${chalk_1.default.green.bold(originalVersion)}
    Installed version: ${chalk_1.default.red.bold(actualVersion)}
`;
}
function createUnexpectedError({ filename, error, }) {
    return `
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red(`Failed to apply patch file ${chalk_1.default.bold(filename)}`)}
  
${error.stack}

  `;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlQYXRjaGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2FwcGx5UGF0Y2hlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQTZGQSxnREFxRUM7QUFFRCx3REEwT0M7QUFFRCxnQ0FrREM7QUFsY0Qsa0RBQXlCO0FBQ3pCLDJCQUFrQztBQUNsQyx1Q0FBcUM7QUFDckMsK0JBQTRCO0FBQzVCLG9EQUEyQjtBQUMzQixpQ0FBaUM7QUFDakMsMkNBQW1EO0FBRW5ELHFFQUFpRTtBQUNqRSx5Q0FBOEM7QUFDOUMsdUNBQXdDO0FBQ3hDLDZDQUE4QztBQUM5Qyx1Q0FBNkM7QUFDN0MsaUNBQXVDO0FBQ3ZDLDJDQUtvQjtBQUVwQixNQUFNLHFCQUFzQixTQUFRLEtBQUs7SUFDdkMsWUFBWSxHQUFXO1FBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNaLENBQUM7Q0FDRjtBQUVELFNBQVMsMEJBQTBCLENBQUMsRUFDbEMsT0FBTyxFQUNQLElBQUksRUFDSixhQUFhLEVBQ2IsU0FBUyxFQUNULGFBQWEsR0FPZDtJQUNDLE1BQU0sVUFBVSxHQUFHLElBQUEsV0FBSSxFQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN0QyxJQUFJLENBQUMsSUFBQSxxQkFBVSxFQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDNUIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxZQUFZLElBQUksU0FBUyxFQUFFLENBQUM7WUFDdkQsT0FBTyxJQUFJLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxHQUFHLEdBQ0wsR0FBRyxlQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsWUFBSyxDQUFDLFFBQVEsQ0FDbkUsYUFBYSxDQUNkLEVBQUUsR0FBRyw0QkFBNEIsSUFBQSxlQUFRLEVBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUE7UUFFL0QsSUFBSSxDQUFDLFNBQVMsSUFBSSxPQUFP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ZUFBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO3lCQUMxQyxlQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7Q0FDckQsQ0FBQTtBQUNELENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLEVBQzdCLFFBQVEsRUFDUixLQUFLLEdBSU47SUFDQyxPQUFPO0VBQ1AsZUFBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksZUFBSyxDQUFDLEdBQUcsQ0FDdEMsOEJBQThCLGVBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FDckQ7O0VBRUQsS0FBSyxDQUFDLEtBQUs7O0dBRVYsQ0FBQTtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSBcImNoYWxrXCJcbmltcG9ydCB7IHdyaXRlRmlsZVN5bmMgfSBmcm9tIFwiZnNcIlxuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJmcy1leHRyYVwiXG5pbXBvcnQgeyBwb3NpeCB9IGZyb20gXCJwYXRoXCJcbmltcG9ydCBzZW12ZXIgZnJvbSBcInNlbXZlclwiXG5pbXBvcnQgeyBoYXNoRmlsZSB9IGZyb20gXCIuL2hhc2hcIlxuaW1wb3J0IHsgbG9nUGF0Y2hTZXF1ZW5jZUVycm9yIH0gZnJvbSBcIi4vbWFrZVBhdGNoXCJcbmltcG9ydCB7IFBhY2thZ2VEZXRhaWxzLCBQYXRjaGVkUGFja2FnZURldGFpbHMgfSBmcm9tIFwiLi9QYWNrYWdlRGV0YWlsc1wiXG5pbXBvcnQgeyBwYWNrYWdlSXNEZXZEZXBlbmRlbmN5IH0gZnJvbSBcIi4vcGFja2FnZUlzRGV2RGVwZW5kZW5jeVwiXG5pbXBvcnQgeyBleGVjdXRlRWZmZWN0cyB9IGZyb20gXCIuL3BhdGNoL2FwcGx5XCJcbmltcG9ydCB7IHJlYWRQYXRjaCB9IGZyb20gXCIuL3BhdGNoL3JlYWRcIlxuaW1wb3J0IHsgcmV2ZXJzZVBhdGNoIH0gZnJvbSBcIi4vcGF0Y2gvcmV2ZXJzZVwiXG5pbXBvcnQgeyBnZXRHcm91cGVkUGF0Y2hlcyB9IGZyb20gXCIuL3BhdGNoRnNcIlxuaW1wb3J0IHsgam9pbiwgcmVsYXRpdmUgfSBmcm9tIFwiLi9wYXRoXCJcbmltcG9ydCB7XG4gIGNsZWFyUGF0Y2hBcHBsaWNhdGlvblN0YXRlLFxuICBnZXRQYXRjaEFwcGxpY2F0aW9uU3RhdGUsXG4gIFBhdGNoU3RhdGUsXG4gIHNhdmVQYXRjaEFwcGxpY2F0aW9uU3RhdGUsXG59IGZyb20gXCIuL3N0YXRlRmlsZVwiXG5cbmNsYXNzIFBhdGNoQXBwbGljYXRpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobXNnOiBzdHJpbmcpIHtcbiAgICBzdXBlcihtc2cpXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0SW5zdGFsbGVkUGFja2FnZVZlcnNpb24oe1xuICBhcHBQYXRoLFxuICBwYXRoLFxuICBwYXRoU3BlY2lmaWVyLFxuICBpc0Rldk9ubHksXG4gIHBhdGNoRmlsZW5hbWUsXG59OiB7XG4gIGFwcFBhdGg6IHN0cmluZ1xuICBwYXRoOiBzdHJpbmdcbiAgcGF0aFNwZWNpZmllcjogc3RyaW5nXG4gIGlzRGV2T25seTogYm9vbGVhblxuICBwYXRjaEZpbGVuYW1lOiBzdHJpbmdcbn0pOiBudWxsIHwgc3RyaW5nIHtcbiAgY29uc3QgcGFja2FnZURpciA9IGpvaW4oYXBwUGF0aCwgcGF0aClcbiAgaWYgKCFleGlzdHNTeW5jKHBhY2thZ2VEaXIpKSB7XG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSBcInByb2R1Y3Rpb25cIiAmJiBpc0Rldk9ubHkpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgbGV0IGVyciA9XG4gICAgICBgJHtjaGFsay5yZWQoXCJFcnJvcjpcIil9IFBhdGNoIGZpbGUgZm91bmQgZm9yIHBhY2thZ2UgJHtwb3NpeC5iYXNlbmFtZShcbiAgICAgICAgcGF0aFNwZWNpZmllcixcbiAgICAgICl9YCArIGAgd2hpY2ggaXMgbm90IHByZXNlbnQgYXQgJHtyZWxhdGl2ZShcIi5cIiwgcGFja2FnZURpcil9YFxuXG4gICAgaWYgKCFpc0Rldk9ubHkgJiYgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09IFwicHJvZHVjdGlvblwiKSB7XG4gICAgICBlcnIgKz0gYFxuXG4gIElmIHRoaXMgcGFja2FnZSBpcyBhIGRldiBkZXBlbmRlbmN5LCByZW5hbWUgdGhlIHBhdGNoIGZpbGUgdG9cbiAgXG4gICAgJHtjaGFsay5ib2xkKHBhdGNoRmlsZW5hbWUucmVwbGFjZShcIi5wYXRjaFwiLCBcIi5kZXYucGF0Y2hcIikpfVxuYFxuICAgIH1cbiAgICB0aHJvdyBuZXcgUGF0Y2hBcHBsaWNhdGlvbkVycm9yKGVycilcbiAgfVxuXG4gIGNvbnN0IHsgdmVyc2lvbiB9ID0gcmVxdWlyZShqb2luKHBhY2thZ2VEaXIsIFwicGFja2FnZS5qc29uXCIpKVxuICAvLyBub3JtYWxpemUgdmVyc2lvbiBmb3IgYG5wbSBjaWBcbiAgY29uc3QgcmVzdWx0ID0gc2VtdmVyLnZhbGlkKHZlcnNpb24pXG4gIGlmIChyZXN1bHQgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgUGF0Y2hBcHBsaWNhdGlvbkVycm9yKFxuICAgICAgYCR7Y2hhbGsucmVkKFxuICAgICAgICBcIkVycm9yOlwiLFxuICAgICAgKX0gVmVyc2lvbiBzdHJpbmcgJyR7dmVyc2lvbn0nIGNhbm5vdCBiZSBwYXJzZWQgZnJvbSAke2pvaW4oXG4gICAgICAgIHBhY2thZ2VEaXIsXG4gICAgICAgIFwicGFja2FnZS5qc29uXCIsXG4gICAgICApfWAsXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdCBhcyBzdHJpbmdcbn1cblxuZnVuY3Rpb24gbG9nUGF0Y2hBcHBsaWNhdGlvbihwYXRjaERldGFpbHM6IFBhdGNoZWRQYWNrYWdlRGV0YWlscykge1xuICBjb25zdCBzZXF1ZW5jZVN0cmluZyA9XG4gICAgcGF0Y2hEZXRhaWxzLnNlcXVlbmNlTnVtYmVyICE9IG51bGxcbiAgICAgID8gYCAoJHtwYXRjaERldGFpbHMuc2VxdWVuY2VOdW1iZXJ9JHtcbiAgICAgICAgICBwYXRjaERldGFpbHMuc2VxdWVuY2VOYW1lID8gXCIgXCIgKyBwYXRjaERldGFpbHMuc2VxdWVuY2VOYW1lIDogXCJcIlxuICAgICAgICB9KWBcbiAgICAgIDogXCJcIlxuICBjb25zb2xlLmxvZyhcbiAgICBgJHtjaGFsay5ib2xkKHBhdGNoRGV0YWlscy5wYXRoU3BlY2lmaWVyKX1AJHtcbiAgICAgIHBhdGNoRGV0YWlscy52ZXJzaW9uXG4gICAgfSR7c2VxdWVuY2VTdHJpbmd9ICR7Y2hhbGsuZ3JlZW4oXCLinJRcIil9YCxcbiAgKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlQYXRjaGVzRm9yQXBwKHtcbiAgYXBwUGF0aCxcbiAgcmV2ZXJzZSxcbiAgcGF0Y2hEaXIsXG4gIHNob3VsZEV4aXRXaXRoRXJyb3IsXG4gIHNob3VsZEV4aXRXaXRoV2FybmluZyxcbiAgYmVzdEVmZm9ydCxcbn06IHtcbiAgYXBwUGF0aDogc3RyaW5nXG4gIHJldmVyc2U6IGJvb2xlYW5cbiAgcGF0Y2hEaXI6IHN0cmluZ1xuICBzaG91bGRFeGl0V2l0aEVycm9yOiBib29sZWFuXG4gIHNob3VsZEV4aXRXaXRoV2FybmluZzogYm9vbGVhblxuICBiZXN0RWZmb3J0OiBib29sZWFuXG59KTogdm9pZCB7XG4gIGNvbnN0IHBhdGNoZXNEaXJlY3RvcnkgPSBqb2luKGFwcFBhdGgsIHBhdGNoRGlyKVxuICBjb25zdCBncm91cGVkUGF0Y2hlcyA9IGdldEdyb3VwZWRQYXRjaGVzKHBhdGNoZXNEaXJlY3RvcnkpXG5cbiAgaWYgKGdyb3VwZWRQYXRjaGVzLm51bVBhdGNoRmlsZXMgPT09IDApIHtcbiAgICBjb25zb2xlLmxvZyhjaGFsay5ibHVlQnJpZ2h0KFwiTm8gcGF0Y2ggZmlsZXMgZm91bmRcIikpXG4gICAgcmV0dXJuXG4gIH1cblxuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW11cbiAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gWy4uLmdyb3VwZWRQYXRjaGVzLndhcm5pbmdzXVxuXG4gIGZvciAoY29uc3QgcGF0Y2hlcyBvZiBPYmplY3QudmFsdWVzKFxuICAgIGdyb3VwZWRQYXRjaGVzLnBhdGhTcGVjaWZpZXJUb1BhdGNoRmlsZXMsXG4gICkpIHtcbiAgICBhcHBseVBhdGNoZXNGb3JQYWNrYWdlKHtcbiAgICAgIHBhdGNoZXMsXG4gICAgICBhcHBQYXRoLFxuICAgICAgcGF0Y2hEaXIsXG4gICAgICByZXZlcnNlLFxuICAgICAgd2FybmluZ3MsXG4gICAgICBlcnJvcnMsXG4gICAgICBiZXN0RWZmb3J0LFxuICAgIH0pXG4gIH1cblxuICBmb3IgKGNvbnN0IHdhcm5pbmcgb2Ygd2FybmluZ3MpIHtcbiAgICBjb25zb2xlLmxvZyh3YXJuaW5nKVxuICB9XG4gIGZvciAoY29uc3QgZXJyb3Igb2YgZXJyb3JzKSB7XG4gICAgY29uc29sZS5sb2coZXJyb3IpXG4gIH1cblxuICBjb25zdCBwcm9ibGVtc1N1bW1hcnkgPSBbXVxuICBpZiAod2FybmluZ3MubGVuZ3RoKSB7XG4gICAgcHJvYmxlbXNTdW1tYXJ5LnB1c2goY2hhbGsueWVsbG93KGAke3dhcm5pbmdzLmxlbmd0aH0gd2FybmluZyhzKWApKVxuICB9XG4gIGlmIChlcnJvcnMubGVuZ3RoKSB7XG4gICAgcHJvYmxlbXNTdW1tYXJ5LnB1c2goY2hhbGsucmVkKGAke2Vycm9ycy5sZW5ndGh9IGVycm9yKHMpYCkpXG4gIH1cblxuICBpZiAocHJvYmxlbXNTdW1tYXJ5Lmxlbmd0aCkge1xuICAgIGNvbnNvbGUubG9nKFwiLS0tXCIpXG4gICAgY29uc29sZS5sb2coXCJwYXRjaC1wYWNrYWdlIGZpbmlzaGVkIHdpdGhcIiwgcHJvYmxlbXNTdW1tYXJ5LmpvaW4oXCIsIFwiKSArIFwiLlwiKVxuICB9XG5cbiAgaWYgKGVycm9ycy5sZW5ndGggJiYgc2hvdWxkRXhpdFdpdGhFcnJvcikge1xuICAgIHByb2Nlc3MuZXhpdCgxKVxuICB9XG5cbiAgaWYgKHdhcm5pbmdzLmxlbmd0aCAmJiBzaG91bGRFeGl0V2l0aFdhcm5pbmcpIHtcbiAgICBwcm9jZXNzLmV4aXQoMSlcbiAgfVxuXG4gIHByb2Nlc3MuZXhpdCgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlQYXRjaGVzRm9yUGFja2FnZSh7XG4gIHBhdGNoZXMsXG4gIGFwcFBhdGgsXG4gIHBhdGNoRGlyLFxuICByZXZlcnNlLFxuICB3YXJuaW5ncyxcbiAgZXJyb3JzLFxuICBiZXN0RWZmb3J0LFxufToge1xuICBwYXRjaGVzOiBQYXRjaGVkUGFja2FnZURldGFpbHNbXVxuICBhcHBQYXRoOiBzdHJpbmdcbiAgcGF0Y2hEaXI6IHN0cmluZ1xuICByZXZlcnNlOiBib29sZWFuXG4gIHdhcm5pbmdzOiBzdHJpbmdbXVxuICBlcnJvcnM6IHN0cmluZ1tdXG4gIGJlc3RFZmZvcnQ6IGJvb2xlYW5cbn0pIHtcbiAgY29uc3QgcGF0aFNwZWNpZmllciA9IHBhdGNoZXNbMF0ucGF0aFNwZWNpZmllclxuICBjb25zdCBzdGF0ZSA9IHBhdGNoZXMubGVuZ3RoID4gMSA/IGdldFBhdGNoQXBwbGljYXRpb25TdGF0ZShwYXRjaGVzWzBdKSA6IG51bGxcbiAgY29uc3QgdW5hcHBsaWVkUGF0Y2hlcyA9IHBhdGNoZXMuc2xpY2UoMClcbiAgY29uc3QgYXBwbGllZFBhdGNoZXM6IFBhdGNoZWRQYWNrYWdlRGV0YWlsc1tdID0gW11cbiAgLy8gaWYgdGhlcmUgYXJlIG11bHRpcGxlIHBhdGNoZXMgdG8gYXBwbHksIHdlIGNhbid0IHJlbHkgb24gdGhlIHJldmVyc2UtcGF0Y2gtZHJ5LXJ1biBiZWhhdmlvciB0byBtYWtlIHRoaXMgb3BlcmF0aW9uXG4gIC8vIGlkZW1wb3RlbnQsIHNvIGluc3RlYWQgd2UgbmVlZCB0byBjaGVjayB0aGUgc3RhdGUgZmlsZSB0byBzZWUgd2hldGhlciB3ZSBoYXZlIGFscmVhZHkgYXBwbGllZCBhbnkgb2YgdGhlIHBhdGNoZXNcbiAgLy8gdG9kbzogb25jZSB0aGlzIGlzIGJhdHRsZSB0ZXN0ZWQgd2UgbWlnaHQgd2FudCB0byB1c2UgdGhlIHNhbWUgYXBwcm9hY2ggZm9yIHNpbmdsZSBwYXRjaGVzIGFzIHdlbGwsIGJ1dCBpdCdzIG5vdCBiaWdnaWUgc2luY2UgdGhlIGRyeSBydW4gdGhpbmcgaXMgZmFzdFxuICBpZiAodW5hcHBsaWVkUGF0Y2hlcyAmJiBzdGF0ZSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RhdGUucGF0Y2hlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcGF0Y2hUaGF0V2FzQXBwbGllZCA9IHN0YXRlLnBhdGNoZXNbaV1cbiAgICAgIGlmICghcGF0Y2hUaGF0V2FzQXBwbGllZC5kaWRBcHBseSkge1xuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY29uc3QgcGF0Y2hUb0FwcGx5ID0gdW5hcHBsaWVkUGF0Y2hlc1swXVxuICAgICAgY29uc3QgY3VycmVudFBhdGNoSGFzaCA9IGhhc2hGaWxlKFxuICAgICAgICBqb2luKGFwcFBhdGgsIHBhdGNoRGlyLCBwYXRjaFRvQXBwbHkucGF0Y2hGaWxlbmFtZSksXG4gICAgICApXG4gICAgICBpZiAocGF0Y2hUaGF0V2FzQXBwbGllZC5wYXRjaENvbnRlbnRIYXNoID09PSBjdXJyZW50UGF0Y2hIYXNoKSB7XG4gICAgICAgIC8vIHRoaXMgcGF0Y2ggd2FzIGFwcGxpZWQgd2UgY2FuIHNraXAgaXRcbiAgICAgICAgYXBwbGllZFBhdGNoZXMucHVzaCh1bmFwcGxpZWRQYXRjaGVzLnNoaWZ0KCkhKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgY2hhbGsucmVkKFwiRXJyb3I6XCIpLFxuICAgICAgICAgIGBUaGUgcGF0Y2hlcyBmb3IgJHtjaGFsay5ib2xkKHBhdGhTcGVjaWZpZXIpfSBoYXZlIGNoYW5nZWQuYCxcbiAgICAgICAgICBgWW91IHNob3VsZCByZWluc3RhbGwgeW91ciBub2RlX21vZHVsZXMgZm9sZGVyIHRvIG1ha2Ugc3VyZSB0aGUgcGFja2FnZSBpcyB1cCB0byBkYXRlYCxcbiAgICAgICAgKVxuICAgICAgICBwcm9jZXNzLmV4aXQoMSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAocmV2ZXJzZSAmJiBzdGF0ZSkge1xuICAgIC8vIGlmIHdlIGFyZSByZXZlcnNpbmcgdGhlIHBhdGNoZXMgd2UgbmVlZCB0byBtYWtlIHRoZSB1bmFwcGxpZWRQYXRjaGVzIGFycmF5XG4gICAgLy8gYmUgdGhlIHJldmVyc2VkIHZlcnNpb24gb2YgdGhlIGFwcGxpZWRQYXRjaGVzIGFycmF5LlxuICAgIC8vIFRoZSBhcHBsaWVkIHBhdGNoZXMgYXJyYXkgc2hvdWxkIHRoZW4gYmUgZW1wdHkgYmVjYXVzZSBpdCBpcyB1c2VkIGRpZmZlcmVudGx5XG4gICAgLy8gd2hlbiBvdXRwdXR0aW5nIHRoZSBzdGF0ZSBmaWxlLlxuICAgIHVuYXBwbGllZFBhdGNoZXMubGVuZ3RoID0gMFxuICAgIHVuYXBwbGllZFBhdGNoZXMucHVzaCguLi5hcHBsaWVkUGF0Y2hlcylcbiAgICB1bmFwcGxpZWRQYXRjaGVzLnJldmVyc2UoKVxuICAgIGFwcGxpZWRQYXRjaGVzLmxlbmd0aCA9IDBcbiAgfVxuICBpZiAoYXBwbGllZFBhdGNoZXMubGVuZ3RoKSB7XG4gICAgLy8gc29tZSBwYXRjaGVzIGhhdmUgYWxyZWFkeSBiZWVuIGFwcGxpZWRcbiAgICBhcHBsaWVkUGF0Y2hlcy5mb3JFYWNoKGxvZ1BhdGNoQXBwbGljYXRpb24pXG4gIH1cbiAgaWYgKCF1bmFwcGxpZWRQYXRjaGVzLmxlbmd0aCkge1xuICAgIHJldHVyblxuICB9XG4gIGxldCBmYWlsZWRQYXRjaDogUGF0Y2hlZFBhY2thZ2VEZXRhaWxzIHwgbnVsbCA9IG51bGxcbiAgcGFja2FnZUxvb3A6IGZvciAoY29uc3QgcGF0Y2hEZXRhaWxzIG9mIHVuYXBwbGllZFBhdGNoZXMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBuYW1lLCB2ZXJzaW9uLCBwYXRoLCBpc0Rldk9ubHksIHBhdGNoRmlsZW5hbWUgfSA9IHBhdGNoRGV0YWlsc1xuXG4gICAgICBjb25zdCBpbnN0YWxsZWRQYWNrYWdlVmVyc2lvbiA9IGdldEluc3RhbGxlZFBhY2thZ2VWZXJzaW9uKHtcbiAgICAgICAgYXBwUGF0aCxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgcGF0aFNwZWNpZmllcixcbiAgICAgICAgaXNEZXZPbmx5OlxuICAgICAgICAgIGlzRGV2T25seSB8fFxuICAgICAgICAgIC8vIGNoZWNrIGZvciBkaXJlY3QtZGVwZW5kZW50cyBpbiBwcm9kXG4gICAgICAgICAgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSBcInByb2R1Y3Rpb25cIiAmJlxuICAgICAgICAgICAgcGFja2FnZUlzRGV2RGVwZW5kZW5jeSh7XG4gICAgICAgICAgICAgIGFwcFBhdGgsXG4gICAgICAgICAgICAgIHBhdGNoRGV0YWlscyxcbiAgICAgICAgICAgIH0pKSxcbiAgICAgICAgcGF0Y2hGaWxlbmFtZSxcbiAgICAgIH0pXG4gICAgICBpZiAoIWluc3RhbGxlZFBhY2thZ2VWZXJzaW9uKSB7XG4gICAgICAgIC8vIGl0J3Mgb2sgd2UncmUgaW4gcHJvZHVjdGlvbiBtb2RlIGFuZCB0aGlzIGlzIGEgZGV2IG9ubHkgcGFja2FnZVxuICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICBgU2tpcHBpbmcgZGV2LW9ubHkgJHtjaGFsay5ib2xkKFxuICAgICAgICAgICAgcGF0aFNwZWNpZmllcixcbiAgICAgICAgICApfUAke3ZlcnNpb259ICR7Y2hhbGsuYmx1ZShcIuKclFwiKX1gLFxuICAgICAgICApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIGlmIChcbiAgICAgICAgYXBwbHlQYXRjaCh7XG4gICAgICAgICAgcGF0Y2hGaWxlUGF0aDogam9pbihhcHBQYXRoLCBwYXRjaERpciwgcGF0Y2hGaWxlbmFtZSkgYXMgc3RyaW5nLFxuICAgICAgICAgIHJldmVyc2UsXG4gICAgICAgICAgcGF0Y2hEZXRhaWxzLFxuICAgICAgICAgIHBhdGNoRGlyLFxuICAgICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgICBiZXN0RWZmb3J0LFxuICAgICAgICB9KVxuICAgICAgKSB7XG4gICAgICAgIGFwcGxpZWRQYXRjaGVzLnB1c2gocGF0Y2hEZXRhaWxzKVxuICAgICAgICAvLyB5YXkgcGF0Y2ggd2FzIGFwcGxpZWQgc3VjY2Vzc2Z1bGx5XG4gICAgICAgIC8vIHByaW50IHdhcm5pbmcgaWYgdmVyc2lvbiBtaXNtYXRjaFxuICAgICAgICBpZiAoaW5zdGFsbGVkUGFja2FnZVZlcnNpb24gIT09IHZlcnNpb24pIHtcbiAgICAgICAgICB3YXJuaW5ncy5wdXNoKFxuICAgICAgICAgICAgY3JlYXRlVmVyc2lvbk1pc21hdGNoV2FybmluZyh7XG4gICAgICAgICAgICAgIHBhY2thZ2VOYW1lOiBuYW1lLFxuICAgICAgICAgICAgICBhY3R1YWxWZXJzaW9uOiBpbnN0YWxsZWRQYWNrYWdlVmVyc2lvbixcbiAgICAgICAgICAgICAgb3JpZ2luYWxWZXJzaW9uOiB2ZXJzaW9uLFxuICAgICAgICAgICAgICBwYXRoU3BlY2lmaWVyLFxuICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICAgIGxvZ1BhdGNoQXBwbGljYXRpb24ocGF0Y2hEZXRhaWxzKVxuICAgICAgfSBlbHNlIGlmIChwYXRjaGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbG9nUGF0Y2hTZXF1ZW5jZUVycm9yKHsgcGF0Y2hEZXRhaWxzIH0pXG4gICAgICAgIC8vIGluIGNhc2UgdGhlIHBhY2thZ2UgaGFzIG11bHRpcGxlIHBhdGNoZXMsIHdlIG5lZWQgdG8gYnJlYWsgb3V0IG9mIHRoaXMgaW5uZXIgbG9vcFxuICAgICAgICAvLyBiZWNhdXNlIHdlIGRvbid0IHdhbnQgdG8gYXBwbHkgbW9yZSBwYXRjaGVzIG9uIHRvcCBvZiB0aGUgYnJva2VuIHN0YXRlXG4gICAgICAgIGZhaWxlZFBhdGNoID0gcGF0Y2hEZXRhaWxzXG4gICAgICAgIGJyZWFrIHBhY2thZ2VMb29wXG4gICAgICB9IGVsc2UgaWYgKGluc3RhbGxlZFBhY2thZ2VWZXJzaW9uID09PSB2ZXJzaW9uKSB7XG4gICAgICAgIC8vIGNvbXBsZXRlbHkgZmFpbGVkIHRvIGFwcGx5IHBhdGNoXG4gICAgICAgIC8vIFRPRE86IHByb3BhZ2F0ZSB1c2VmdWwgZXJyb3IgbWVzc2FnZXMgZnJvbSBwYXRjaCBhcHBsaWNhdGlvblxuICAgICAgICBlcnJvcnMucHVzaChcbiAgICAgICAgICBjcmVhdGVCcm9rZW5QYXRjaEZpbGVFcnJvcih7XG4gICAgICAgICAgICBwYWNrYWdlTmFtZTogbmFtZSxcbiAgICAgICAgICAgIHBhdGNoRmlsZW5hbWUsXG4gICAgICAgICAgICBwYXRoU3BlY2lmaWVyLFxuICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICB9KSxcbiAgICAgICAgKVxuICAgICAgICBicmVhayBwYWNrYWdlTG9vcFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXG4gICAgICAgICAgY3JlYXRlUGF0Y2hBcHBsaWNhdGlvbkZhaWx1cmVFcnJvcih7XG4gICAgICAgICAgICBwYWNrYWdlTmFtZTogbmFtZSxcbiAgICAgICAgICAgIGFjdHVhbFZlcnNpb246IGluc3RhbGxlZFBhY2thZ2VWZXJzaW9uLFxuICAgICAgICAgICAgb3JpZ2luYWxWZXJzaW9uOiB2ZXJzaW9uLFxuICAgICAgICAgICAgcGF0Y2hGaWxlbmFtZSxcbiAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICBwYXRoU3BlY2lmaWVyLFxuICAgICAgICAgIH0pLFxuICAgICAgICApXG4gICAgICAgIC8vIGluIGNhc2UgdGhlIHBhY2thZ2UgaGFzIG11bHRpcGxlIHBhdGNoZXMsIHdlIG5lZWQgdG8gYnJlYWsgb3V0IG9mIHRoaXMgaW5uZXIgbG9vcFxuICAgICAgICAvLyBiZWNhdXNlIHdlIGRvbid0IHdhbnQgdG8gYXBwbHkgbW9yZSBwYXRjaGVzIG9uIHRvcCBvZiB0aGUgYnJva2VuIHN0YXRlXG4gICAgICAgIGJyZWFrIHBhY2thZ2VMb29wXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFBhdGNoQXBwbGljYXRpb25FcnJvcikge1xuICAgICAgICBlcnJvcnMucHVzaChlcnJvci5tZXNzYWdlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXG4gICAgICAgICAgY3JlYXRlVW5leHBlY3RlZEVycm9yKHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiBwYXRjaERldGFpbHMucGF0Y2hGaWxlbmFtZSxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvciBhcyBFcnJvcixcbiAgICAgICAgICB9KSxcbiAgICAgICAgKVxuICAgICAgfVxuICAgICAgLy8gaW4gY2FzZSB0aGUgcGFja2FnZSBoYXMgbXVsdGlwbGUgcGF0Y2hlcywgd2UgbmVlZCB0byBicmVhayBvdXQgb2YgdGhpcyBpbm5lciBsb29wXG4gICAgICAvLyBiZWNhdXNlIHdlIGRvbid0IHdhbnQgdG8gYXBwbHkgbW9yZSBwYXRjaGVzIG9uIHRvcCBvZiB0aGUgYnJva2VuIHN0YXRlXG4gICAgICBicmVhayBwYWNrYWdlTG9vcFxuICAgIH1cbiAgfVxuXG4gIGlmIChwYXRjaGVzLmxlbmd0aCA+IDEpIHtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgaWYgKCFzdGF0ZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIHN0YXRlOiBubyBzdGF0ZSBmaWxlIGZvdW5kIHdoaWxlIHJldmVyc2luZ1wiKVxuICAgICAgfVxuICAgICAgLy8gaWYgd2UgcmVtb3ZlZCBhbGwgdGhlIHBhdGNoZXMgdGhhdCB3ZXJlIHByZXZpb3VzbHkgYXBwbGllZCB3ZSBjYW4gZGVsZXRlIHRoZSBzdGF0ZSBmaWxlXG4gICAgICBpZiAoYXBwbGllZFBhdGNoZXMubGVuZ3RoID09PSBwYXRjaGVzLmxlbmd0aCkge1xuICAgICAgICBjbGVhclBhdGNoQXBwbGljYXRpb25TdGF0ZShwYXRjaGVzWzBdKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gV2UgZmFpbGVkIHdoaWxlIHJldmVyc2luZyBwYXRjaGVzIGFuZCBzb21lIGFyZSBzdGlsbCBpbiB0aGUgYXBwbGllZCBzdGF0ZS5cbiAgICAgICAgLy8gV2UgbmVlZCB0byB1cGRhdGUgdGhlIHN0YXRlIGZpbGUgdG8gcmVmbGVjdCB0aGF0LlxuICAgICAgICAvLyBhcHBsaWVkUGF0Y2hlcyBpcyBjdXJyZW50bHkgdGhlIHBhdGNoZXMgdGhhdCB3ZXJlIHN1Y2Nlc3NmdWxseSByZXZlcnNlZCwgaW4gdGhlIG9yZGVyIHRoZXkgd2VyZSByZXZlcnNlZFxuICAgICAgICAvLyBTbyB3ZSBuZWVkIHRvIGZpbmQgdGhlIGluZGV4IG9mIHRoZSBsYXN0IHJldmVyc2VkIHBhdGNoIGluIHRoZSBvcmlnaW5hbCBwYXRjaGVzIGFycmF5XG4gICAgICAgIC8vIGFuZCB0aGVuIHJlbW92ZSBhbGwgdGhlIHBhdGNoZXMgYWZ0ZXIgdGhhdC4gU29ycnkgZm9yIHRoZSBjb25mdXNpbmcgY29kZS5cbiAgICAgICAgY29uc3QgbGFzdFJldmVyc2VkUGF0Y2hJbmRleCA9IHBhdGNoZXMuaW5kZXhPZihcbiAgICAgICAgICBhcHBsaWVkUGF0Y2hlc1thcHBsaWVkUGF0Y2hlcy5sZW5ndGggLSAxXSxcbiAgICAgICAgKVxuICAgICAgICBpZiAobGFzdFJldmVyc2VkUGF0Y2hJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBcInVuZXhwZWN0ZWQgc3RhdGU6IGZhaWxlZCB0byBmaW5kIGxhc3QgcmV2ZXJzZWQgcGF0Y2ggaW4gb3JpZ2luYWwgcGF0Y2hlcyBhcnJheVwiLFxuICAgICAgICAgIClcbiAgICAgICAgfVxuXG4gICAgICAgIHNhdmVQYXRjaEFwcGxpY2F0aW9uU3RhdGUoe1xuICAgICAgICAgIHBhY2thZ2VEZXRhaWxzOiBwYXRjaGVzWzBdLFxuICAgICAgICAgIHBhdGNoZXM6IHBhdGNoZXMuc2xpY2UoMCwgbGFzdFJldmVyc2VkUGF0Y2hJbmRleCkubWFwKChwYXRjaCkgPT4gKHtcbiAgICAgICAgICAgIGRpZEFwcGx5OiB0cnVlLFxuICAgICAgICAgICAgcGF0Y2hDb250ZW50SGFzaDogaGFzaEZpbGUoXG4gICAgICAgICAgICAgIGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIsIHBhdGNoLnBhdGNoRmlsZW5hbWUpLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIHBhdGNoRmlsZW5hbWU6IHBhdGNoLnBhdGNoRmlsZW5hbWUsXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIGlzUmViYXNpbmc6IGZhbHNlLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBuZXh0U3RhdGUgPSBhcHBsaWVkUGF0Y2hlcy5tYXAoXG4gICAgICAgIChwYXRjaCk6IFBhdGNoU3RhdGUgPT4gKHtcbiAgICAgICAgICBkaWRBcHBseTogdHJ1ZSxcbiAgICAgICAgICBwYXRjaENvbnRlbnRIYXNoOiBoYXNoRmlsZShcbiAgICAgICAgICAgIGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIsIHBhdGNoLnBhdGNoRmlsZW5hbWUpLFxuICAgICAgICAgICksXG4gICAgICAgICAgcGF0Y2hGaWxlbmFtZTogcGF0Y2gucGF0Y2hGaWxlbmFtZSxcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAgIGlmIChmYWlsZWRQYXRjaCkge1xuICAgICAgICBuZXh0U3RhdGUucHVzaCh7XG4gICAgICAgICAgZGlkQXBwbHk6IGZhbHNlLFxuICAgICAgICAgIHBhdGNoQ29udGVudEhhc2g6IGhhc2hGaWxlKFxuICAgICAgICAgICAgam9pbihhcHBQYXRoLCBwYXRjaERpciwgZmFpbGVkUGF0Y2gucGF0Y2hGaWxlbmFtZSksXG4gICAgICAgICAgKSxcbiAgICAgICAgICBwYXRjaEZpbGVuYW1lOiBmYWlsZWRQYXRjaC5wYXRjaEZpbGVuYW1lLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgc2F2ZVBhdGNoQXBwbGljYXRpb25TdGF0ZSh7XG4gICAgICAgIHBhY2thZ2VEZXRhaWxzOiBwYXRjaGVzWzBdLFxuICAgICAgICBwYXRjaGVzOiBuZXh0U3RhdGUsXG4gICAgICAgIGlzUmViYXNpbmc6ICEhZmFpbGVkUGF0Y2gsXG4gICAgICB9KVxuICAgIH1cbiAgICBpZiAoZmFpbGVkUGF0Y2gpIHtcbiAgICAgIHByb2Nlc3MuZXhpdCgxKVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlQYXRjaCh7XG4gIHBhdGNoRmlsZVBhdGgsXG4gIHJldmVyc2UsXG4gIHBhdGNoRGV0YWlscyxcbiAgcGF0Y2hEaXIsXG4gIGN3ZCxcbiAgYmVzdEVmZm9ydCxcbn06IHtcbiAgcGF0Y2hGaWxlUGF0aDogc3RyaW5nXG4gIHJldmVyc2U6IGJvb2xlYW5cbiAgcGF0Y2hEZXRhaWxzOiBQYWNrYWdlRGV0YWlsc1xuICBwYXRjaERpcjogc3RyaW5nXG4gIGN3ZDogc3RyaW5nXG4gIGJlc3RFZmZvcnQ6IGJvb2xlYW5cbn0pOiBib29sZWFuIHtcbiAgY29uc3QgcGF0Y2ggPSByZWFkUGF0Y2goe1xuICAgIHBhdGNoRmlsZVBhdGgsXG4gICAgcGF0Y2hEZXRhaWxzLFxuICAgIHBhdGNoRGlyLFxuICB9KVxuXG4gIGNvbnN0IGZvcndhcmQgPSByZXZlcnNlID8gcmV2ZXJzZVBhdGNoKHBhdGNoKSA6IHBhdGNoXG4gIHRyeSB7XG4gICAgaWYgKCFiZXN0RWZmb3J0KSB7XG4gICAgICBleGVjdXRlRWZmZWN0cyhmb3J3YXJkLCB7IGRyeVJ1bjogdHJ1ZSwgY3dkLCBiZXN0RWZmb3J0OiBmYWxzZSB9KVxuICAgIH1cbiAgICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkID0gYmVzdEVmZm9ydCA/IFtdIDogdW5kZWZpbmVkXG4gICAgZXhlY3V0ZUVmZmVjdHMoZm9yd2FyZCwgeyBkcnlSdW46IGZhbHNlLCBjd2QsIGJlc3RFZmZvcnQsIGVycm9ycyB9KVxuICAgIGlmIChlcnJvcnM/Lmxlbmd0aCkge1xuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgIFwiU2F2aW5nIGVycm9ycyB0b1wiLFxuICAgICAgICBjaGFsay5jeWFuLmJvbGQoXCIuL3BhdGNoLXBhY2thZ2UtZXJyb3JzLmxvZ1wiKSxcbiAgICAgIClcbiAgICAgIHdyaXRlRmlsZVN5bmMoXCJwYXRjaC1wYWNrYWdlLWVycm9ycy5sb2dcIiwgZXJyb3JzLmpvaW4oXCJcXG5cXG5cIikpXG4gICAgICBwcm9jZXNzLmV4aXQoMClcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgYmFja3dhcmQgPSByZXZlcnNlID8gcGF0Y2ggOiByZXZlcnNlUGF0Y2gocGF0Y2gpXG4gICAgICBleGVjdXRlRWZmZWN0cyhiYWNrd2FyZCwge1xuICAgICAgICBkcnlSdW46IHRydWUsXG4gICAgICAgIGN3ZCxcbiAgICAgICAgYmVzdEVmZm9ydDogZmFsc2UsXG4gICAgICB9KVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZlcnNpb25NaXNtYXRjaFdhcm5pbmcoe1xuICBwYWNrYWdlTmFtZSxcbiAgYWN0dWFsVmVyc2lvbixcbiAgb3JpZ2luYWxWZXJzaW9uLFxuICBwYXRoU3BlY2lmaWVyLFxuICBwYXRoLFxufToge1xuICBwYWNrYWdlTmFtZTogc3RyaW5nXG4gIGFjdHVhbFZlcnNpb246IHN0cmluZ1xuICBvcmlnaW5hbFZlcnNpb246IHN0cmluZ1xuICBwYXRoU3BlY2lmaWVyOiBzdHJpbmdcbiAgcGF0aDogc3RyaW5nXG59KSB7XG4gIHJldHVybiBgXG4ke2NoYWxrLnllbGxvdyhcIldhcm5pbmc6XCIpfSBwYXRjaC1wYWNrYWdlIGRldGVjdGVkIGEgcGF0Y2ggZmlsZSB2ZXJzaW9uIG1pc21hdGNoXG5cbiAgRG9uJ3Qgd29ycnkhIFRoaXMgaXMgcHJvYmFibHkgZmluZS4gVGhlIHBhdGNoIHdhcyBzdGlsbCBhcHBsaWVkXG4gIHN1Y2Nlc3NmdWxseS4gSGVyZSdzIHRoZSBkZWV0czpcblxuICBQYXRjaCBmaWxlIGNyZWF0ZWQgZm9yXG5cbiAgICAke3BhY2thZ2VOYW1lfUAke2NoYWxrLmJvbGQob3JpZ2luYWxWZXJzaW9uKX1cblxuICBhcHBsaWVkIHRvXG5cbiAgICAke3BhY2thZ2VOYW1lfUAke2NoYWxrLmJvbGQoYWN0dWFsVmVyc2lvbil9XG4gIFxuICBBdCBwYXRoXG4gIFxuICAgICR7cGF0aH1cblxuICBUaGlzIHdhcm5pbmcgaXMganVzdCB0byBnaXZlIHlvdSBhIGhlYWRzLXVwLiBUaGVyZSBpcyBhIHNtYWxsIGNoYW5jZSBvZlxuICBicmVha2FnZSBldmVuIHRob3VnaCB0aGUgcGF0Y2ggd2FzIGFwcGxpZWQgc3VjY2Vzc2Z1bGx5LiBNYWtlIHN1cmUgdGhlIHBhY2thZ2VcbiAgc3RpbGwgYmVoYXZlcyBsaWtlIHlvdSBleHBlY3QgKHlvdSB3cm90ZSB0ZXN0cywgcmlnaHQ/KSBhbmQgdGhlbiBydW5cblxuICAgICR7Y2hhbGsuYm9sZChgcGF0Y2gtcGFja2FnZSAke3BhdGhTcGVjaWZpZXJ9YCl9XG5cbiAgdG8gdXBkYXRlIHRoZSB2ZXJzaW9uIGluIHRoZSBwYXRjaCBmaWxlIG5hbWUgYW5kIG1ha2UgdGhpcyB3YXJuaW5nIGdvIGF3YXkuXG5gXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJyb2tlblBhdGNoRmlsZUVycm9yKHtcbiAgcGFja2FnZU5hbWUsXG4gIHBhdGNoRmlsZW5hbWUsXG4gIHBhdGgsXG4gIHBhdGhTcGVjaWZpZXIsXG59OiB7XG4gIHBhY2thZ2VOYW1lOiBzdHJpbmdcbiAgcGF0Y2hGaWxlbmFtZTogc3RyaW5nXG4gIHBhdGg6IHN0cmluZ1xuICBwYXRoU3BlY2lmaWVyOiBzdHJpbmdcbn0pIHtcbiAgcmV0dXJuIGBcbiR7Y2hhbGsucmVkLmJvbGQoXCIqKkVSUk9SKipcIil9ICR7Y2hhbGsucmVkKFxuICAgIGBGYWlsZWQgdG8gYXBwbHkgcGF0Y2ggZm9yIHBhY2thZ2UgJHtjaGFsay5ib2xkKHBhY2thZ2VOYW1lKX0gYXQgcGF0aGAsXG4gICl9XG4gIFxuICAgICR7cGF0aH1cblxuICBUaGlzIGVycm9yIHdhcyBjYXVzZWQgYmVjYXVzZSBwYXRjaC1wYWNrYWdlIGNhbm5vdCBhcHBseSB0aGUgZm9sbG93aW5nIHBhdGNoIGZpbGU6XG5cbiAgICBwYXRjaGVzLyR7cGF0Y2hGaWxlbmFtZX1cblxuICBUcnkgcmVtb3Zpbmcgbm9kZV9tb2R1bGVzIGFuZCB0cnlpbmcgYWdhaW4uIElmIHRoYXQgZG9lc24ndCB3b3JrLCBtYXliZSB0aGVyZSB3YXNcbiAgYW4gYWNjaWRlbnRhbCBjaGFuZ2UgbWFkZSB0byB0aGUgcGF0Y2ggZmlsZT8gVHJ5IHJlY3JlYXRpbmcgaXQgYnkgbWFudWFsbHlcbiAgZWRpdGluZyB0aGUgYXBwcm9wcmlhdGUgZmlsZXMgYW5kIHJ1bm5pbmc6XG4gIFxuICAgIHBhdGNoLXBhY2thZ2UgJHtwYXRoU3BlY2lmaWVyfVxuICBcbiAgSWYgdGhhdCBkb2Vzbid0IHdvcmssIHRoZW4gaXQncyBhIGJ1ZyBpbiBwYXRjaC1wYWNrYWdlLCBzbyBwbGVhc2Ugc3VibWl0IGEgYnVnXG4gIHJlcG9ydC4gVGhhbmtzIVxuXG4gICAgaHR0cHM6Ly9naXRodWIuY29tL2RzMzAwL3BhdGNoLXBhY2thZ2UvaXNzdWVzXG4gICAgXG5gXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhdGNoQXBwbGljYXRpb25GYWlsdXJlRXJyb3Ioe1xuICBwYWNrYWdlTmFtZSxcbiAgYWN0dWFsVmVyc2lvbixcbiAgb3JpZ2luYWxWZXJzaW9uLFxuICBwYXRjaEZpbGVuYW1lLFxuICBwYXRoLFxuICBwYXRoU3BlY2lmaWVyLFxufToge1xuICBwYWNrYWdlTmFtZTogc3RyaW5nXG4gIGFjdHVhbFZlcnNpb246IHN0cmluZ1xuICBvcmlnaW5hbFZlcnNpb246IHN0cmluZ1xuICBwYXRjaEZpbGVuYW1lOiBzdHJpbmdcbiAgcGF0aDogc3RyaW5nXG4gIHBhdGhTcGVjaWZpZXI6IHN0cmluZ1xufSkge1xuICByZXR1cm4gYFxuJHtjaGFsay5yZWQuYm9sZChcIioqRVJST1IqKlwiKX0gJHtjaGFsay5yZWQoXG4gICAgYEZhaWxlZCB0byBhcHBseSBwYXRjaCBmb3IgcGFja2FnZSAke2NoYWxrLmJvbGQocGFja2FnZU5hbWUpfSBhdCBwYXRoYCxcbiAgKX1cbiAgXG4gICAgJHtwYXRofVxuXG4gIFRoaXMgZXJyb3Igd2FzIGNhdXNlZCBiZWNhdXNlICR7Y2hhbGsuYm9sZChwYWNrYWdlTmFtZSl9IGhhcyBjaGFuZ2VkIHNpbmNlIHlvdVxuICBtYWRlIHRoZSBwYXRjaCBmaWxlIGZvciBpdC4gVGhpcyBpbnRyb2R1Y2VkIGNvbmZsaWN0cyB3aXRoIHlvdXIgcGF0Y2gsXG4gIGp1c3QgbGlrZSBhIG1lcmdlIGNvbmZsaWN0IGluIEdpdCB3aGVuIHNlcGFyYXRlIGluY29tcGF0aWJsZSBjaGFuZ2VzIGFyZVxuICBtYWRlIHRvIHRoZSBzYW1lIHBpZWNlIG9mIGNvZGUuXG5cbiAgTWF5YmUgdGhpcyBtZWFucyB5b3VyIHBhdGNoIGZpbGUgaXMgbm8gbG9uZ2VyIG5lY2Vzc2FyeSwgaW4gd2hpY2ggY2FzZVxuICBob29yYXkhIEp1c3QgZGVsZXRlIGl0IVxuXG4gIE90aGVyd2lzZSwgeW91IG5lZWQgdG8gZ2VuZXJhdGUgYSBuZXcgcGF0Y2ggZmlsZS5cblxuICBUbyBnZW5lcmF0ZSBhIG5ldyBvbmUsIGp1c3QgcmVwZWF0IHRoZSBzdGVwcyB5b3UgbWFkZSB0byBnZW5lcmF0ZSB0aGUgZmlyc3RcbiAgb25lLlxuXG4gIGkuZS4gbWFudWFsbHkgbWFrZSB0aGUgYXBwcm9wcmlhdGUgZmlsZSBjaGFuZ2VzLCB0aGVuIHJ1biBcblxuICAgIHBhdGNoLXBhY2thZ2UgJHtwYXRoU3BlY2lmaWVyfVxuXG4gIEluZm86XG4gICAgUGF0Y2ggZmlsZTogcGF0Y2hlcy8ke3BhdGNoRmlsZW5hbWV9XG4gICAgUGF0Y2ggd2FzIG1hZGUgZm9yIHZlcnNpb246ICR7Y2hhbGsuZ3JlZW4uYm9sZChvcmlnaW5hbFZlcnNpb24pfVxuICAgIEluc3RhbGxlZCB2ZXJzaW9uOiAke2NoYWxrLnJlZC5ib2xkKGFjdHVhbFZlcnNpb24pfVxuYFxufVxuXG5mdW5jdGlvbiBjcmVhdGVVbmV4cGVjdGVkRXJyb3Ioe1xuICBmaWxlbmFtZSxcbiAgZXJyb3IsXG59OiB7XG4gIGZpbGVuYW1lOiBzdHJpbmdcbiAgZXJyb3I6IEVycm9yXG59KSB7XG4gIHJldHVybiBgXG4ke2NoYWxrLnJlZC5ib2xkKFwiKipFUlJPUioqXCIpfSAke2NoYWxrLnJlZChcbiAgICBgRmFpbGVkIHRvIGFwcGx5IHBhdGNoIGZpbGUgJHtjaGFsay5ib2xkKGZpbGVuYW1lKX1gLFxuICApfVxuICBcbiR7ZXJyb3Iuc3RhY2t9XG5cbiAgYFxufVxuIl19