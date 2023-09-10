import { spawnSync } from "child_process"

// From https://github.com/oven-sh/bun/blob/ffe4f561a3af53b9f5a41c182de55d7199b5d692/packages/bun-vscode/src/features/lockfile.ts#L39,
// rewritten to use spawnSync instead of spawn.
export function parseBunLockfile(lockFilePath: string): string {
  const process = spawnSync("bun", [lockFilePath], {
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (process.status !== 0) {
    throw new Error(
      `Bun exited with code: ${process.status}\n${process.stderr.toString()}`,
    )
  }
  return process.stdout.toString()
}
