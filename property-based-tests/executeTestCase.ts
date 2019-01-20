import * as tmp from "tmp"
import * as path from "path"

import { spawnSafeSync } from "../src/spawnSafe"
import { executeEffects } from "../src/patch/apply"
import { parsePatchFile } from "../src/patch/parse"
import { reversePatch } from "../src/patch/reverse"

import { TestCase, Files } from "./testCases"
import { appendFileSync, existsSync, writeFileSync } from "fs"

jest.mock("fs-extra", () => {
  let workingFiles: Files

  function setWorkingFiles(files: Files) {
    workingFiles = files
  }

  function getWorkingFiles() {
    return workingFiles
  }

  return {
    setWorkingFiles,
    getWorkingFiles,
    ensureDirSync: jest.fn(),
    readFileSync: jest.fn(path => getWorkingFiles()[path].contents),
    writeFileSync: jest.fn(
      (path: string, contents: string, opts?: { mode?: number }) => {
        getWorkingFiles()[path] = {
          contents,
          mode: opts && typeof opts.mode === "number" ? opts.mode : 0o644,
        }
      },
    ),
    unlinkSync: jest.fn(path => delete getWorkingFiles()[path]),
    moveSync: jest.fn((from, to) => {
      getWorkingFiles()[to] = getWorkingFiles()[from]
      delete getWorkingFiles()[from]
    }),
    statSync: jest.fn(path => getWorkingFiles()[path]),
    chmodSync: jest.fn((path, mode) => {
      const { contents } = getWorkingFiles()[path]
      getWorkingFiles()[path] = { contents, mode }
    }),
  }
})

function writeFiles(cwd: string, files: Files): void {
  const mkdirpSync = require("fs-extra/lib/mkdirs/index.js").mkdirpSync
  const writeFileSync = require("fs").writeFileSync
  Object.keys(files).forEach(filePath => {
    if (!filePath.startsWith(".git/")) {
      mkdirpSync(path.join(cwd, path.dirname(filePath)))
      writeFileSync(path.join(cwd, filePath), files[filePath].contents, {
        mode: files[filePath].mode,
      })
    }
  })
}

function removeLeadingSpaceOnBlankLines(patchFileContents: string): string {
  return patchFileContents
    .split("\n")
    .map(line => (line === " " ? "" : line))
    .join("\n")
}

export function executeTestCase(testCase: TestCase) {
  const fs = require("fs-extra")

  function reportingFailures(f: () => void): void {
    try {
      f()
    } catch (e) {
      const data = JSON.stringify(testCase) + "\n\n"
      if (!existsSync("generative-test-errors.log")) {
        writeFileSync("generative-test-errors.log", data)
      } else {
        appendFileSync("generative-test-errors.log", data)
      }
      throw e
    }
  }

  const tmpDir = tmp.dirSync({ unsafeCleanup: true, mode: 0o100777 })

  spawnSafeSync("git", ["init"], { cwd: tmpDir.name })

  writeFiles(tmpDir.name, testCase.cleanFiles)

  spawnSafeSync("git", ["add", "-A"], { cwd: tmpDir.name })
  spawnSafeSync("git", ["commit", "--allow-empty", "-m", "blah"], {
    cwd: tmpDir.name,
  })
  if (Object.keys(testCase.cleanFiles).length > 0) {
    spawnSafeSync("git", ["rm", "-rf", "*"], {
      cwd: tmpDir.name,
    })
  }

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
      expect(parsePatchFile(patchFileContents)).toEqual(
        parsePatchFile(patchFileContentsWithBlankLines),
      )
    })
  })

  // console.log(patchFileContents)

  it("works forwards", () => {
    fs.setWorkingFiles({ ...testCase.cleanFiles })
    reportingFailures(() => {
      const effects = parsePatchFile(patchFileContents)
      executeEffects(effects, { dryRun: false })
      expect(fs.getWorkingFiles()).toEqual(testCase.modifiedFiles)
    })
  })

  it("works backwards", () => {
    fs.setWorkingFiles({ ...testCase.modifiedFiles })
    reportingFailures(() => {
      const effects = reversePatch(parsePatchFile(patchFileContents))
      executeEffects(effects, { dryRun: false })
      expect(fs.getWorkingFiles()).toEqual(testCase.cleanFiles)
    })
  })
}
