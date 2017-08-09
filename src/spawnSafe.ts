import { sync as spawnSync } from "cross-spawn"

const defaultOptions = {
  logStdErrOnError: true,
  throwOnError: true,
}

export default function spawnSafeSync(
  command: string,
  args?: string[],
  options?: {
    throwOnError?: boolean
    logStdErrOnError?: boolean
    cwd?: string
  },
) {
  const mergedOptions = Object.assign({}, defaultOptions, options)
  const result = spawnSync(command, args, options)
  if (result.error || result.status !== 0) {
    if (mergedOptions.logStdErrOnError) {
      console.error(result.stderr.toString())
    }
    if (mergedOptions.throwOnError) {
      throw result
    }
  }
  return result
}
