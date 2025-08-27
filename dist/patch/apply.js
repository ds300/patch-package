"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeEffects = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = require("path");
const assertNever_1 = require("../assertNever");
const executeEffects = (effects, { dryRun, bestEffort, errors, cwd, }) => {
    const inCwd = (path) => (cwd ? (0, path_1.join)(cwd, path) : path);
    const humanReadable = (path) => (0, path_1.relative)(process.cwd(), inCwd(path));
    effects.forEach((eff) => {
        switch (eff.type) {
            case "file deletion":
                if (dryRun) {
                    if (!fs_extra_1.default.existsSync(inCwd(eff.path))) {
                        throw new Error("Trying to delete file that doesn't exist: " +
                            humanReadable(eff.path));
                    }
                }
                else {
                    // TODO: integrity checks
                    try {
                        fs_extra_1.default.unlinkSync(inCwd(eff.path));
                    }
                    catch (e) {
                        if (bestEffort) {
                            errors === null || errors === void 0 ? void 0 : errors.push(`Failed to delete file ${eff.path}`);
                        }
                        else {
                            throw e;
                        }
                    }
                }
                break;
            case "rename":
                if (dryRun) {
                    // TODO: see what patch files look like if moving to exising path
                    if (!fs_extra_1.default.existsSync(inCwd(eff.fromPath))) {
                        throw new Error("Trying to move file that doesn't exist: " +
                            humanReadable(eff.fromPath));
                    }
                }
                else {
                    try {
                        fs_extra_1.default.moveSync(inCwd(eff.fromPath), inCwd(eff.toPath));
                    }
                    catch (e) {
                        if (bestEffort) {
                            errors === null || errors === void 0 ? void 0 : errors.push(`Failed to rename file ${eff.fromPath} to ${eff.toPath}`);
                        }
                        else {
                            throw e;
                        }
                    }
                }
                break;
            case "file creation":
                if (dryRun) {
                    if (fs_extra_1.default.existsSync(inCwd(eff.path))) {
                        throw new Error("Trying to create file that already exists: " +
                            humanReadable(eff.path));
                    }
                    // todo: check file contents matches
                }
                else {
                    const fileContents = eff.hunk
                        ? eff.hunk.parts[0].lines.join("\n") +
                            (eff.hunk.parts[0].noNewlineAtEndOfFile ? "" : "\n")
                        : "";
                    const path = inCwd(eff.path);
                    try {
                        fs_extra_1.default.ensureDirSync((0, path_1.dirname)(path));
                        fs_extra_1.default.writeFileSync(path, fileContents, { mode: eff.mode });
                    }
                    catch (e) {
                        if (bestEffort) {
                            errors === null || errors === void 0 ? void 0 : errors.push(`Failed to create new file ${eff.path}`);
                        }
                        else {
                            throw e;
                        }
                    }
                }
                break;
            case "patch":
                applyPatch(eff, { dryRun, cwd, bestEffort, errors });
                break;
            case "mode change":
                const currentMode = fs_extra_1.default.statSync(inCwd(eff.path)).mode;
                if (((isExecutable(eff.newMode) && isExecutable(currentMode)) ||
                    (!isExecutable(eff.newMode) && !isExecutable(currentMode))) &&
                    dryRun) {
                    console.log(`Mode change is not required for file ${humanReadable(eff.path)}`);
                }
                fs_extra_1.default.chmodSync(inCwd(eff.path), eff.newMode);
                break;
            default:
                (0, assertNever_1.assertNever)(eff);
        }
    });
};
exports.executeEffects = executeEffects;
function isExecutable(fileMode) {
    // tslint:disable-next-line:no-bitwise
    return (fileMode & 64) > 0;
}
const trimRight = (s) => s.replace(/\s+$/, "");
function linesAreEqual(a, b) {
    return trimRight(a) === trimRight(b);
}
/**
 * How does noNewLineAtEndOfFile work?
 *
 * if you remove the newline from a file that had one without editing other bits:
 *
 *    it creates an insertion/removal pair where the insertion has \ No new line at end of file
 *
 * if you edit a file that didn't have a new line and don't add one:
 *
 *    both insertion and deletion have \ No new line at end of file
 *
 * if you edit a file that didn't have a new line and add one:
 *
 *    deletion has \ No new line at end of file
 *    but not insertion
 *
 * if you edit a file that had a new line and leave it in:
 *
 *    neither insetion nor deletion have the annoation
 *
 */
