import { readFileSync, unlinkSync, writeFileSync } from "fs"
import { join } from "path"
import { PackageDetails } from "./PackageDetails"
import stringify from "json-stable-stringify"
export interface PatchState {
  patchFilename: string
  patchContentHash: string
  didApply: true
}

const version = 0
export interface PatchApplicationState {
  version: number
  patches: PatchState[]
}

export const STATE_FILE_NAME = ".patch-package.json"

export function getPatchApplicationState(
  packageDetails: PackageDetails,
): PatchApplicationState | null {
  const fileName = join(packageDetails.path, STATE_FILE_NAME)

  try {
    const state = JSON.parse(readFileSync(fileName, "utf8"))
    if (state.version !== version) {
      return null
    }
    return state
  } catch (e) {
    return null
  }
}
export function savePatchApplicationState(
  packageDetails: PackageDetails,
  patches: PatchState[],
) {
  const fileName = join(packageDetails.path, STATE_FILE_NAME)

  const state: PatchApplicationState = {
    patches,
    version,
  }

  writeFileSync(fileName, stringify(state, { space: 4 }), "utf8")
}

export function clearPatchApplicationState(packageDetails: PackageDetails) {
  const fileName = join(packageDetails.path, STATE_FILE_NAME)

  try {
    unlinkSync(fileName)
  } catch (e) {
    // noop
  }
}
