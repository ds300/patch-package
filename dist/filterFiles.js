"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeIgnoredFiles = removeIgnoredFiles;
const path_1 = require("./path");
const fs_extra_1 = require("fs-extra");
const klaw_sync_1 = __importDefault(require("klaw-sync"));
function removeIgnoredFiles(dir, includePaths, excludePaths) {
    (0, klaw_sync_1.default)(dir, { nodir: true })
        .map((item) => item.path.slice(`${dir}/`.length))
        .filter((relativePath) => !relativePath.match(includePaths) || relativePath.match(excludePaths))
        .forEach((relativePath) => (0, fs_extra_1.removeSync)((0, path_1.join)(dir, relativePath)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyRmlsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZmlsdGVyRmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFJQSxnREFZQztBQWhCRCxpQ0FBNkI7QUFDN0IsdUNBQXFDO0FBQ3JDLDBEQUFnQztBQUVoQyxTQUFnQixrQkFBa0IsQ0FDaEMsR0FBVyxFQUNYLFlBQW9CLEVBQ3BCLFlBQW9CO0lBRXBCLElBQUEsbUJBQVEsRUFBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7U0FDM0IsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ2hELE1BQU0sQ0FDTCxDQUFDLFlBQVksRUFBRSxFQUFFLENBQ2YsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQ3hFO1NBQ0EsT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxJQUFBLHFCQUFVLEVBQUMsSUFBQSxXQUFJLEVBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNuRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgam9pbiB9IGZyb20gXCIuL3BhdGhcIlxuaW1wb3J0IHsgcmVtb3ZlU3luYyB9IGZyb20gXCJmcy1leHRyYVwiXG5pbXBvcnQga2xhd1N5bmMgZnJvbSBcImtsYXctc3luY1wiXG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVJZ25vcmVkRmlsZXMoXG4gIGRpcjogc3RyaW5nLFxuICBpbmNsdWRlUGF0aHM6IFJlZ0V4cCxcbiAgZXhjbHVkZVBhdGhzOiBSZWdFeHAsXG4pIHtcbiAga2xhd1N5bmMoZGlyLCB7IG5vZGlyOiB0cnVlIH0pXG4gICAgLm1hcCgoaXRlbSkgPT4gaXRlbS5wYXRoLnNsaWNlKGAke2Rpcn0vYC5sZW5ndGgpKVxuICAgIC5maWx0ZXIoXG4gICAgICAocmVsYXRpdmVQYXRoKSA9PlxuICAgICAgICAhcmVsYXRpdmVQYXRoLm1hdGNoKGluY2x1ZGVQYXRocykgfHwgcmVsYXRpdmVQYXRoLm1hdGNoKGV4Y2x1ZGVQYXRocyksXG4gICAgKVxuICAgIC5mb3JFYWNoKChyZWxhdGl2ZVBhdGgpID0+IHJlbW92ZVN5bmMoam9pbihkaXIsIHJlbGF0aXZlUGF0aCkpKVxufVxuIl19