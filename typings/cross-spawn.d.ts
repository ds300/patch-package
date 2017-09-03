declare module "cross-spawn" {
  import { spawnSync } from "child_process"
  export const sync: typeof spawnSync
}
