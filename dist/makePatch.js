"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePatch = makePatch;
exports.logPatchSequenceError = logPatchSequenceError;
const chalk_1 = __importDefault(require("chalk"));
const console_1 = __importDefault(require("console"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const tmp_1 = require("tmp");
const zlib_1 = require("zlib");
const applyPatches_1 = require("./applyPatches");
const createIssue_1 = require("./createIssue");
const filterFiles_1 = require("./filterFiles");
const getPackageResolution_1 = require("./getPackageResolution");
const getPackageVersion_1 = require("./getPackageVersion");
const hash_1 = require("./hash");
const PackageDetails_1 = require("./PackageDetails");
const parse_1 = require("./patch/parse");
const patchFs_1 = require("./patchFs");
const path_1 = require("./path");
const resolveRelativeFileDependencies_1 = require("./resolveRelativeFileDependencies");
const spawnSafe_1 = require("./spawnSafe");
const stateFile_1 = require("./stateFile");
function printNoPackageFoundError(packageName, packageJsonPath) {
    console_1.default.log(`No such package ${packageName}

  File not found: ${packageJsonPath}`);
}
function makePatch({ packagePathSpecifier, appPath, packageManager, includePaths, excludePaths, patchDir, createIssue, mode, }) {
    var _a, _b, _c, _d, _e;
    const packageDetails = (0, PackageDetails_1.getPatchDetailsFromCliString)(packagePathSpecifier);
    if (!packageDetails) {
        console_1.default.log("No such package", packagePathSpecifier);
        return;
    }
    const state = (0, stateFile_1.getPatchApplicationState)(packageDetails);
    const isRebasing = (_a = state === null || state === void 0 ? void 0 : state.isRebasing) !== null && _a !== void 0 ? _a : false;
    // If we are rebasing and no patches have been applied, --append is the only valid option because
    // there are no previous patches to overwrite/update
    if (isRebasing &&
        (state === null || state === void 0 ? void 0 : state.patches.filter((p) => p.didApply).length) === 0 &&
        mode.type === "overwrite_last") {
        mode = { type: "append", name: "initial" };
    }
    if (isRebasing && state) {
        (0, stateFile_1.verifyAppliedPatches)({ appPath, patchDir, state });
    }
    if (mode.type === "overwrite_last" &&
        isRebasing &&
        (state === null || state === void 0 ? void 0 : state.patches.length) === 0) {
        mode = { type: "append", name: "initial" };
    }
    const existingPatches = (0, patchFs_1.getGroupedPatches)(patchDir).pathSpecifierToPatchFiles[packageDetails.pathSpecifier] || [];
    // apply all existing patches if appending
    // otherwise apply all but the last
    const previouslyAppliedPatches = state === null || state === void 0 ? void 0 : state.patches.filter((p) => p.didApply);
    const patchesToApplyBeforeDiffing = isRebasing
        ? mode.type === "append"
            ? existingPatches.slice(0, previouslyAppliedPatches.length)
            : state.patches[state.patches.length - 1].didApply
                ? existingPatches.slice(0, previouslyAppliedPatches.length - 1)
                : existingPatches.slice(0, previouslyAppliedPatches.length)
        : mode.type === "append"
            ? existingPatches
            : existingPatches.slice(0, -1);
    if (createIssue && mode.type === "append") {
        console_1.default.log("--create-issue is not compatible with --append.");
        process.exit(1);
    }
    if (createIssue && isRebasing) {
        console_1.default.log("--create-issue is not compatible with rebasing.");
        process.exit(1);
    }
    const numPatchesAfterCreate = mode.type === "append" || existingPatches.length === 0
        ? existingPatches.length + 1
        : existingPatches.length;
    const vcs = (0, createIssue_1.getPackageVCSDetails)(packageDetails);
    const canCreateIssue = !isRebasing &&
        (0, createIssue_1.shouldRecommendIssue)(vcs) &&
        numPatchesAfterCreate === 1 &&
        mode.type !== "append";
    const appPackageJson = require((0, path_1.join)(appPath, "package.json"));
    const packagePath = (0, path_1.join)(appPath, packageDetails.path);
    const packageJsonPath = (0, path_1.join)(packagePath, "package.json");
    if (!(0, fs_extra_1.existsSync)(packageJsonPath)) {
        printNoPackageFoundError(packagePathSpecifier, packageJsonPath);
        process.exit(1);
    }
    const tmpRepo = (0, tmp_1.dirSync)({ unsafeCleanup: true });
    const tmpRepoPackagePath = (0, path_1.join)(tmpRepo.name, packageDetails.path);
    const tmpRepoNpmRoot = tmpRepoPackagePath.slice(0, -`/node_modules/${packageDetails.name}`.length);
    const tmpRepoPackageJsonPath = (0, path_1.join)(tmpRepoNpmRoot, "package.json");
    try {
        const patchesDir = (0, path_1.resolve)((0, path_1.join)(appPath, patchDir));
        console_1.default.info(chalk_1.default.grey("•"), "Creating temporary folder");
        // make a blank package.json
        (0, fs_extra_1.mkdirpSync)(tmpRepoNpmRoot);
        (0, fs_extra_1.writeFileSync)(tmpRepoPackageJsonPath, JSON.stringify({
            dependencies: {
                [packageDetails.name]: (0, getPackageResolution_1.getPackageResolution)({
                    packageDetails,
                    packageManager,
                    appPath,
                }),
            },
            resolutions: (0, resolveRelativeFileDependencies_1.resolveRelativeFileDependencies)(appPath, appPackageJson.resolutions || {}),
        }));
        const packageVersion = (0, getPackageVersion_1.getPackageVersion)((0, path_1.join)((0, path_1.resolve)(packageDetails.path), "package.json"));
        [".npmrc", ".yarnrc", ".yarn"].forEach((rcFile) => {
            const rcPath = (0, path_1.join)(appPath, rcFile);
            if ((0, fs_extra_1.existsSync)(rcPath)) {
                (0, fs_extra_1.copySync)(rcPath, (0, path_1.join)(tmpRepo.name, rcFile), { dereference: true });
            }
        });
        if (packageManager === "yarn") {
            console_1.default.info(chalk_1.default.grey("•"), `Installing ${packageDetails.name}@${packageVersion} with yarn`);
            try {
                // try first without ignoring scripts in case they are required
                // this works in 99.99% of cases
                (0, spawnSafe_1.spawnSafeSync)(`yarn`, ["install", "--ignore-engines"], {
                    cwd: tmpRepoNpmRoot,
                    logStdErrOnError: false,
                });
            }
            catch (e) {
                // try again while ignoring scripts in case the script depends on
                // an implicit context which we haven't reproduced
                (0, spawnSafe_1.spawnSafeSync)(`yarn`, ["install", "--ignore-engines", "--ignore-scripts"], {
                    cwd: tmpRepoNpmRoot,
                });
            }
        }
        else {
            console_1.default.info(chalk_1.default.grey("•"), `Installing ${packageDetails.name}@${packageVersion} with npm`);
            try {
                // try first without ignoring scripts in case they are required
                // this works in 99.99% of cases
                (0, spawnSafe_1.spawnSafeSync)(`npm`, ["i", "--force"], {
                    cwd: tmpRepoNpmRoot,
                    logStdErrOnError: false,
                    stdio: "ignore",
                });
            }
            catch (e) {
                // try again while ignoring scripts in case the script depends on
                // an implicit context which we haven't reproduced
                (0, spawnSafe_1.spawnSafeSync)(`npm`, ["i", "--ignore-scripts", "--force"], {
                    cwd: tmpRepoNpmRoot,
                    stdio: "ignore",
                });
            }
        }
        const git = (...args) => (0, spawnSafe_1.spawnSafeSync)("git", args, {
            cwd: tmpRepo.name,
            env: Object.assign(Object.assign({}, process.env), { HOME: tmpRepo.name }),
            maxBuffer: 1024 * 1024 * 100,
        });
        // remove nested node_modules just to be safe
        (0, fs_extra_1.removeSync)((0, path_1.join)(tmpRepoPackagePath, "node_modules"));
        // remove .git just to be safe
        (0, fs_extra_1.removeSync)((0, path_1.join)(tmpRepoPackagePath, ".git"));
        // remove patch-package state file
        (0, fs_extra_1.removeSync)((0, path_1.join)(tmpRepoPackagePath, stateFile_1.STATE_FILE_NAME));
        // commit the package
        console_1.default.info(chalk_1.default.grey("•"), "Diffing your files with clean files");
        (0, fs_extra_1.writeFileSync)((0, path_1.join)(tmpRepo.name, ".gitignore"), "!/node_modules\n\n");
        git("init");
        git("config", "--local", "user.name", "patch-package");
        git("config", "--local", "user.email", "patch@pack.age");
        // remove ignored files first
        (0, filterFiles_1.removeIgnoredFiles)(tmpRepoPackagePath, includePaths, excludePaths);
        for (const patchDetails of patchesToApplyBeforeDiffing) {
            if (!(0, applyPatches_1.applyPatch)({
                patchDetails,
                patchDir,
                patchFilePath: (0, path_1.join)(appPath, patchDir, patchDetails.patchFilename),
                reverse: false,
                cwd: tmpRepo.name,
                bestEffort: false,
            })) {
                // TODO: add better error message once --rebase is implemented
                console_1.default.log(`Failed to apply patch ${patchDetails.patchFilename} to ${packageDetails.pathSpecifier}`);
                process.exit(1);
            }
        }
        git("add", "-f", packageDetails.path);
        git("commit", "--allow-empty", "-m", "init");
        // replace package with user's version
        (0, fs_extra_1.removeSync)(tmpRepoPackagePath);
        // pnpm installs packages as symlinks, copySync would copy only the symlink
        (0, fs_extra_1.copySync)((0, fs_extra_1.realpathSync)(packagePath), tmpRepoPackagePath);
        // remove nested node_modules just to be safe
        (0, fs_extra_1.removeSync)((0, path_1.join)(tmpRepoPackagePath, "node_modules"));
        // remove .git just to be safe
        (0, fs_extra_1.removeSync)((0, path_1.join)(tmpRepoPackagePath, ".git"));
        // remove patch-package state file
        (0, fs_extra_1.removeSync)((0, path_1.join)(tmpRepoPackagePath, stateFile_1.STATE_FILE_NAME));
        // also remove ignored files like before
        (0, filterFiles_1.removeIgnoredFiles)(tmpRepoPackagePath, includePaths, excludePaths);
        // stage all files
        git("add", "-f", packageDetails.path);
        // get diff of changes
        const diffResult = git("diff", "--cached", "--no-color", "--ignore-space-at-eol", "--no-ext-diff", "--src-prefix=a/", "--dst-prefix=b/");
        if (diffResult.stdout.length === 0) {
            console_1.default.log(`⁉️  Not creating patch file for package '${packagePathSpecifier}'`);
            console_1.default.log(`⁉️  There don't appear to be any changes.`);
            if (isRebasing && mode.type === "overwrite_last") {
                console_1.default.log("\n💡 To remove a patch file, delete it and then reinstall node_modules from scratch.");
            }
            process.exit(1);
            return;
        }
        try {
            (0, parse_1.parsePatchFile)(diffResult.stdout.toString());
        }
        catch (e) {
            if (e.message.includes("Unexpected file mode string: 120000")) {
                console_1.default.log(`
⛔️ ${chalk_1.default.red.bold("ERROR")}

  Your changes involve creating symlinks. patch-package does not yet support
  symlinks.
  
  ️Please use ${chalk_1.default.bold("--include")} and/or ${chalk_1.default.bold("--exclude")} to narrow the scope of your patch if
  this was unintentional.
`);
            }
            else {
                const outPath = "./patch-package-error.json.gz";
                (0, fs_extra_1.writeFileSync)(outPath, (0, zlib_1.gzipSync)(JSON.stringify({
                    error: {
                        message: e instanceof Error ? e.message : String(e),
                        stack: e instanceof Error ? e.stack : "",
                    },
                    patch: diffResult.stdout.toString(),
                })));
                console_1.default.log(`
⛔️ ${chalk_1.default.red.bold("ERROR")}
        
  patch-package was unable to read the patch-file made by git. This should not
  happen.
  
  A diagnostic file was written to
  
    ${outPath}
  
  Please attach it to a github issue
  
    https://github.com/ds300/patch-package/issues/new?title=New+patch+parse+failed&body=Please+attach+the+diagnostic+file+by+dragging+it+into+here+🙏
  
  Note that this diagnostic file will contain code from the package you were
  attempting to patch.

`);
            }
            process.exit(1);
            return;
        }
        // maybe delete existing
        if (mode.type === "append" && !isRebasing && existingPatches.length === 1) {
            // if we are appending to an existing patch that doesn't have a sequence number let's rename it
            const prevPatch = existingPatches[0];
            if (prevPatch.sequenceNumber === undefined) {
                const newFileName = createPatchFileName({
                    packageDetails,
                    packageVersion,
                    sequenceNumber: 1,
                    sequenceName: (_b = prevPatch.sequenceName) !== null && _b !== void 0 ? _b : "initial",
                });
                const oldPath = (0, path_1.join)(appPath, patchDir, prevPatch.patchFilename);
                const newPath = (0, path_1.join)(appPath, patchDir, newFileName);
                (0, fs_1.renameSync)(oldPath, newPath);
                prevPatch.sequenceNumber = 1;
                prevPatch.patchFilename = newFileName;
                prevPatch.sequenceName = (_c = prevPatch.sequenceName) !== null && _c !== void 0 ? _c : "initial";
            }
        }
        const lastPatch = existingPatches[state ? state.patches.length - 1 : existingPatches.length - 1];
        const sequenceName = mode.type === "append" ? mode.name : lastPatch === null || lastPatch === void 0 ? void 0 : lastPatch.sequenceName;
        const sequenceNumber = mode.type === "append"
            ? ((_d = lastPatch === null || lastPatch === void 0 ? void 0 : lastPatch.sequenceNumber) !== null && _d !== void 0 ? _d : 0) + 1
            : lastPatch === null || lastPatch === void 0 ? void 0 : lastPatch.sequenceNumber;
        const patchFileName = createPatchFileName({
            packageDetails,
            packageVersion,
            sequenceName,
            sequenceNumber,
        });
        const patchPath = (0, path_1.join)(patchesDir, patchFileName);
        if (!(0, fs_extra_1.existsSync)((0, path_1.dirname)(patchPath))) {
            // scoped package
            (0, fs_extra_1.mkdirSync)((0, path_1.dirname)(patchPath));
        }
        // if we are inserting a new patch into a sequence we most likely need to update the sequence numbers
        if (isRebasing && mode.type === "append") {
            const patchesToNudge = existingPatches.slice(state.patches.length);
            if (sequenceNumber === undefined) {
                throw new Error("sequenceNumber is undefined while rebasing");
            }
            if (((_e = patchesToNudge[0]) === null || _e === void 0 ? void 0 : _e.sequenceNumber) !== undefined &&
                patchesToNudge[0].sequenceNumber <= sequenceNumber) {
                let next = sequenceNumber + 1;
                for (const p of patchesToNudge) {
                    const newName = createPatchFileName({
                        packageDetails,
                        packageVersion,
                        sequenceName: p.sequenceName,
                        sequenceNumber: next++,
                    });
                    console_1.default.log("Renaming", chalk_1.default.bold(p.patchFilename), "to", chalk_1.default.bold(newName));
                    const oldPath = (0, path_1.join)(appPath, patchDir, p.patchFilename);
                    const newPath = (0, path_1.join)(appPath, patchDir, newName);
                    (0, fs_1.renameSync)(oldPath, newPath);
                }
            }
        }
        (0, fs_extra_1.writeFileSync)(patchPath, diffResult.stdout);
        console_1.default.log(`${chalk_1.default.green("✔")} Created file ${(0, path_1.join)(patchDir, patchFileName)}\n`);
        const prevState = patchesToApplyBeforeDiffing.map((p) => ({
            patchFilename: p.patchFilename,
            didApply: true,
            patchContentHash: (0, hash_1.hashFile)((0, path_1.join)(appPath, patchDir, p.patchFilename)),
        }));
        const nextState = [
            ...prevState,
            {
                patchFilename: patchFileName,
                didApply: true,
                patchContentHash: (0, hash_1.hashFile)(patchPath),
            },
        ];
        // if any patches come after this one we just made, we should reapply them
        let didFailWhileFinishingRebase = false;
        if (isRebasing) {
            const currentPatches = (0, patchFs_1.getGroupedPatches)((0, path_1.join)(appPath, patchDir))
                .pathSpecifierToPatchFiles[packageDetails.pathSpecifier];
            const previouslyUnappliedPatches = currentPatches.slice(nextState.length);
            if (previouslyUnappliedPatches.length) {
                console_1.default.log(`Fast forwarding...`);
                for (const patch of previouslyUnappliedPatches) {
                    const patchFilePath = (0, path_1.join)(appPath, patchDir, patch.patchFilename);
                    if (!(0, applyPatches_1.applyPatch)({
                        patchDetails: patch,
                        patchDir,
                        patchFilePath,
                        reverse: false,
                        cwd: process.cwd(),
                        bestEffort: false,
                    })) {
                        didFailWhileFinishingRebase = true;
                        logPatchSequenceError({ patchDetails: patch });
                        nextState.push({
                            patchFilename: patch.patchFilename,
                            didApply: false,
                            patchContentHash: (0, hash_1.hashFile)(patchFilePath),
                        });
                        break;
                    }
                    else {
                        console_1.default.log(`  ${chalk_1.default.green("✔")} ${patch.patchFilename}`);
                        nextState.push({
                            patchFilename: patch.patchFilename,
                            didApply: true,
                            patchContentHash: (0, hash_1.hashFile)(patchFilePath),
                        });
                    }
                }
            }
        }
        if (isRebasing || numPatchesAfterCreate > 1) {
            (0, stateFile_1.savePatchApplicationState)({
                packageDetails,
                patches: nextState,
                isRebasing: didFailWhileFinishingRebase,
            });
        }
        else {
            (0, stateFile_1.clearPatchApplicationState)(packageDetails);
        }
        if (canCreateIssue) {
            if (createIssue) {
                (0, createIssue_1.openIssueCreationLink)({
                    packageDetails,
                    patchFileContents: diffResult.stdout.toString(),
                    packageVersion,
                    patchPath,
                });
            }
            else {
                (0, createIssue_1.maybePrintIssueCreationPrompt)(vcs, packageDetails, packageManager);
            }
        }
    }
    catch (e) {
        console_1.default.log(e);
        throw e;
    }
    finally {
        tmpRepo.removeCallback();
    }
}
function createPatchFileName({ packageDetails, packageVersion, sequenceNumber, sequenceName, }) {
    const packageNames = packageDetails.packageNames
        .map((name) => name.replace(/\//g, "+"))
        .join("++");
    const nameAndVersion = `${packageNames}+${packageVersion}`;
    const num = sequenceNumber === undefined
        ? ""
        : `+${sequenceNumber.toString().padStart(3, "0")}`;
    const name = !sequenceName ? "" : `+${sequenceName}`;
    return `${nameAndVersion}${num}${name}.patch`;
}
function logPatchSequenceError({ patchDetails, }) {
    console_1.default.log(`
${chalk_1.default.red.bold("⛔ ERROR")}

Failed to apply patch file ${chalk_1.default.bold(patchDetails.patchFilename)}.

If this patch file is no longer useful, delete it and run

  ${chalk_1.default.bold(`patch-package`)}

To partially apply the patch (if possible) and output a log of errors to fix, run

  ${chalk_1.default.bold(`patch-package --partial`)}

After which you should make any required changes inside ${patchDetails.path}, and finally run

  ${chalk_1.default.bold(`patch-package ${patchDetails.pathSpecifier}`)}

to update the patch file.
`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFrZVBhdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL21ha2VQYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQXdEQSw4QkFtZkM7QUEyQkQsc0RBMEJDO0FBaG1CRCxrREFBeUI7QUFDekIsc0RBQTZCO0FBQzdCLDJCQUErQjtBQUMvQix1Q0FRaUI7QUFDakIsNkJBQTZCO0FBQzdCLCtCQUErQjtBQUMvQixpREFBMkM7QUFDM0MsK0NBS3NCO0FBRXRCLCtDQUFrRDtBQUNsRCxpRUFBNkQ7QUFDN0QsMkRBQXVEO0FBQ3ZELGlDQUFpQztBQUNqQyxxREFJeUI7QUFDekIseUNBQThDO0FBQzlDLHVDQUE2QztBQUM3QyxpQ0FBK0M7QUFDL0MsdUZBQW1GO0FBQ25GLDJDQUEyQztBQUMzQywyQ0FPb0I7QUFFcEIsU0FBUyx3QkFBd0IsQ0FDL0IsV0FBbUIsRUFDbkIsZUFBdUI7SUFFdkIsaUJBQU8sQ0FBQyxHQUFHLENBQ1QsbUJBQW1CLFdBQVc7O29CQUVkLGVBQWUsRUFBRSxDQUNsQyxDQUFBO0FBQ0gsQ0FBQztBQUVELFNBQWdCLFNBQVMsQ0FBQyxFQUN4QixvQkFBb0IsRUFDcEIsT0FBTyxFQUNQLGNBQWMsRUFDZCxZQUFZLEVBQ1osWUFBWSxFQUNaLFFBQVEsRUFDUixXQUFXLEVBQ1gsSUFBSSxHQVVMOztJQUNDLE1BQU0sY0FBYyxHQUFHLElBQUEsNkNBQTRCLEVBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUV6RSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDcEIsaUJBQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUNwRCxPQUFNO0lBQ1IsQ0FBQztJQUVELE1BQU0sS0FBSyxHQUFHLElBQUEsb0NBQXdCLEVBQUMsY0FBYyxDQUFDLENBQUE7SUFDdEQsTUFBTSxVQUFVLEdBQUcsTUFBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsVUFBVSxtQ0FBSSxL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SyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7Ozs7SUFJM0IsZUFBSyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQzs7MERBR3JDLFlBQVksQ0FBQyxJQUNmOztJQUVFLGVBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQzs7O0NBRzVELENBQUMsQ0FBQTtBQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSBcImNoYWxrXCJcbmltcG9ydCBjb25zb2xlIGZyb20gXCJjb25zb2xlXCJcbmltcG9ydCB7IHJlbmFtZVN5bmMgfSBmcm9tIFwiZnNcIlxuaW1wb3J0IHtcbiAgY29weVN5bmMsXG4gIGV4aXN0c1N5bmMsXG4gIG1rZGlycFN5bmMsXG4gIG1rZGlyU3luYyxcbiAgcmVhbHBhdGhTeW5jLFxuICByZW1vdmVTeW5jLFxuICB3cml0ZUZpbGVTeW5jLFxufSBmcm9tIFwiZnMtZXh0cmFcIlxuaW1wb3J0IHsgZGlyU3luYyB9IGZyb20gXCJ0bXBcIlxuaW1wb3J0IHsgZ3ppcFN5bmMgfSBmcm9tIFwiemxpYlwiXG5pbXBvcnQgeyBhcHBseVBhdGNoIH0gZnJvbSBcIi4vYXBwbHlQYXRjaGVzXCJcbmltcG9ydCB7XG4gIGdldFBhY2thZ2VWQ1NEZXRhaWxzLFxuICBtYXliZVByaW50SXNzdWVDcmVhdGlvblByb21wdCxcbiAgb3Blbklzc3VlQ3JlYXRpb25MaW5rLFxuICBzaG91bGRSZWNvbW1lbmRJc3N1ZSxcbn0gZnJvbSBcIi4vY3JlYXRlSXNzdWVcIlxuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tIFwiLi9kZXRlY3RQYWNrYWdlTWFuYWdlclwiXG5pbXBvcnQgeyByZW1vdmVJZ25vcmVkRmlsZXMgfSBmcm9tIFwiLi9maWx0ZXJGaWxlc1wiXG5pbXBvcnQgeyBnZXRQYWNrYWdlUmVzb2x1dGlvbiB9IGZyb20gXCIuL2dldFBhY2thZ2VSZXNvbHV0aW9uXCJcbmltcG9ydCB7IGdldFBhY2thZ2VWZXJzaW9uIH0gZnJvbSBcIi4vZ2V0UGFja2FnZVZlcnNpb25cIlxuaW1wb3J0IHsgaGFzaEZpbGUgfSBmcm9tIFwiLi9oYXNoXCJcbmltcG9ydCB7XG4gIGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcsXG4gIFBhY2thZ2VEZXRhaWxzLFxuICBQYXRjaGVkUGFja2FnZURldGFpbHMsXG59IGZyb20gXCIuL1BhY2thZ2VEZXRhaWxzXCJcbmltcG9ydCB7IHBhcnNlUGF0Y2hGaWxlIH0gZnJvbSBcIi4vcGF0Y2gvcGFyc2VcIlxuaW1wb3J0IHsgZ2V0R3JvdXBlZFBhdGNoZXMgfSBmcm9tIFwiLi9wYXRjaEZzXCJcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4sIHJlc29sdmUgfSBmcm9tIFwiLi9wYXRoXCJcbmltcG9ydCB7IHJlc29sdmVSZWxhdGl2ZUZpbGVEZXBlbmRlbmNpZXMgfSBmcm9tIFwiLi9yZXNvbHZlUmVsYXRpdmVGaWxlRGVwZW5kZW5jaWVzXCJcbmltcG9ydCB7IHNwYXduU2FmZVN5bmMgfSBmcm9tIFwiLi9zcGF3blNhZmVcIlxuaW1wb3J0IHtcbiAgY2xlYXJQYXRjaEFwcGxpY2F0aW9uU3RhdGUsXG4gIGdldFBhdGNoQXBwbGljYXRpb25TdGF0ZSxcbiAgUGF0Y2hTdGF0ZSxcbiAgc2F2ZVBhdGNoQXBwbGljYXRpb25TdGF0ZSxcbiAgU1RBVEVfRklMRV9OQU1FLFxuICB2ZXJpZnlBcHBsaWVkUGF0Y2hlcyxcbn0gZnJvbSBcIi4vc3RhdGVGaWxlXCJcblxuZnVuY3Rpb24gcHJpbnROb1BhY2thZ2VGb3VuZEVycm9yKFxuICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICBwYWNrYWdlSnNvblBhdGg6IHN0cmluZyxcbikge1xuICBjb25zb2xlLmxvZyhcbiAgICBgTm8gc3VjaCBwYWNrYWdlICR7cGFja2FnZU5hbWV9XG5cbiAgRmlsZSBub3QgZm91bmQ6ICR7cGFja2FnZUpzb25QYXRofWAsXG4gIClcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VQYXRjaCh7XG4gIHBhY2thZ2VQYXRoU3BlY2lmaWVyLFxuICBhcHBQYXRoLFxuICBwYWNrYWdlTWFuYWdlcixcbiAgaW5jbHVkZVBhdGhzLFxuICBleGNsdWRlUGF0aHMsXG4gIHBhdGNoRGlyLFxuICBjcmVhdGVJc3N1ZSxcbiAgbW9kZSxcbn06IHtcbiAgcGFja2FnZVBhdGhTcGVjaWZpZXI6IHN0cmluZ1xuICBhcHBQYXRoOiBzdHJpbmdcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyXG4gIGluY2x1ZGVQYXRoczogUmVnRXhwXG4gIGV4Y2x1ZGVQYXRoczogUmVnRXhwXG4gIHBhdGNoRGlyOiBzdHJpbmdcbiAgY3JlYXRlSXNzdWU6IGJvb2xlYW5cbiAgbW9kZTogeyB0eXBlOiBcIm92ZXJ3cml0ZV9sYXN0XCIgfSB8IHsgdHlwZTogXCJhcHBlbmRcIjsgbmFtZT86IHN0cmluZyB9XG59KSB7XG4gIGNvbnN0IHBhY2thZ2VEZXRhaWxzID0gZ2V0UGF0Y2hEZXRhaWxzRnJvbUNsaVN0cmluZyhwYWNrYWdlUGF0aFNwZWNpZmllcilcblxuICBpZiAoIXBhY2thZ2VEZXRhaWxzKSB7XG4gICAgY29uc29sZS5sb2coXCJObyBzdWNoIHBhY2thZ2VcIiwgcGFja2FnZVBhdGhTcGVjaWZpZXIpXG4gICAgcmV0dXJuXG4gIH1cblxuICBjb25zdCBzdGF0ZSA9IGdldFBhdGNoQXBwbGljYXRpb25TdGF0ZShwYWNrYWdlRGV0YWlscylcbiAgY29uc3QgaXNSZWJhc2luZyA9IHN0YXRlPy5pc1JlYmFzaW5nID8/IGZhbHNlXG5cbiAgLy8gSWYgd2UgYXJlIHJlYmFzaW5nIGFuZCBubyBwYXRjaGVzIGhhdmUgYmVlbiBhcHBsaWVkLCAtLWFwcGVuZCBpcyB0aGUgb25seSB2YWxpZCBvcHRpb24gYmVjYXVzZVxuICAvLyB0aGVyZSBhcmUgbm8gcHJldmlvdXMgcGF0Y2hlcyB0byBvdmVyd3JpdGUvdXBkYXRlXG4gIGlmIChcbiAgICBpc1JlYmFzaW5nICYmXG4gICAgc3RhdGU/LnBhdGNoZXMuZmlsdGVyKChwKSA9PiBwLmRpZEFwcGx5KS5sZW5ndGggPT09IDAgJiZcbiAgICBtb2RlLnR5cGUgPT09IFwib3ZlcndyaXRlX2xhc3RcIlxuICApIHtcbiAgICBtb2RlID0geyB0eXBlOiBcImFwcGVuZFwiLCBuYW1lOiBcImluaXRpYWxcIiB9XG4gIH1cblxuICBpZiAoaXNSZWJhc2luZyAmJiBzdGF0ZSkge1xuICAgIHZlcmlmeUFwcGxpZWRQYXRjaGVzKHsgYXBwUGF0aCwgcGF0Y2hEaXIsIHN0YXRlIH0pXG4gIH1cblxuICBpZiAoXG4gICAgbW9kZS50eXBlID09PSBcIm92ZXJ3cml0ZV9sYXN0XCIgJiZcbiAgICBpc1JlYmFzaW5nICYmXG4gICAgc3RhdGU/LnBhdGNoZXMubGVuZ3RoID09PSAwXG4gICkge1xuICAgIG1vZGUgPSB7IHR5cGU6IFwiYXBwZW5kXCIsIG5hbWU6IFwiaW5pdGlhbFwiIH1cbiAgfVxuXG4gIGNvbnN0IGV4aXN0aW5nUGF0Y2hlcyA9XG4gICAgZ2V0R3JvdXBlZFBhdGNoZXMocGF0Y2hEaXIpLnBhdGhTcGVjaWZpZXJUb1BhdGNoRmlsZXNbXG4gICAgICBwYWNrYWdlRGV0YWlscy5wYXRoU3BlY2lmaWVyXG4gICAgXSB8fCBbXVxuXG4gIC8vIGFwcGx5IGFsbCBleGlzdGluZyBwYXRjaGVzIGlmIGFwcGVuZGluZ1xuICAvLyBvdGhlcndpc2UgYXBwbHkgYWxsIGJ1dCB0aGUgbGFzdFxuICBjb25zdCBwcmV2aW91c2x5QXBwbGllZFBhdGNoZXMgPSBzdGF0ZT8ucGF0Y2hlcy5maWx0ZXIoKHApID0+IHAuZGlkQXBwbHkpXG4gIGNvbnN0IHBhdGNoZXNUb0FwcGx5QmVmb3JlRGlmZmluZzogUGF0Y2hlZFBhY2thZ2VEZXRhaWxzW10gPSBpc1JlYmFzaW5nXG4gICAgPyBtb2RlLnR5cGUgPT09IFwiYXBwZW5kXCJcbiAgICAgID8gZXhpc3RpbmdQYXRjaGVzLnNsaWNlKDAsIHByZXZpb3VzbHlBcHBsaWVkUGF0Y2hlcyEubGVuZ3RoKVxuICAgICAgOiBzdGF0ZSEucGF0Y2hlc1tzdGF0ZSEucGF0Y2hlcy5sZW5ndGggLSAxXS5kaWRBcHBseVxuICAgICAgPyBleGlzdGluZ1BhdGNoZXMuc2xpY2UoMCwgcHJldmlvdXNseUFwcGxpZWRQYXRjaGVzIS5sZW5ndGggLSAxKVxuICAgICAgOiBleGlzdGluZ1BhdGNoZXMuc2xpY2UoMCwgcHJldmlvdXNseUFwcGxpZWRQYXRjaGVzIS5sZW5ndGgpXG4gICAgOiBtb2RlLnR5cGUgPT09IFwiYXBwZW5kXCJcbiAgICA/IGV4aXN0aW5nUGF0Y2hlc1xuICAgIDogZXhpc3RpbmdQYXRjaGVzLnNsaWNlKDAsIC0xKVxuXG4gIGlmIChjcmVhdGVJc3N1ZSAmJiBtb2RlLnR5cGUgPT09IFwiYXBwZW5kXCIpIHtcbiAgICBjb25zb2xlLmxvZyhcIi0tY3JlYXRlLWlzc3VlIGlzIG5vdCBjb21wYXRpYmxlIHdpdGggLS1hcHBlbmQuXCIpXG4gICAgcHJvY2Vzcy5leGl0KDEpXG4gIH1cblxuICBpZiAoY3JlYXRlSXNzdWUgJiYgaXNSZWJhc2luZykge1xuICAgIGNvbnNvbGUubG9nKFwiLS1jcmVhdGUtaXNzdWUgaXMgbm90IGNvbXBhdGlibGUgd2l0aCByZWJhc2luZy5cIilcbiAgICBwcm9jZXNzLmV4aXQoMSlcbiAgfVxuXG4gIGNvbnN0IG51bVBhdGNoZXNBZnRlckNyZWF0ZSA9XG4gICAgbW9kZS50eXBlID09PSBcImFwcGVuZFwiIHx8IGV4aXN0aW5nUGF0Y2hlcy5sZW5ndGggPT09IDBcbiAgICAgID8gZXhpc3RpbmdQYXRjaGVzLmxlbmd0aCArIDFcbiAgICAgIDogZXhpc3RpbmdQYXRjaGVzLmxlbmd0aFxuICBjb25zdCB2Y3MgPSBnZXRQYWNrYWdlVkNTRGV0YWlscyhwYWNrYWdlRGV0YWlscylcbiAgY29uc3QgY2FuQ3JlYXRlSXNzdWUgPVxuICAgICFpc1JlYmFzaW5nICYmXG4gICAgc2hvdWxkUmVjb21tZW5kSXNzdWUodmNzKSAmJlxuICAgIG51bVBhdGNoZXNBZnRlckNyZWF0ZSA9PT0gMSAmJlxuICAgIG1vZGUudHlwZSAhPT0gXCJhcHBlbmRcIlxuXG4gIGNvbnN0IGFwcFBhY2thZ2VKc29uID0gcmVxdWlyZShqb2luKGFwcFBhdGgsIFwicGFja2FnZS5qc29uXCIpKVxuICBjb25zdCBwYWNrYWdlUGF0aCA9IGpvaW4oYXBwUGF0aCwgcGFja2FnZURldGFpbHMucGF0aClcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gam9pbihwYWNrYWdlUGF0aCwgXCJwYWNrYWdlLmpzb25cIilcblxuICBpZiAoIWV4aXN0c1N5bmMocGFja2FnZUpzb25QYXRoKSkge1xuICAgIHByaW50Tm9QYWNrYWdlRm91bmRFcnJvcihwYWNrYWdlUGF0aFNwZWNpZmllciwgcGFja2FnZUpzb25QYXRoKVxuICAgIHByb2Nlc3MuZXhpdCgxKVxuICB9XG5cbiAgY29uc3QgdG1wUmVwbyA9IGRpclN5bmMoeyB1bnNhZmVDbGVhbnVwOiB0cnVlIH0pXG4gIGNvbnN0IHRtcFJlcG9QYWNrYWdlUGF0aCA9IGpvaW4odG1wUmVwby5uYW1lLCBwYWNrYWdlRGV0YWlscy5wYXRoKVxuICBjb25zdCB0bXBSZXBvTnBtUm9vdCA9IHRtcFJlcG9QYWNrYWdlUGF0aC5zbGljZShcbiAgICAwLFxuICAgIC1gL25vZGVfbW9kdWxlcy8ke3BhY2thZ2VEZXRhaWxzLm5hbWV9YC5sZW5ndGgsXG4gIClcblxuICBjb25zdCB0bXBSZXBvUGFja2FnZUpzb25QYXRoID0gam9pbih0bXBSZXBvTnBtUm9vdCwgXCJwYWNrYWdlLmpzb25cIilcblxuICB0cnkge1xuICAgIGNvbnN0IHBhdGNoZXNEaXIgPSByZXNvbHZlKGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIpKVxuXG4gICAgY29uc29sZS5pbmZvKGNoYWxrLmdyZXkoXCLigKJcIiksIFwiQ3JlYXRpbmcgdGVtcG9yYXJ5IGZvbGRlclwiKVxuXG4gICAgLy8gbWFrZSBhIGJsYW5rIHBhY2thZ2UuanNvblxuICAgIG1rZGlycFN5bmModG1wUmVwb05wbVJvb3QpXG4gICAgd3JpdGVGaWxlU3luYyhcbiAgICAgIHRtcFJlcG9QYWNrYWdlSnNvblBhdGgsXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGRlcGVuZGVuY2llczoge1xuICAgICAgICAgIFtwYWNrYWdlRGV0YWlscy5uYW1lXTogZ2V0UGFja2FnZVJlc29sdXRpb24oe1xuICAgICAgICAgICAgcGFja2FnZURldGFpbHMsXG4gICAgICAgICAgICBwYWNrYWdlTWFuYWdlcixcbiAgICAgICAgICAgIGFwcFBhdGgsXG4gICAgICAgICAgfSksXG4gICAgICAgIH0sXG4gICAgICAgIHJlc29sdXRpb25zOiByZXNvbHZlUmVsYXRpdmVGaWxlRGVwZW5kZW5jaWVzKFxuICAgICAgICAgIGFwcFBhdGgsXG4gICAgICAgICAgYXBwUGFja2FnZUpzb24ucmVzb2x1dGlvbnMgfHwge30sXG4gICAgICAgICksXG4gICAgICB9KSxcbiAgICApXG5cbiAgICBjb25zdCBwYWNrYWdlVmVyc2lvbiA9IGdldFBhY2thZ2VWZXJzaW9uKFxuICAgICAgam9pbihyZXNvbHZlKHBhY2thZ2VEZXRhaWxzLnBhdGgpLCBcInBhY2thZ2UuanNvblwiKSxcbiAgICApXG5cbiAgICAvLyBjb3B5IC5ucG1yYy8ueWFybnJjIGluIGNhc2UgcGFja2FnZXMgYXJlIGhvc3RlZCBpbiBwcml2YXRlIHJlZ2lzdHJ5XG4gICAgLy8gY29weSAueWFybiBkaXJlY3RvcnkgYXMgd2VsbCB0byBlbnN1cmUgaW5zdGFsbGF0aW9ucyB3b3JrIGluIHlhcm4gMlxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTphbGlnblxuICAgIDtbXCIubnBtcmNcIiwgXCIueWFybnJjXCIsIFwiLnlhcm5cIl0uZm9yRWFjaCgocmNGaWxlKSA9PiB7XG4gICAgICBjb25zdCByY1BhdGggPSBqb2luKGFwcFBhdGgsIHJjRmlsZSlcbiAgICAgIGlmIChleGlzdHNTeW5jKHJjUGF0aCkpIHtcbiAgICAgICAgY29weVN5bmMocmNQYXRoLCBqb2luKHRtcFJlcG8ubmFtZSwgcmNGaWxlKSwgeyBkZXJlZmVyZW5jZTogdHJ1ZSB9KVxuICAgICAgfVxuICAgIH0pXG5cbiAgICBpZiAocGFja2FnZU1hbmFnZXIgPT09IFwieWFyblwiKSB7XG4gICAgICBjb25zb2xlLmluZm8oXG4gICAgICAgIGNoYWxrLmdyZXkoXCLigKJcIiksXG4gICAgICAgIGBJbnN0YWxsaW5nICR7cGFja2FnZURldGFpbHMubmFtZX1AJHtwYWNrYWdlVmVyc2lvbn0gd2l0aCB5YXJuYCxcbiAgICAgIClcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIHRyeSBmaXJzdCB3aXRob3V0IGlnbm9yaW5nIHNjcmlwdHMgaW4gY2FzZSB0aGV5IGFyZSByZXF1aXJlZFxuICAgICAgICAvLyB0aGlzIHdvcmtzIGluIDk5Ljk5JSBvZiBjYXNlc1xuICAgICAgICBzcGF3blNhZmVTeW5jKGB5YXJuYCwgW1wiaW5zdGFsbFwiLCBcIi0taWdub3JlLWVuZ2luZXNcIl0sIHtcbiAgICAgICAgICBjd2Q6IHRtcFJlcG9OcG1Sb290LFxuICAgICAgICAgIGxvZ1N0ZEVyck9uRXJyb3I6IGZhbHNlLFxuICAgICAgICB9KVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyB0cnkgYWdhaW4gd2hpbGUgaWdub3Jpbmcgc2NyaXB0cyBpbiBjYXNlIHRoZSBzY3JpcHQgZGVwZW5kcyBvblxuICAgICAgICAvLyBhbiBpbXBsaWNpdCBjb250ZXh0IHdoaWNoIHdlIGhhdmVuJ3QgcmVwcm9kdWNlZFxuICAgICAgICBzcGF3blNhZmVTeW5jKFxuICAgICAgICAgIGB5YXJuYCxcbiAgICAgICAgICBbXCJpbnN0YWxsXCIsIFwiLS1pZ25vcmUtZW5naW5lc1wiLCBcIi0taWdub3JlLXNjcmlwdHNcIl0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY3dkOiB0bXBSZXBvTnBtUm9vdCxcbiAgICAgICAgICB9LFxuICAgICAgICApXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuaW5mbyhcbiAgICAgICAgY2hhbGsuZ3JleShcIuKAolwiKSxcbiAgICAgICAgYEluc3RhbGxpbmcgJHtwYWNrYWdlRGV0YWlscy5uYW1lfUAke3BhY2thZ2VWZXJzaW9ufSB3aXRoIG5wbWAsXG4gICAgICApXG4gICAgICB0cnkge1xuICAgICAgICAvLyB0cnkgZmlyc3Qgd2l0aG91dCBpZ25vcmluZyBzY3JpcHRzIGluIGNhc2UgdGhleSBhcmUgcmVxdWlyZWRcbiAgICAgICAgLy8gdGhpcyB3b3JrcyBpbiA5OS45OSUgb2YgY2FzZXNcbiAgICAgICAgc3Bhd25TYWZlU3luYyhgbnBtYCwgW1wiaVwiLCBcIi0tZm9yY2VcIl0sIHtcbiAgICAgICAgICBjd2Q6IHRtcFJlcG9OcG1Sb290LFxuICAgICAgICAgIGxvZ1N0ZEVyck9uRXJyb3I6IGZhbHNlLFxuICAgICAgICAgIHN0ZGlvOiBcImlnbm9yZVwiLFxuICAgICAgICB9KVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyB0cnkgYWdhaW4gd2hpbGUgaWdub3Jpbmcgc2NyaXB0cyBpbiBjYXNlIHRoZSBzY3JpcHQgZGVwZW5kcyBvblxuICAgICAgICAvLyBhbiBpbXBsaWNpdCBjb250ZXh0IHdoaWNoIHdlIGhhdmVuJ3QgcmVwcm9kdWNlZFxuICAgICAgICBzcGF3blNhZmVTeW5jKGBucG1gLCBbXCJpXCIsIFwiLS1pZ25vcmUtc2NyaXB0c1wiLCBcIi0tZm9yY2VcIl0sIHtcbiAgICAgICAgICBjd2Q6IHRtcFJlcG9OcG1Sb290LFxuICAgICAgICAgIHN0ZGlvOiBcImlnbm9yZVwiLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGdpdCA9ICguLi5hcmdzOiBzdHJpbmdbXSkgPT5cbiAgICAgIHNwYXduU2FmZVN5bmMoXCJnaXRcIiwgYXJncywge1xuICAgICAgICBjd2Q6IHRtcFJlcG8ubmFtZSxcbiAgICAgICAgZW52OiB7IC4uLnByb2Nlc3MuZW52LCBIT01FOiB0bXBSZXBvLm5hbWUgfSxcbiAgICAgICAgbWF4QnVmZmVyOiAxMDI0ICogMTAyNCAqIDEwMCxcbiAgICAgIH0pXG5cbiAgICAvLyByZW1vdmUgbmVzdGVkIG5vZGVfbW9kdWxlcyBqdXN0IHRvIGJlIHNhZmVcbiAgICByZW1vdmVTeW5jKGpvaW4odG1wUmVwb1BhY2thZ2VQYXRoLCBcIm5vZGVfbW9kdWxlc1wiKSlcbiAgICAvLyByZW1vdmUgLmdpdCBqdXN0IHRvIGJlIHNhZmVcbiAgICByZW1vdmVTeW5jKGpvaW4odG1wUmVwb1BhY2thZ2VQYXRoLCBcIi5naXRcIikpXG4gICAgLy8gcmVtb3ZlIHBhdGNoLXBhY2thZ2Ugc3RhdGUgZmlsZVxuICAgIHJlbW92ZVN5bmMoam9pbih0bXBSZXBvUGFja2FnZVBhdGgsIFNUQVRFX0ZJTEVfTkFNRSkpXG5cbiAgICAvLyBjb21taXQgdGhlIHBhY2thZ2VcbiAgICBjb25zb2xlLmluZm8oY2hhbGsuZ3JleShcIuKAolwiKSwgXCJEaWZmaW5nIHlvdXIgZmlsZXMgd2l0aCBjbGVhbiBmaWxlc1wiKVxuICAgIHdyaXRlRmlsZVN5bmMoam9pbih0bXBSZXBvLm5hbWUsIFwiLmdpdGlnbm9yZVwiKSwgXCIhL25vZGVfbW9kdWxlc1xcblxcblwiKVxuICAgIGdpdChcImluaXRcIilcbiAgICBnaXQoXCJjb25maWdcIiwgXCItLWxvY2FsXCIsIFwidXNlci5uYW1lXCIsIFwicGF0Y2gtcGFja2FnZVwiKVxuICAgIGdpdChcImNvbmZpZ1wiLCBcIi0tbG9jYWxcIiwgXCJ1c2VyLmVtYWlsXCIsIFwicGF0Y2hAcGFjay5hZ2VcIilcblxuICAgIC8vIHJlbW92ZSBpZ25vcmVkIGZpbGVzIGZpcnN0XG4gICAgcmVtb3ZlSWdub3JlZEZpbGVzKHRtcFJlcG9QYWNrYWdlUGF0aCwgaW5jbHVkZVBhdGhzLCBleGNsdWRlUGF0aHMpXG5cbiAgICBmb3IgKGNvbnN0IHBhdGNoRGV0YWlscyBvZiBwYXRjaGVzVG9BcHBseUJlZm9yZURpZmZpbmcpIHtcbiAgICAgIGlmIChcbiAgICAgICAgIWFwcGx5UGF0Y2goe1xuICAgICAgICAgIHBhdGNoRGV0YWlscyxcbiAgICAgICAgICBwYXRjaERpcixcbiAgICAgICAgICBwYXRjaEZpbGVQYXRoOiBqb2luKGFwcFBhdGgsIHBhdGNoRGlyLCBwYXRjaERldGFpbHMucGF0Y2hGaWxlbmFtZSksXG4gICAgICAgICAgcmV2ZXJzZTogZmFsc2UsXG4gICAgICAgICAgY3dkOiB0bXBSZXBvLm5hbWUsXG4gICAgICAgICAgYmVzdEVmZm9ydDogZmFsc2UsXG4gICAgICAgIH0pXG4gICAgICApIHtcbiAgICAgICAgLy8gVE9ETzogYWRkIGJldHRlciBlcnJvciBtZXNzYWdlIG9uY2UgLS1yZWJhc2UgaXMgaW1wbGVtZW50ZWRcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgYEZhaWxlZCB0byBhcHBseSBwYXRjaCAke3BhdGNoRGV0YWlscy5wYXRjaEZpbGVuYW1lfSB0byAke3BhY2thZ2VEZXRhaWxzLnBhdGhTcGVjaWZpZXJ9YCxcbiAgICAgICAgKVxuICAgICAgICBwcm9jZXNzLmV4aXQoMSlcbiAgICAgIH1cbiAgICB9XG4gICAgZ2l0KFwiYWRkXCIsIFwiLWZcIiwgcGFja2FnZURldGFpbHMucGF0aClcbiAgICBnaXQoXCJjb21taXRcIiwgXCItLWFsbG93LWVtcHR5XCIsIFwiLW1cIiwgXCJpbml0XCIpXG5cbiAgICAvLyByZXBsYWNlIHBhY2thZ2Ugd2l0aCB1c2VyJ3MgdmVyc2lvblxuICAgIHJlbW92ZVN5bmModG1wUmVwb1BhY2thZ2VQYXRoKVxuXG4gICAgLy8gcG5wbSBpbnN0YWxscyBwYWNrYWdlcyBhcyBzeW1saW5rcywgY29weVN5bmMgd291bGQgY29weSBvbmx5IHRoZSBzeW1saW5rXG4gICAgY29weVN5bmMocmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKSwgdG1wUmVwb1BhY2thZ2VQYXRoKVxuXG4gICAgLy8gcmVtb3ZlIG5lc3RlZCBub2RlX21vZHVsZXMganVzdCB0byBiZSBzYWZlXG4gICAgcmVtb3ZlU3luYyhqb2luKHRtcFJlcG9QYWNrYWdlUGF0aCwgXCJub2RlX21vZHVsZXNcIikpXG4gICAgLy8gcmVtb3ZlIC5naXQganVzdCB0byBiZSBzYWZlXG4gICAgcmVtb3ZlU3luYyhqb2luKHRtcFJlcG9QYWNrYWdlUGF0aCwgXCIuZ2l0XCIpKVxuICAgIC8vIHJlbW92ZSBwYXRjaC1wYWNrYWdlIHN0YXRlIGZpbGVcbiAgICByZW1vdmVTeW5jKGpvaW4odG1wUmVwb1BhY2thZ2VQYXRoLCBTVEFURV9GSUxFX05BTUUpKVxuXG4gICAgLy8gYWxzbyByZW1vdmUgaWdub3JlZCBmaWxlcyBsaWtlIGJlZm9yZVxuICAgIHJlbW92ZUlnbm9yZWRGaWxlcyh0bXBSZXBvUGFja2FnZVBhdGgsIGluY2x1ZGVQYXRocywgZXhjbHVkZVBhdGhzKVxuXG4gICAgLy8gc3RhZ2UgYWxsIGZpbGVzXG4gICAgZ2l0KFwiYWRkXCIsIFwiLWZcIiwgcGFja2FnZURldGFpbHMucGF0aClcblxuICAgIC8vIGdldCBkaWZmIG9mIGNoYW5nZXNcbiAgICBjb25zdCBkaWZmUmVzdWx0ID0gZ2l0KFxuICAgICAgXCJkaWZmXCIsXG4gICAgICBcIi0tY2FjaGVkXCIsXG4gICAgICBcIi0tbm8tY29sb3JcIixcbiAgICAgIFwiLS1pZ25vcmUtc3BhY2UtYXQtZW9sXCIsXG4gICAgICBcIi0tbm8tZXh0LWRpZmZcIixcbiAgICAgIFwiLS1zcmMtcHJlZml4PWEvXCIsXG4gICAgICBcIi0tZHN0LXByZWZpeD1iL1wiLFxuICAgIClcblxuICAgIGlmIChkaWZmUmVzdWx0LnN0ZG91dC5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBg4oGJ77iPICBOb3QgY3JlYXRpbmcgcGF0Y2ggZmlsZSBmb3IgcGFja2FnZSAnJHtwYWNrYWdlUGF0aFNwZWNpZmllcn0nYCxcbiAgICAgIClcbiAgICAgIGNvbnNvbGUubG9nKGDigYnvuI8gIFRoZXJlIGRvbid0IGFwcGVhciB0byBiZSBhbnkgY2hhbmdlcy5gKVxuICAgICAgaWYgKGlzUmViYXNpbmcgJiYgbW9kZS50eXBlID09PSBcIm92ZXJ3cml0ZV9sYXN0XCIpIHtcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgXCJcXG7wn5KhIFRvIHJlbW92ZSBhIHBhdGNoIGZpbGUsIGRlbGV0ZSBpdCBhbmQgdGhlbiByZWluc3RhbGwgbm9kZV9tb2R1bGVzIGZyb20gc2NyYXRjaC5cIixcbiAgICAgICAgKVxuICAgICAgfVxuICAgICAgcHJvY2Vzcy5leGl0KDEpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgcGFyc2VQYXRjaEZpbGUoZGlmZlJlc3VsdC5zdGRvdXQudG9TdHJpbmcoKSlcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIChlIGFzIEVycm9yKS5tZXNzYWdlLmluY2x1ZGVzKFwiVW5leHBlY3RlZCBmaWxlIG1vZGUgc3RyaW5nOiAxMjAwMDBcIilcbiAgICAgICkge1xuICAgICAgICBjb25zb2xlLmxvZyhgXG7im5TvuI8gJHtjaGFsay5yZWQuYm9sZChcIkVSUk9SXCIpfVxuXG4gIFlvdXIgY2hhbmdlcyBpbnZvbHZlIGNyZWF0aW5nIHN5bWxpbmtzLiBwYXRjaC1wYWNrYWdlIGRvZXMgbm90IHlldCBzdXBwb3J0XG4gIHN5bWxpbmtzLlxuICBcbiAg77iPUGxlYXNlIHVzZSAke2NoYWxrLmJvbGQoXCItLWluY2x1ZGVcIil9IGFuZC9vciAke2NoYWxrLmJvbGQoXG4gICAgICAgICAgXCItLWV4Y2x1ZGVcIixcbiAgICAgICAgKX0gdG8gbmFycm93IHRoZSBzY29wZSBvZiB5b3VyIHBhdGNoIGlmXG4gIHRoaXMgd2FzIHVuaW50ZW50aW9uYWwuXG5gKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb3V0UGF0aCA9IFwiLi9wYXRjaC1wYWNrYWdlLWVycm9yLmpzb24uZ3pcIlxuICAgICAgICB3cml0ZUZpbGVTeW5jKFxuICAgICAgICAgIG91dFBhdGgsXG4gICAgICAgICAgZ3ppcFN5bmMoXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpLFxuICAgICAgICAgICAgICAgIHN0YWNrOiBlIGluc3RhbmNlb2YgRXJyb3IgPyBlLnN0YWNrIDogXCJcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgcGF0Y2g6IGRpZmZSZXN1bHQuc3Rkb3V0LnRvU3RyaW5nKCksXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICApLFxuICAgICAgICApXG4gICAgICAgIGNvbnNvbGUubG9nKGBcbuKblO+4jyAke2NoYWxrLnJlZC5ib2xkKFwiRVJST1JcIil9XG4gICAgICAgIFxuICBwYXRjaC1wYWNrYWdlIHdhcyB1bmFibGUgdG8gcmVhZCB0aGUgcGF0Y2gtZmlsZSBtYWRlIGJ5IGdpdC4gVGhpcyBzaG91bGQgbm90XG4gIGhhcHBlbi5cbiAgXG4gIEEgZGlhZ25vc3RpYyBmaWxlIHdhcyB3cml0dGVuIHRvXG4gIFxuICAgICR7b3V0UGF0aH1cbiAgXG4gIFBsZWFzZSBhdHRhY2ggaXQgdG8gYSBnaXRodWIgaXNzdWVcbiAgXG4gICAgaHR0cHM6Ly9naXRodWIuY29tL2RzMzAwL3BhdGNoLXBhY2thZ2UvaXNzdWVzL25ldz90aXRsZT1OZXcrcGF0Y2grcGFyc2UrZmFpbGVkJmJvZHk9UGxlYXNlK2F0dGFjaCt0aGUrZGlhZ25vc3RpYytmaWxlK2J5K2RyYWdnaW5nK2l0K2ludG8raGVyZSvwn5mPXG4gIFxuICBOb3RlIHRoYXQgdGhpcyBkaWFnbm9zdGljIGZpbGUgd2lsbCBjb250YWluIGNvZGUgZnJvbSB0aGUgcGFja2FnZSB5b3Ugd2VyZVxuICBhdHRlbXB0aW5nIHRvIHBhdGNoLlxuXG5gKVxuICAgICAgfVxuICAgICAgcHJvY2Vzcy5leGl0KDEpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBtYXliZSBkZWxldGUgZXhpc3RpbmdcbiAgICBpZiAobW9kZS50eXBlID09PSBcImFwcGVuZFwiICYmICFpc1JlYmFzaW5nICYmIGV4aXN0aW5nUGF0Y2hlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIC8vIGlmIHdlIGFyZSBhcHBlbmRpbmcgdG8gYW4gZXhpc3RpbmcgcGF0Y2ggdGhhdCBkb2Vzbid0IGhhdmUgYSBzZXF1ZW5jZSBudW1iZXIgbGV0J3MgcmVuYW1lIGl0XG4gICAgICBjb25zdCBwcmV2UGF0Y2ggPSBleGlzdGluZ1BhdGNoZXNbMF1cbiAgICAgIGlmIChwcmV2UGF0Y2guc2VxdWVuY2VOdW1iZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCBuZXdGaWxlTmFtZSA9IGNyZWF0ZVBhdGNoRmlsZU5hbWUoe1xuICAgICAgICAgIHBhY2thZ2VEZXRhaWxzLFxuICAgICAgICAgIHBhY2thZ2VWZXJzaW9uLFxuICAgICAgICAgIHNlcXVlbmNlTnVtYmVyOiAxLFxuICAgICAgICAgIHNlcXVlbmNlTmFtZTogcHJldlBhdGNoLnNlcXVlbmNlTmFtZSA/PyBcImluaXRpYWxcIixcbiAgICAgICAgfSlcbiAgICAgICAgY29uc3Qgb2xkUGF0aCA9IGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIsIHByZXZQYXRjaC5wYXRjaEZpbGVuYW1lKVxuICAgICAgICBjb25zdCBuZXdQYXRoID0gam9pbihhcHBQYXRoLCBwYXRjaERpciwgbmV3RmlsZU5hbWUpXG4gICAgICAgIHJlbmFtZVN5bmMob2xkUGF0aCwgbmV3UGF0aClcbiAgICAgICAgcHJldlBhdGNoLnNlcXVlbmNlTnVtYmVyID0gMVxuICAgICAgICBwcmV2UGF0Y2gucGF0Y2hGaWxlbmFtZSA9IG5ld0ZpbGVOYW1lXG4gICAgICAgIHByZXZQYXRjaC5zZXF1ZW5jZU5hbWUgPSBwcmV2UGF0Y2guc2VxdWVuY2VOYW1lID8/IFwiaW5pdGlhbFwiXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbGFzdFBhdGNoID0gZXhpc3RpbmdQYXRjaGVzW1xuICAgICAgc3RhdGUgPyBzdGF0ZS5wYXRjaGVzLmxlbmd0aCAtIDEgOiBleGlzdGluZ1BhdGNoZXMubGVuZ3RoIC0gMVxuICAgIF0gYXMgUGF0Y2hlZFBhY2thZ2VEZXRhaWxzIHwgdW5kZWZpbmVkXG4gICAgY29uc3Qgc2VxdWVuY2VOYW1lID1cbiAgICAgIG1vZGUudHlwZSA9PT0gXCJhcHBlbmRcIiA/IG1vZGUubmFtZSA6IGxhc3RQYXRjaD8uc2VxdWVuY2VOYW1lXG4gICAgY29uc3Qgc2VxdWVuY2VOdW1iZXIgPVxuICAgICAgbW9kZS50eXBlID09PSBcImFwcGVuZFwiXG4gICAgICAgID8gKGxhc3RQYXRjaD8uc2VxdWVuY2VOdW1iZXIgPz8gMCkgKyAxXG4gICAgICAgIDogbGFzdFBhdGNoPy5zZXF1ZW5jZU51bWJlclxuXG4gICAgY29uc3QgcGF0Y2hGaWxlTmFtZSA9IGNyZWF0ZVBhdGNoRmlsZU5hbWUoe1xuICAgICAgcGFja2FnZURldGFpbHMsXG4gICAgICBwYWNrYWdlVmVyc2lvbixcbiAgICAgIHNlcXVlbmNlTmFtZSxcbiAgICAgIHNlcXVlbmNlTnVtYmVyLFxuICAgIH0pXG5cbiAgICBjb25zdCBwYXRjaFBhdGg6IHN0cmluZyA9IGpvaW4ocGF0Y2hlc0RpciwgcGF0Y2hGaWxlTmFtZSlcbiAgICBpZiAoIWV4aXN0c1N5bmMoZGlybmFtZShwYXRjaFBhdGgpKSkge1xuICAgICAgLy8gc2NvcGVkIHBhY2thZ2VcbiAgICAgIG1rZGlyU3luYyhkaXJuYW1lKHBhdGNoUGF0aCkpXG4gICAgfVxuXG4gICAgLy8gaWYgd2UgYXJlIGluc2VydGluZyBhIG5ldyBwYXRjaCBpbnRvIGEgc2VxdWVuY2Ugd2UgbW9zdCBsaWtlbHkgbmVlZCB0byB1cGRhdGUgdGhlIHNlcXVlbmNlIG51bWJlcnNcbiAgICBpZiAoaXNSZWJhc2luZyAmJiBtb2RlLnR5cGUgPT09IFwiYXBwZW5kXCIpIHtcbiAgICAgIGNvbnN0IHBhdGNoZXNUb051ZGdlID0gZXhpc3RpbmdQYXRjaGVzLnNsaWNlKHN0YXRlIS5wYXRjaGVzLmxlbmd0aClcbiAgICAgIGlmIChzZXF1ZW5jZU51bWJlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInNlcXVlbmNlTnVtYmVyIGlzIHVuZGVmaW5lZCB3aGlsZSByZWJhc2luZ1wiKVxuICAgICAgfVxuICAgICAgaWYgKFxuICAgICAgICBwYXRjaGVzVG9OdWRnZVswXT8uc2VxdWVuY2VOdW1iZXIgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICBwYXRjaGVzVG9OdWRnZVswXS5zZXF1ZW5jZU51bWJlciA8PSBzZXF1ZW5jZU51bWJlclxuICAgICAgKSB7XG4gICAgICAgIGxldCBuZXh0ID0gc2VxdWVuY2VOdW1iZXIgKyAxXG4gICAgICAgIGZvciAoY29uc3QgcCBvZiBwYXRjaGVzVG9OdWRnZSkge1xuICAgICAgICAgIGNvbnN0IG5ld05hbWUgPSBjcmVhdGVQYXRjaEZpbGVOYW1lKHtcbiAgICAgICAgICAgIHBhY2thZ2VEZXRhaWxzLFxuICAgICAgICAgICAgcGFja2FnZVZlcnNpb24sXG4gICAgICAgICAgICBzZXF1ZW5jZU5hbWU6IHAuc2VxdWVuY2VOYW1lLFxuICAgICAgICAgICAgc2VxdWVuY2VOdW1iZXI6IG5leHQrKyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgXCJSZW5hbWluZ1wiLFxuICAgICAgICAgICAgY2hhbGsuYm9sZChwLnBhdGNoRmlsZW5hbWUpLFxuICAgICAgICAgICAgXCJ0b1wiLFxuICAgICAgICAgICAgY2hhbGsuYm9sZChuZXdOYW1lKSxcbiAgICAgICAgICApXG4gICAgICAgICAgY29uc3Qgb2xkUGF0aCA9IGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIsIHAucGF0Y2hGaWxlbmFtZSlcbiAgICAgICAgICBjb25zdCBuZXdQYXRoID0gam9pbihhcHBQYXRoLCBwYXRjaERpciwgbmV3TmFtZSlcbiAgICAgICAgICByZW5hbWVTeW5jKG9sZFBhdGgsIG5ld1BhdGgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB3cml0ZUZpbGVTeW5jKHBhdGNoUGF0aCwgZGlmZlJlc3VsdC5zdGRvdXQpXG4gICAgY29uc29sZS5sb2coXG4gICAgICBgJHtjaGFsay5ncmVlbihcIuKclFwiKX0gQ3JlYXRlZCBmaWxlICR7am9pbihwYXRjaERpciwgcGF0Y2hGaWxlTmFtZSl9XFxuYCxcbiAgICApXG5cbiAgICBjb25zdCBwcmV2U3RhdGU6IFBhdGNoU3RhdGVbXSA9IHBhdGNoZXNUb0FwcGx5QmVmb3JlRGlmZmluZy5tYXAoXG4gICAgICAocCk6IFBhdGNoU3RhdGUgPT4gKHtcbiAgICAgICAgcGF0Y2hGaWxlbmFtZTogcC5wYXRjaEZpbGVuYW1lLFxuICAgICAgICBkaWRBcHBseTogdHJ1ZSxcbiAgICAgICAgcGF0Y2hDb250ZW50SGFzaDogaGFzaEZpbGUoam9pbihhcHBQYXRoLCBwYXRjaERpciwgcC5wYXRjaEZpbGVuYW1lKSksXG4gICAgICB9KSxcbiAgICApXG4gICAgY29uc3QgbmV4dFN0YXRlOiBQYXRjaFN0YXRlW10gPSBbXG4gICAgICAuLi5wcmV2U3RhdGUsXG4gICAgICB7XG4gICAgICAgIHBhdGNoRmlsZW5hbWU6IHBhdGNoRmlsZU5hbWUsXG4gICAgICAgIGRpZEFwcGx5OiB0cnVlLFxuICAgICAgICBwYXRjaENvbnRlbnRIYXNoOiBoYXNoRmlsZShwYXRjaFBhdGgpLFxuICAgICAgfSxcbiAgICBdXG5cbiAgICAvLyBpZiBhbnkgcGF0Y2hlcyBjb21lIGFmdGVyIHRoaXMgb25lIHdlIGp1c3QgbWFkZSwgd2Ugc2hvdWxkIHJlYXBwbHkgdGhlbVxuICAgIGxldCBkaWRGYWlsV2hpbGVGaW5pc2hpbmdSZWJhc2UgPSBmYWxzZVxuICAgIGlmIChpc1JlYmFzaW5nKSB7XG4gICAgICBjb25zdCBjdXJyZW50UGF0Y2hlcyA9IGdldEdyb3VwZWRQYXRjaGVzKGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIpKVxuICAgICAgICAucGF0aFNwZWNpZmllclRvUGF0Y2hGaWxlc1twYWNrYWdlRGV0YWlscy5wYXRoU3BlY2lmaWVyXVxuXG4gICAgICBjb25zdCBwcmV2aW91c2x5VW5hcHBsaWVkUGF0Y2hlcyA9IGN1cnJlbnRQYXRjaGVzLnNsaWNlKG5leHRTdGF0ZS5sZW5ndGgpXG4gICAgICBpZiAocHJldmlvdXNseVVuYXBwbGllZFBhdGNoZXMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBGYXN0IGZvcndhcmRpbmcuLi5gKVxuICAgICAgICBmb3IgKGNvbnN0IHBhdGNoIG9mIHByZXZpb3VzbHlVbmFwcGxpZWRQYXRjaGVzKSB7XG4gICAgICAgICAgY29uc3QgcGF0Y2hGaWxlUGF0aCA9IGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIsIHBhdGNoLnBhdGNoRmlsZW5hbWUpXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIWFwcGx5UGF0Y2goe1xuICAgICAgICAgICAgICBwYXRjaERldGFpbHM6IHBhdGNoLFxuICAgICAgICAgICAgICBwYXRjaERpcixcbiAgICAgICAgICAgICAgcGF0Y2hGaWxlUGF0aCxcbiAgICAgICAgICAgICAgcmV2ZXJzZTogZmFsc2UsXG4gICAgICAgICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgICAgICAgYmVzdEVmZm9ydDogZmFsc2UsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgZGlkRmFpbFdoaWxlRmluaXNoaW5nUmViYXNlID0gdHJ1ZVxuICAgICAgICAgICAgbG9nUGF0Y2hTZXF1ZW5jZUVycm9yKHsgcGF0Y2hEZXRhaWxzOiBwYXRjaCB9KVxuICAgICAgICAgICAgbmV4dFN0YXRlLnB1c2goe1xuICAgICAgICAgICAgICBwYXRjaEZpbGVuYW1lOiBwYXRjaC5wYXRjaEZpbGVuYW1lLFxuICAgICAgICAgICAgICBkaWRBcHBseTogZmFsc2UsXG4gICAgICAgICAgICAgIHBhdGNoQ29udGVudEhhc2g6IGhhc2hGaWxlKHBhdGNoRmlsZVBhdGgpLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICR7Y2hhbGsuZ3JlZW4oXCLinJRcIil9ICR7cGF0Y2gucGF0Y2hGaWxlbmFtZX1gKVxuICAgICAgICAgICAgbmV4dFN0YXRlLnB1c2goe1xuICAgICAgICAgICAgICBwYXRjaEZpbGVuYW1lOiBwYXRjaC5wYXRjaEZpbGVuYW1lLFxuICAgICAgICAgICAgICBkaWRBcHBseTogdHJ1ZSxcbiAgICAgICAgICAgICAgcGF0Y2hDb250ZW50SGFzaDogaGFzaEZpbGUocGF0Y2hGaWxlUGF0aCksXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc1JlYmFzaW5nIHx8IG51bVBhdGNoZXNBZnRlckNyZWF0ZSA+IDEpIHtcbiAgICAgIHNhdmVQYXRjaEFwcGxpY2F0aW9uU3RhdGUoe1xuICAgICAgICBwYWNrYWdlRGV0YWlscyxcbiAgICAgICAgcGF0Y2hlczogbmV4dFN0YXRlLFxuICAgICAgICBpc1JlYmFzaW5nOiBkaWRGYWlsV2hpbGVGaW5pc2hpbmdSZWJhc2UsXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBjbGVhclBhdGNoQXBwbGljYXRpb25TdGF0ZShwYWNrYWdlRGV0YWlscylcbiAgICB9XG5cbiAgICBpZiAoY2FuQ3JlYXRlSXNzdWUpIHtcbiAgICAgIGlmIChjcmVhdGVJc3N1ZSkge1xuICAgICAgICBvcGVuSXNzdWVDcmVhdGlvbkxpbmsoe1xuICAgICAgICAgIHBhY2thZ2VEZXRhaWxzLFxuICAgICAgICAgIHBhdGNoRmlsZUNvbnRlbnRzOiBkaWZmUmVzdWx0LnN0ZG91dC50b1N0cmluZygpLFxuICAgICAgICAgIHBhY2thZ2VWZXJzaW9uLFxuICAgICAgICAgIHBhdGNoUGF0aCxcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1heWJlUHJpbnRJc3N1ZUNyZWF0aW9uUHJvbXB0KHZjcywgcGFja2FnZURldGFpbHMsIHBhY2thZ2VNYW5hZ2VyKVxuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUubG9nKGUpXG4gICAgdGhyb3cgZVxuICB9IGZpbmFsbHkge1xuICAgIHRtcFJlcG8ucmVtb3ZlQ2FsbGJhY2soKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhdGNoRmlsZU5hbWUoe1xuICBwYWNrYWdlRGV0YWlscyxcbiAgcGFja2FnZVZlcnNpb24sXG4gIHNlcXVlbmNlTnVtYmVyLFxuICBzZXF1ZW5jZU5hbWUsXG59OiB7XG4gIHBhY2thZ2VEZXRhaWxzOiBQYWNrYWdlRGV0YWlsc1xuICBwYWNrYWdlVmVyc2lvbjogc3RyaW5nXG4gIHNlcXVlbmNlTnVtYmVyPzogbnVtYmVyXG4gIHNlcXVlbmNlTmFtZT86IHN0cmluZ1xufSkge1xuICBjb25zdCBwYWNrYWdlTmFtZXMgPSBwYWNrYWdlRGV0YWlscy5wYWNrYWdlTmFtZXNcbiAgICAubWFwKChuYW1lKSA9PiBuYW1lLnJlcGxhY2UoL1xcLy9nLCBcIitcIikpXG4gICAgLmpvaW4oXCIrK1wiKVxuXG4gIGNvbnN0IG5hbWVBbmRWZXJzaW9uID0gYCR7cGFja2FnZU5hbWVzfSske3BhY2thZ2VWZXJzaW9ufWBcbiAgY29uc3QgbnVtID1cbiAgICBzZXF1ZW5jZU51bWJlciA9PT0gdW5kZWZpbmVkXG4gICAgICA/IFwiXCJcbiAgICAgIDogYCske3NlcXVlbmNlTnVtYmVyLnRvU3RyaW5nKCkucGFkU3RhcnQoMywgXCIwXCIpfWBcbiAgY29uc3QgbmFtZSA9ICFzZXF1ZW5jZU5hbWUgPyBcIlwiIDogYCske3NlcXVlbmNlTmFtZX1gXG5cbiAgcmV0dXJuIGAke25hbWVBbmRWZXJzaW9ufSR7bnVtfSR7bmFtZX0ucGF0Y2hgXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2dQYXRjaFNlcXVlbmNlRXJyb3Ioe1xuICBwYXRjaERldGFpbHMsXG59OiB7XG4gIHBhdGNoRGV0YWlsczogUGF0Y2hlZFBhY2thZ2VEZXRhaWxzXG59KSB7XG4gIGNvbnNvbGUubG9nKGBcbiR7Y2hhbGsucmVkLmJvbGQoXCLim5QgRVJST1JcIil9XG5cbkZhaWxlZCB0byBhcHBseSBwYXRjaCBmaWxlICR7Y2hhbGsuYm9sZChwYXRjaERldGFpbHMucGF0Y2hGaWxlbmFtZSl9LlxuXG5JZiB0aGlzIHBhdGNoIGZpbGUgaXMgbm8gbG9uZ2VyIHVzZWZ1bCwgZGVsZXRlIGl0IGFuZCBydW5cblxuICAke2NoYWxrLmJvbGQoYHBhdGNoLXBhY2thZ2VgKX1cblxuVG8gcGFydGlhbGx5IGFwcGx5IHRoZSBwYXRjaCAoaWYgcG9zc2libGUpIGFuZCBvdXRwdXQgYSBsb2cgb2YgZXJyb3JzIHRvIGZpeCwgcnVuXG5cbiAgJHtjaGFsay5ib2xkKGBwYXRjaC1wYWNrYWdlIC0tcGFydGlhbGApfVxuXG5BZnRlciB3aGljaCB5b3Ugc2hvdWxkIG1ha2UgYW55IHJlcXVpcmVkIGNoYW5nZXMgaW5zaWRlICR7XG4gICAgcGF0Y2hEZXRhaWxzLnBhdGhcbiAgfSwgYW5kIGZpbmFsbHkgcnVuXG5cbiAgJHtjaGFsay5ib2xkKGBwYXRjaC1wYWNrYWdlICR7cGF0Y2hEZXRhaWxzLnBhdGhTcGVjaWZpZXJ9YCl9XG5cbnRvIHVwZGF0ZSB0aGUgcGF0Y2ggZmlsZS5cbmApXG59XG4iXX0=