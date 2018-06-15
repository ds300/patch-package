import { parsePatch } from "./parse"
import { applyPatchFile, Effect } from "./apply"
import { reversePatch } from "./reverse"

export const patch = (
  patchFileContents: string,
  {
    reverse = false,
  }: {
    reverse?: boolean
  } = {},
): Effect[] => {
  let parsedPatch = parsePatch(patchFileContents)

  if (reverse) {
    parsedPatch = reversePatch(parsedPatch)
  }

  return applyPatchFile(parsedPatch)
}
