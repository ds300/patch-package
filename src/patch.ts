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
  const patch = parsePatch(patchFileContents)

  return applyPatchFile(reverse ? reversePatch(patch) : patch)
}
