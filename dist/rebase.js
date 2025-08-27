"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebase = rebase;
const chalk_1 = __importDefault(require("chalk"));
const path_1 = require("path");
const applyPatches_1 = require("./applyPatches");
const hash_1 = require("./hash");
const patchFs_1 = require("./patchFs");
const stateFile_1 = require("./stateFile");
function rebase({ appPath, patchDir, packagePathSpecifier, targetPatch, }) {
    const patchesDirectory = (0, path_1.join)(appPath, patchDir);
    const groupedPatches = (0, patchFs_1.getGroupedPatches)(patchesDirectory);
    if (groupedPatches.numPatchFiles === 0) {
        console.log(chalk_1.default.blueBright("No patch files found"));
        process.exit(1);
    }
    const packagePatches = groupedPatches.pathSpecifierToPatchFiles[packagePathSpecifier];
    if (!packagePatches) {
        console.log(chalk_1.default.blueBright("No patch files found for package"), packagePathSpecifier);
        process.exit(1);
    }
    const state = (0, stateFile_1.getPatchApplicationState)(packagePatches[0]);
    if (!state) {
        console.log(chalk_1.default.blueBright("No patch state found"), "Did you forget to run", chalk_1.default.bold("patch-package"), "(without arguments) first?");
        process.exit(1);
    }
    if (state.isRebasing) {
        console.log(chalk_1.default.blueBright("Already rebasing"), "Make changes to the files in", chalk_1.default.bold(packagePatches[0].path), "and then run `patch-package", packagePathSpecifier, "--continue` to", packagePatches.length === state.patches.length
            ? "append a patch file"
            : `update the ${packagePatches[packagePatches.length - 1].patchFilename} file`);
        console.log(`💡 To remove a broken patch file, delete it and reinstall node_modules`);
        process.exit(1);
    }
    if (state.patches.length !== packagePatches.length) {
        console.log(chalk_1.default.blueBright("Some patches have not been applied."), "Reinstall node_modules and try again.");
    }
    // check hashes
    (0, stateFile_1.verifyAppliedPatches)({ appPath, patchDir, state });
    if (targetPatch === "0") {
        // unapply all
        unApplyPatches({
            patches: packagePatches,
            appPath,
            patchDir,
        });
        (0, stateFile_1.savePatchApplicationState)({
            packageDetails: packagePatches[0],
            isRebasing: true,
            patches: [],
        });
        console.log(`
Make any changes you need inside ${chalk_1.default.bold(packagePatches[0].path)}

When you are done, run

  ${chalk_1.default.bold(`patch-package ${packagePathSpecifier} --append 'MyChangeDescription'`)}
  
to insert a new patch file.
`);
        return;
    }
    // find target patch
    const target = packagePatches.find((p) => {
        if (p.patchFilename === targetPatch) {
            return true;
        }
        if ((0, path_1.resolve)(process.cwd(), targetPatch) ===
            (0, path_1.join)(patchesDirectory, p.patchFilename)) {
            return true;
        }
        if (targetPatch === p.sequenceName) {
            return true;
        }
        const n = Number(targetPatch.replace(/^0+/g, ""));
        if (!isNaN(n) && n === p.sequenceNumber) {
            return true;
        }
        return false;
    });
    if (!target) {
        console.log(chalk_1.default.red("Could not find target patch file"), chalk_1.default.bold(targetPatch));
        console.log();
        console.log("The list of available patch files is:");
        packagePatches.forEach((p) => {
            console.log(`  - ${p.patchFilename}`);
        });
        process.exit(1);
    }
    const currentHash = (0, hash_1.hashFile)((0, path_1.join)(patchesDirectory, target.patchFilename));
    const prevApplication = state.patches.find((p) => p.patchContentHash === currentHash);
    if (!prevApplication) {
        console.log(chalk_1.default.red("Could not find previous application of patch file"), chalk_1.default.bold(target.patchFilename));
        console.log();
        console.log("You should reinstall node_modules and try again.");
        process.exit(1);
    }
    // ok, we are good to start undoing all the patches that were applied up to but not including the target patch
    const targetIdx = state.patches.indexOf(prevApplication);
    unApplyPatches({
        patches: packagePatches.slice(targetIdx + 1),
        appPath,
        patchDir,
    });
    (0, stateFile_1.savePatchApplicationState)({
        packageDetails: packagePatches[0],
        isRebasing: true,
        patches: packagePatches.slice(0, targetIdx + 1).map((p) => ({
            patchFilename: p.patchFilename,
            patchContentHash: (0, hash_1.hashFile)((0, path_1.join)(patchesDirectory, p.patchFilename)),
            didApply: true,
        })),
    });
    console.log(`
Make any changes you need inside ${chalk_1.default.bold(packagePatches[0].path)}

When you are done, do one of the following:

  To update ${chalk_1.default.bold(packagePatches[targetIdx].patchFilename)} run

    ${chalk_1.default.bold(`patch-package ${packagePathSpecifier}`)}
    
  To create a new patch file after ${chalk_1.default.bold(packagePatches[targetIdx].patchFilename)} run
  
    ${chalk_1.default.bold(`patch-package ${packagePathSpecifier} --append 'MyChangeDescription'`)}

  `);
}
function unApplyPatches({ patches, appPath, patchDir, }) {
    for (const patch of patches.slice().reverse()) {
        if (!(0, applyPatches_1.applyPatch)({
            patchFilePath: (0, path_1.join)(appPath, patchDir, patch.patchFilename),
            reverse: true,
            patchDetails: patch,
            patchDir,
            cwd: process.cwd(),
            bestEffort: false,
        })) {
            console.log(chalk_1.default.red("Failed to un-apply patch file"), chalk_1.default.bold(patch.patchFilename), "Try completely reinstalling node_modules.");
            process.exit(1);
        }
        console.log(chalk_1.default.cyan.bold("Un-applied"), patch.patchFilename);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmViYXNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3JlYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQVlBLHdCQW9MQztBQWhNRCxrREFBeUI7QUFDekIsK0JBQW9DO0FBQ3BDLGlEQUEyQztBQUMzQyxpQ0FBaUM7QUFFakMsdUNBQTZDO0FBQzdDLDJDQUlvQjtBQUVwQixTQUFnQixNQUFNLENBQUMsRUFDckIsT0FBTyxFQUNQLFFBQVEsRUFDUixvQkFBb0IsRUFDcEIsV0FBVyxHQU1aO0lBQ0MsTUFBTSxnQkFBZ0IsR0FBRyxJQUFBLFdBQUksRUFBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDaEQsTUFBTSxjQUFjLEdBQUcsSUFBQSwyQkFBaUIsRUFBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBRTFELElBQUksY0FBYyxDQUFDLGFBQWEsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakIsQ0FBQztJQUVELE1BQU0sY0FBYyxHQUNsQixjQUFjLENBQUMseUJBQXlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUNoRSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FDVCxlQUFLLENBQUMsVUFBVSxDQUFDLGtDQUFrQyxDQUFDLEVBQ3BELG9CQUFvQixDQUNyQixDQUFBO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBQSxvQ0FBd0IsRUFBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUV6RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWCxPQUFPLENBQUMsR0FBRyxDQUNULGVB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QUMsQ0FBQTtBQUNKLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxFQUN0QixPQUFPLEVBQ1AsT0FBTyxFQUNQLFFBQVEsR0FLVDtJQUNDLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7UUFDOUMsSUFDRSxDQUFDLElBQUEseUJBQVUsRUFBQztZQUNWLGFBQWEsRUFBRSxJQUFBLFdBQUksRUFBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQVc7WUFDckUsT0FBTyxFQUFFLElBQUk7WUFDYixZQUFZLEVBQUUsS0FBSztZQUNuQixRQUFRO1lBQ1IsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDbEIsVUFBVSxFQUFFLEtBQUs7U0FDbEIsQ0FBQyxFQUNGLENBQUM7WUFDRCxPQUFPLENBQUMsR0FBRyxDQUNULGVBQUssQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsRUFDMUMsZUFBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQy9CLDJDQUEyQyxDQUM1QyxDQUFBO1lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDakUsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSBcImNoYWxrXCJcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tIFwicGF0aFwiXG5pbXBvcnQgeyBhcHBseVBhdGNoIH0gZnJvbSBcIi4vYXBwbHlQYXRjaGVzXCJcbmltcG9ydCB7IGhhc2hGaWxlIH0gZnJvbSBcIi4vaGFzaFwiXG5pbXBvcnQgeyBQYXRjaGVkUGFja2FnZURldGFpbHMgfSBmcm9tIFwiLi9QYWNrYWdlRGV0YWlsc1wiXG5pbXBvcnQgeyBnZXRHcm91cGVkUGF0Y2hlcyB9IGZyb20gXCIuL3BhdGNoRnNcIlxuaW1wb3J0IHtcbiAgZ2V0UGF0Y2hBcHBsaWNhdGlvblN0YXRlLFxuICBzYXZlUGF0Y2hBcHBsaWNhdGlvblN0YXRlLFxuICB2ZXJpZnlBcHBsaWVkUGF0Y2hlcyxcbn0gZnJvbSBcIi4vc3RhdGVGaWxlXCJcblxuZXhwb3J0IGZ1bmN0aW9uIHJlYmFzZSh7XG4gIGFwcFBhdGgsXG4gIHBhdGNoRGlyLFxuICBwYWNrYWdlUGF0aFNwZWNpZmllcixcbiAgdGFyZ2V0UGF0Y2gsXG59OiB7XG4gIGFwcFBhdGg6IHN0cmluZ1xuICBwYXRjaERpcjogc3RyaW5nXG4gIHBhY2thZ2VQYXRoU3BlY2lmaWVyOiBzdHJpbmdcbiAgdGFyZ2V0UGF0Y2g6IHN0cmluZ1xufSk6IHZvaWQge1xuICBjb25zdCBwYXRjaGVzRGlyZWN0b3J5ID0gam9pbihhcHBQYXRoLCBwYXRjaERpcilcbiAgY29uc3QgZ3JvdXBlZFBhdGNoZXMgPSBnZXRHcm91cGVkUGF0Y2hlcyhwYXRjaGVzRGlyZWN0b3J5KVxuXG4gIGlmIChncm91cGVkUGF0Y2hlcy5udW1QYXRjaEZpbGVzID09PSAwKSB7XG4gICAgY29uc29sZS5sb2coY2hhbGsuYmx1ZUJyaWdodChcIk5vIHBhdGNoIGZpbGVzIGZvdW5kXCIpKVxuICAgIHByb2Nlc3MuZXhpdCgxKVxuICB9XG5cbiAgY29uc3QgcGFja2FnZVBhdGNoZXMgPVxuICAgIGdyb3VwZWRQYXRjaGVzLnBhdGhTcGVjaWZpZXJUb1BhdGNoRmlsZXNbcGFja2FnZVBhdGhTcGVjaWZpZXJdXG4gIGlmICghcGFja2FnZVBhdGNoZXMpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIGNoYWxrLmJsdWVCcmlnaHQoXCJObyBwYXRjaCBmaWxlcyBmb3VuZCBmb3IgcGFja2FnZVwiKSxcbiAgICAgIHBhY2thZ2VQYXRoU3BlY2lmaWVyLFxuICAgIClcbiAgICBwcm9jZXNzLmV4aXQoMSlcbiAgfVxuXG4gIGNvbnN0IHN0YXRlID0gZ2V0UGF0Y2hBcHBsaWNhdGlvblN0YXRlKHBhY2thZ2VQYXRjaGVzWzBdKVxuXG4gIGlmICghc3RhdGUpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIGNoYWxrLmJsdWVCcmlnaHQoXCJObyBwYXRjaCBzdGF0ZSBmb3VuZFwiKSxcbiAgICAgIFwiRGlkIHlvdSBmb3JnZXQgdG8gcnVuXCIsXG4gICAgICBjaGFsay5ib2xkKFwicGF0Y2gtcGFja2FnZVwiKSxcbiAgICAgIFwiKHdpdGhvdXQgYXJndW1lbnRzKSBmaXJzdD9cIixcbiAgICApXG4gICAgcHJvY2Vzcy5leGl0KDEpXG4gIH1cbiAgaWYgKHN0YXRlLmlzUmViYXNpbmcpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIGNoYWxrLmJsdWVCcmlnaHQoXCJBbHJlYWR5IHJlYmFzaW5nXCIpLFxuICAgICAgXCJNYWtlIGNoYW5nZXMgdG8gdGhlIGZpbGVzIGluXCIsXG4gICAgICBjaGFsay5ib2xkKHBhY2thZ2VQYXRjaGVzWzBdLnBhdGgpLFxuICAgICAgXCJhbmQgdGhlbiBydW4gYHBhdGNoLXBhY2thZ2VcIixcbiAgICAgIHBhY2thZ2VQYXRoU3BlY2lmaWVyLFxuICAgICAgXCItLWNvbnRpbnVlYCB0b1wiLFxuICAgICAgcGFja2FnZVBhdGNoZXMubGVuZ3RoID09PSBzdGF0ZS5wYXRjaGVzLmxlbmd0aFxuICAgICAgICA/IFwiYXBwZW5kIGEgcGF0Y2ggZmlsZVwiXG4gICAgICAgIDogYHVwZGF0ZSB0aGUgJHtcbiAgICAgICAgICAgIHBhY2thZ2VQYXRjaGVzW3BhY2thZ2VQYXRjaGVzLmxlbmd0aCAtIDFdLnBhdGNoRmlsZW5hbWVcbiAgICAgICAgICB9IGZpbGVgLFxuICAgIClcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIGDwn5KhIFRvIHJlbW92ZSBhIGJyb2tlbiBwYXRjaCBmaWxlLCBkZWxldGUgaXQgYW5kIHJlaW5zdGFsbCBub2RlX21vZHVsZXNgLFxuICAgIClcbiAgICBwcm9jZXNzLmV4aXQoMSlcbiAgfVxuICBpZiAoc3RhdGUucGF0Y2hlcy5sZW5ndGggIT09IHBhY2thZ2VQYXRjaGVzLmxlbmd0aCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgY2hhbGsuYmx1ZUJyaWdodChcIlNvbWUgcGF0Y2hlcyBoYXZlIG5vdCBiZWVuIGFwcGxpZWQuXCIpLFxuICAgICAgXCJSZWluc3RhbGwgbm9kZV9tb2R1bGVzIGFuZCB0cnkgYWdhaW4uXCIsXG4gICAgKVxuICB9XG4gIC8vIGNoZWNrIGhhc2hlc1xuICB2ZXJpZnlBcHBsaWVkUGF0Y2hlcyh7IGFwcFBhdGgsIHBhdGNoRGlyLCBzdGF0ZSB9KVxuXG4gIGlmICh0YXJnZXRQYXRjaCA9PT0gXCIwXCIpIHtcbiAgICAvLyB1bmFwcGx5IGFsbFxuICAgIHVuQXBwbHlQYXRjaGVzKHtcbiAgICAgIHBhdGNoZXM6IHBhY2thZ2VQYXRjaGVzLFxuICAgICAgYXBwUGF0aCxcbiAgICAgIHBhdGNoRGlyLFxuICAgIH0pXG4gICAgc2F2ZVBhdGNoQXBwbGljYXRpb25TdGF0ZSh7XG4gICAgICBwYWNrYWdlRGV0YWlsczogcGFja2FnZVBhdGNoZXNbMF0sXG4gICAgICBpc1JlYmFzaW5nOiB0cnVlLFxuICAgICAgcGF0Y2hlczogW10sXG4gICAgfSlcbiAgICBjb25zb2xlLmxvZyhgXG5NYWtlIGFueSBjaGFuZ2VzIHlvdSBuZWVkIGluc2lkZSAke2NoYWxrLmJvbGQocGFja2FnZVBhdGNoZXNbMF0ucGF0aCl9XG5cbldoZW4geW91IGFyZSBkb25lLCBydW5cblxuICAke2NoYWxrLmJvbGQoXG4gICAgYHBhdGNoLXBhY2thZ2UgJHtwYWNrYWdlUGF0aFNwZWNpZmllcn0gLS1hcHBlbmQgJ015Q2hhbmdlRGVzY3JpcHRpb24nYCxcbiAgKX1cbiAgXG50byBpbnNlcnQgYSBuZXcgcGF0Y2ggZmlsZS5cbmApXG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyBmaW5kIHRhcmdldCBwYXRjaFxuICBjb25zdCB0YXJnZXQgPSBwYWNrYWdlUGF0Y2hlcy5maW5kKChwKSA9PiB7XG4gICAgaWYgKHAucGF0Y2hGaWxlbmFtZSA9PT0gdGFyZ2V0UGF0Y2gpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIGlmIChcbiAgICAgIHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgdGFyZ2V0UGF0Y2gpID09PVxuICAgICAgam9pbihwYXRjaGVzRGlyZWN0b3J5LCBwLnBhdGNoRmlsZW5hbWUpXG4gICAgKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cblxuICAgIGlmICh0YXJnZXRQYXRjaCA9PT0gcC5zZXF1ZW5jZU5hbWUpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIGNvbnN0IG4gPSBOdW1iZXIodGFyZ2V0UGF0Y2gucmVwbGFjZSgvXjArL2csIFwiXCIpKVxuICAgIGlmICghaXNOYU4obikgJiYgbiA9PT0gcC5zZXF1ZW5jZU51bWJlcikge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG5cbiAgaWYgKCF0YXJnZXQpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIGNoYWxrLnJlZChcIkNvdWxkIG5vdCBmaW5kIHRhcmdldCBwYXRjaCBmaWxlXCIpLFxuICAgICAgY2hhbGsuYm9sZCh0YXJnZXRQYXRjaCksXG4gICAgKVxuICAgIGNvbnNvbGUubG9nKClcbiAgICBjb25zb2xlLmxvZyhcIlRoZSBsaXN0IG9mIGF2YWlsYWJsZSBwYXRjaCBmaWxlcyBpczpcIilcbiAgICBwYWNrYWdlUGF0Y2hlcy5mb3JFYWNoKChwKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhgICAtICR7cC5wYXRjaEZpbGVuYW1lfWApXG4gICAgfSlcblxuICAgIHByb2Nlc3MuZXhpdCgxKVxuICB9XG4gIGNvbnN0IGN1cnJlbnRIYXNoID0gaGFzaEZpbGUoam9pbihwYXRjaGVzRGlyZWN0b3J5LCB0YXJnZXQucGF0Y2hGaWxlbmFtZSkpXG5cbiAgY29uc3QgcHJldkFwcGxpY2F0aW9uID0gc3RhdGUucGF0Y2hlcy5maW5kKFxuICAgIChwKSA9PiBwLnBhdGNoQ29udGVudEhhc2ggPT09IGN1cnJlbnRIYXNoLFxuICApXG4gIGlmICghcHJldkFwcGxpY2F0aW9uKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICBjaGFsay5yZWQoXCJDb3VsZCBub3QgZmluZCBwcmV2aW91cyBhcHBsaWNhdGlvbiBvZiBwYXRjaCBmaWxlXCIpLFxuICAgICAgY2hhbGsuYm9sZCh0YXJnZXQucGF0Y2hGaWxlbmFtZSksXG4gICAgKVxuICAgIGNvbnNvbGUubG9nKClcbiAgICBjb25zb2xlLmxvZyhcIllvdSBzaG91bGQgcmVpbnN0YWxsIG5vZGVfbW9kdWxlcyBhbmQgdHJ5IGFnYWluLlwiKVxuICAgIHByb2Nlc3MuZXhpdCgxKVxuICB9XG5cbiAgLy8gb2ssIHdlIGFyZSBnb29kIHRvIHN0YXJ0IHVuZG9pbmcgYWxsIHRoZSBwYXRjaGVzIHRoYXQgd2VyZSBhcHBsaWVkIHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSB0YXJnZXQgcGF0Y2hcbiAgY29uc3QgdGFyZ2V0SWR4ID0gc3RhdGUucGF0Y2hlcy5pbmRleE9mKHByZXZBcHBsaWNhdGlvbilcblxuICB1bkFwcGx5UGF0Y2hlcyh7XG4gICAgcGF0Y2hlczogcGFja2FnZVBhdGNoZXMuc2xpY2UodGFyZ2V0SWR4ICsgMSksXG4gICAgYXBwUGF0aCxcbiAgICBwYXRjaERpcixcbiAgfSlcbiAgc2F2ZVBhdGNoQXBwbGljYXRpb25TdGF0ZSh7XG4gICAgcGFja2FnZURldGFpbHM6IHBhY2thZ2VQYXRjaGVzWzBdLFxuICAgIGlzUmViYXNpbmc6IHRydWUsXG4gICAgcGF0Y2hlczogcGFja2FnZVBhdGNoZXMuc2xpY2UoMCwgdGFyZ2V0SWR4ICsgMSkubWFwKChwKSA9PiAoe1xuICAgICAgcGF0Y2hGaWxlbmFtZTogcC5wYXRjaEZpbGVuYW1lLFxuICAgICAgcGF0Y2hDb250ZW50SGFzaDogaGFzaEZpbGUoam9pbihwYXRjaGVzRGlyZWN0b3J5LCBwLnBhdGNoRmlsZW5hbWUpKSxcbiAgICAgIGRpZEFwcGx5OiB0cnVlLFxuICAgIH0pKSxcbiAgfSlcblxuICBjb25zb2xlLmxvZyhgXG5NYWtlIGFueSBjaGFuZ2VzIHlvdSBuZWVkIGluc2lkZSAke2NoYWxrLmJvbGQocGFja2FnZVBhdGNoZXNbMF0ucGF0aCl9XG5cbldoZW4geW91IGFyZSBkb25lLCBkbyBvbmUgb2YgdGhlIGZvbGxvd2luZzpcblxuICBUbyB1cGRhdGUgJHtjaGFsay5ib2xkKHBhY2thZ2VQYXRjaGVzW3RhcmdldElkeF0ucGF0Y2hGaWxlbmFtZSl9IHJ1blxuXG4gICAgJHtjaGFsay5ib2xkKGBwYXRjaC1wYWNrYWdlICR7cGFja2FnZVBhdGhTcGVjaWZpZXJ9YCl9XG4gICAgXG4gIFRvIGNyZWF0ZSBhIG5ldyBwYXRjaCBmaWxlIGFmdGVyICR7Y2hhbGsuYm9sZChcbiAgICBwYWNrYWdlUGF0Y2hlc1t0YXJnZXRJZHhdLnBhdGNoRmlsZW5hbWUsXG4gICl9IHJ1blxuICBcbiAgICAke2NoYWxrLmJvbGQoXG4gICAgICBgcGF0Y2gtcGFja2FnZSAke3BhY2thZ2VQYXRoU3BlY2lmaWVyfSAtLWFwcGVuZCAnTXlDaGFuZ2VEZXNjcmlwdGlvbidgLFxuICAgICl9XG5cbiAgYClcbn1cblxuZnVuY3Rpb24gdW5BcHBseVBhdGNoZXMoe1xuICBwYXRjaGVzLFxuICBhcHBQYXRoLFxuICBwYXRjaERpcixcbn06IHtcbiAgcGF0Y2hlczogUGF0Y2hlZFBhY2thZ2VEZXRhaWxzW11cbiAgYXBwUGF0aDogc3RyaW5nXG4gIHBhdGNoRGlyOiBzdHJpbmdcbn0pIHtcbiAgZm9yIChjb25zdCBwYXRjaCBvZiBwYXRjaGVzLnNsaWNlKCkucmV2ZXJzZSgpKSB7XG4gICAgaWYgKFxuICAgICAgIWFwcGx5UGF0Y2goe1xuICAgICAgICBwYXRjaEZpbGVQYXRoOiBqb2luKGFwcFBhdGgsIHBhdGNoRGlyLCBwYXRjaC5wYXRjaEZpbGVuYW1lKSBhcyBzdHJpbmcsXG4gICAgICAgIHJldmVyc2U6IHRydWUsXG4gICAgICAgIHBhdGNoRGV0YWlsczogcGF0Y2gsXG4gICAgICAgIHBhdGNoRGlyLFxuICAgICAgICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gICAgICAgIGJlc3RFZmZvcnQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICApIHtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBjaGFsay5yZWQoXCJGYWlsZWQgdG8gdW4tYXBwbHkgcGF0Y2ggZmlsZVwiKSxcbiAgICAgICAgY2hhbGsuYm9sZChwYXRjaC5wYXRjaEZpbGVuYW1lKSxcbiAgICAgICAgXCJUcnkgY29tcGxldGVseSByZWluc3RhbGxpbmcgbm9kZV9tb2R1bGVzLlwiLFxuICAgICAgKVxuICAgICAgcHJvY2Vzcy5leGl0KDEpXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGNoYWxrLmN5YW4uYm9sZChcIlVuLWFwcGxpZWRcIiksIHBhdGNoLnBhdGNoRmlsZW5hbWUpXG4gIH1cbn1cbiJdfQ==