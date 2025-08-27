"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppRootPath = void 0;
const path_1 = require("./path");
const process_1 = __importDefault(require("process"));
const fs_extra_1 = require("fs-extra");
const getAppRootPath = () => {
    let cwd = process_1.default.cwd();
    while (!(0, fs_extra_1.existsSync)((0, path_1.join)(cwd, "package.json"))) {
        const up = (0, path_1.resolve)(cwd, "../");
        if (up === cwd) {
            throw new Error("no package.json found for this project");
        }
        cwd = up;
    }
    return cwd;
};
exports.getAppRootPath = getAppRootPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0QXBwUm9vdFBhdGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0QXBwUm9vdFBhdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsaUNBQXNDO0FBQ3RDLHNEQUE2QjtBQUM3Qix1Q0FBcUM7QUFFOUIsTUFBTSxjQUFjLEdBQUcsR0FBVyxFQUFFO0lBQ3pDLElBQUksR0FBRyxHQUFHLGlCQUFPLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDdkIsT0FBTyxDQUFDLElBQUEscUJBQVUsRUFBQyxJQUFBLFdBQUksRUFBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzlDLE1BQU0sRUFBRSxHQUFHLElBQUEsY0FBTyxFQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QixJQUFJLEVBQUUsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsd0NBQXdDLENBQUMsQ0FBQTtRQUMzRCxDQUFDO1FBQ0QsR0FBRyxHQUFHLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQTtBQUNaLENBQUMsQ0FBQTtBQVZZLFFBQUEsY0FBYyxrQkFVMUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBqb2luLCByZXNvbHZlIH0gZnJvbSBcIi4vcGF0aFwiXG5pbXBvcnQgcHJvY2VzcyBmcm9tIFwicHJvY2Vzc1wiXG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcImZzLWV4dHJhXCJcblxuZXhwb3J0IGNvbnN0IGdldEFwcFJvb3RQYXRoID0gKCk6IHN0cmluZyA9PiB7XG4gIGxldCBjd2QgPSBwcm9jZXNzLmN3ZCgpXG4gIHdoaWxlICghZXhpc3RzU3luYyhqb2luKGN3ZCwgXCJwYWNrYWdlLmpzb25cIikpKSB7XG4gICAgY29uc3QgdXAgPSByZXNvbHZlKGN3ZCwgXCIuLi9cIilcbiAgICBpZiAodXAgPT09IGN3ZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm8gcGFja2FnZS5qc29uIGZvdW5kIGZvciB0aGlzIHByb2plY3RcIilcbiAgICB9XG4gICAgY3dkID0gdXBcbiAgfVxuICByZXR1cm4gY3dkXG59XG4iXX0=