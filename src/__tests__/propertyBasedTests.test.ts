import { generate } from "randomstring"
import * as tmp from "tmp"
import spawnSafeSync from "../spawnSafe"
import * as fs from "fs-extra"
import * as path from "path"
import { patch } from "../patch"
import { executeEffects } from "../patch/apply"
import { parsePatch } from "../patch/parse"

describe("property based tests", () => {
  const fileCharSet = `
                                                     \n
\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
0123456789!@£$%^&*()-=_+[]{};'i\\:"|<>?,./\`~§±
0123456789!@£$%^&*()-=_+[]{};'i\\:"|<>?,./\`~§±
\r\r\r\r\t\t\t\t
`

  function makeFileContents() {
    return (
      generate({
        length: Math.floor(Math.random() * 1000),
        charset: fileCharSet,
      }) || ""
    )
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

  interface Files {
    [filePath: string]: string
  }

  interface TestCase {
    cleanFiles: Files
    modifiedFiles: Files
  }

  function makeFiles(): Files {
    const fileSystem: { [path: string]: string } = {}
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
  const liklihoodSum = mutationKindLikelihoods.reduce(
    (acc, [_, n]) => acc + n,
    0,
  )

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

  function deleteLinesFromFile(fileContents: string): string {
    const numLinesToDelete = Math.ceil(Math.random() * 1)
    const lines = fileContents.split("\n")
    const index = Math.max(Math.random() * (lines.length - numLinesToDelete), 0)
    lines.splice(index, numLinesToDelete)
    return lines.join("\n")
  }

  function insertLinesIntoFile(fileContents: string): string {
    const lines = fileContents.split("\n")
    const index = Math.floor(Math.random() * lines.length)
    const length = Math.ceil(Math.random() * 5)
    lines.splice(index, 0, generate({ length, charset: fileCharSet }))
    return lines.join("\n")
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
          mutatedFiles[makeFileName()] = makeFileContents()
          break
        }
        case "deleteLine": {
          const pathToDeleteFrom = selectRandomElement(
            Object.keys(mutatedFiles),
          )
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

  function makeTestCase(): TestCase {
    const cleanFiles = makeFiles()

    return {
      cleanFiles,
      modifiedFiles: mutateFiles(cleanFiles),
    }
  }

  function writeFiles(cwd: string, files: { [path: string]: string }): void {
    Object.keys(files).forEach(filePath => {
      if (!filePath.startsWith(".git/")) {
        fs.mkdirpSync(path.join(cwd, path.dirname(filePath)))
        fs.writeFileSync(path.join(cwd, filePath), files[filePath])
      }
    })
  }

  let workingFiles: Files

  function setWorkingFiles(files: Files) {
    workingFiles = files
  }

  function getWorkingFiles() {
    return workingFiles
  }

  const properReadFileSync = fs.readFileSync
  const properWriteFileSync = fs.writeFileSync
  const properUnlinkSync = fs.unlinkSync
  const properMoveSync = fs.moveSync

  beforeEach(() => {
    ;(fs as any).readFileSync = jest.fn(path => getWorkingFiles()[path])
    ;(fs as any).writeFileSync = jest.fn(
      (path, data) => (getWorkingFiles()[path] = data),
    )
    ;(fs as any).unlinkSync = jest.fn(path => delete getWorkingFiles()[path])
    ;(fs as any).moveSync = jest.fn((from, to) => {
      getWorkingFiles()[to] = getWorkingFiles()[from]
      delete getWorkingFiles()[from]
    })
  })

  afterEach(() => {
    ;(fs as any).readFileSync = properReadFileSync
    ;(fs as any).writeFileSync = properWriteFileSync
    ;(fs as any).unlinkSync = properUnlinkSync
    ;(fs as any).moveSync = properMoveSync
  })

  function addBlankLines(patchFileContents: string): string {
    return patchFileContents
      .split("\n")
      .map(line => (line === " " ? "" : line))
      .join("\n")
  }

  describe("adding blank lines", () => {
    it("adds blank lines where once there were spaces", () => {
      expect(
        addBlankLines(`diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,5 @@
 this
 is
 
-a
+
 file
`),
      ).toMatchSnapshot()
    })
  })

  function executeTest(testCase: TestCase, i: number) {
    function reportingFailures(f: () => void): void {
      try {
        f()
      } catch (e) {
        console.error("TEST CASE FAILED", {
          testCase,
          workingFiles: getWorkingFiles(),
        })
        throw e
      }
    }

    describe("the test case " + i, () => {
      const tmpDir = tmp.dirSync({ unsafeCleanup: true })

      spawnSafeSync("git", ["init"], { cwd: tmpDir.name })

      writeFiles(tmpDir.name, testCase.cleanFiles)

      spawnSafeSync("git", ["add", "-A"], { cwd: tmpDir.name })
      spawnSafeSync("git", ["commit", "-m", "blah"], {
        cwd: tmpDir.name,
      })
      spawnSafeSync("git", ["rm", "-rf", "*"], {
        cwd: tmpDir.name,
      })

      writeFiles(tmpDir.name, testCase.modifiedFiles)
      spawnSafeSync("git", ["add", "-A"], { cwd: tmpDir.name })

      const patchResult = spawnSafeSync(
        "git",
        ["diff", "--color=never", "--cached"],
        {
          cwd: tmpDir.name,
          logStdErrOnError: true,
          throwOnError: true,
        },
      )

      const patchFileContents = patchResult.stdout.toString()

      const patchFileContentsWithBlankLines = addBlankLines(patchFileContents)

      it("looks the same whether parsed with blank lines or not", () => {
        reportingFailures(() => {
          expect(parsePatch(patchFileContents)).toEqual(
            parsePatch(patchFileContentsWithBlankLines),
          )
        })
      })

      // console.log(patchFileContents)

      it("works forwards", () => {
        setWorkingFiles({ ...testCase.cleanFiles })
        reportingFailures(() => {
          const effects = patch(patchFileContents)
          executeEffects(effects)
          expect(getWorkingFiles()).toEqual(testCase.modifiedFiles)
        })
      })

      it("works backwards", () => {
        setWorkingFiles({ ...testCase.modifiedFiles })
        reportingFailures(() => {
          const result = patch(patchFileContents, { reverse: true })
          executeEffects(result)
          expect(getWorkingFiles()).toEqual(testCase.cleanFiles)
        })
      })
    })
  }

  for (let i = 0; i < 200; i++) {
    executeTest(makeTestCase(), i)
  }

  executeTest(
    {
      cleanFiles: {
        blah: "\n\n\na\nb\rc\rd\ne\nf\ng\rh\ni\n",
      },
      modifiedFiles: { blah: "z\n\na\nb\rc\rd\ne\nf\ng\rh\ni\n_" },
    },
    9,
  )

  executeTest(
    {
      cleanFiles: {
        blah: `a
b
c
d
e
f
g
h
i
j
k
l`,
      },
      modifiedFiles: {
        blah: `d
e
f
g
h
i
j
k
m
l`,
      },
    },
    9,
  )

  executeTest(
    {
      cleanFiles: {
        b: "\n",
      },
      modifiedFiles: {
        b: "",
      },
    },
    3,
  )
  executeTest({ cleanFiles: { b: "" }, modifiedFiles: { b: "\n" } }, 3)

  executeTest(
    {
      cleanFiles: {
        "qc-s.4me": "a\nl\nb\nG",
      },
      modifiedFiles: {
        "qc-s.4me": "\na\nl\nb\nG",
      },
    },
    4,
  )

  executeTest(
    {
      cleanFiles: {
        banana: "\r",
      },
      modifiedFiles: {
        banana: "",
      },
    },
    4,
  )

  executeTest(
    {
      cleanFiles: {
        f: "5\n",
      },
      modifiedFiles: {
        f: "5\n7\n",
      },
    },
    4,
  )

  executeTest(
    {
      cleanFiles: {
        nugs: "a",
      },
      modifiedFiles: {
        nugs: "a\n\n",
      },
    },
    4,
  )

  executeTest(
    {
      cleanFiles: {
        b: "\n",
      },
      modifiedFiles: {
        b: "ba\n",
      },
    },
    3,
  )

  executeTest(
    {
      cleanFiles: {
        banana: "WMo^",
      },
      modifiedFiles: {
        banana: "\n\n",
      },
    },
    4,
  )

  executeTest(
    {
      cleanFiles: {
        b: "a",
      },
      modifiedFiles: { b: "a", c: "a\n" },
    },
    4,
  )

  executeTest(
    {
      cleanFiles: {
        "c-qZ0Qznn1.RWOZ": "$xs\rwim\t}pJ(;£BZxc\\bg9k|zvBufcaa",
        "tK/NEDQ-hff.iaQK": ";4l",
        "KbYXh8-Dk3J/vcjQ.mz": "+4:",
        "r6LXXaS/DO3VbFBswE6.WmHQ": "rX]bnT%j+,\t\r~xc&`lLh^\\n*-J$z<4xu",
        "Fa/lQgW3c/G8LsUj-YFoS.4hoY": "NS",
      },
      modifiedFiles: {
        "c-qZ0Qznn1.RWOZ": "$xs\rwim\t}pJ(;£BZxc\\bg9k|zvBufcaa",
        "tK/NEDQ-hff.iaQK": ";4l",
        "KbYXh8-Dk3J/vcjQ.mz": "+4:",
        "r6LXXaS/DO3VbFBswE6.WmHQ": "",
        "Fa/lQgW3c/G8LsUj-YFoS.4hoY": "NS",
        wW1UMkaGn: "F",
      },
    },
    3,
  )

  executeTest(
    {
      cleanFiles: {
        banana: "M_7P /c$Y%ldTF=o\nKv_caoM|A\rZ^i!+",
      },
      modifiedFiles: {
        banana: "B-§s\r\nM_7P /c$Y%ldTF=o\nKv_caoM|A\rZ^i!+",
        jimmy: "",
      },
    },
    4,
  )

  executeTest(
    {
      cleanFiles: {
        "QBgzpme/jN/Rvr8SP1gZ.9": "Zk$@",
      },
      modifiedFiles: {
        "QBgzpme/jN/Rvr8SP1gZ.9": ".6f\n7tD*\nZk$@",
      },
    },
    5,
  )
  executeTest(
    {
      cleanFiles: { "1dkfI.J": "lineend\n" },
      modifiedFiles: { "1dkfI.J": "nout" },
    },
    5,
  )
  executeTest(
    {
      cleanFiles: { "1dkfI.J": "a\nb\nc" },
      modifiedFiles: { "1dkfI.J": "b\nb\nc" },
    },
    5,
  )
})
