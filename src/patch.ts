import { parsePatch } from "./parsePatch"
import { applyPatchFile, Effect } from "./applyPatch"
import { reversePatch } from "./reversePatch"

export function patch(
  patchFileContents: string,
  {
    reverse = false,
  }: {
    reverse?: boolean
  } = {},
): Effect[] {
  let patch = parsePatch(patchFileContents)

  if (reverse) {
    patch = reversePatch(patch)
  }

  // console.dir(patch, {depth: 5})

  return applyPatchFile(patch)
}
