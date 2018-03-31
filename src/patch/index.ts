import { parsePatch } from "./parse"
import { applyPatchFile, Effect } from "./apply"
import { reversePatch } from "./reverse"

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
