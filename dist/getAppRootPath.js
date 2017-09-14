"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var process = require("process");
function getAppRootPath() {
    var cwd = process.cwd();
    while (!fs.existsSync(path.join(cwd, "package.json"))) {
        cwd = path.resolve(cwd, "../");
    }
    return cwd;
}
exports.default = getAppRootPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0QXBwUm9vdFBhdGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0QXBwUm9vdFBhdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1QkFBd0I7QUFDeEIsMkJBQTRCO0FBQzVCLGlDQUFrQztBQUVsQztJQUNFLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUN2QixPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdEQsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2hDLENBQUM7SUFDRCxNQUFNLENBQUMsR0FBRyxDQUFBO0FBQ1osQ0FBQztBQU5ELGlDQU1DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIlxuaW1wb3J0ICogYXMgcHJvY2VzcyBmcm9tIFwicHJvY2Vzc1wiXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldEFwcFJvb3RQYXRoKCkge1xuICBsZXQgY3dkID0gcHJvY2Vzcy5jd2QoKVxuICB3aGlsZSAoIWZzLmV4aXN0c1N5bmMocGF0aC5qb2luKGN3ZCwgXCJwYWNrYWdlLmpzb25cIikpKSB7XG4gICAgY3dkID0gcGF0aC5yZXNvbHZlKGN3ZCwgXCIuLi9cIilcbiAgfVxuICByZXR1cm4gY3dkXG59XG4iXX0=