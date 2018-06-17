import { ParsedPatchFile, PatchFilePart, PatchHunk } from "./parse"

function reverseHunks(hunks: PatchHunk[]): PatchHunk[] {
  const result: PatchHunk[] = []

  for (let i = 0; i < hunks.length; i++) {
    const hunk = hunks[i]
    switch (hunk.type) {
      case "hunk header":
        result.push({
          type: "hunk header",
          original: hunk.patched,
          patched: hunk.original,
        })
        break
      case "deletion":
        result.push({
          ...hunk,
          type: "insertion",
        })
        break
      case "insertion":
        result.push({
          ...hunk,
          type: "deletion",
        })
        break
      case "context":
        result.push(hunk)
        break
    }
  }
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i].type === "insertion" && result[i + 1].type === "deletion") {
      const tmp = result[i]
      result[i] = result[i + 1]
      result[i + 1] = tmp
      i += 1
    }
  }

  return result
}

export const reversePatch = (patch: ParsedPatchFile): ParsedPatchFile => {
  return patch
    .map((part: PatchFilePart): PatchFilePart => {
      switch (part.type) {
        case "file creation":
          return {
            type: "file deletion",
            path: part.path,
            lines: part.lines,
            mode: part.mode,
            noNewlineAtEndOfFile: part.noNewlineAtEndOfFile,
          }
        case "file deletion":
          return {
            type: "file creation",
            path: part.path,
            lines: part.lines,
            mode: part.mode,
            noNewlineAtEndOfFile: part.noNewlineAtEndOfFile,
          }
        case "rename":
          return {
            type: "rename",
            fromPath: part.toPath,
            toPath: part.fromPath,
          }
        case "patch":
          return {
            type: "patch",
            path: part.path,
            parts: reverseHunks(part.parts),
          }
        default:
          throw new Error()
      }
    })
    .reverse()
}
