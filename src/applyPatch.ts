import * as fs from "fs-extra"
import { ParsedPatchFile, FilePatch } from "./parsePatch"

export type Effect =
  | { type: "file deletion"; path: string; lines: string[] }
  | { type: "rename"; fromPath: string; toPath: string }
  | { type: "file creation"; path: string; lines: string[] }
  | { type: "replace"; path: string; lines: string[] }

export function executeEffects(effects: Effect[]) {
  effects.forEach(eff => {
    switch (eff.type) {
      case "file deletion":
        fs.unlinkSync(eff.path)
        break
      case "rename":
        fs.moveSync(eff.fromPath, eff.toPath)
        break
      case "file creation":
        fs.writeFileSync(eff.path, eff.lines.join("\n"))
        break
      case "replace":
        fs.writeFileSync(eff.path, eff.lines.join("\n"))
        break
    }
  })
}

const trimRight = (s: string) => s.replace(/\s+$/, "")
function assertLineEquality(onDisk: string, expected: string) {
  if (trimRight(onDisk) !== trimRight(expected)) {
    throw new Error(
      `Line mismatch

  Expected:  ${JSON.stringify(expected)}
  Observed:  ${JSON.stringify(onDisk)}

`,
    )
  }
}

function applyPatch({ parts, path }: FilePatch): Effect {
  // modifying the file in place
  // check to see if the file has moved first
  const fileContents = fs.readFileSync(path).toString()

  const fileLines: string[] =
    fileContents === "" ? [] : fileContents.split(/\n/)

  let i = 0
  while (i < parts.length) {
    const hunkHeader = parts[i++]
    if (hunkHeader.type !== "hunk header") {
      throw new Error("expecting hunk header but got " + hunkHeader.type)
    }

    // contextIndex is the offest from the hunk header start but in the original file
    let contextIndex = 0

    while (i < parts.length && parts[i].type !== "hunk header") {
      const part = parts[i++]
      switch (part.type) {
        case "deletion":
        case "context":
          for (const line of part.lines) {
            const originalLine =
              fileLines[hunkHeader.original.start - 1 + contextIndex]
            assertLineEquality(originalLine, line)
            contextIndex++
          }

          if (part.type === "deletion") {
            fileLines.splice(
              hunkHeader.original.start - 1 + contextIndex - part.lines.length,
              part.lines.length,
            )
            contextIndex -= part.lines.length
          }
          break
        case "insertion":
          fileLines.splice(
            hunkHeader.original.start - 1 + contextIndex,
            0,
            ...part.lines,
          )
          contextIndex += part.lines.length
          if (i === parts.length) {
            if (part.noNewlineAtEndOfFile) {
              while (!fileLines[fileLines.length - 1]) {
                fileLines.pop()
              }
            } else {
              if (fileLines[fileLines.length - 1]) {
                fileLines.push("")
              }
            }
          }
          break
      }
    }
  }

  return {
    type: "replace",
    path,
    lines: fileLines,
  }
}

export function applyPatchFile(patch: ParsedPatchFile): Effect[] {
  const effects: Effect[] = []

  for (const part of patch) {
    switch (part.type) {
      case "file creation":
      case "file deletion":
      case "rename":
        effects.push(part)
        break
      case "patch":
        effects.push(applyPatch(part))
    }
  }

  return effects
}
