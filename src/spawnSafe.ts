import { sync as spawnSync } from "cross-spawn"

export default function spawnSafeSync(
  command: string,
  args?: string[],
  options?: { noStderrOnError?: boolean; cwd?: string },
) {
  const result = spawnSync(command, args, options)
  if (result.error || result.status !== 0) {
    if (options && !options.noStderrOnError) {
      console.error(result.stderr.toString())
    }
    throw result
  }
  return result
}
