"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.coerceSemVer = coerceSemVer;
const semver_1 = __importDefault(require("semver"));
function coerceSemVer(version) {
    var _a;
    return ((_a = semver_1.default.coerce(version)) === null || _a === void 0 ? void 0 : _a.version) || null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29lcmNlU2VtVmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NvZXJjZVNlbVZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUVBLG9DQUVDO0FBSkQsb0RBQTJCO0FBRTNCLFNBQWdCLFlBQVksQ0FBQyxPQUFlOztJQUMxQyxPQUFPLENBQUEsTUFBQSxnQkFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsMENBQUUsT0FBTyxLQUFJLElBQUksQ0FBQTtBQUNoRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHNlbXZlciBmcm9tIFwic2VtdmVyXCJcblxuZXhwb3J0IGZ1bmN0aW9uIGNvZXJjZVNlbVZlcih2ZXJzaW9uOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgcmV0dXJuIHNlbXZlci5jb2VyY2UodmVyc2lvbik/LnZlcnNpb24gfHwgbnVsbFxufVxuIl19