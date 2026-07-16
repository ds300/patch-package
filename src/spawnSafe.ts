import { sync as spawnSync } from "cross-spawn"
import { SpawnOptions } from "child_process"

export interface SpawnSafeOptions extends SpawnOptions {
  throwOnError?: boolean
  logStdErrOnError?: boolean
  maxBuffer?: number
  encoding?: BufferEncoding
}

const defaultOptions: SpawnSafeOptions = {
  logStdErrOnError: true,
  throwOnError: true,
  encoding: "utf8",
}

export const spawnSafeSync = (
  command: string,
  args?: string[],
  options?: SpawnSafeOptions,
) => {
  const mergedOptions = Object.assign({}, defaultOptions, options)
  const result = spawnSync(command, args, mergedOptions)
  if (result.error || result.status !== 0) {
    if (mergedOptions.logStdErrOnError) {
      if (result.stderr) {
        console.log(result.stderr.toString())
      } else if (result.error) {
        console.log(result.error)
      }
    }
    if (mergedOptions.throwOnError) {
      throw result
    }
  }
  return result
}
