import fs from "fs-extra"
import { dirname } from "path"
import { ParsedPatchFile, FilePatch } from "./parse"

export const executeEffects = (
  effects: ParsedPatchFile,
  { dryRun }: { dryRun: boolean },
) => {
  effects.forEach(eff => {
    switch (eff.type) {
      case "file deletion":
        if (dryRun) {
          if (!fs.existsSync(eff.path)) {
            throw new Error(
              "Trying to delete file that doesn't exist: " + eff.path,
            )
          }
        } else {
          fs.unlinkSync(eff.path)
        }
        break
      case "rename":
        if (dryRun) {
          // TODO: see what patch files look like if moving to exising path
          if (!fs.existsSync(eff.fromPath)) {
            throw new Error(
              "Trying to move file that doesn't exist: " + eff.fromPath,
            )
          }
        } else {
          fs.moveSync(eff.fromPath, eff.toPath)
        }
        break
      case "file creation":
        if (dryRun) {
          if (fs.existsSync(eff.path)) {
            throw new Error(
              "Trying to create file that already exists: " + eff.path,
            )
          }
        } else {
          fs.ensureDirSync(dirname(eff.path))
          fs.writeFileSync(
            eff.path,
            eff.lines.join("\n") + (eff.noNewlineAtEndOfFile ? "" : "\n"),
            { mode: eff.mode },
          )
        }
        break
      case "patch":
        applyPatch(eff, { dryRun })
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

/**
 * How does noNewLineAtEndOfFile work?
 *
 * if you remove the newline from a file that had one without editing other bits:
 *
 *    it creates an insertion/removal pair where the insertion has \ No new line at end of file
 *
 * if you edit a file that didn't have a new line and don't add one:
 *
 *    both insertion and deletion have \ No new line at end of file
 *
 * if you edit a file that didn't have a new line and add one:
 *
 *    deletion has \ No new line at end of file
 *    but not insertion
 *
 * if you edit a file that had a new line and leave it in:
 *
 *    neither insetion nor deletion have the annoation
 *
 */

function applyPatch(
  { parts, path }: FilePatch,
  { dryRun }: { dryRun: boolean },
): void {
  // modifying the file in place
  const fileContents = fs.readFileSync(path).toString()

  const fileLines: string[] = fileContents.split(/\n/)

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
            fileLines.splice(
              contextIndex - part.lines.length,
              part.lines.length,
            )
            contextIndex -= part.lines.length

            if (part.noNewlineAtEndOfFile) {
              fileLines.push("")
            }
          }
          break
        case "insertion":
          fileLines.splice(contextIndex, 0, ...part.lines)
          contextIndex += part.lines.length
          if (part.noNewlineAtEndOfFile) {
            if (contextIndex !== fileLines.length - 1) {
              throw new Error("Invalid patch application state.")
            }
            fileLines.pop()
          }
          break
      }
    }
  }

  if (!dryRun) {
    fs.writeFileSync(path, fileLines.join("\n"))
  }
}
