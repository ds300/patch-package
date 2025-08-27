"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.relative = exports.resolve = exports.dirname = exports.join = void 0;
const slash_1 = __importDefault(require("slash"));
const path_1 = __importDefault(require("path"));
const join = (...args) => (0, slash_1.default)(path_1.default.join(...args));
exports.join = join;
var path_2 = require("path");
Object.defineProperty(exports, "dirname", { enumerable: true, get: function () { return path_2.dirname; } });
const resolve = (...args) => (0, slash_1.default)(path_1.default.resolve(...args));
exports.resolve = resolve;
const relative = (...args) => (0, slash_1.default)(path_1.default.relative(...args));
exports.relative = relative;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGtEQUF5QjtBQUN6QixnREFBdUI7QUFFaEIsTUFBTSxJQUFJLEdBQXFCLENBQUMsR0FBRyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUEsZUFBSyxFQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO0FBQS9ELFFBQUEsSUFBSSxRQUEyRDtBQUU1RSw2QkFBOEI7QUFBckIsK0ZBQUEsT0FBTyxPQUFBO0FBRVQsTUFBTSxPQUFPLEdBQXdCLENBQUMsR0FBRyxJQUFJLEVBQUUsRUFBRSxDQUN0RCxJQUFBLGVBQUssRUFBQyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtBQURqQixRQUFBLE9BQU8sV0FDVTtBQUV2QixNQUFNLFFBQVEsR0FBeUIsQ0FBQyxHQUFHLElBQUksRUFBRSxFQUFFLENBQ3hELElBQUEsZUFBSyxFQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO0FBRGxCLFFBQUEsUUFBUSxZQUNVIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHNsYXNoIGZyb20gXCJzbGFzaFwiXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiXG5cbmV4cG9ydCBjb25zdCBqb2luOiB0eXBlb2YgcGF0aC5qb2luID0gKC4uLmFyZ3MpID0+IHNsYXNoKHBhdGguam9pbiguLi5hcmdzKSlcblxuZXhwb3J0IHsgZGlybmFtZSB9IGZyb20gXCJwYXRoXCJcblxuZXhwb3J0IGNvbnN0IHJlc29sdmU6IHR5cGVvZiBwYXRoLnJlc29sdmUgPSAoLi4uYXJncykgPT5cbiAgc2xhc2gocGF0aC5yZXNvbHZlKC4uLmFyZ3MpKVxuXG5leHBvcnQgY29uc3QgcmVsYXRpdmU6IHR5cGVvZiBwYXRoLnJlbGF0aXZlID0gKC4uLmFyZ3MpID0+XG4gIHNsYXNoKHBhdGgucmVsYXRpdmUoLi4uYXJncykpXG4iXX0=