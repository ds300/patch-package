import { execSync as exec } from "child_process"

export default function applyPatch(patchFilePath: string, packageName: string) {
  try {
    exec("patch --forward -p1 -i " + patchFilePath)
    console.log(`Successfully patched ${packageName}`)
  } catch (e) {
    // patch cli tool has no way to fail gracefully if patch was already applied,
    // so to check, we need to try a dry-run of applying the patch in reverse, and
    // if that works it means the patch was already applied sucessfully. Otherwise
    // the patch just failed for some reason.
    exec("patch --reverse --dry-run -p1 -i " + patchFilePath)
    console.log(`Already patched ${packageName}`)
  }
}
