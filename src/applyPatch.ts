import * as fs from "fs-extra"
import { ParsedPatchFile, FilePatch } from "./parsePatch"

export type Effect =
  | {
      type: "file deletion"
      path: string
      lines: string[]
      mode: number
      noNewlineAtEndOfFile: boolean
    }
  | {
      type: "rename"
      fromPath: string
      toPath: string
    }
  | {
      type: "file creation"
      path: string
      lines: string[]
      mode: number
      noNewlineAtEndOfFile: boolean
    }
  | {
      type: "replace"
      path: string
      lines: string[]
      noNewlineAtEndOfFile: boolean
    }

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
        fs.writeFileSync(
          eff.path,
          eff.lines.join("\n") + (eff.noNewlineAtEndOfFile ? "" : "\n"),
          { mode: eff.mode },
        )
        break
      case "replace":
        fs.writeFileSync(
          eff.path,
          eff.lines.join("\n") + (eff.noNewlineAtEndOfFile ? "" : "\n"),
        )
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

  const fileLines: string[] = fileContents.split(/\n/)
  if (fileLines[fileLines.length - 1] === "") {
    fileLines.pop()
  }

  let noNewlineAtEndOfFile = true

  // when adding or removing lines from a file, gotta
  // make sure that the original lines in hunk headers match up
  // this effectively measures the total +/- in line count during the course
  // of the patching process
  let contextIndexOffset = 0

  let i = 0
  while (i < parts.length) {
    const hunkHeader = parts[i++]
    if (hunkHeader.type !== "hunk header") {
      throw new Error("expecting hunk header but got " + hunkHeader.type)
    }

    // contextIndex is the offest from the hunk header start but in the original file
    let contextIndex = hunkHeader.original.start - 1 + contextIndexOffset

    contextIndexOffset += hunkHeader.patched.length - hunkHeader.original.length

    while (i < parts.length && parts[i].type !== "hunk header") {
      const part = parts[i++]
      switch (part.type) {
        case "deletion":
        case "context":
          for (const line of part.lines) {
            const originalLine = fileLines[contextIndex]
            assertLineEquality(originalLine, line)
            contextIndex++
          }

          if (part.type === "deletion") {
            // console.log("bill deleter", fileLines, part.lines)
            // console.log(
            //   "splicin'",
            //   contextIndex - part.lines.length,
            //   part.lines.length,
            // )
            fileLines.splice(
              contextIndex - part.lines.length,
              part.lines.length,
            )
            contextIndex -= part.lines.length

            if (contextIndex >= fileLines.length) {
              if (
                (hunkHeader.patched.length > 0 && part.noNewlineAtEndOfFile) ||
                (parts[i - 2] &&
                  (parts[i - 2].type === "insertion" ||
                    parts[i - 2].type === "context") &&
                  !(parts[i - 2] as any).noNewlineAtEndOfFile)
              ) {
                // delete the fact that there was no newline at the end of the file
                // by adding a newline to the end of the file
                noNewlineAtEndOfFile = false
              }
            }
            // console.log("bill deleted", fileLines, part.lines)
          } else {
            if (contextIndex >= fileLines.length) {
              noNewlineAtEndOfFile = part.noNewlineAtEndOfFile
            }
          }
          break
        case "insertion":
          // console.log("inserting", fileLines, part.lines)
          fileLines.splice(contextIndex, 0, ...part.lines)
          contextIndex += part.lines.length
          if (contextIndex >= fileLines.length) {
            noNewlineAtEndOfFile = part.noNewlineAtEndOfFile
          }
          // console.log("done", fileLines, part.lines)
          break
      }
    }
  }

  return {
    type: "replace",
    noNewlineAtEndOfFile,
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
