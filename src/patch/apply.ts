import fs from "fs-extra"
import { dirname } from "path"
import { ParsedPatchFile, FilePatch } from "./parse"
import { assertNever } from "../assertNever"

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
          // TODO: integrity checks
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
          // todo: check file contents matches
        } else {
          const fileContents = eff.hunk
            ? eff.hunk.parts[0].lines.join("\n") +
              (eff.hunk.parts[0].noNewlineAtEndOfFile ? "" : "\n")
            : ""
          fs.ensureDirSync(dirname(eff.path))
          fs.writeFileSync(eff.path, fileContents, { mode: eff.mode })
        }
        break
      case "patch":
        applyPatch(eff, { dryRun })
        break
      case "mode change":
        const currentMode = fs.statSync(eff.path).mode
        if (
          (isExecutable(eff.newMode) && isExecutable(currentMode)) ||
          (!isExecutable(eff.newMode) && !isExecutable(currentMode))
        ) {
          throw new Error("Mode change is not required")
        }
        fs.chmodSync(eff.path, eff.newMode)
        break
      default:
        assertNever(eff)
    }
  })
}

function isExecutable(fileMode: number) {
  // tslint:disable-next-line:no-bitwise
  return (fileMode & 0b001_000_000) > 0
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
  { hunks, path }: FilePatch,
  { dryRun }: { dryRun: boolean },
): void {
  // modifying the file in place
  const fileContents = fs.readFileSync(path).toString()
  const mode = fs.statSync(path).mode

  const fileLines: string[] = fileContents.split(/\n/)

  // when adding or removing lines from a file, gotta
  // make sure that the original lines in hunk headers match up
  // this effectively measures the total +/- in line count during the course
  // of the patching process
  let contextIndexOffset = 0

  for (const { parts, header } of hunks) {
    // contextIndex is the offest from the hunk header start but in the original file
    let contextIndex = header.original.start - 1 + contextIndexOffset

    contextIndexOffset += header.patched.length - header.original.length

    for (const part of parts) {
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
        default:
          assertNever(part.type)
      }
    }
  }

  if (!dryRun) {
    fs.writeFileSync(path, fileLines.join("\n"), { mode })
  }
}
