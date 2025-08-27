"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPatch = readPatch;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = require("fs-extra");
const path_1 = require("../path");
const path_2 = require("path");
const parse_1 = require("./parse");
function readPatch({ patchFilePath, patchDetails, patchDir, }) {
    try {
        return (0, parse_1.parsePatchFile)((0, fs_extra_1.readFileSync)(patchFilePath).toString());
    }
    catch (e) {
        const fixupSteps = [];
        const relativePatchFilePath = (0, path_2.normalize)((0, path_1.relative)(process.cwd(), patchFilePath));
        const patchBaseDir = relativePatchFilePath.slice(0, relativePatchFilePath.indexOf(patchDir));
        if (patchBaseDir) {
            fixupSteps.push(`cd ${patchBaseDir}`);
        }
        fixupSteps.push(`patch -p1 -i ${relativePatchFilePath.slice(relativePatchFilePath.indexOf(patchDir))}`);
        fixupSteps.push(`npx patch-package ${patchDetails.pathSpecifier}`);
        if (patchBaseDir) {
            fixupSteps.push(`cd ${(0, path_1.relative)((0, path_1.resolve)(process.cwd(), patchBaseDir), process.cwd())}`);
        }
        console.log(`
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red(`Failed to apply patch for package ${chalk_1.default.bold(patchDetails.humanReadablePathSpecifier)}`)}
    
  This happened because the patch file ${relativePatchFilePath} could not be parsed.
   
  If you just upgraded patch-package, you can try running:
  
    ${fixupSteps.join("\n    ")}
    
  Otherwise, try manually creating the patch file again.
  
  If the problem persists, please submit a bug report:
  
    https://github.com/ds300/patch-package/issues/new?title=Patch+file+parse+error&body=%3CPlease+attach+the+patch+file+in+question%3E

`);
        process.exit(1);
    }
    return [];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9wYXRjaC9yZWFkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBT0EsOEJBMERDO0FBakVELGtEQUF5QjtBQUN6Qix1Q0FBdUM7QUFDdkMsa0NBQTJDO0FBQzNDLCtCQUFnQztBQUVoQyxtQ0FBdUQ7QUFFdkQsU0FBZ0IsU0FBUyxDQUFDLEVBQ3hCLGFBQWEsRUFDYixZQUFZLEVBQ1osUUFBUSxHQUtUO0lBQ0MsSUFBSSxDQUFDO1FBQ0gsT0FBTyxJQUFBLHNCQUFjLEVBQUMsSUFBQSx1QkFBWSxFQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDWCxNQUFNLFVBQVUsR0FBYSxFQUFFLENBQUE7UUFDL0IsTUFBTSxxQkFBcUIsR0FBRyxJQUFBLGdCQUFTLEVBQ3JDLElBQUEsZUFBUSxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FDdkMsQ0FBQTtRQUNELE1BQU0sWUFBWSxHQUFHLHFCQUFxQixDQUFDLEtBQUssQ0FDOUMsQ0FBQyxFQUNELHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FDeEMsQ0FBQTtRQUNELElBQUksWUFBWSxFQUFFLENBQUM7WUFDakIsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLFlBQVksRUFBRSxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUNELFVBQVUsQ0FBQyxJQUFJLENBQ2IsZ0JBQWdCLHFCQUFxQixDQUFDLEtBQUssQ0FDekMscUJBQXFCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUN4QyxFQUFFLENBQ0osQ0FBQTtRQUNELFVBQVUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO1FBQ2xFLElBQUksWUFBWSxFQUFFLENBQUM7WUFDakIsVUFBVSxDQUFDLElBQUksQ0FDYixNQUFNLElBQUEsZUFBUSxFQUFDLElBQUEsY0FBTyxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUN0RSxDQUFBO1FBQ0gsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUM7RUFDZCxlQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxlQUFLLENBQUMsR0FBRyxDQUNwQyxxQ0FBcUMsZUFBSyxDQUFDLElBQUksQ0FDN0MsWUFBWSxDQUFDLDBCQUEwQixDQUN4QyxFQUFFLENBQ0o7O3lDQUVvQyxxQkFBcUI7Ozs7TUFJeEQsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7Ozs7Ozs7O0NBUTlCLENBQUMsQ0FBQTtRQUNFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakIsQ0FBQztJQUNELE9BQU8sRUFBRSxDQUFBO0FBQ1gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tIFwiY2hhbGtcIlxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSBcImZzLWV4dHJhXCJcbmltcG9ydCB7IHJlbGF0aXZlLCByZXNvbHZlIH0gZnJvbSBcIi4uL3BhdGhcIlxuaW1wb3J0IHsgbm9ybWFsaXplIH0gZnJvbSBcInBhdGhcIlxuaW1wb3J0IHsgUGFja2FnZURldGFpbHMgfSBmcm9tIFwiLi4vUGFja2FnZURldGFpbHNcIlxuaW1wb3J0IHsgcGFyc2VQYXRjaEZpbGUsIFBhdGNoRmlsZVBhcnQgfSBmcm9tIFwiLi9wYXJzZVwiXG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkUGF0Y2goe1xuICBwYXRjaEZpbGVQYXRoLFxuICBwYXRjaERldGFpbHMsXG4gIHBhdGNoRGlyLFxufToge1xuICBwYXRjaEZpbGVQYXRoOiBzdHJpbmdcbiAgcGF0Y2hEZXRhaWxzOiBQYWNrYWdlRGV0YWlsc1xuICBwYXRjaERpcjogc3RyaW5nXG59KTogUGF0Y2hGaWxlUGFydFtdIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcGFyc2VQYXRjaEZpbGUocmVhZEZpbGVTeW5jKHBhdGNoRmlsZVBhdGgpLnRvU3RyaW5nKCkpXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zdCBmaXh1cFN0ZXBzOiBzdHJpbmdbXSA9IFtdXG4gICAgY29uc3QgcmVsYXRpdmVQYXRjaEZpbGVQYXRoID0gbm9ybWFsaXplKFxuICAgICAgcmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgcGF0Y2hGaWxlUGF0aCksXG4gICAgKVxuICAgIGNvbnN0IHBhdGNoQmFzZURpciA9IHJlbGF0aXZlUGF0Y2hGaWxlUGF0aC5zbGljZShcbiAgICAgIDAsXG4gICAgICByZWxhdGl2ZVBhdGNoRmlsZVBhdGguaW5kZXhPZihwYXRjaERpciksXG4gICAgKVxuICAgIGlmIChwYXRjaEJhc2VEaXIpIHtcbiAgICAgIGZpeHVwU3RlcHMucHVzaChgY2QgJHtwYXRjaEJhc2VEaXJ9YClcbiAgICB9XG4gICAgZml4dXBTdGVwcy5wdXNoKFxuICAgICAgYHBhdGNoIC1wMSAtaSAke3JlbGF0aXZlUGF0Y2hGaWxlUGF0aC5zbGljZShcbiAgICAgICAgcmVsYXRpdmVQYXRjaEZpbGVQYXRoLmluZGV4T2YocGF0Y2hEaXIpLFxuICAgICAgKX1gLFxuICAgIClcbiAgICBmaXh1cFN0ZXBzLnB1c2goYG5weCBwYXRjaC1wYWNrYWdlICR7cGF0Y2hEZXRhaWxzLnBhdGhTcGVjaWZpZXJ9YClcbiAgICBpZiAocGF0Y2hCYXNlRGlyKSB7XG4gICAgICBmaXh1cFN0ZXBzLnB1c2goXG4gICAgICAgIGBjZCAke3JlbGF0aXZlKHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgcGF0Y2hCYXNlRGlyKSwgcHJvY2Vzcy5jd2QoKSl9YCxcbiAgICAgIClcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgXG4ke2NoYWxrLnJlZC5ib2xkKFwiKipFUlJPUioqXCIpfSAke2NoYWxrLnJlZChcbiAgICAgIGBGYWlsZWQgdG8gYXBwbHkgcGF0Y2ggZm9yIHBhY2thZ2UgJHtjaGFsay5ib2xkKFxuICAgICAgICBwYXRjaERldGFpbHMuaHVtYW5SZWFkYWJsZVBhdGhTcGVjaWZpZXIsXG4gICAgICApfWAsXG4gICAgKX1cbiAgICBcbiAgVGhpcyBoYXBwZW5lZCBiZWNhdXNlIHRoZSBwYXRjaCBmaWxlICR7cmVsYXRpdmVQYXRjaEZpbGVQYXRofSBjb3VsZCBub3QgYmUgcGFyc2VkLlxuICAgXG4gIElmIHlvdSBqdXN0IHVwZ3JhZGVkIHBhdGNoLXBhY2thZ2UsIHlvdSBjYW4gdHJ5IHJ1bm5pbmc6XG4gIFxuICAgICR7Zml4dXBTdGVwcy5qb2luKFwiXFxuICAgIFwiKX1cbiAgICBcbiAgT3RoZXJ3aXNlLCB0cnkgbWFudWFsbHkgY3JlYXRpbmcgdGhlIHBhdGNoIGZpbGUgYWdhaW4uXG4gIFxuICBJZiB0aGUgcHJvYmxlbSBwZXJzaXN0cywgcGxlYXNlIHN1Ym1pdCBhIGJ1ZyByZXBvcnQ6XG4gIFxuICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9kczMwMC9wYXRjaC1wYWNrYWdlL2lzc3Vlcy9uZXc/dGl0bGU9UGF0Y2grZmlsZStwYXJzZStlcnJvciZib2R5PSUzQ1BsZWFzZSthdHRhY2grdGhlK3BhdGNoK2ZpbGUraW4rcXVlc3Rpb24lM0VcblxuYClcbiAgICBwcm9jZXNzLmV4aXQoMSlcbiAgfVxuICByZXR1cm4gW11cbn1cbiJdfQ==