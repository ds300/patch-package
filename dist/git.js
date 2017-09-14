"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var spawnSafe_1 = require("./spawnSafe");
function getGitRootPath() {
    var result = spawnSafe_1.default("git", ["rev-parse", "--show-toplevel"], {
        logStdErrOnError: false,
        throwOnError: false,
    });
    if (result.status === 0) {
        return result.stdout.toString().trim();
    }
    else {
        return null;
    }
}
exports.getGitRootPath = getGitRootPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2dpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHlDQUFtQztBQUVuQztJQUNFLElBQU0sTUFBTSxHQUFHLG1CQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsV0FBVyxFQUFFLGlCQUFpQixDQUFDLEVBQUU7UUFDaEUsZ0JBQWdCLEVBQUUsS0FBSztRQUN2QixZQUFZLEVBQUUsS0FBSztLQUNwQixDQUFDLENBQUE7SUFFRixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDeEMsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sTUFBTSxDQUFDLElBQUksQ0FBQTtJQUNiLENBQUM7QUFDSCxDQUFDO0FBWEQsd0NBV0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc3Bhd25TYWZlIGZyb20gXCIuL3NwYXduU2FmZVwiXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRHaXRSb290UGF0aCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgcmVzdWx0ID0gc3Bhd25TYWZlKFwiZ2l0XCIsIFtcInJldi1wYXJzZVwiLCBcIi0tc2hvdy10b3BsZXZlbFwiXSwge1xuICAgIGxvZ1N0ZEVyck9uRXJyb3I6IGZhbHNlLFxuICAgIHRocm93T25FcnJvcjogZmFsc2UsXG4gIH0pXG5cbiAgaWYgKHJlc3VsdC5zdGF0dXMgPT09IDApIHtcbiAgICByZXR1cm4gcmVzdWx0LnN0ZG91dC50b1N0cmluZygpLnRyaW0oKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsXG4gIH1cbn1cbiJdfQ==