function applyPatch({ hunks, path }, { dryRun, cwd, bestEffort, errors, }) {
    path = cwd ? (0, path_1.resolve)(cwd, path) : path;
    // modifying the file in place
    const fileContents = fs_extra_1.default.readFileSync(path).toString();
    const mode = fs_extra_1.default.statSync(path).mode;
    const fileLines = fileContents.split(/\n/);
    const result = [];
    for (const hunk of hunks) {
        let fuzzingOffset = 0;
        while (true) {
            const modifications = evaluateHunk(hunk, fileLines, fuzzingOffset);
            if (modifications) {
                result.push(modifications);
                break;
            }
            fuzzingOffset =
                fuzzingOffset < 0 ? fuzzingOffset * -1 : fuzzingOffset * -1 - 1;
            if (Math.abs(fuzzingOffset) > 20) {
                const message = `Cannot apply hunk ${hunks.indexOf(hunk)} for file ${(0, path_1.relative)(process.cwd(), path)}\n\`\`\`diff\n${hunk.source}\n\`\`\`\n`;
                if (bestEffort) {
                    errors === null || errors === void 0 ? void 0 : errors.push(message);
                    break;
                }
                else {
                    throw new Error(message);
                }
            }
        }
    }
    if (dryRun) {
        return;
    }
    let diffOffset = 0;
    for (const modifications of result) {
        for (const modification of modifications) {
            switch (modification.type) {
                case "splice":
                    fileLines.splice(modification.index + diffOffset, modification.numToDelete, ...modification.linesToInsert);
                    diffOffset +=
                        modification.linesToInsert.length - modification.numToDelete;
                    break;
                case "pop":
                    fileLines.pop();
                    break;
                case "push":
                    fileLines.push(modification.line);
                    break;
                default:
                    (0, assertNever_1.assertNever)(modification);
            }
        }
    }
    try {
        fs_extra_1.default.writeFileSync(path, fileLines.join("\n"), { mode });
    }
    catch (e) {
        if (bestEffort) {
            errors === null || errors === void 0 ? void 0 : errors.push(`Failed to write file ${path}`);
        }
        else {
            throw e;
        }
    }
}
function evaluateHunk(hunk, fileLines, fuzzingOffset) {
    const result = [];
    let contextIndex = hunk.header.original.start - 1 + fuzzingOffset;
    // do bounds checks for index
    if (contextIndex < 0) {
        return null;
    }
    if (fileLines.length - contextIndex < hunk.header.original.length) {
        return null;
    }
    for (const part of hunk.parts) {
        switch (part.type) {
            case "deletion":
            case "context":
                for (const line of part.lines) {
                    const originalLine = fileLines[contextIndex];
                    if (!linesAreEqual(originalLine, line)) {
                        return null;
                    }
                    contextIndex++;
                }
                if (part.type === "deletion") {
                    result.push({
                        type: "splice",
                        index: contextIndex - part.lines.length,
                        numToDelete: part.lines.length,
                        linesToInsert: [],
                    });
                    if (part.noNewlineAtEndOfFile) {
                        result.push({
                            type: "push",
                            line: "",
                        });
                    }
                }
                break;
            case "insertion":
                result.push({
                    type: "splice",
                    index: contextIndex,
                    numToDelete: 0,
                    linesToInsert: part.lines,
                });
                if (part.noNewlineAtEndOfFile) {
                    result.push({ type: "pop" });
                }
                break;
            default:
                (0, assertNever_1.assertNever)(part.type);
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcGF0Y2gvYXBwbHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0RBQXlCO0FBQ3pCLCtCQUF1RDtBQUV2RCxnREFBNEM7QUFFckMsTUFBTSxjQUFjLEdBQUcsQ0FDNUIsT0FBd0IsRUFDeEIsRUFDRSxNQUFNLEVBQ04sVUFBVSxFQUNWLE1BQU0sRUFDTixHQUFHLEdBQ3VFLEVBQzVFLEVBQUU7SUFDRixNQUFNLEtBQUssR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUEsV0FBSSxFQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDOUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLElBQUEsZUFBUSxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUM1RSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDdEIsUUFBUSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakIsS0FBSyxlQUFlO2dCQUNsQixJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNYLElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDcEMsTUFBTSxJQUFJLEtBQUssQ0FDYiw0Q0FBNEM7NEJBQzFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQzFCLENBQUE7b0JBQ0gsQ0FBQztnQkFDSCxDQUFDO3FCQUFNLENBQUM7b0JBQ04seUJBQXlCO29CQUN6QixJQUFJLENBQUM7d0JBQ0gsa0JBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJ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LEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dCQUM5QixDQUFDO2dCQUNELE1BQUs7WUFDUDtnQkFDRSxJQUFBLHlCQUFXLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFCLENBQUM7SUFDSCxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUE7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gXCJmcy1leHRyYVwiXG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luLCByZWxhdGl2ZSwgcmVzb2x2ZSB9IGZyb20gXCJwYXRoXCJcbmltcG9ydCB7IFBhcnNlZFBhdGNoRmlsZSwgRmlsZVBhdGNoLCBIdW5rIH0gZnJvbSBcIi4vcGFyc2VcIlxuaW1wb3J0IHsgYXNzZXJ0TmV2ZXIgfSBmcm9tIFwiLi4vYXNzZXJ0TmV2ZXJcIlxuXG5leHBvcnQgY29uc3QgZXhlY3V0ZUVmZmVjdHMgPSAoXG4gIGVmZmVjdHM6IFBhcnNlZFBhdGNoRmlsZSxcbiAge1xuICAgIGRyeVJ1bixcbiAgICBiZXN0RWZmb3J0LFxuICAgIGVycm9ycyxcbiAgICBjd2QsXG4gIH06IHsgZHJ5UnVuOiBib29sZWFuOyBjd2Q/OiBzdHJpbmc7IGVycm9ycz86IHN0cmluZ1tdOyBiZXN0RWZmb3J0OiBib29sZWFuIH0sXG4pID0+IHtcbiAgY29uc3QgaW5Dd2QgPSAocGF0aDogc3RyaW5nKSA9PiAoY3dkID8gam9pbihjd2QsIHBhdGgpIDogcGF0aClcbiAgY29uc3QgaHVtYW5SZWFkYWJsZSA9IChwYXRoOiBzdHJpbmcpID0+IHJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGluQ3dkKHBhdGgpKVxuICBlZmZlY3RzLmZvckVhY2goKGVmZikgPT4ge1xuICAgIHN3aXRjaCAoZWZmLnR5cGUpIHtcbiAgICAgIGNhc2UgXCJmaWxlIGRlbGV0aW9uXCI6XG4gICAgICAgIGlmIChkcnlSdW4pIHtcbiAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5Dd2QoZWZmLnBhdGgpKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBcIlRyeWluZyB0byBkZWxldGUgZmlsZSB0aGF0IGRvZXNuJ3QgZXhpc3Q6IFwiICtcbiAgICAgICAgICAgICAgICBodW1hblJlYWRhYmxlKGVmZi5wYXRoKSxcbiAgICAgICAgICAgIClcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVE9ETzogaW50ZWdyaXR5IGNoZWNrc1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmcy51bmxpbmtTeW5jKGluQ3dkKGVmZi5wYXRoKSlcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoYmVzdEVmZm9ydCkge1xuICAgICAgICAgICAgICBlcnJvcnM/LnB1c2goYEZhaWxlZCB0byBkZWxldGUgZmlsZSAke2VmZi5wYXRofWApXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIFwicmVuYW1lXCI6XG4gICAgICAgIGlmIChkcnlSdW4pIHtcbiAgICAgICAgICAvLyBUT0RPOiBzZWUgd2hhdCBwYXRjaCBmaWxlcyBsb29rIGxpa2UgaWYgbW92aW5nIHRvIGV4aXNpbmcgcGF0aFxuICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhpbkN3ZChlZmYuZnJvbVBhdGgpKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBcIlRyeWluZyB0byBtb3ZlIGZpbGUgdGhhdCBkb2Vzbid0IGV4aXN0OiBcIiArXG4gICAgICAgICAgICAgICAgaHVtYW5SZWFkYWJsZShlZmYuZnJvbVBhdGgpLFxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZnMubW92ZVN5bmMoaW5Dd2QoZWZmLmZyb21QYXRoKSwgaW5Dd2QoZWZmLnRvUGF0aCkpXG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGJlc3RFZmZvcnQpIHtcbiAgICAgICAgICAgICAgZXJyb3JzPy5wdXNoKFxuICAgICAgICAgICAgICAgIGBGYWlsZWQgdG8gcmVuYW1lIGZpbGUgJHtlZmYuZnJvbVBhdGh9IHRvICR7ZWZmLnRvUGF0aH1gLFxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIFwiZmlsZSBjcmVhdGlvblwiOlxuICAgICAgICBpZiAoZHJ5UnVuKSB7XG4gICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoaW5Dd2QoZWZmLnBhdGgpKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBcIlRyeWluZyB0byBjcmVhdGUgZmlsZSB0aGF0IGFscmVhZHkgZXhpc3RzOiBcIiArXG4gICAgICAgICAgICAgICAgaHVtYW5SZWFkYWJsZShlZmYucGF0aCksXG4gICAgICAgICAgICApXG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHRvZG86IGNoZWNrIGZpbGUgY29udGVudHMgbWF0Y2hlc1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGZpbGVDb250ZW50cyA9IGVmZi5odW5rXG4gICAgICAgICAgICA/IGVmZi5odW5rLnBhcnRzWzBdLmxpbmVzLmpvaW4oXCJcXG5cIikgK1xuICAgICAgICAgICAgICAoZWZmLmh1bmsucGFydHNbMF0ubm9OZXdsaW5lQXRFbmRPZkZpbGUgPyBcIlwiIDogXCJcXG5cIilcbiAgICAgICAgICAgIDogXCJcIlxuICAgICAgICAgIGNvbnN0IHBhdGggPSBpbkN3ZChlZmYucGF0aClcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZnMuZW5zdXJlRGlyU3luYyhkaXJuYW1lKHBhdGgpKVxuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLCBmaWxlQ29udGVudHMsIHsgbW9kZTogZWZmLm1vZGUgfSlcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoYmVzdEVmZm9ydCkge1xuICAgICAgICAgICAgICBlcnJvcnM/LnB1c2goYEZhaWxlZCB0byBjcmVhdGUgbmV3IGZpbGUgJHtlZmYucGF0aH1gKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSBcInBhdGNoXCI6XG4gICAgICAgIGFwcGx5UGF0Y2goZWZmLCB7IGRyeVJ1biwgY3dkLCBiZXN0RWZmb3J0LCBlcnJvcnMgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgXCJtb2RlIGNoYW5nZVwiOlxuICAgICAgICBjb25zdCBjdXJyZW50TW9kZSA9IGZzLnN0YXRTeW5jKGluQ3dkKGVmZi5wYXRoKSkubW9kZVxuICAgICAgICBpZiAoXG4gICAgICAgICAgKChpc0V4ZWN1dGFibGUoZWZmLm5ld01vZGUpICYmIGlzRXhlY3V0YWJsZShjdXJyZW50TW9kZSkpIHx8XG4gICAgICAgICAgICAoIWlzRXhlY3V0YWJsZShlZmYubmV3TW9kZSkgJiYgIWlzRXhlY3V0YWJsZShjdXJyZW50TW9kZSkpKSAmJlxuICAgICAgICAgIGRyeVJ1blxuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgIGBNb2RlIGNoYW5nZSBpcyBub3QgcmVxdWlyZWQgZm9yIGZpbGUgJHtodW1hblJlYWRhYmxlKGVmZi5wYXRoKX1gLFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgICBmcy5jaG1vZFN5bmMoaW5Dd2QoZWZmLnBhdGgpLCBlZmYubmV3TW9kZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFzc2VydE5ldmVyKGVmZilcbiAgICB9XG4gIH0pXG59XG5cbmZ1bmN0aW9uIGlzRXhlY3V0YWJsZShmaWxlTW9kZTogbnVtYmVyKSB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iaXR3aXNlXG4gIHJldHVybiAoZmlsZU1vZGUgJiAwYjAwMV8wMDBfMDAwKSA+IDBcbn1cblxuY29uc3QgdHJpbVJpZ2h0ID0gKHM6IHN0cmluZykgPT4gcy5yZXBsYWNlKC9cXHMrJC8sIFwiXCIpXG5mdW5jdGlvbiBsaW5lc0FyZUVxdWFsKGE6IHN0cmluZywgYjogc3RyaW5nKSB7XG4gIHJldHVybiB0cmltUmlnaHQoYSkgPT09IHRyaW1SaWdodChiKVxufVxuXG4vKipcbiAqIEhvdyBkb2VzIG5vTmV3TGluZUF0RW5kT2ZGaWxlIHdvcms/XG4gKlxuICogaWYgeW91IHJlbW92ZSB0aGUgbmV3bGluZSBmcm9tIGEgZmlsZSB0aGF0IGhhZCBvbmUgd2l0aG91dCBlZGl0aW5nIG90aGVyIGJpdHM6XG4gKlxuICogICAgaXQgY3JlYXRlcyBhbiBpbnNlcnRpb24vcmVtb3ZhbCBwYWlyIHdoZXJlIHRoZSBpbnNlcnRpb24gaGFzIFxcIE5vIG5ldyBsaW5lIGF0IGVuZCBvZiBmaWxlXG4gKlxuICogaWYgeW91IGVkaXQgYSBmaWxlIHRoYXQgZGlkbid0IGhhdmUgYSBuZXcgbGluZSBhbmQgZG9uJ3QgYWRkIG9uZTpcbiAqXG4gKiAgICBib3RoIGluc2VydGlvbiBhbmQgZGVsZXRpb24gaGF2ZSBcXCBObyBuZXcgbGluZSBhdCBlbmQgb2YgZmlsZVxuICpcbiAqIGlmIHlvdSBlZGl0IGEgZmlsZSB0aGF0IGRpZG4ndCBoYXZlIGEgbmV3IGxpbmUgYW5kIGFkZCBvbmU6XG4gKlxuICogICAgZGVsZXRpb24gaGFzIFxcIE5vIG5ldyBsaW5lIGF0IGVuZCBvZiBmaWxlXG4gKiAgICBidXQgbm90IGluc2VydGlvblxuICpcbiAqIGlmIHlvdSBlZGl0IGEgZmlsZSB0aGF0IGhhZCBhIG5ldyBsaW5lIGFuZCBsZWF2ZSBpdCBpbjpcbiAqXG4gKiAgICBuZWl0aGVyIGluc2V0aW9uIG5vciBkZWxldGlvbiBoYXZlIHRoZSBhbm5vYXRpb25cbiAqXG4gKi9cblxuZnVuY3Rpb24gYXBwbHlQYXRjaChcbiAgeyBodW5rcywgcGF0aCB9OiBGaWxlUGF0Y2gsXG4gIHtcbiAgICBkcnlSdW4sXG4gICAgY3dkLFxuICAgIGJlc3RFZmZvcnQsXG4gICAgZXJyb3JzLFxuICB9OiB7IGRyeVJ1bjogYm9vbGVhbjsgY3dkPzogc3RyaW5nOyBiZXN0RWZmb3J0OiBib29sZWFuOyBlcnJvcnM/OiBzdHJpbmdbXSB9LFxuKTogdm9pZCB7XG4gIHBhdGggPSBjd2QgPyByZXNvbHZlKGN3ZCwgcGF0aCkgOiBwYXRoXG4gIC8vIG1vZGlmeWluZyB0aGUgZmlsZSBpbiBwbGFjZVxuICBjb25zdCBmaWxlQ29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMocGF0aCkudG9TdHJpbmcoKVxuICBjb25zdCBtb2RlID0gZnMuc3RhdFN5bmMocGF0aCkubW9kZVxuXG4gIGNvbnN0IGZpbGVMaW5lczogc3RyaW5nW10gPSBmaWxlQ29udGVudHMuc3BsaXQoL1xcbi8pXG5cbiAgY29uc3QgcmVzdWx0OiBNb2RpZmljYXRpb25bXVtdID0gW11cblxuICBmb3IgKGNvbnN0IGh1bmsgb2YgaHVua3MpIHtcbiAgICBsZXQgZnV6emluZ09mZnNldCA9IDBcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3QgbW9kaWZpY2F0aW9ucyA9IGV2YWx1YXRlSHVuayhodW5rLCBmaWxlTGluZXMsIGZ1enppbmdPZmZzZXQpXG4gICAgICBpZiAobW9kaWZpY2F0aW9ucykge1xuICAgICAgICByZXN1bHQucHVzaChtb2RpZmljYXRpb25zKVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBmdXp6aW5nT2Zmc2V0ID1cbiAgICAgICAgZnV6emluZ09mZnNldCA8IDAgPyBmdXp6aW5nT2Zmc2V0ICogLTEgOiBmdXp6aW5nT2Zmc2V0ICogLTEgLSAxXG5cbiAgICAgIGlmIChNYXRoLmFicyhmdXp6aW5nT2Zmc2V0KSA+IDIwKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgQ2Fubm90IGFwcGx5IGh1bmsgJHtodW5rcy5pbmRleE9mKFxuICAgICAgICAgIGh1bmssXG4gICAgICAgICl9IGZvciBmaWxlICR7cmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgcGF0aCl9XFxuXFxgXFxgXFxgZGlmZlxcbiR7XG4gICAgICAgICAgaHVuay5zb3VyY2VcbiAgICAgICAgfVxcblxcYFxcYFxcYFxcbmBcblxuICAgICAgICBpZiAoYmVzdEVmZm9ydCkge1xuICAgICAgICAgIGVycm9ycz8ucHVzaChtZXNzYWdlKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZHJ5UnVuKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBsZXQgZGlmZk9mZnNldCA9IDBcblxuICBmb3IgKGNvbnN0IG1vZGlmaWNhdGlvbnMgb2YgcmVzdWx0KSB7XG4gICAgZm9yIChjb25zdCBtb2RpZmljYXRpb24gb2YgbW9kaWZpY2F0aW9ucykge1xuICAgICAgc3dpdGNoIChtb2RpZmljYXRpb24udHlwZSkge1xuICAgICAgICBjYXNlIFwic3BsaWNlXCI6XG4gICAgICAgICAgZmlsZUxpbmVzLnNwbGljZShcbiAgICAgICAgICAgIG1vZGlmaWNhdGlvbi5pbmRleCArIGRpZmZPZmZzZXQsXG4gICAgICAgICAgICBtb2RpZmljYXRpb24ubnVtVG9EZWxldGUsXG4gICAgICAgICAgICAuLi5tb2RpZmljYXRpb24ubGluZXNUb0luc2VydCxcbiAgICAgICAgICApXG4gICAgICAgICAgZGlmZk9mZnNldCArPVxuICAgICAgICAgICAgbW9kaWZpY2F0aW9uLmxpbmVzVG9JbnNlcnQubGVuZ3RoIC0gbW9kaWZpY2F0aW9uLm51bVRvRGVsZXRlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSBcInBvcFwiOlxuICAgICAgICAgIGZpbGVMaW5lcy5wb3AoKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgXCJwdXNoXCI6XG4gICAgICAgICAgZmlsZUxpbmVzLnB1c2gobW9kaWZpY2F0aW9uLmxpbmUpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBhc3NlcnROZXZlcihtb2RpZmljYXRpb24pXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdHJ5IHtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGgsIGZpbGVMaW5lcy5qb2luKFwiXFxuXCIpLCB7IG1vZGUgfSlcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChiZXN0RWZmb3J0KSB7XG4gICAgICBlcnJvcnM/LnB1c2goYEZhaWxlZCB0byB3cml0ZSBmaWxlICR7cGF0aH1gKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlXG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBQdXNoIHtcbiAgdHlwZTogXCJwdXNoXCJcbiAgbGluZTogc3RyaW5nXG59XG5pbnRlcmZhY2UgUG9wIHtcbiAgdHlwZTogXCJwb3BcIlxufVxuaW50ZXJmYWNlIFNwbGljZSB7XG4gIHR5cGU6IFwic3BsaWNlXCJcbiAgaW5kZXg6IG51bWJlclxuICBudW1Ub0RlbGV0ZTogbnVtYmVyXG4gIGxpbmVzVG9JbnNlcnQ6IHN0cmluZ1tdXG59XG5cbnR5cGUgTW9kaWZpY2F0aW9uID0gUHVzaCB8IFBvcCB8IFNwbGljZVxuXG5mdW5jdGlvbiBldmFsdWF0ZUh1bmsoXG4gIGh1bms6IEh1bmssXG4gIGZpbGVMaW5lczogc3RyaW5nW10sXG4gIGZ1enppbmdPZmZzZXQ6IG51bWJlcixcbik6IE1vZGlmaWNhdGlvbltdIHwgbnVsbCB7XG4gIGNvbnN0IHJlc3VsdDogTW9kaWZpY2F0aW9uW10gPSBbXVxuICBsZXQgY29udGV4dEluZGV4ID0gaHVuay5oZWFkZXIub3JpZ2luYWwuc3RhcnQgLSAxICsgZnV6emluZ09mZnNldFxuICAvLyBkbyBib3VuZHMgY2hlY2tzIGZvciBpbmRleFxuICBpZiAoY29udGV4dEluZGV4IDwgMCkge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgaWYgKGZpbGVMaW5lcy5sZW5ndGggLSBjb250ZXh0SW5kZXggPCBodW5rLmhlYWRlci5vcmlnaW5hbC5sZW5ndGgpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgZm9yIChjb25zdCBwYXJ0IG9mIGh1bmsucGFydHMpIHtcbiAgICBzd2l0Y2ggKHBhcnQudHlwZSkge1xuICAgICAgY2FzZSBcImRlbGV0aW9uXCI6XG4gICAgICBjYXNlIFwiY29udGV4dFwiOlxuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgcGFydC5saW5lcykge1xuICAgICAgICAgIGNvbnN0IG9yaWdpbmFsTGluZSA9IGZpbGVMaW5lc1tjb250ZXh0SW5kZXhdXG4gICAgICAgICAgaWYgKCFsaW5lc0FyZUVxdWFsKG9yaWdpbmFsTGluZSwgbGluZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsXG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRleHRJbmRleCsrXG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGFydC50eXBlID09PSBcImRlbGV0aW9uXCIpIHtcbiAgICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgICB0eXBlOiBcInNwbGljZVwiLFxuICAgICAgICAgICAgaW5kZXg6IGNvbnRleHRJbmRleCAtIHBhcnQubGluZXMubGVuZ3RoLFxuICAgICAgICAgICAgbnVtVG9EZWxldGU6IHBhcnQubGluZXMubGVuZ3RoLFxuICAgICAgICAgICAgbGluZXNUb0luc2VydDogW10sXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIGlmIChwYXJ0Lm5vTmV3bGluZUF0RW5kT2ZGaWxlKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgICAgIHR5cGU6IFwicHVzaFwiLFxuICAgICAgICAgICAgICBsaW5lOiBcIlwiLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgXCJpbnNlcnRpb25cIjpcbiAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwic3BsaWNlXCIsXG4gICAgICAgICAgaW5kZXg6IGNvbnRleHRJbmRleCxcbiAgICAgICAgICBudW1Ub0RlbGV0ZTogMCxcbiAgICAgICAgICBsaW5lc1RvSW5zZXJ0OiBwYXJ0LmxpbmVzLFxuICAgICAgICB9KVxuICAgICAgICBpZiAocGFydC5ub05ld2xpbmVBdEVuZE9mRmlsZSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHsgdHlwZTogXCJwb3BcIiB9KVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhc3NlcnROZXZlcihwYXJ0LnR5cGUpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuIl19