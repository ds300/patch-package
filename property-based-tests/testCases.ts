import { generate } from "randomstring"

export interface File {
  contents: string
  mode: number
}

export interface Files {
  [filePath: string]: File
}

export interface TestCase {
  cleanFiles: Files
  modifiedFiles: Files
}

const fileCharSet = `
                                                     \n
\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
0123456789!@£$%^&*()-=_+[]{};'i\\:"|<>?,./\`~§±
0123456789!@£$%^&*()-=_+[]{};'i\\:"|<>?,./\`~§±
\r\r\r\r\t\t\t\t
`

function makeFileContents(): File {
  return {
    contents:
      generate({
        length: Math.floor(Math.random() * 1000),
        charset: fileCharSet,
      }) || "",
    mode: 0o644,
  }
}

function makeFileName(ext?: boolean) {
  const name = generate({
    length: Math.ceil(Math.random() * 10),
    charset: "abcdefghijklmnopqrstuvwxyz-_0987654321",
  })

  return ext ? name + "." + generate(Math.ceil(Math.random() * 4)) : name
}

function makeFilePath() {
  const numParts = Math.floor(Math.random() * 3)
  const parts = []
  for (let i = 0; i < numParts; i++) {
    parts.push(makeFileName())
  }
  parts.push(makeFileName(true))
  return parts.join("/")
}

function makeFiles(): Files {
  const fileSystem: Files = {}
  const numFiles = Math.random() * 3 + 1
  for (let i = 0; i < numFiles; i++) {
    fileSystem[makeFilePath()] = makeFileContents()
  }
  return fileSystem
}

type MutationKind = "deleteFile" | "createFile" | "deleteLine" | "insertLine"

const mutationKindLikelihoods: Array<[MutationKind, number]> = [
  ["deleteFile", 1],
  ["createFile", 1],
  ["deleteLine", 10],
  ["insertLine", 10],
]
const liklihoodSum = mutationKindLikelihoods.reduce((acc, [_, n]) => acc + n, 0)

function getNextMutationKind(): MutationKind {
  const n = Math.random() * liklihoodSum
  let sum = 0
  for (const [kind, likelihood] of mutationKindLikelihoods) {
    sum += likelihood
    if (n < sum) {
      return kind
    }
  }
  return "insertLine"
}

function selectRandomElement<T>(ts: T[]): T {
  return ts[Math.floor(Math.random() * ts.length)]
}

function deleteLinesFromFile(file: File): File {
  const numLinesToDelete = Math.ceil(Math.random() * 1)
  const lines = file.contents.split("\n")
  const index = Math.max(Math.random() * (lines.length - numLinesToDelete), 0)
  lines.splice(index, numLinesToDelete)
  return { ...file, contents: lines.join("\n") }
}

function insertLinesIntoFile(file: File): File {
  const lines = file.contents.split("\n")
  const index = Math.floor(Math.random() * lines.length)
  const length = Math.ceil(Math.random() * 5)
  lines.splice(index, 0, generate({ length, charset: fileCharSet }))
  return { ...file, contents: lines.join("\n") }
}

function mutateFiles(files: Files): Files {
  const mutatedFiles = { ...files }

  const numMutations = Math.ceil(Math.random() * 1000)

  for (let i = 0; i < numMutations; i++) {
    switch (getNextMutationKind()) {
      case "deleteFile": {
        if (Object.keys(mutatedFiles).length === 1) {
          break
        }
        // select a file at random and delete it
        const pathToDelete = selectRandomElement(Object.keys(mutatedFiles))
        delete mutatedFiles[pathToDelete]
        break
      }
      case "createFile": {
        // TODO make sure there isn't a dir with that filename already
        let filename = makeFileName()
        while (Object.keys(mutatedFiles).some(k => k.startsWith(filename))) {
          filename = makeFileName()
        }
        mutatedFiles[filename] = makeFileContents()
        break
      }
      case "deleteLine": {
        const pathToDeleteFrom = selectRandomElement(Object.keys(mutatedFiles))
        mutatedFiles[pathToDeleteFrom] = deleteLinesFromFile(
          mutatedFiles[pathToDeleteFrom],
        )
        break
      }
      case "insertLine":
        const pathToInsertTo = selectRandomElement(Object.keys(mutatedFiles))
        mutatedFiles[pathToInsertTo] = insertLinesIntoFile(
          mutatedFiles[pathToInsertTo],
        )
        // select a file at random and insert some text in there
        break
    }
  }

  return mutatedFiles
}

export function generateTestCase(): TestCase {
  const cleanFiles = makeFiles()

  return {
    cleanFiles,
    modifiedFiles: mutateFiles(cleanFiles),
  }
}
