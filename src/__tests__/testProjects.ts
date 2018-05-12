import * as fs from "fs-extra"
import * as path from "../path"

export const patchPackageTarballPath = path.resolve(
  fs
    .readdirSync(".")
    .filter(nm => nm.match(/^patch-package\.test\.\d+\.tgz$/))[0],
)
