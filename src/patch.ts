import * as fs from "fs-extra"

export function parseHunkHeaderLine(headerLine: string) {
  const match = headerLine.trim().match(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@$/)
  if (!match) {
    throw new Error(`Bad header line: '${headerLine}'`)
  }

  return {
    original: {
      length: Number(match[2]),
      start: Number(match[1]),
    },
    patched: {
      length: Number(match[4]),
      start: Number(match[3]),
    },
  }
}

export function patch(patchFilePath: string /*, reverse: boolean */) {
  const patchFileContents = fs.readFileSync(patchFilePath).toString()

  const patchFileLines = patchFileContents.split(/\r?\n/)

  const moves: Record<string, string> = {}

  let i = 0
  while (i < patchFileLines.length) {
    const line = patchFileLines[i++].trim()
    if (!line.startsWith("---") && !line.startsWith("rename from")) {
      continue
    }

    if (line.startsWith("rename from")) {
      const startPath = line.slice("rename from ".length)
      const endPath = patchFileLines[i++].slice("rename to ".length).trim()
      moves[startPath] = endPath
      // if (reverse) {
      //   fs.moveSync(endPath, startPath)
      // } else {
      fs.moveSync(startPath, endPath)
      // }
      continue
    }

    const startPath = line.slice("--- ".length)
    const endPath = patchFileLines[i++].trim().slice("--- ".length)

    if (endPath === "/dev/null") {
      // deleting a file
      // just get rid of that noise
      // slice of the 'a/'
      fs.unlinkSync(startPath.slice(2))
      // ignore hunk header
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
      fs.writeFileSync(endPath.slice(2), fileLines.join("\n"))
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
            if (
              patchFileLines[i++].slice(1) !==
              fileLines[hunkHeader.original.start - 1 + contextIndex++]
            ) {
              console.log(fileLines)
              throw new Error(
                `mismatched lines '${patchFileLines[i - 1].slice(
                  1,
                )}' and '${fileLines[
                  hunkHeader.original.start - 1 + contextIndex - 1
                ]}'`,
              )
            }
          }
          while (
            i < patchFileLines.length &&
            patchFileLines[i].startsWith("-")
          ) {
            // delete the line
            // check it's the same as in the file
            if (
              patchFileLines[i++].slice(1) !==
              fileLines[hunkHeader.original.start - 1 + contextIndex]
            ) {
              throw new Error(
                `mismatched lines '${patchFileLines[i - 1].slice(
                  1,
                )}' and '${fileLines[
                  hunkHeader.original.start - 1 + contextIndex
                ]}'`,
              )
            }
            // all good then delete the shizz
            fileLines.splice(contextIndex, 1)
          }
          while (
            i < patchFileLines.length &&
            patchFileLines[i].startsWith("+")
          ) {
            // insert the line
            // check it's the same as in the file
            fileLines.splice(contextIndex++, 0, patchFileLines[i++].slice(1))
          }
        }
      }

      // all done with this file?
      fs.unlinkSync(startPathCanonical)
      fs.writeFileSync(endPath.slice(2), fileLines.join("\n"))
    }
  }
}
