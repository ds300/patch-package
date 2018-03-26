interface HunkHeader {
  type: "hunk header"
  original: {
    start: number
    length: number
  }
  patched: {
    start: number
    length: number
  }
}

export function parseHunkHeaderLine(headerLine: string): HunkHeader {
  const match = headerLine
    .trim()
    .match(/^@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@.*/)
  if (!match) {
    throw new Error(`Bad header line: '${headerLine}'`)
  }

  return {
    type: "hunk header",
    original: {
      start: Number(match[1]),
      length: Number(match[3] || 1),
    },
    patched: {
      start: Number(match[4]),
      length: Number(match[6] || 1),
    },
  }
}

interface Insertion {
  type: "insertion"
  lines: string[]
  noNewlineAtEndOfFile: boolean
}

interface Deletion {
  type: "deletion"
  lines: string[]
  noNewlineAtEndOfFile: boolean
}

interface Context {
  type: "context"
  lines: string[]
  noNewlineAtEndOfFile: boolean
}

type PatchMutationPart = Insertion | Deletion | Context
export type PatchHunk = HunkHeader | PatchMutationPart

interface FileRename {
  type: "rename"
  fromPath: string
  toPath: string
}

export interface FilePatch {
  type: "patch"
  path: string
  parts: PatchHunk[]
}

interface FileDeletion {
  type: "file deletion"
  path: string
  lines: string[]
  mode: number
}

interface FileCreation {
  type: "file creation"
  mode: number
  path: string
  lines: string[]
}

export type PatchFilePart = FilePatch | FileDeletion | FileCreation | FileRename

export type ParsedPatchFile = PatchFilePart[]

export function parsePatch(patchFileContents: string): ParsedPatchFile {
  const patchFileLines = patchFileContents.split(/\n/)
  const result: ParsedPatchFile = []

  let i = 0
  while (i < patchFileLines.length) {
    const line = patchFileLines[i++]
    if (
      !line.startsWith("---") &&
      !line.startsWith("rename from") &&
      !line.startsWith("new file mode")
    ) {
      continue
    }

    let fileMode = null as null | string

    if (line.startsWith("deleted file mode")) {
      fileMode = line.slice("deleted file mode ".length).trim()
    }

    if (line.startsWith("new file mode")) {
      fileMode = line.slice("new file mode ".length).trim()
      // at some point in patch-package's life it was removing git headers
      // beginning `diff` and `index` for weird reasons related to
      // cross-platform functionality
      // That's no longer needed but this should still support those old files
      // unless the file created is empty, in which case the normal patch
      // parsing bits below don't work and we need this special case
      if (
        !patchFileLines[i].startsWith("--- /dev/null") &&
        !patchFileLines[i + 1].startsWith("--- /dev/null")
      ) {
        const match = patchFileLines[i - 2].match(
          /^diff --git a\/(.+) b\/(.+)$/,
        )
        if (!match) {
          throw new Error("Creating new empty file but found no diff header.")
        }
        const path = match[1]
        result.push({
          type: "file creation",
          path,
          lines: [""],
          // tslint:disable-next-line no-bitwise
          mode: parseInt(fileMode, 8) & 0o777,
        })
        continue
      }
    }

    if (line.startsWith("rename from")) {
      const fromPath = line.slice("rename from ".length)
      const toPath = patchFileLines[i++].slice("rename to ".length).trim()
      result.push({ type: "rename", fromPath, toPath })
      continue
    }

    const startPath = line.slice("--- ".length)
    const endPath = patchFileLines[i++].trim().slice("--- ".length)

    if (endPath === "/dev/null") {
      // deleting a file
      // just get rid of that noise
      // slice of the 'a/'
      const deletion: FileDeletion = {
        type: "file deletion",
        path: startPath.slice(2),
        // tslint:disable-next-line no-bitwise
        mode: fileMode ? parseInt(fileMode, 8) & 0o777 : 0o666,
        lines: [],
      }
      result.push(deletion)
      // ignore hunk header
      parseHunkHeaderLine(patchFileLines[i++])
      // ignore all -lines
      // TODO: perform integrity check on hunk header
      while (i < patchFileLines.length && patchFileLines[i].startsWith("-")) {
        deletion.lines.push(patchFileLines[i].slice(1))
        i++
      }
    } else if (startPath === "/dev/null") {
      // creating a new file
      // just grab all the contents and put it in the file
      const { patched: { length } } = parseHunkHeaderLine(patchFileLines[i++])
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
      result.push({
        type: "file creation",
        path: endPath.slice(2),
        lines: fileLines,
        // tslint:disable-next-line no-bitwise
        mode: fileMode ? parseInt(fileMode, 8) & 0o777 : 0o666,
      })
    } else {
      // iterate over hunks
      const filePatch: FilePatch = {
        type: "patch",
        path: endPath.slice(2),
        parts: [],
      }
      result.push(filePatch)

      while (i < patchFileLines.length && patchFileLines[i].startsWith("@@")) {
        filePatch.parts.push(parseHunkHeaderLine(patchFileLines[i++]))

        while (
          i < patchFileLines.length &&
          patchFileLines[i].match(/^(\+|-| |\\).*/)
        ) {
          // skip intitial comments
          while (
            i < patchFileLines.length &&
            patchFileLines[i].startsWith("\\")
          ) {
            i++
          }

          // collect patch part blocks
          for (const type of ["context", "deletion", "insertion"] as Array<
            PatchMutationPart["type"]
          >) {
            const lines = []
            while (
              i < patchFileLines.length &&
              patchFileLines[i].startsWith(
                { context: " ", deletion: "-", insertion: "+" }[type],
              )
            ) {
              lines.push(patchFileLines[i++].slice(1))
            }
            if (lines.length > 0) {
              let noNewlineAtEndOfFile = false
              if (
                i < patchFileLines.length &&
                patchFileLines[i].startsWith("\\ No newline at end of file")
              ) {
                noNewlineAtEndOfFile = true
                i++
              }
              filePatch.parts.push({
                type,
                lines,
                noNewlineAtEndOfFile,
              } as PatchMutationPart)
            }
          }
        }
      }
    }
  }

  return result
}
