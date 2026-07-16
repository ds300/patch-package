import { spawnSafeSync } from "./spawnSafe"

describe(spawnSafeSync, () => {
  it("returns stdout and stderr as utf8 strings", () => {
    const result = spawnSafeSync("node", [
      "-e",
      "console.log('to out'); console.error('to err')",
    ])
    expect(result.stdout).toBe("to out\n")
    expect(result.stderr).toBe("to err\n")
  })

  it("applies the default encoding even when custom options are passed", () => {
    const result = spawnSafeSync("node", ["-e", "console.log('to out')"], {
      cwd: process.cwd(),
    })
    expect(result.stdout).toBe("to out\n")
  })

  it("throws the result with string output when the command fails", () => {
    let thrown
    try {
      spawnSafeSync("node", ["-e", "console.error('oh no'); process.exit(1)"], {
        logStdErrOnError: false,
      })
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeDefined()
    expect(thrown.status).toBe(1)
    expect(thrown.stderr).toBe("oh no\n")
  })

  it("does not throw on failure when throwOnError is false", () => {
    const result = spawnSafeSync("node", ["-e", "process.exit(1)"], {
      throwOnError: false,
      logStdErrOnError: false,
    })
    expect(result.status).toBe(1)
  })
})
