import { generate } from "randomstring"
import * as tmp from "tmp"
import spawnSafeSync from "../spawnSafe"
import * as fs from "fs-extra"
import * as path from "path"
import { patch } from "../patch"
import { executeEffects } from "../applyPatch"

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
    return generate({
      length: Math.floor(Math.random() * 5),
      charset: fileCharSet,
    })
  }

  function makeFileName(ext?: boolean) {
    const name = generate({
      length: Math.ceil(Math.random() * 12),
      charset:
        "abcdefghijklmnopqrstuvwxyzABCDEFGGHIJKLMNOPQRSTUVWXYZ-_0987654321",
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
    const numFiles = Math.random() * 10 + 1
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

    const numMutations = Math.ceil(Math.random() * 10)

    for (let i = 0; i < numMutations; i++) {
      switch (getNextMutationKind()) {
        case "deleteFile": {
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

  function executeTest(testCase: TestCase, i: number) {
    describe("the test case " + i, () => {
      const tmpDir = tmp.dirSync({ unsafeCleanup: true })
      // if (fs.existsSync("testblah")) {
      //   fs.removeSync("testblah")
      // }
      // fs.mkdirSync("testblah")
      // const tmpDir = { name: "testblah" }

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

      try {
        it("works forwards", () => {
          setWorkingFiles({ ...testCase.cleanFiles })
          try {
            patch(patchFileContents)
          } catch (e) {
            console.error("TEST CASE FAILED", {
              testCase,
              workingFiles: getWorkingFiles(),
            })
            throw e
          }
          const effects = patch(patchFileContents)
          executeEffects(effects)
          try {
            expect(getWorkingFiles()).toEqual(testCase.modifiedFiles)
          } catch (e) {
            console.error("TEST CASE FAILED", {
              testCase,
              workingFiles: getWorkingFiles(),
            })
            throw e
          }
        })

        it("works backwards", () => {
          setWorkingFiles({ ...testCase.modifiedFiles })
          const result = patch(patchFileContents, { reverse: true })
          executeEffects(result)
          expect(getWorkingFiles()).toEqual(testCase.cleanFiles)
        })
      } catch (e) {
        console.error("TEST CASE FAILED", JSON.stringify(testCase))
        throw e
      }
    })
  }

  for (let i = 0; i < 1; i++) {
    executeTest(makeTestCase(), i)
  }

  // executeTest(
  //   {
  //     cleanFiles: {
  //       "banana":
  //         "M_7P /c$Y%ldTF=o\nKv_caoM|A\rZ^i!+",
  //     },
  //     modifiedFiles: {
  //       "banana":
  //         "B-§s\r\nM_7P /c$Y%ldTF=o\nKv_caoM|A\rZ^i!+",
  //       jimmy: "",
  //     },
  //   },
  //   4,
  // )

  // executeTest(
  //   {
  //     cleanFiles: {
  //       "QBgzpme/jN/Rvr8SP1gZ.9": "Zk$@",
  //     },
  //     modifiedFiles: {
  //       "QBgzpme/jN/Rvr8SP1gZ.9": ".6f\n7tD*\nZk$@",
  //     },
  //   },
  //   5,
  // )
  // executeTest(
  //   {
  //     cleanFiles: { "1dkfI.J": "lineend\n" },
  //     modifiedFiles: { "1dkfI.J": "nout" },
  //   },
  //   5,
  // )
  // executeTest(
  //   {
  //     cleanFiles: { "1dkfI.J": "a\nb\nc" },
  //     modifiedFiles: { "1dkfI.J": "b\nb\nc" },
  //   },
  //   5,
  // )
})
/*
oh fuck
What's the problem ?
The problem is like that line endings are not being applied in one situation
- when the patch file is reversed by me
- when the clean file has a line ending but the modified file does not

When reversed, the patch file is wrong because the same scenario manually
reversed is a-ok here's the bad patch file:

```patch
diff --git a/1dkfI.J b/1dkfI.J
index cfc60af..2d950c4 100644
--- a/1dkfI.J
+++ b/1dkfI.J
@@ -1,0 +1,0 @@
-nout
+lineend
\ No newline at end of file
```

here's the good patch file:

```patch
diff --git a/1dkfI.J b/1dkfI.J
index 2d950c4..cfc60af 100644
--- a/1dkfI.J
+++ b/1dkfI.J
@@ -1 +1 @@
-nout
\ No newline at end of file
+lineend
```

here's the differences:

- the bad patch file has length 0s in the hunk header
  That's probably not an issue, since the default value for lengths is 0
- The bad patch file has the \ no newline at end of file comment in the wrong place
  But that's probably not an issue since my code ignores it

```patch
@@ -1,0 +1,0 @@
-nout
+lineend
\ No newline at end of file
```

here's the good patch file:

```patch
@@ -1 +1 @@
-nout
\ No newline at end of file
+lineend
```
 */
