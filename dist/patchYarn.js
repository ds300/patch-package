"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = require("chalk");
var fs_1 = require("fs");
var path_1 = require("path");
var applyPatches_1 = require("./applyPatches");
var chalk_2 = require("chalk");
var yarnPatchFile = path_1.join(__dirname, "../yarn.patch");
function patchYarn(appPath) {
    try {
        applyPatches_1.applyPatch(yarnPatchFile);
        var yarnVersion = require(path_1.join(appPath, "node_modules", "yarn", "package.json")).version;
        console.log(chalk_2.bold("yarn") + "@" + yarnVersion + " " + chalk_2.green("✔"));
    }
    catch (e) {
        if (fs_1.existsSync(path_1.join(appPath, "node_modules", "yarn"))) {
            printIncompatibleYarnError();
        }
        else {
            printNoYarnWarning();
        }
    }
}
exports.default = patchYarn;
function printIncompatibleYarnError() {
    console.error("\n" + chalk_1.red.bold("***ERROR***") + "\n" + chalk_1.red("This version of patch-package in incompatible with your current local\nversion of yarn. Please update both.") + "\n");
}
function printNoYarnWarning() {
    console.warn("\n" + chalk_1.yellow.bold("***Warning***") + "\nYou asked patch-package to patch yarn, but you don't seem to have yarn installed\n");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2hZYXJuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3BhdGNoWWFybi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtCQUFtQztBQUNuQyx5QkFBK0I7QUFDL0IsNkJBQTJCO0FBQzNCLCtDQUEyQztBQUMzQywrQkFBbUM7QUFFbkMsSUFBTSxhQUFhLEdBQUcsV0FBSSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQTtBQUV0RCxtQkFBa0MsT0FBZTtJQUMvQyxJQUFJLENBQUM7UUFDSCx5QkFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3pCLElBQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFJLENBQzlCLE9BQU8sRUFDUCxjQUFjLEVBQ2QsTUFBTSxFQUNOLGNBQWMsQ0FDZixDQUFDLENBQUMsT0FBTyxDQUFBO1FBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBSSxZQUFJLENBQUMsTUFBTSxDQUFDLFNBQUksV0FBVyxTQUFJLGFBQUssQ0FBQyxHQUFHLENBQUcsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1gsRUFBRSxDQUFDLENBQUMsZUFBVSxDQUFDLFdBQUksQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RELDBCQUEwQixFQUFFLENBQUE7UUFDOUIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sa0JBQWtCLEVBQUUsQ0FBQTtRQUN0QixDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFqQkQsNEJBaUJDO0FBRUQ7SUFDRSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQ2QsV0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsVUFDdkIsV0FBRyxDQUFDLDZHQUMrQixDQUFDLE9BQ3JDLENBQUMsQ0FBQTtBQUNGLENBQUM7QUFFRDtJQUNFLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FDYixjQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyx5RkFFN0IsQ0FBQyxDQUFBO0FBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlZCwgeWVsbG93IH0gZnJvbSBcImNoYWxrXCJcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tIFwiZnNcIlxuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJwYXRoXCJcbmltcG9ydCB7IGFwcGx5UGF0Y2ggfSBmcm9tIFwiLi9hcHBseVBhdGNoZXNcIlxuaW1wb3J0IHsgYm9sZCwgZ3JlZW4gfSBmcm9tIFwiY2hhbGtcIlxuXG5jb25zdCB5YXJuUGF0Y2hGaWxlID0gam9pbihfX2Rpcm5hbWUsIFwiLi4veWFybi5wYXRjaFwiKVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwYXRjaFlhcm4oYXBwUGF0aDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgYXBwbHlQYXRjaCh5YXJuUGF0Y2hGaWxlKVxuICAgIGNvbnN0IHlhcm5WZXJzaW9uID0gcmVxdWlyZShqb2luKFxuICAgICAgYXBwUGF0aCxcbiAgICAgIFwibm9kZV9tb2R1bGVzXCIsXG4gICAgICBcInlhcm5cIixcbiAgICAgIFwicGFja2FnZS5qc29uXCIsXG4gICAgKSkudmVyc2lvblxuICAgIGNvbnNvbGUubG9nKGAke2JvbGQoXCJ5YXJuXCIpfUAke3lhcm5WZXJzaW9ufSAke2dyZWVuKFwi4pyUXCIpfWApXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZXhpc3RzU3luYyhqb2luKGFwcFBhdGgsIFwibm9kZV9tb2R1bGVzXCIsIFwieWFyblwiKSkpIHtcbiAgICAgIHByaW50SW5jb21wYXRpYmxlWWFybkVycm9yKClcbiAgICB9IGVsc2Uge1xuICAgICAgcHJpbnROb1lhcm5XYXJuaW5nKClcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJpbnRJbmNvbXBhdGlibGVZYXJuRXJyb3IoKSB7XG4gIGNvbnNvbGUuZXJyb3IoYFxuJHtyZWQuYm9sZChcIioqKkVSUk9SKioqXCIpfVxuJHtyZWQoYFRoaXMgdmVyc2lvbiBvZiBwYXRjaC1wYWNrYWdlIGluIGluY29tcGF0aWJsZSB3aXRoIHlvdXIgY3VycmVudCBsb2NhbFxudmVyc2lvbiBvZiB5YXJuLiBQbGVhc2UgdXBkYXRlIGJvdGguYCl9XG5gKVxufVxuXG5mdW5jdGlvbiBwcmludE5vWWFybldhcm5pbmcoKSB7XG4gIGNvbnNvbGUud2FybihgXG4ke3llbGxvdy5ib2xkKFwiKioqV2FybmluZyoqKlwiKX1cbllvdSBhc2tlZCBwYXRjaC1wYWNrYWdlIHRvIHBhdGNoIHlhcm4sIGJ1dCB5b3UgZG9uJ3Qgc2VlbSB0byBoYXZlIHlhcm4gaW5zdGFsbGVkXG5gKVxufVxuIl19