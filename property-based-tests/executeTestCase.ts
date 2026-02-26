import * as tmp from "tmp"

import { spawnSafeSync } from "../src/spawnSafe"
import { executeEffects } from "../src/patch/apply"
import { parsePatchFile } from "../src/patch/parse"
import { reversePatch } from "../src/patch/reverse"

import { TestCase, Files } from "./testCases"
import { appendFileSync, existsSync, writeFileSync } from "fs"
import { join, dirname } from "path"

jest.mock("fs", () => {
  const realFs = jest.requireActual("fs")
  let workingFiles: Files

  function setWorkingFiles(files: Files) {
    workingFiles = files
  }

  function getWorkingFiles() {
    return workingFiles
  }

  function isVirtualPath(path: string) {
    return workingFiles && path in workingFiles
  }

  return {
    ...realFs,
    setWorkingFiles,
    getWorkingFiles,
    mkdirSync: jest.fn((...args: any[]) => {
      if (workingFiles) {
        return
      }
      return realFs.mkdirSync(...args)
    }),
    existsSync: jest.fn((path: string) => {
      if (workingFiles) {
        return path in workingFiles
      }
      return realFs.existsSync(path)
    }),
    readFileSync: jest.fn((path: string, ...args: any[]) => {
      if (isVirtualPath(path)) {
        return getWorkingFiles()[path].contents
      }
      return realFs.readFileSync(path, ...args)
    }),
    writeFileSync: jest.fn(
      (path: string, contents: string, opts?: { mode?: number }) => {
        if (workingFiles) {
          getWorkingFiles()[path] = {
            contents,
            mode: opts && typeof opts.mode === "number" ? opts.mode : 0o644,
          }
          return
        }
        return realFs.writeFileSync(path, contents, opts)
      },
    ),
    unlinkSync: jest.fn((path: string) => {
      if (isVirtualPath(path)) {
        delete getWorkingFiles()[path]
        return
      }
      return realFs.unlinkSync(path)
    }),
    renameSync: jest.fn((from: string, to: string) => {
      if (isVirtualPath(from)) {
        getWorkingFiles()[to] = getWorkingFiles()[from]
        delete getWorkingFiles()[from]
        return
      }
      return realFs.renameSync(from, to)
    }),
    statSync: jest.fn((path: string, ...args: any[]) => {
      if (isVirtualPath(path)) {
        return getWorkingFiles()[path]
      }
      return realFs.statSync(path, ...args)
    }),
    chmodSync: jest.fn((path: string, mode: number) => {
      if (isVirtualPath(path)) {
        const { contents } = getWorkingFiles()[path]
        getWorkingFiles()[path] = { contents, mode }
        return
      }
      return realFs.chmodSync(path, mode)
    }),
  }
})

function writeFiles(cwd: string, files: Files): void {
  const realFs = jest.requireActual("fs") as typeof import("fs")
  Object.keys(files).forEach((filePath) => {
    if (!filePath.startsWith(".git/")) {
      realFs.mkdirSync(join(cwd, dirname(filePath)), { recursive: true })
      realFs.writeFileSync(join(cwd, filePath), files[filePath].contents, {
        mode: files[filePath].mode,
      })
    }
  })
}

function removeLeadingSpaceOnBlankLines(patchFileContents: string): string {
  return patchFileContents
    .split("\n")
    .map((line) => (line === " " ? "" : line))
    .join("\n")
}

export function executeTestCase(testCase: TestCase) {
  const fs = require("fs")

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

  // skipping because we add source to the hunks now, so we need to strip that out before comparing
  it.skip("looks the same whether parsed with blank lines or not", () => {
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
      executeEffects(effects, { dryRun: false, bestEffort: false })
      expect(fs.getWorkingFiles()).toEqual(testCase.modifiedFiles)
    })
  })

  it("works backwards", () => {
    fs.setWorkingFiles({ ...testCase.modifiedFiles })
    reportingFailures(() => {
      const effects = reversePatch(parsePatchFile(patchFileContents))
      executeEffects(effects, { dryRun: false, bestEffort: false })
      expect(fs.getWorkingFiles()).toEqual(testCase.cleanFiles)
    })
  })
}
