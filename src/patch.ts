import * as fs from "fs-extra"

type HunkHeaderLineParseResult =
  | {
      error: true
      message: string
    }
  | {
      error: false
      original: {
        start: number
        length: number
      }
      patched: {
        start: number
        length: number
      }
    }

export function parseHunkHeaderLine(
  headerLine: string,
): HunkHeaderLineParseResult {
  const match = headerLine
    .trim()
    .match(/^@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@.*/)
  if (!match) {
    return { error: true, message: `Bad header line: '${headerLine}'` }
  }

  return {
    error: false,
    original: {
      start: Number(match[1]),
      length: Number(match[3] || 0),
    },
    patched: {
      start: Number(match[4]),
      length: Number(match[6] || 0),
    },
  }
}

const trimRight = (s: string) => s.replace(/\s+$/, "")

function invertPatchFileLines(lines: string[]): boolean {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith("--- ")) {
      // switch over startPath and endPath
      const other = lines[i + 1]
      if (line.startsWith("--- /dev/null")) {
        lines[i + 1] = "+++ /dev/null"
        lines[i] = "--- a/" + other.slice("+++ b/".length)
      } else {
        lines[i + 1] = "+++ b/" + line.slice("--- a/".length)
        if (other.startsWith("+++ /dev/null")) {
          lines[i] = "--- /dev/null"
        } else {
          lines[i] = "--- a/" + other.slice("+++ b/".length)
        }
      }
      i++
    } else if (line.startsWith("rename from ")) {
      const fromName = line.slice("rename from ".length)
      const toName = line.slice("rename to ".length)
      lines[i] = "rename from " + toName
      lines[++i] = "rename to " + fromName
    } else if (line.startsWith("@@ ")) {
      const result = parseHunkHeaderLine(line)
      if (result.error) {
        return false
      }
      const { original, patched } = result
      lines[
        i
      ] = `@@ -${patched.start},${patched.length} +${original.start},${original.length} @@`
    } else if (line.startsWith("-")) {
      lines[i] = "+" + line.slice(1)
    } else if (line.startsWith("+")) {
      lines[i] = "-" + line.slice(1)
    }
  }
  return true
}

type Effect =
  | { type: "delete"; path: string }
  | { type: "rename"; fromPath: string; toPath: string }
  | { type: "create"; path: string; contents: string }

export function executeEffects(effects: Effect[]) {
  effects.forEach(eff => {
    switch (eff.type) {
      case "delete":
        fs.unlinkSync(eff.path)
        break
      case "rename":
        fs.moveSync(eff.fromPath, eff.toPath)
        break
      case "create":
        fs.writeFileSync(eff.path, eff.contents)
        break
    }
  })
}

type PatchResult =
  | {
      error: false
      effects: Effect[]
    }
  | {
      error: true
      message?: string
    }

export function patch(
  patchFileContents: string,
  {
    reverse = false,
  }: {
    reverse?: boolean
  } = {},
): PatchResult {
  const effects: Effect[] = []
  // invert patch file here first

  const patchFileLines = patchFileContents.split(/\r?\n/)

  if (reverse && !invertPatchFileLines(patchFileLines)) {
    return {
      error: true,
      message: "failed to reverse patch file",
    }
  }

  const moves: Record<string, string> = {}

  let i = 0
  while (i < patchFileLines.length) {
    const line = patchFileLines[i++].trim()
    if (!line.startsWith("---") && !line.startsWith("rename from")) {
      continue
    }

    if (line.startsWith("rename from")) {
      const fromPath = line.slice("rename from ".length)
      const toPath = patchFileLines[i++].slice("rename to ".length).trim()
      moves[fromPath] = toPath
      effects.push({ type: "rename", fromPath, toPath })
      continue
    }

    const startPath = line.slice("--- ".length)
    const endPath = patchFileLines[i++].trim().slice("--- ".length)

    if (endPath === "/dev/null") {
      // deleting a file
      // just get rid of that noise
      // slice of the 'a/'
      effects.push({
        type: "delete",
        path: startPath.slice(2),
      })
      // ignore hunk header
      const result = parseHunkHeaderLine(patchFileLines[i++])
      if (result.error) {
        return result
      }
      // ignore all -lines
      // TODO: check that the lines match the file
      while (i < patchFileLines.length && patchFileLines[i].startsWith("-")) {
        i++
      }
    } else if (startPath === "/dev/null") {
      // creating a new file
      // just grab all the contents and put it in the file
      const result = parseHunkHeaderLine(patchFileLines[i++])
      if (result.error) {
        return result
      }
      const { patched: { length } } = result
      const fileLines = []
      while (i < patchFileLines.length && patchFileLines[i].startsWith("+")) {
        fileLines.push(patchFileLines[i++].slice(1))
      }
      if (fileLines.length !== length) {
        console.warn(
          "hunk length mismatch :( expected",
          length,
          "got",
          fileLines.length,
        )
      }
      effects.push({
        type: "create",
        path: endPath.slice(2),
        contents: fileLines.join("\n"),
      })
    } else {
      // modifying the file in place
      // check to see if the file has moved first
      const startPathCanonical =
        moves[startPath.slice(2).trim()] || startPath.slice(2)
      const fileLines = fs
        .readFileSync(startPathCanonical)
        .toString()
        .split(/\r?\n/)

      // iterate over hunks
      while (i < patchFileLines.length && patchFileLines[i].startsWith("@@")) {
        const hunkHeader = parseHunkHeaderLine(patchFileLines[i++])
        if (hunkHeader.error) {
          return hunkHeader
        }

        // contextIndex is the offest from the hunk header start but in the original file
        let contextIndex = 0
        while (
          i < patchFileLines.length &&
          patchFileLines[i].match(/^(\+|-| ).*/)
        ) {
          while (
            i < patchFileLines.length &&
            patchFileLines[i].startsWith(" ")
          ) {
            // context line
            // check it's the same as in the file
            const fromPatchFile = trimRight(patchFileLines[i++].slice(1))
            const fromActualFile = trimRight(
              fileLines[hunkHeader.original.start - 1 + contextIndex++],
            )
            if (fromPatchFile !== fromActualFile) {
              return {
                error: true,
                message: `mismatched lines \n  ${JSON.stringify(
                  fromPatchFile,
                )} \n  ${JSON.stringify(fromActualFile)}`,
              }
            }
          }
          while (
            i < patchFileLines.length &&
            patchFileLines[i].startsWith("-")
          ) {
            // delete the line
            // check it's the same as in the file
            if (
              trimRight(patchFileLines[i++].slice(1)) !==
              trimRight(fileLines[hunkHeader.original.start - 1 + contextIndex])
            ) {
              return {
                error: true,
                message: `mismatched lines '${patchFileLines[i - 1].slice(
                  1,
                )}' and '${fileLines[
                  hunkHeader.original.start - 1 + contextIndex
                ]}'`,
              }
            }
            // all good then delete the shizz
            fileLines.splice(hunkHeader.original.start - 1 + contextIndex, 1)
          }
          while (
            i < patchFileLines.length &&
            patchFileLines[i].startsWith("+")
          ) {
            // insert the line
            // check it's the same as in the file
            fileLines.splice(
              hunkHeader.original.start - 1 + contextIndex++,
              0,
              patchFileLines[i++].slice(1),
            )
          }
        }
      }

      // all done with this file?
      effects.push(
        {
          type: "delete",
          path: startPathCanonical,
        },
        {
          type: "create",
          path: endPath.slice(2),
          contents: fileLines.join("\n"),
        },
      )
    }
  }

  return { error: false, effects }
}
