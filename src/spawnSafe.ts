import { sync as spawnSync } from "cross-spawn";

export interface SpawnSafeOptions {
  throwOnError?: boolean;
  logStdErrOnError?: boolean;
  cwd?: string;
  env?: object;
}

const defaultOptions: SpawnSafeOptions = {
  logStdErrOnError: true,
  throwOnError: true
};

export default function spawnSafeSync(
  command: string,
  args?: string[],
  options?: SpawnSafeOptions
) {
  const mergedOptions = Object.assign({}, defaultOptions, options);
  const result = spawnSync(command, args, options);
  if (result.error || result.status !== 0) {
    if (mergedOptions.logStdErrOnError) {
      if (result.stderr) {
        console.error(result.stderr.toString());
      } else if (result.error) {
        console.error(result.error);
      }
    }
    if (mergedOptions.throwOnError) {
      throw result;
    }
  }
  return result;
}
