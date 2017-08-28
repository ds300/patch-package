import spawnSafe from "./spawnSafe"

export function getGitRootPath(): string | null {
  const result = spawnSafe("git", ["rev-parse", "--show-toplevel"], {
    logStdErrOnError: false,
    throwOnError: false,
  })

  if (result.status === 0) {
    return result.stdout.toString().trim()
  } else {
    return null
  }
}
