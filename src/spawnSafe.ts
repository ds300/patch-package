import { sync as spawnSync } from "cross-spawn"
import { SpawnOptions } from "child_process"

export interface SpawnSafeOptions extends SpawnOptions {
  throwOnError?: boolean
  logStdErrOnError?: boolean
}

const defaultOptions: SpawnSafeOptions = {
  logStdErrOnError: true,
  throwOnError: true,
}

export const spawnSafeSync = (
  command: string,
  args?: string[],
  options?: SpawnSafeOptions,
) => {
  const mergedOptions = Object.assign({}, defaultOptions, options)
  const result = spawnSync(command, args, options)
  if (result.error || result.status !== 0) {
    if (mergedOptions.logStdErrOnError) {
      if (result.stderr) {
        console.error(result.stderr.toString())
      } else if (result.error) {
        console.error(result.error)
      }
    }
    if (mergedOptions.throwOnError) {
      throw result
    }
  }
  return result
}
