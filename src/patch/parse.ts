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

export const parseHunkHeaderLine = (headerLine: string): HunkHeader => {
  const match = headerLine
    .trim()
    .match(/^@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@.*/)
  if (!match) {
    throw new Error(`Bad header line: '${headerLine}'`)
  }

  return {
    type: "hunk header",
    original: {
      start: Math.max(Number(match[1]), 1),
      length: Number(match[3] || 1),
    },
    patched: {
      start: Math.max(Number(match[4]), 1),
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
  noNewlineAtEndOfFile: boolean
}

interface FileCreation {
  type: "file creation"
  mode: number
  path: string
  lines: string[]
  noNewlineAtEndOfFile: boolean
}

export type PatchFilePart = FilePatch | FileDeletion | FileCreation | FileRename

export type ParsedPatchFile = PatchFilePart[]

class PatchParser {
  private i: number = 0
  private result: ParsedPatchFile = []
  // tslint:disable-next-line variable-name
  private _fileMode: string | null = null

  private get fileMode() {
    // tslint:disable-next-line no-bitwise
    return this._fileMode ? parseInt(this._fileMode, 8) & 0o777 : 0o644
  }

  constructor(private lines: string[]) {}

  private get currentLine() {
    return this.lines[this.i]
  }

  private nextLine() {
    this.i++
  }

  private skipHeaderCruft() {
    while (!this.isEOF) {
      if (
        !this.currentLine.startsWith("---") &&
        !this.currentLine.startsWith("rename from") &&
        !this.currentLine.startsWith("new file mode") &&
        !this.currentLine.startsWith("deleted file mode")
      ) {
        this.nextLine()
      } else {
        break
      }
    }
  }

  private get isEOF() {
    return this.i >= this.lines.length
  }

  private get isOneLineLeft() {
    return this.i === this.lines.length - 1
  }

  // tslint:disable member-ordering
  public parse() {
    while (!this.isEOF) {
      this.skipHeaderCruft()

      if (this.isEOF) {
        break
      }

      if (this.currentLine.startsWith("deleted file mode")) {
        this._fileMode = this.currentLine
          .slice("deleted file mode ".length)
          .trim()
        this.nextLine()
        continue
      }

      if (this.currentLine.startsWith("new file mode")) {
        this._fileMode = this.currentLine.slice("new file mode ".length).trim()
        this.nextLine()
        // at some point in patch-package's life it was removing git headers
        // beginning `diff` and `index` for weird reasons related to
        // cross-platform functionality
        // That's no longer needed but this should still support those old files
        // unless the file created is empty, in which case the normal patch
        // parsing bits below don't work and we need this special case
        if (
          !this.lines[this.i].startsWith("--- /dev/null") &&
          !this.lines[this.i + 1].startsWith("--- /dev/null")
        ) {
          const match = this.lines[this.i - 2].match(
            /^diff --git a\/(.+) b\/(.+)$/,
          )
          if (!match) {
            console.error(this.lines, this.i)
            throw new Error("Creating new empty file but found no diff header.")
          }
          const path = match[1]
          this.result.push({
            type: "file creation",
            path,
            lines: [""],
            // tslint:disable-next-line no-bitwise
            mode: this.fileMode,
            noNewlineAtEndOfFile: true,
          })
        }
        continue
      }

      if (this.currentLine.startsWith("rename from")) {
        const fromPath = this.currentLine.slice("rename from ".length)
        const toPath = this.lines[this.i++].slice("rename to ".length).trim()
        this.result.push({ type: "rename", fromPath, toPath })
        continue
      }

      this.parseFileModification()
    }

    return this.result
  }

  private parsePatchMutationPart(): PatchMutationPart {
    let blockType: PatchMutationPart["type"]
    const firstChar = this.currentLine[0]
    switch (firstChar) {
      case "\\":
        if (this.currentLine.startsWith("\\ No newline at end of file")) {
          return {
            type: "insertion",
            lines: [],
            noNewlineAtEndOfFile: true,
          } as PatchMutationPart
        } else {
          throw new Error(`unexpected patch file comment ${this.currentLine}`)
        }
      case "+":
        blockType = "insertion"
        break
      case "-":
        blockType = "deletion"
        break
      case undefined:
      case " ":
        blockType = "context"
        break
      default:
        throw new Error(`unexpected patch file line ${this.currentLine}`)
    }

    const lines = []
    do {
      lines.push(this.currentLine.slice(1))
      this.nextLine()
    } while (
      !this.isEOF &&
      // handle empty last line as not part of the context
      !(this.isOneLineLeft && this.currentLine === "") &&
      // while we have contiguous hunk line types
      (this.currentLine[0] === firstChar ||
        // handle mismatching context types
        (firstChar === " " && this.currentLine[0] === undefined) ||
        (firstChar === undefined && this.currentLine[0] === " "))
    )

    let noNewlineAtEndOfFile = false
    if (
      !this.isEOF &&
      this.currentLine.startsWith("\\ No newline at end of file")
    ) {
      noNewlineAtEndOfFile = true
      this.nextLine()
    }
    return {
      type: blockType,
      lines,
      noNewlineAtEndOfFile,
    } as PatchMutationPart
  }

  private currentLineIsPartOfHunk(): boolean {
    if (this.isEOF) {
      return false
    }
    // Next hunk is starting
    if (this.currentLine.startsWith("---")) {
      return false
    }
    switch (this.currentLine[0]) {
      case undefined:
      case " ":
      case "+":
      case "-":
      case "\\":
        return true
      default:
        return false
    }
  }

  private parseFileModification() {
    const startPath = this.currentLine.trim().slice("--- ".length)
    this.nextLine()
    const endPath = this.currentLine.trim().slice("--- ".length)
    this.nextLine()

    if (endPath === "/dev/null") {
      // deleting a file
      // just get rid of that noise
      // slice of the 'a/'

      // ignore hunk header
      const header = parseHunkHeaderLine(this.currentLine)
      this.nextLine()

      const deletion: PatchMutationPart = this.parsePatchMutationPart()
      if (header.original.length !== deletion.lines.length) {
        throw new Error(
          "hunk header integrity check failed when parsing file deletion",
        )
      }

      this.result.push({
        type: "file deletion",
        path: startPath.slice(2),
        mode: this.fileMode,
        lines: deletion.lines,
        noNewlineAtEndOfFile: deletion.noNewlineAtEndOfFile,
      })
    } else if (startPath === "/dev/null") {
      // creating a new file
      // just grab all the contents and put it in the file
      // TODO: header integrity checks
      const header = parseHunkHeaderLine(this.currentLine)
      this.nextLine()

      const addition: PatchMutationPart = this.parsePatchMutationPart()

      if (header.patched.length !== addition.lines.length) {
        throw new Error(
          "hunk header integrity check failed when parsing file addition",
        )
      }

      this.result.push({
        type: "file creation",
        path: endPath.slice(2),
        lines: addition.lines,
        mode: this.fileMode,
        noNewlineAtEndOfFile: addition.noNewlineAtEndOfFile,
      })
    } else {
      const filePatch: FilePatch = {
        type: "patch",
        path: endPath.slice(2),
        parts: [],
      }

      this.result.push(filePatch)

      // iterate over hunks
      while (!this.isEOF && this.currentLine.startsWith("@@")) {
        const header = parseHunkHeaderLine(this.currentLine)
        const hunkParts = []

        this.nextLine()

        while (
          this.currentLineIsPartOfHunk() &&
          !(this.isOneLineLeft && this.currentLine === "")
        ) {
          const mutations = this.parsePatchMutationPart()
          hunkParts.push(mutations)
        }

        // verify hunk integrity
        const endSize = hunkParts.reduce(
          (
            { originalLength, patchedLength },
            { type, lines }: PatchMutationPart,
          ) => {
            switch (type) {
              case "insertion":
                return {
                  originalLength,
                  patchedLength: patchedLength + lines.length,
                }
              case "context":
                return {
                  originalLength: originalLength + lines.length,
                  patchedLength: patchedLength + lines.length,
                }
              case "deletion":
                return {
                  originalLength: originalLength + lines.length,
                  patchedLength,
                }
            }
          },
          { originalLength: 0, patchedLength: 0 },
        )

        if (
          endSize.originalLength !== header.original.length ||
          endSize.patchedLength !== header.patched.length
        ) {
          throw new Error(
            "hunk header integrity check failed when parsing file addition",
          )
        }

        filePatch.parts.push(header)
        filePatch.parts.push(...hunkParts)
      }
    }
  }
}

export const parsePatch = (patchFileContents: string): ParsedPatchFile => {
  return new PatchParser(patchFileContents.split(/\n/)).parse()
}
