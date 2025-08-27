"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXECUTABLE_FILE_MODE = exports.NON_EXECUTABLE_FILE_MODE = exports.parseHunkHeaderLine = void 0;
exports.interpretParsedPatchFile = interpretParsedPatchFile;
exports.parsePatchFile = parsePatchFile;
exports.verifyHunkIntegrity = verifyHunkIntegrity;
const assertNever_1 = require("../assertNever");
const parseHunkHeaderLine = (headerLine) => {
    const match = headerLine
        .trim()
        .match(/^@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@.*/);
    if (!match) {
        throw new Error(`Bad header line: '${headerLine}'`);
    }
    return {
        original: {
            start: Math.max(Number(match[1]), 1),
            length: Number(match[3] || 1),
        },
        patched: {
            start: Math.max(Number(match[4]), 1),
            length: Number(match[6] || 1),
        },
    };
};
exports.parseHunkHeaderLine = parseHunkHeaderLine;
exports.NON_EXECUTABLE_FILE_MODE = 0o644;
exports.EXECUTABLE_FILE_MODE = 0o755;
const emptyFilePatch = () => ({
    diffLineFromPath: null,
    diffLineToPath: null,
    oldMode: null,
    newMode: null,
    deletedFileMode: null,
    newFileMode: null,
    renameFrom: null,
    renameTo: null,
    beforeHash: null,
    afterHash: null,
    fromPath: null,
    toPath: null,
    hunks: null,
});
const emptyHunk = (headerLine) => ({
    header: (0, exports.parseHunkHeaderLine)(headerLine),
    parts: [],
    source: "",
});
const hunkLinetypes = {
    "@": "header",
    "-": "deletion",
    "+": "insertion",
    " ": "context",
    "\\": "pragma",
    // Treat blank lines as context
    undefined: "context",
    "\r": "context",
};
function parsePatchLines(lines, { supportLegacyDiffs }) {
    const result = [];
    let currentFilePatch = emptyFilePatch();
    let state = "parsing header";
    let currentHunk = null;
    let currentHunkMutationPart = null;
    let hunkStartLineIndex = 0;
    function commitHunk(i) {
        if (currentHunk) {
            if (currentHunkMutationPart) {
                currentHunk.parts.push(currentHunkMutationPart);
                currentHunkMutationPart = null;
            }
            currentHunk.source = lines.slice(hunkStartLineIndex, i).join("\n");
            currentFilePatch.hunks.push(currentHunk);
            currentHunk = null;
        }
    }
    function commitFilePatch(i) {
        commitHunk(i);
        result.push(currentFilePatch);
        currentFilePatch = emptyFilePatch();
    }
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (state === "parsing header") {
            if (line.startsWith("@@")) {
                hunkStartLineIndex = i;
                state = "parsing hunks";
                currentFilePatch.hunks = [];
                i--;
            }
            else if (line.startsWith("diff --git ")) {
                if (currentFilePatch && currentFilePatch.diffLineFromPath) {
                    commitFilePatch(i);
                }
                const match = line.match(/^diff --git a\/(.*?) b\/(.*?)\s*$/);
                if (!match) {
                    throw new Error("Bad diff line: " + line);
                }
                currentFilePatch.diffLineFromPath = match[1];
                currentFilePatch.diffLineToPath = match[2];
            }
            else if (line.startsWith("old mode ")) {
                currentFilePatch.oldMode = line.slice("old mode ".length).trim();
            }
            else if (line.startsWith("new mode ")) {
                currentFilePatch.newMode = line.slice("new mode ".length).trim();
            }
            else if (line.startsWith("deleted file mode ")) {
                currentFilePatch.deletedFileMode = line
                    .slice("deleted file mode ".length)
                    .trim();
            }
            else if (line.startsWith("new file mode ")) {
                currentFilePatch.newFileMode = line
                    .slice("new file mode ".length)
                    .trim();
            }
            else if (line.startsWith("rename from ")) {
                currentFilePatch.renameFrom = line.slice("rename from ".length).trim();
            }
            else if (line.startsWith("rename to ")) {
                currentFilePatch.renameTo = line.slice("rename to ".length).trim();
            }
            else if (line.startsWith("index ")) {
                const match = line.match(/(\w+)\.\.(\w+)/);
                if (!match) {
                    continue;
                }
                currentFilePatch.beforeHash = match[1];
                currentFilePatch.afterHash = match[2];
            }
            else if (line.startsWith("--- ")) {
                currentFilePatch.fromPath = line.slice("--- a/".length).trim();
            }
            else if (line.startsWith("+++ ")) {
                currentFilePatch.toPath = line.slice("+++ b/".length).trim();
            }
        }
        else {
            if (supportLegacyDiffs && line.startsWith("--- a/")) {
                state = "parsing header";
                commitFilePatch(i);
                i--;
                continue;
            }
            // parsing hunks
            const lineType = hunkLinetypes[line[0]] || null;
            switch (lineType) {
                case "header":
                    commitHunk(i);
                    currentHunk = emptyHunk(line);
                    break;
                case null:
                    // unrecognized, bail out
                    state = "parsing header";
                    commitFilePatch(i);
                    i--;
                    break;
                case "pragma":
                    if (!line.startsWith("\\ No newline at end of file")) {
                        throw new Error("Unrecognized pragma in patch file: " + line);
                    }
                    if (!currentHunkMutationPart) {
                        throw new Error("Bad parser state: No newline at EOF pragma encountered without context");
                    }
                    currentHunkMutationPart.noNewlineAtEndOfFile = true;
                    break;
                case "insertion":
                case "deletion":
                case "context":
                    if (!currentHunk) {
                        throw new Error("Bad parser state: Hunk lines encountered before hunk header");
                    }
                    if (currentHunkMutationPart &&
                        currentHunkMutationPart.type !== lineType) {
                        currentHunk.parts.push(currentHunkMutationPart);
                        currentHunkMutationPart = null;
                    }
                    if (!currentHunkMutationPart) {
                        currentHunkMutationPart = {
                            type: lineType,
                            lines: [],
                            noNewlineAtEndOfFile: false,
                        };
                    }
                    currentHunkMutationPart.lines.push(line.slice(1));
                    break;
                default:
                    // exhausitveness check
                    (0, assertNever_1.assertNever)(lineType);
            }
        }
    }
    commitFilePatch(lines.length);
    for (const { hunks } of result) {
        if (hunks) {
            for (const hunk of hunks) {
                verifyHunkIntegrity(hunk);
            }
        }
    }
    return result;
}
function interpretParsedPatchFile(files) {
    const result = [];
    for (const file of files) {
        const { diffLineFromPath, diffLineToPath, oldMode, newMode, deletedFileMode, newFileMode, renameFrom, renameTo, beforeHash, afterHash, fromPath, toPath, hunks, } = file;
        const type = renameFrom
            ? "rename"
            : deletedFileMode
                ? "file deletion"
                : newFileMode
                    ? "file creation"
                    : hunks && hunks.length > 0
                        ? "patch"
                        : "mode change";
        let destinationFilePath = null;
        switch (type) {
            case "rename":
                if (!renameFrom || !renameTo) {
                    throw new Error("Bad parser state: rename from & to not given");
                }
                result.push({
                    type: "rename",
                    fromPath: renameFrom,
                    toPath: renameTo,
                });
                destinationFilePath = renameTo;
                break;
            case "file deletion": {
                const path = diffLineFromPath || fromPath;
                if (!path) {
                    throw new Error("Bad parse state: no path given for file deletion");
                }
                result.push({
                    type: "file deletion",
                    hunk: (hunks && hunks[0]) || null,
                    path,
                    mode: parseFileMode(deletedFileMode),
                    hash: beforeHash,
                });
                break;
            }
            case "file creation": {
                const path = diffLineToPath || toPath;
                if (!path) {
                    throw new Error("Bad parse state: no path given for file creation");
                }
                result.push({
                    type: "file creation",
                    hunk: (hunks && hunks[0]) || null,
                    path,
                    mode: parseFileMode(newFileMode),
                    hash: afterHash,
                });
                break;
            }
            case "patch":
            case "mode change":
                destinationFilePath = toPath || diffLineToPath;
                break;
            default:
                (0, assertNever_1.assertNever)(type);
        }
        if (destinationFilePath && oldMode && newMode && oldMode !== newMode) {
            result.push({
                type: "mode change",
                path: destinationFilePath,
                oldMode: parseFileMode(oldMode),
                newMode: parseFileMode(newMode),
            });
        }
        if (destinationFilePath && hunks && hunks.length) {
            result.push({
                type: "patch",
                path: destinationFilePath,
                hunks,
                beforeHash,
                afterHash,
            });
        }
    }
    return result;
}
function parseFileMode(mode) {
    // tslint:disable-next-line:no-bitwise
    const parsedMode = parseInt(mode, 8) & 0o777;
    if (parsedMode !== exports.NON_EXECUTABLE_FILE_MODE &&
        parsedMode !== exports.EXECUTABLE_FILE_MODE) {
        throw new Error("Unexpected file mode string: " + mode);
    }
    return parsedMode;
}
function parsePatchFile(file) {
    const lines = file.split(/\n/g);
    if (lines[lines.length - 1] === "") {
        lines.pop();
    }
    try {
        return interpretParsedPatchFile(parsePatchLines(lines, { supportLegacyDiffs: false }));
    }
    catch (e) {
        if (e instanceof Error &&
            e.message === "hunk header integrity check failed") {
            return interpretParsedPatchFile(parsePatchLines(lines, { supportLegacyDiffs: true }));
        }
        throw e;
    }
}
function verifyHunkIntegrity(hunk) {
    // verify hunk integrity
    let originalLength = 0;
    let patchedLength = 0;
    for (const { type, lines } of hunk.parts) {
        switch (type) {
            case "context":
                patchedLength += lines.length;
                originalLength += lines.length;
                break;
            case "deletion":
                originalLength += lines.length;
                break;
            case "insertion":
                patchedLength += lines.length;
                break;
            default:
                (0, assertNever_1.assertNever)(type);
        }
    }
    if (originalLength !== hunk.header.original.length ||
        patchedLength !== hunk.header.patched.length) {
        throw new Error("hunk header integrity check failed");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcGF0Y2gvcGFyc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBNFNBLDREQW1HQztBQWNELHdDQW9CQztBQUVELGtEQTJCQztBQTljRCxnREFBNEM7QUFhckMsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLFVBQWtCLEVBQWMsRUFBRTtJQUNwRSxNQUFNLEtBQUssR0FBRyxVQUFVO1NBQ3JCLElBQUksRUFBRTtTQUNOLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFBO0lBQ3JELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLFVBQVUsR0FBRyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVELE9BQU87UUFDTCxRQUFRLEVBQUU7WUFDUixLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM5QjtRQUNELE9BQU8sRUFBRTtZQUNQLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDcEMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlCO0tBQ0YsQ0FBQTtBQUNILENBQUMsQ0FBQTtBQWxCWSxRQUFBLG1CQUFtQix1QkFrQi9CO0FBRVksUUFBQSx3QkFBd0IsR0FBRyxLQUFLLENBQUE7QUFDaEMsUUFBQSxvQkFBb0IsR0FBRyxLQUFLLENBQUE7QUFnRnpDLE1BQU0sY0FBYyxHQUFHLEdBQWMsRUFBRSxDQUFDLENBQUM7SUFDdkMsZ0JBQWdCLEVBQUUsSUFBSTtJ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dmVyIH0gZnJvbSBcIi4uL2Fzc2VydE5ldmVyXCJcblxuZXhwb3J0IGludGVyZmFjZSBIdW5rSGVhZGVyIHtcbiAgb3JpZ2luYWw6IHtcbiAgICBzdGFydDogbnVtYmVyXG4gICAgbGVuZ3RoOiBudW1iZXJcbiAgfVxuICBwYXRjaGVkOiB7XG4gICAgc3RhcnQ6IG51bWJlclxuICAgIGxlbmd0aDogbnVtYmVyXG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IHBhcnNlSHVua0hlYWRlckxpbmUgPSAoaGVhZGVyTGluZTogc3RyaW5nKTogSHVua0hlYWRlciA9PiB7XG4gIGNvbnN0IG1hdGNoID0gaGVhZGVyTGluZVxuICAgIC50cmltKClcbiAgICAubWF0Y2goL15AQCAtKFxcZCspKCwoXFxkKykpPyBcXCsoXFxkKykoLChcXGQrKSk/IEBALiovKVxuICBpZiAoIW1hdGNoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBCYWQgaGVhZGVyIGxpbmU6ICcke2hlYWRlckxpbmV9J2ApXG4gIH1cblxuICByZXR1cm4ge1xuICAgIG9yaWdpbmFsOiB7XG4gICAgICBzdGFydDogTWF0aC5tYXgoTnVtYmVyKG1hdGNoWzFdKSwgMSksXG4gICAgICBsZW5ndGg6IE51bWJlcihtYXRjaFszXSB8fCAxKSxcbiAgICB9LFxuICAgIHBhdGNoZWQ6IHtcbiAgICAgIHN0YXJ0OiBNYXRoLm1heChOdW1iZXIobWF0Y2hbNF0pLCAxKSxcbiAgICAgIGxlbmd0aDogTnVtYmVyKG1hdGNoWzZdIHx8IDEpLFxuICAgIH0sXG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IE5PTl9FWEVDVVRBQkxFX0ZJTEVfTU9ERSA9IDBvNjQ0XG5leHBvcnQgY29uc3QgRVhFQ1VUQUJMRV9GSUxFX01PREUgPSAwbzc1NVxuXG50eXBlIEZpbGVNb2RlID0gdHlwZW9mIE5PTl9FWEVDVVRBQkxFX0ZJTEVfTU9ERSB8IHR5cGVvZiBFWEVDVVRBQkxFX0ZJTEVfTU9ERVxuXG5pbnRlcmZhY2UgUGF0Y2hNdXRhdGlvblBhcnQge1xuICB0eXBlOiBcImNvbnRleHRcIiB8IFwiaW5zZXJ0aW9uXCIgfCBcImRlbGV0aW9uXCJcbiAgbGluZXM6IHN0cmluZ1tdXG4gIG5vTmV3bGluZUF0RW5kT2ZGaWxlOiBib29sZWFuXG59XG5cbmludGVyZmFjZSBGaWxlUmVuYW1lIHtcbiAgdHlwZTogXCJyZW5hbWVcIlxuICBmcm9tUGF0aDogc3RyaW5nXG4gIHRvUGF0aDogc3RyaW5nXG59XG5cbmludGVyZmFjZSBGaWxlTW9kZUNoYW5nZSB7XG4gIHR5cGU6IFwibW9kZSBjaGFuZ2VcIlxuICBwYXRoOiBzdHJpbmdcbiAgb2xkTW9kZTogRmlsZU1vZGVcbiAgbmV3TW9kZTogRmlsZU1vZGVcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGaWxlUGF0Y2gge1xuICB0eXBlOiBcInBhdGNoXCJcbiAgcGF0aDogc3RyaW5nXG4gIGh1bmtzOiBIdW5rW11cbiAgYmVmb3JlSGFzaDogc3RyaW5nIHwgbnVsbFxuICBhZnRlckhhc2g6IHN0cmluZyB8IG51bGxcbn1cblxuaW50ZXJmYWNlIEZpbGVEZWxldGlvbiB7XG4gIHR5cGU6IFwiZmlsZSBkZWxldGlvblwiXG4gIHBhdGg6IHN0cmluZ1xuICBtb2RlOiBGaWxlTW9kZVxuICBodW5rOiBIdW5rIHwgbnVsbFxuICBoYXNoOiBzdHJpbmcgfCBudWxsXG59XG5cbmludGVyZmFjZSBGaWxlQ3JlYXRpb24ge1xuICB0eXBlOiBcImZpbGUgY3JlYXRpb25cIlxuICBtb2RlOiBGaWxlTW9kZVxuICBwYXRoOiBzdHJpbmdcbiAgaHVuazogSHVuayB8IG51bGxcbiAgaGFzaDogc3RyaW5nIHwgbnVsbFxufVxuXG5leHBvcnQgdHlwZSBQYXRjaEZpbGVQYXJ0ID1cbiAgfCBGaWxlUGF0Y2hcbiAgfCBGaWxlRGVsZXRpb25cbiAgfCBGaWxlQ3JlYXRpb25cbiAgfCBGaWxlUmVuYW1lXG4gIHwgRmlsZU1vZGVDaGFuZ2VcblxuZXhwb3J0IHR5cGUgUGFyc2VkUGF0Y2hGaWxlID0gUGF0Y2hGaWxlUGFydFtdXG5cbnR5cGUgU3RhdGUgPSBcInBhcnNpbmcgaGVhZGVyXCIgfCBcInBhcnNpbmcgaHVua3NcIlxuXG5pbnRlcmZhY2UgRmlsZURlZXRzIHtcbiAgZGlmZkxpbmVGcm9tUGF0aDogc3RyaW5nIHwgbnVsbFxuICBkaWZmTGluZVRvUGF0aDogc3RyaW5nIHwgbnVsbFxuICBvbGRNb2RlOiBzdHJpbmcgfCBudWxsXG4gIG5ld01vZGU6IHN0cmluZyB8IG51bGxcbiAgZGVsZXRlZEZpbGVNb2RlOiBzdHJpbmcgfCBudWxsXG4gIG5ld0ZpbGVNb2RlOiBzdHJpbmcgfCBudWxsXG4gIHJlbmFtZUZyb206IHN0cmluZyB8IG51bGxcbiAgcmVuYW1lVG86IHN0cmluZyB8IG51bGxcbiAgYmVmb3JlSGFzaDogc3RyaW5nIHwgbnVsbFxuICBhZnRlckhhc2g6IHN0cmluZyB8IG51bGxcbiAgZnJvbVBhdGg6IHN0cmluZyB8IG51bGxcbiAgdG9QYXRoOiBzdHJpbmcgfCBudWxsXG4gIGh1bmtzOiBIdW5rW10gfCBudWxsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSHVuayB7XG4gIGhlYWRlcjogSHVua0hlYWRlclxuICBwYXJ0czogUGF0Y2hNdXRhdGlvblBhcnRbXVxuICBzb3VyY2U6IHN0cmluZ1xufVxuXG5jb25zdCBlbXB0eUZpbGVQYXRjaCA9ICgpOiBGaWxlRGVldHMgPT4gKHtcbiAgZGlmZkxpbmVGcm9tUGF0aDogbnVsbCxcbiAgZGlmZkxpbmVUb1BhdGg6IG51bGwsXG4gIG9sZE1vZGU6IG51bGwsXG4gIG5ld01vZGU6IG51bGwsXG4gIGRlbGV0ZWRGaWxlTW9kZTogbnVsbCxcbiAgbmV3RmlsZU1vZGU6IG51bGwsXG4gIHJlbmFtZUZyb206IG51bGwsXG4gIHJlbmFtZVRvOiBudWxsLFxuICBiZWZvcmVIYXNoOiBudWxsLFxuICBhZnRlckhhc2g6IG51bGwsXG4gIGZyb21QYXRoOiBudWxsLFxuICB0b1BhdGg6IG51bGwsXG4gIGh1bmtzOiBudWxsLFxufSlcblxuY29uc3QgZW1wdHlIdW5rID0gKGhlYWRlckxpbmU6IHN0cmluZyk6IEh1bmsgPT4gKHtcbiAgaGVhZGVyOiBwYXJzZUh1bmtIZWFkZXJMaW5lKGhlYWRlckxpbmUpLFxuICBwYXJ0czogW10sXG4gIHNvdXJjZTogXCJcIixcbn0pXG5cbmNvbnN0IGh1bmtMaW5ldHlwZXM6IHtcbiAgW2s6IHN0cmluZ106IFBhdGNoTXV0YXRpb25QYXJ0W1widHlwZVwiXSB8IFwicHJhZ21hXCIgfCBcImhlYWRlclwiXG59ID0ge1xuICBcIkBcIjogXCJoZWFkZXJcIixcbiAgXCItXCI6IFwiZGVsZXRpb25cIixcbiAgXCIrXCI6IFwiaW5zZXJ0aW9uXCIsXG4gIFwiIFwiOiBcImNvbnRleHRcIixcbiAgXCJcXFxcXCI6IFwicHJhZ21hXCIsXG4gIC8vIFRyZWF0IGJsYW5rIGxpbmVzIGFzIGNvbnRleHRcbiAgdW5kZWZpbmVkOiBcImNvbnRleHRcIixcbiAgXCJcXHJcIjogXCJjb250ZXh0XCIsXG59XG5cbmZ1bmN0aW9uIHBhcnNlUGF0Y2hMaW5lcyhcbiAgbGluZXM6IHN0cmluZ1tdLFxuICB7IHN1cHBvcnRMZWdhY3lEaWZmcyB9OiB7IHN1cHBvcnRMZWdhY3lEaWZmczogYm9vbGVhbiB9LFxuKTogRmlsZURlZXRzW10ge1xuICBjb25zdCByZXN1bHQ6IEZpbGVEZWV0c1tdID0gW11cbiAgbGV0IGN1cnJlbnRGaWxlUGF0Y2g6IEZpbGVEZWV0cyA9IGVtcHR5RmlsZVBhdGNoKClcbiAgbGV0IHN0YXRlOiBTdGF0ZSA9IFwicGFyc2luZyBoZWFkZXJcIlxuICBsZXQgY3VycmVudEh1bms6IEh1bmsgfCBudWxsID0gbnVsbFxuICBsZXQgY3VycmVudEh1bmtNdXRhdGlvblBhcnQ6IFBhdGNoTXV0YXRpb25QYXJ0IHwgbnVsbCA9IG51bGxcbiAgbGV0IGh1bmtTdGFydExpbmVJbmRleCA9IDBcblxuICBmdW5jdGlvbiBjb21taXRIdW5rKGk6IG51bWJlcikge1xuICAgIGlmIChjdXJyZW50SHVuaykge1xuICAgICAgaWYgKGN1cnJlbnRIdW5rTXV0YXRpb25QYXJ0KSB7XG4gICAgICAgIGN1cnJlbnRIdW5rLnBhcnRzLnB1c2goY3VycmVudEh1bmtNdXRhdGlvblBhcnQpXG4gICAgICAgIGN1cnJlbnRIdW5rTXV0YXRpb25QYXJ0ID0gbnVsbFxuICAgICAgfVxuICAgICAgY3VycmVudEh1bmsuc291cmNlID0gbGluZXMuc2xpY2UoaHVua1N0YXJ0TGluZUluZGV4LCBpKS5qb2luKFwiXFxuXCIpXG4gICAgICBjdXJyZW50RmlsZVBhdGNoLmh1bmtzIS5wdXNoKGN1cnJlbnRIdW5rKVxuICAgICAgY3VycmVudEh1bmsgPSBudWxsXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29tbWl0RmlsZVBhdGNoKGk6IG51bWJlcikge1xuICAgIGNvbW1pdEh1bmsoaSlcbiAgICByZXN1bHQucHVzaChjdXJyZW50RmlsZVBhdGNoKVxuICAgIGN1cnJlbnRGaWxlUGF0Y2ggPSBlbXB0eUZpbGVQYXRjaCgpXG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2ldXG5cbiAgICBpZiAoc3RhdGUgPT09IFwicGFyc2luZyBoZWFkZXJcIikge1xuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aChcIkBAXCIpKSB7XG4gICAgICAgIGh1bmtTdGFydExpbmVJbmRleCA9IGlcbiAgICAgICAgc3RhdGUgPSBcInBhcnNpbmcgaHVua3NcIlxuICAgICAgICBjdXJyZW50RmlsZVBhdGNoLmh1bmtzID0gW11cbiAgICAgICAgaS0tXG4gICAgICB9IGVsc2UgaWYgKGxpbmUuc3RhcnRzV2l0aChcImRpZmYgLS1naXQgXCIpKSB7XG4gICAgICAgIGlmIChjdXJyZW50RmlsZVBhdGNoICYmIGN1cnJlbnRGaWxlUGF0Y2guZGlmZkxpbmVGcm9tUGF0aCkge1xuICAgICAgICAgIGNvbW1pdEZpbGVQYXRjaChpKVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaCgvXmRpZmYgLS1naXQgYVxcLyguKj8pIGJcXC8oLio/KVxccyokLylcbiAgICAgICAgaWYgKCFtYXRjaCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkJhZCBkaWZmIGxpbmU6IFwiICsgbGluZSlcbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50RmlsZVBhdGNoLmRpZmZMaW5lRnJvbVBhdGggPSBtYXRjaFsxXVxuICAgICAgICBjdXJyZW50RmlsZVBhdGNoLmRpZmZMaW5lVG9QYXRoID0gbWF0Y2hbMl1cbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwib2xkIG1vZGUgXCIpKSB7XG4gICAgICAgIGN1cnJlbnRGaWxlUGF0Y2gub2xkTW9kZSA9IGxpbmUuc2xpY2UoXCJvbGQgbW9kZSBcIi5sZW5ndGgpLnRyaW0oKVxuICAgICAgfSBlbHNlIGlmIChsaW5lLnN0YXJ0c1dpdGgoXCJuZXcgbW9kZSBcIikpIHtcbiAgICAgICAgY3VycmVudEZpbGVQYXRjaC5uZXdNb2RlID0gbGluZS5zbGljZShcIm5ldyBtb2RlIFwiLmxlbmd0aCkudHJpbSgpXG4gICAgICB9IGVsc2UgaWYgKGxpbmUuc3RhcnRzV2l0aChcImRlbGV0ZWQgZmlsZSBtb2RlIFwiKSkge1xuICAgICAgICBjdXJyZW50RmlsZVBhdGNoLmRlbGV0ZWRGaWxlTW9kZSA9IGxpbmVcbiAgICAgICAgICAuc2xpY2UoXCJkZWxldGVkIGZpbGUgbW9kZSBcIi5sZW5ndGgpXG4gICAgICAgICAgLnRyaW0oKVxuICAgICAgfSBlbHNlIGlmIChsaW5lLnN0YXJ0c1dpdGgoXCJuZXcgZmlsZSBtb2RlIFwiKSkge1xuICAgICAgICBjdXJyZW50RmlsZVBhdGNoLm5ld0ZpbGVNb2RlID0gbGluZVxuICAgICAgICAgIC5zbGljZShcIm5ldyBmaWxlIG1vZGUgXCIubGVuZ3RoKVxuICAgICAgICAgIC50cmltKClcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwicmVuYW1lIGZyb20gXCIpKSB7XG4gICAgICAgIGN1cnJlbnRGaWxlUGF0Y2gucmVuYW1lRnJvbSA9IGxpbmUuc2xpY2UoXCJyZW5hbWUgZnJvbSBcIi5sZW5ndGgpLnRyaW0oKVxuICAgICAgfSBlbHNlIGlmIChsaW5lLnN0YXJ0c1dpdGgoXCJyZW5hbWUgdG8gXCIpKSB7XG4gICAgICAgIGN1cnJlbnRGaWxlUGF0Y2gucmVuYW1lVG8gPSBsaW5lLnNsaWNlKFwicmVuYW1lIHRvIFwiLmxlbmd0aCkudHJpbSgpXG4gICAgICB9IGVsc2UgaWYgKGxpbmUuc3RhcnRzV2l0aChcImluZGV4IFwiKSkge1xuICAgICAgICBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goLyhcXHcrKVxcLlxcLihcXHcrKS8pXG4gICAgICAgIGlmICghbWF0Y2gpIHtcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIGN1cnJlbnRGaWxlUGF0Y2guYmVmb3JlSGFzaCA9IG1hdGNoWzFdXG4gICAgICAgIGN1cnJlbnRGaWxlUGF0Y2guYWZ0ZXJIYXNoID0gbWF0Y2hbMl1cbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwiLS0tIFwiKSkge1xuICAgICAgICBjdXJyZW50RmlsZVBhdGNoLmZyb21QYXRoID0gbGluZS5zbGljZShcIi0tLSBhL1wiLmxlbmd0aCkudHJpbSgpXG4gICAgICB9IGVsc2UgaWYgKGxpbmUuc3RhcnRzV2l0aChcIisrKyBcIikpIHtcbiAgICAgICAgY3VycmVudEZpbGVQYXRjaC50b1BhdGggPSBsaW5lLnNsaWNlKFwiKysrIGIvXCIubGVuZ3RoKS50cmltKClcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN1cHBvcnRMZWdhY3lEaWZmcyAmJiBsaW5lLnN0YXJ0c1dpdGgoXCItLS0gYS9cIikpIHtcbiAgICAgICAgc3RhdGUgPSBcInBhcnNpbmcgaGVhZGVyXCJcbiAgICAgICAgY29tbWl0RmlsZVBhdGNoKGkpXG4gICAgICAgIGktLVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgLy8gcGFyc2luZyBodW5rc1xuICAgICAgY29uc3QgbGluZVR5cGUgPSBodW5rTGluZXR5cGVzW2xpbmVbMF1dIHx8IG51bGxcbiAgICAgIHN3aXRjaCAobGluZVR5cGUpIHtcbiAgICAgICAgY2FzZSBcImhlYWRlclwiOlxuICAgICAgICAgIGNvbW1pdEh1bmsoaSlcbiAgICAgICAgICBjdXJyZW50SHVuayA9IGVtcHR5SHVuayhsaW5lKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgbnVsbDpcbiAgICAgICAgICAvLyB1bnJlY29nbml6ZWQsIGJhaWwgb3V0XG4gICAgICAgICAgc3RhdGUgPSBcInBhcnNpbmcgaGVhZGVyXCJcbiAgICAgICAgICBjb21taXRGaWxlUGF0Y2goaSlcbiAgICAgICAgICBpLS1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIFwicHJhZ21hXCI6XG4gICAgICAgICAgaWYgKCFsaW5lLnN0YXJ0c1dpdGgoXCJcXFxcIE5vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGVcIikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVucmVjb2duaXplZCBwcmFnbWEgaW4gcGF0Y2ggZmlsZTogXCIgKyBsaW5lKVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWN1cnJlbnRIdW5rTXV0YXRpb25QYXJ0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIFwiQmFkIHBhcnNlciBzdGF0ZTogTm8gbmV3bGluZSBhdCBFT0YgcHJhZ21hIGVuY291bnRlcmVkIHdpdGhvdXQgY29udGV4dFwiLFxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJyZW50SHVua011dGF0aW9uUGFydC5ub05ld2xpbmVBdEVuZE9mRmlsZSA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIFwiaW5zZXJ0aW9uXCI6XG4gICAgICAgIGNhc2UgXCJkZWxldGlvblwiOlxuICAgICAgICBjYXNlIFwiY29udGV4dFwiOlxuICAgICAgICAgIGlmICghY3VycmVudEh1bmspIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgXCJCYWQgcGFyc2VyIHN0YXRlOiBIdW5rIGxpbmVzIGVuY291bnRlcmVkIGJlZm9yZSBodW5rIGhlYWRlclwiLFxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBjdXJyZW50SHVua011dGF0aW9uUGFydCAmJlxuICAgICAgICAgICAgY3VycmVudEh1bmtNdXRhdGlvblBhcnQudHlwZSAhPT0gbGluZVR5cGVcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGN1cnJlbnRIdW5rLnBhcnRzLnB1c2goY3VycmVudEh1bmtNdXRhdGlvblBhcnQpXG4gICAgICAgICAgICBjdXJyZW50SHVua011dGF0aW9uUGFydCA9IG51bGxcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFjdXJyZW50SHVua011dGF0aW9uUGFydCkge1xuICAgICAgICAgICAgY3VycmVudEh1bmtNdXRhdGlvblBhcnQgPSB7XG4gICAgICAgICAgICAgIHR5cGU6IGxpbmVUeXBlLFxuICAgICAgICAgICAgICBsaW5lczogW10sXG4gICAgICAgICAgICAgIG5vTmV3bGluZUF0RW5kT2ZGaWxlOiBmYWxzZSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgY3VycmVudEh1bmtNdXRhdGlvblBhcnQubGluZXMucHVzaChsaW5lLnNsaWNlKDEpKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgLy8gZXhoYXVzaXR2ZW5lc3MgY2hlY2tcbiAgICAgICAgICBhc3NlcnROZXZlcihsaW5lVHlwZSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb21taXRGaWxlUGF0Y2gobGluZXMubGVuZ3RoKVxuXG4gIGZvciAoY29uc3QgeyBodW5rcyB9IG9mIHJlc3VsdCkge1xuICAgIGlmIChodW5rcykge1xuICAgICAgZm9yIChjb25zdCBodW5rIG9mIGh1bmtzKSB7XG4gICAgICAgIHZlcmlmeUh1bmtJbnRlZ3JpdHkoaHVuaylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnRlcnByZXRQYXJzZWRQYXRjaEZpbGUoZmlsZXM6IEZpbGVEZWV0c1tdKTogUGFyc2VkUGF0Y2hGaWxlIHtcbiAgY29uc3QgcmVzdWx0OiBQYXJzZWRQYXRjaEZpbGUgPSBbXVxuXG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGNvbnN0IHtcbiAgICAgIGRpZmZMaW5lRnJvbVBhdGgsXG4gICAgICBkaWZmTGluZVRvUGF0aCxcbiAgICAgIG9sZE1vZGUsXG4gICAgICBuZXdNb2RlLFxuICAgICAgZGVsZXRlZEZpbGVNb2RlLFxuICAgICAgbmV3RmlsZU1vZGUsXG4gICAgICByZW5hbWVGcm9tLFxuICAgICAgcmVuYW1lVG8sXG4gICAgICBiZWZvcmVIYXNoLFxuICAgICAgYWZ0ZXJIYXNoLFxuICAgICAgZnJvbVBhdGgsXG4gICAgICB0b1BhdGgsXG4gICAgICBodW5rcyxcbiAgICB9ID0gZmlsZVxuICAgIGNvbnN0IHR5cGU6IFBhdGNoRmlsZVBhcnRbXCJ0eXBlXCJdID0gcmVuYW1lRnJvbVxuICAgICAgPyBcInJlbmFtZVwiXG4gICAgICA6IGRlbGV0ZWRGaWxlTW9kZVxuICAgICAgPyBcImZpbGUgZGVsZXRpb25cIlxuICAgICAgOiBuZXdGaWxlTW9kZVxuICAgICAgPyBcImZpbGUgY3JlYXRpb25cIlxuICAgICAgOiBodW5rcyAmJiBodW5rcy5sZW5ndGggPiAwXG4gICAgICA/IFwicGF0Y2hcIlxuICAgICAgOiBcIm1vZGUgY2hhbmdlXCJcblxuICAgIGxldCBkZXN0aW5hdGlvbkZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbFxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSBcInJlbmFtZVwiOlxuICAgICAgICBpZiAoIXJlbmFtZUZyb20gfHwgIXJlbmFtZVRvKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQmFkIHBhcnNlciBzdGF0ZTogcmVuYW1lIGZyb20gJiB0byBub3QgZ2l2ZW5cIilcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJyZW5hbWVcIixcbiAgICAgICAgICBmcm9tUGF0aDogcmVuYW1lRnJvbSxcbiAgICAgICAgICB0b1BhdGg6IHJlbmFtZVRvLFxuICAgICAgICB9KVxuICAgICAgICBkZXN0aW5hdGlvbkZpbGVQYXRoID0gcmVuYW1lVG9cbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgXCJmaWxlIGRlbGV0aW9uXCI6IHtcbiAgICAgICAgY29uc3QgcGF0aCA9IGRpZmZMaW5lRnJvbVBhdGggfHwgZnJvbVBhdGhcbiAgICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQmFkIHBhcnNlIHN0YXRlOiBubyBwYXRoIGdpdmVuIGZvciBmaWxlIGRlbGV0aW9uXCIpXG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZmlsZSBkZWxldGlvblwiLFxuICAgICAgICAgIGh1bms6IChodW5rcyAmJiBodW5rc1swXSkgfHwgbnVsbCxcbiAgICAgICAgICBwYXRoLFxuICAgICAgICAgIG1vZGU6IHBhcnNlRmlsZU1vZGUoZGVsZXRlZEZpbGVNb2RlISksXG4gICAgICAgICAgaGFzaDogYmVmb3JlSGFzaCxcbiAgICAgICAgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgXCJmaWxlIGNyZWF0aW9uXCI6IHtcbiAgICAgICAgY29uc3QgcGF0aCA9IGRpZmZMaW5lVG9QYXRoIHx8IHRvUGF0aFxuICAgICAgICBpZiAoIXBhdGgpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCYWQgcGFyc2Ugc3RhdGU6IG5vIHBhdGggZ2l2ZW4gZm9yIGZpbGUgY3JlYXRpb25cIilcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJmaWxlIGNyZWF0aW9uXCIsXG4gICAgICAgICAgaHVuazogKGh1bmtzICYmIGh1bmtzWzBdKSB8fCBudWxsLFxuICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgbW9kZTogcGFyc2VGaWxlTW9kZShuZXdGaWxlTW9kZSEpLFxuICAgICAgICAgIGhhc2g6IGFmdGVySGFzaCxcbiAgICAgICAgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgXCJwYXRjaFwiOlxuICAgICAgY2FzZSBcIm1vZGUgY2hhbmdlXCI6XG4gICAgICAgIGRlc3RpbmF0aW9uRmlsZVBhdGggPSB0b1BhdGggfHwgZGlmZkxpbmVUb1BhdGhcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFzc2VydE5ldmVyKHR5cGUpXG4gICAgfVxuXG4gICAgaWYgKGRlc3RpbmF0aW9uRmlsZVBhdGggJiYgb2xkTW9kZSAmJiBuZXdNb2RlICYmIG9sZE1vZGUgIT09IG5ld01vZGUpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgdHlwZTogXCJtb2RlIGNoYW5nZVwiLFxuICAgICAgICBwYXRoOiBkZXN0aW5hdGlvbkZpbGVQYXRoLFxuICAgICAgICBvbGRNb2RlOiBwYXJzZUZpbGVNb2RlKG9sZE1vZGUpLFxuICAgICAgICBuZXdNb2RlOiBwYXJzZUZpbGVNb2RlKG5ld01vZGUpLFxuICAgICAgfSlcbiAgICB9XG5cbiAgICBpZiAoZGVzdGluYXRpb25GaWxlUGF0aCAmJiBodW5rcyAmJiBodW5rcy5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgdHlwZTogXCJwYXRjaFwiLFxuICAgICAgICBwYXRoOiBkZXN0aW5hdGlvbkZpbGVQYXRoLFxuICAgICAgICBodW5rcyxcbiAgICAgICAgYmVmb3JlSGFzaCxcbiAgICAgICAgYWZ0ZXJIYXNoLFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0XG59XG5cbmZ1bmN0aW9uIHBhcnNlRmlsZU1vZGUobW9kZTogc3RyaW5nKTogRmlsZU1vZGUge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYml0d2lzZVxuICBjb25zdCBwYXJzZWRNb2RlID0gcGFyc2VJbnQobW9kZSwgOCkgJiAwbzc3N1xuICBpZiAoXG4gICAgcGFyc2VkTW9kZSAhPT0gTk9OX0VYRUNVVEFCTEVfRklMRV9NT0RFICYmXG4gICAgcGFyc2VkTW9kZSAhPT0gRVhFQ1VUQUJMRV9GSUxFX01PREVcbiAgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVW5leHBlY3RlZCBmaWxlIG1vZGUgc3RyaW5nOiBcIiArIG1vZGUpXG4gIH1cbiAgcmV0dXJuIHBhcnNlZE1vZGVcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUGF0Y2hGaWxlKGZpbGU6IHN0cmluZyk6IFBhcnNlZFBhdGNoRmlsZSB7XG4gIGNvbnN0IGxpbmVzID0gZmlsZS5zcGxpdCgvXFxuL2cpXG4gIGlmIChsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSA9PT0gXCJcIikge1xuICAgIGxpbmVzLnBvcCgpXG4gIH1cbiAgdHJ5IHtcbiAgICByZXR1cm4gaW50ZXJwcmV0UGFyc2VkUGF0Y2hGaWxlKFxuICAgICAgcGFyc2VQYXRjaExpbmVzKGxpbmVzLCB7IHN1cHBvcnRMZWdhY3lEaWZmczogZmFsc2UgfSksXG4gICAgKVxuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKFxuICAgICAgZSBpbnN0YW5jZW9mIEVycm9yICYmXG4gICAgICBlLm1lc3NhZ2UgPT09IFwiaHVuayBoZWFkZXIgaW50ZWdyaXR5IGNoZWNrIGZhaWxlZFwiXG4gICAgKSB7XG4gICAgICByZXR1cm4gaW50ZXJwcmV0UGFyc2VkUGF0Y2hGaWxlKFxuICAgICAgICBwYXJzZVBhdGNoTGluZXMobGluZXMsIHsgc3VwcG9ydExlZ2FjeURpZmZzOiB0cnVlIH0pLFxuICAgICAgKVxuICAgIH1cbiAgICB0aHJvdyBlXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeUh1bmtJbnRlZ3JpdHkoaHVuazogSHVuaykge1xuICAvLyB2ZXJpZnkgaHVuayBpbnRlZ3JpdHlcbiAgbGV0IG9yaWdpbmFsTGVuZ3RoID0gMFxuICBsZXQgcGF0Y2hlZExlbmd0aCA9IDBcbiAgZm9yIChjb25zdCB7IHR5cGUsIGxpbmVzIH0gb2YgaHVuay5wYXJ0cykge1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSBcImNvbnRleHRcIjpcbiAgICAgICAgcGF0Y2hlZExlbmd0aCArPSBsaW5lcy5sZW5ndGhcbiAgICAgICAgb3JpZ2luYWxMZW5ndGggKz0gbGluZXMubGVuZ3RoXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIFwiZGVsZXRpb25cIjpcbiAgICAgICAgb3JpZ2luYWxMZW5ndGggKz0gbGluZXMubGVuZ3RoXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIFwiaW5zZXJ0aW9uXCI6XG4gICAgICAgIHBhdGNoZWRMZW5ndGggKz0gbGluZXMubGVuZ3RoXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhc3NlcnROZXZlcih0eXBlKVxuICAgIH1cbiAgfVxuXG4gIGlmIChcbiAgICBvcmlnaW5hbExlbmd0aCAhPT0gaHVuay5oZWFkZXIub3JpZ2luYWwubGVuZ3RoIHx8XG4gICAgcGF0Y2hlZExlbmd0aCAhPT0gaHVuay5oZWFkZXIucGF0Y2hlZC5sZW5ndGhcbiAgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaHVuayBoZWFkZXIgaW50ZWdyaXR5IGNoZWNrIGZhaWxlZFwiKVxuICB9XG59XG4iXX0=