import * as tmp from "tmp"
import * as fs from "fs-extra"
import * as path from "path"

import { spawnSafeSync } from "../src/spawnSafe"
import { patch } from "../src/patch"
import { executeEffects } from "../src/patch/apply"
import { parsePatch } from "../src/patch/parse"

import { TestCase, Files } from "./testCases"

function writeFiles(cwd: string, files: Files): void {
  Object.keys(files).forEach(filePath => {
    if (!filePath.startsWith(".git/")) {
      fs.mkdirpSync(path.join(cwd, path.dirname(filePath)))
      fs.writeFileSync(path.join(cwd, filePath), files[filePath].contents, {
        mode: files[filePath].mode,
      })
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

function removeLeadingSpaceOnBlankLines(patchFileContents: string): string {
  return patchFileContents
    .split("\n")
    .map(line => (line === " " ? "" : line))
    .join("\n")
}

export function executeTestCase(testCase: TestCase) {
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

  describe("the test case", () => {
    beforeEach(() => {
      ;(fs as any).readFileSync = jest.fn(
        path => getWorkingFiles()[path].contents,
      )
      ;(fs as any).writeFileSync = jest.fn(
        (path: string, contents: string, opts?: { mode?: number }) => {
          getWorkingFiles()[path] = {
            contents,
            mode: opts && typeof opts.mode === "number" ? opts.mode : 0o644,
          }
        },
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

    const tmpDir = tmp.dirSync({ unsafeCleanup: true, mode: 0o100777 })

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

    const patchFileContentsWithBlankLines = removeLeadingSpaceOnBlankLines(
      patchFileContents,
    )

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
