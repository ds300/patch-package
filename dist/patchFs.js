"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroupedPatches = exports.getPatchFiles = void 0;
const PackageDetails_1 = require("./PackageDetails");
const path_1 = require("./path");
const klaw_sync_1 = __importDefault(require("klaw-sync"));
const getPatchFiles = (patchesDir) => {
    try {
        return (0, klaw_sync_1.default)(patchesDir, { nodir: true })
            .map(({ path }) => (0, path_1.relative)(patchesDir, path))
            .filter((path) => path.endsWith(".patch"));
    }
    catch (e) {
        return [];
    }
};
exports.getPatchFiles = getPatchFiles;
const getGroupedPatches = (patchesDirectory) => {
    const files = (0, exports.getPatchFiles)(patchesDirectory);
    if (files.length === 0) {
        return {
            numPatchFiles: 0,
            pathSpecifierToPatchFiles: {},
            warnings: [],
        };
    }
    const warnings = [];
    const pathSpecifierToPatchFiles = {};
    for (const file of files) {
        const details = (0, PackageDetails_1.getPackageDetailsFromPatchFilename)(file);
        if (!details) {
            warnings.push(`Unrecognized patch file in patches directory ${file}`);
            continue;
        }
        if (!pathSpecifierToPatchFiles[details.pathSpecifier]) {
            pathSpecifierToPatchFiles[details.pathSpecifier] = [];
        }
        pathSpecifierToPatchFiles[details.pathSpecifier].push(details);
    }
    for (const arr of Object.values(pathSpecifierToPatchFiles)) {
        arr.sort((a, b) => {
            var _a, _b;
            return ((_a = a.sequenceNumber) !== null && _a !== void 0 ? _a : 0) - ((_b = b.sequenceNumber) !== null && _b !== void 0 ? _b : 0);
        });
    }
    return {
        numPatchFiles: files.length,
        pathSpecifierToPatchFiles,
        warnings,
    };
};
exports.getGroupedPatches = getGroupedPatches;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2hGcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXRjaEZzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLHFEQUd5QjtBQUN6QixpQ0FBaUM7QUFDakMsMERBQWdDO0FBRXpCLE1BQU0sYUFBYSxHQUFHLENBQUMsVUFBa0IsRUFBRSxFQUFFO0lBQ2xELElBQUksQ0FBQztRQUNILE9BQU8sSUFBQSxtQkFBUSxFQUFDLFVBQVUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQzthQUN6QyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFBLGVBQVEsRUFBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDN0MsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDWCxPQUFPLEVBQUUsQ0FBQTtJQUNYLENBQUM7QUFDSCxDQUFDLENBQUE7QUFSWSxRQUFBLGFBQWEsaUJBUXpCO0FBT00sTUFBTSxpQkFBaUIsR0FBRyxDQUFDLGdCQUF3QixFQUFrQixFQUFFO0lBQzVFLE1BQU0sS0FBSyxHQUFHLElBQUEscUJBQWEsRUFBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBRTdDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixPQUFPO1lBQ0wsYUFBYSxFQUFFLENBQUM7WUFDaEIseUJBQXlCLEVBQUUsRUFBRTtZQUM3QixRQUFRLEVBQUUsRUFBRTtTQUNiLENBQUE7SUFDSCxDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFBO0lBRTdCLE1BQU0seUJBQXlCLEdBQTRDLEVBQUUsQ0FBQTtJQUM3RSxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLElBQUEsbURBQWtDLEVBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2IsUUFBUSxDQUFDLElBQUksQ0FBQyxnREFBZ0QsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUNyRSxTQUFRO1FBQ1YsQ0FBQztRQUNELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztZQUN0RCx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ3ZELENBQUM7UUFDRCx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ2hFLENBQUM7SUFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDO1FBQzNELEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O1lBQ2hCLE9BQU8sQ0FBQyxNQUFBLENBQUMsQ0FBQyxjQUFjLG1DQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBQSxDQUFDLENBQUMsY0FBYyxtQ0FBSSxDQUFDLENBQUMsQ0FBQTtRQUMxRCxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxPQUFPO1FBQ0wsYUFBYSxFQUFFLEtBQUssQ0FBQyxNQUFNO1FBQzNCLHlCQUF5QjtRQUN6QixRQUFRO0tBQ1QsQ0FBQTtBQUNILENBQUMsQ0FBQTtBQXBDWSxRQUFBLGlCQUFpQixxQkFvQzdCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgUGF0Y2hlZFBhY2thZ2VEZXRhaWxzLFxuICBnZXRQYWNrYWdlRGV0YWlsc0Zyb21QYXRjaEZpbGVuYW1lLFxufSBmcm9tIFwiLi9QYWNrYWdlRGV0YWlsc1wiXG5pbXBvcnQgeyByZWxhdGl2ZSB9IGZyb20gXCIuL3BhdGhcIlxuaW1wb3J0IGtsYXdTeW5jIGZyb20gXCJrbGF3LXN5bmNcIlxuXG5leHBvcnQgY29uc3QgZ2V0UGF0Y2hGaWxlcyA9IChwYXRjaGVzRGlyOiBzdHJpbmcpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4ga2xhd1N5bmMocGF0Y2hlc0RpciwgeyBub2RpcjogdHJ1ZSB9KVxuICAgICAgLm1hcCgoeyBwYXRoIH0pID0+IHJlbGF0aXZlKHBhdGNoZXNEaXIsIHBhdGgpKVxuICAgICAgLmZpbHRlcigocGF0aCkgPT4gcGF0aC5lbmRzV2l0aChcIi5wYXRjaFwiKSlcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBbXVxuICB9XG59XG5cbmludGVyZmFjZSBHcm91cGVkUGF0Y2hlcyB7XG4gIG51bVBhdGNoRmlsZXM6IG51bWJlclxuICBwYXRoU3BlY2lmaWVyVG9QYXRjaEZpbGVzOiBSZWNvcmQ8c3RyaW5nLCBQYXRjaGVkUGFja2FnZURldGFpbHNbXT5cbiAgd2FybmluZ3M6IHN0cmluZ1tdXG59XG5leHBvcnQgY29uc3QgZ2V0R3JvdXBlZFBhdGNoZXMgPSAocGF0Y2hlc0RpcmVjdG9yeTogc3RyaW5nKTogR3JvdXBlZFBhdGNoZXMgPT4ge1xuICBjb25zdCBmaWxlcyA9IGdldFBhdGNoRmlsZXMocGF0Y2hlc0RpcmVjdG9yeSlcblxuICBpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG51bVBhdGNoRmlsZXM6IDAsXG4gICAgICBwYXRoU3BlY2lmaWVyVG9QYXRjaEZpbGVzOiB7fSxcbiAgICAgIHdhcm5pbmdzOiBbXSxcbiAgICB9XG4gIH1cblxuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXVxuXG4gIGNvbnN0IHBhdGhTcGVjaWZpZXJUb1BhdGNoRmlsZXM6IFJlY29yZDxzdHJpbmcsIFBhdGNoZWRQYWNrYWdlRGV0YWlsc1tdPiA9IHt9XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGNvbnN0IGRldGFpbHMgPSBnZXRQYWNrYWdlRGV0YWlsc0Zyb21QYXRjaEZpbGVuYW1lKGZpbGUpXG4gICAgaWYgKCFkZXRhaWxzKSB7XG4gICAgICB3YXJuaW5ncy5wdXNoKGBVbnJlY29nbml6ZWQgcGF0Y2ggZmlsZSBpbiBwYXRjaGVzIGRpcmVjdG9yeSAke2ZpbGV9YClcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGlmICghcGF0aFNwZWNpZmllclRvUGF0Y2hGaWxlc1tkZXRhaWxzLnBhdGhTcGVjaWZpZXJdKSB7XG4gICAgICBwYXRoU3BlY2lmaWVyVG9QYXRjaEZpbGVzW2RldGFpbHMucGF0aFNwZWNpZmllcl0gPSBbXVxuICAgIH1cbiAgICBwYXRoU3BlY2lmaWVyVG9QYXRjaEZpbGVzW2RldGFpbHMucGF0aFNwZWNpZmllcl0ucHVzaChkZXRhaWxzKVxuICB9XG4gIGZvciAoY29uc3QgYXJyIG9mIE9iamVjdC52YWx1ZXMocGF0aFNwZWNpZmllclRvUGF0Y2hGaWxlcykpIHtcbiAgICBhcnIuc29ydCgoYSwgYikgPT4ge1xuICAgICAgcmV0dXJuIChhLnNlcXVlbmNlTnVtYmVyID8/IDApIC0gKGIuc2VxdWVuY2VOdW1iZXIgPz8gMClcbiAgICB9KVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBudW1QYXRjaEZpbGVzOiBmaWxlcy5sZW5ndGgsXG4gICAgcGF0aFNwZWNpZmllclRvUGF0Y2hGaWxlcyxcbiAgICB3YXJuaW5ncyxcbiAgfVxufVxuIl19