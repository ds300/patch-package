import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs"
import { join } from "path"
import { PackageDetails } from "./PackageDetails"
import stringify from "json-stable-stringify"
import { hashFile } from "./hash"
import chalk from "chalk"
export interface PatchState {
  patchFilename: string
  patchContentHash: string
  didApply: boolean
}

const version = 1
export interface PatchApplicationState {
  version: number
  patches: PatchState[]
  isRebasing: boolean
}

export const STATE_FILE_NAME = ".patch-package.json"

export function getPatchApplicationState(
  packageDetails: PackageDetails,
): PatchApplicationState | null {
  const fileName = join(packageDetails.path, STATE_FILE_NAME)

  let state: null | PatchApplicationState = null
  try {
    state = JSON.parse(readFileSync(fileName, "utf8"))
  } catch (e) {
    // noop
  }
  if (!state) {
    return null
  }
  if (state.version !== version) {
    console.log(
      `You upgraded patch-package and need to fully reinstall node_modules to continue.`,
    )
    process.exit(1)
  }
  return state
}

export function savePatchApplicationState({
  packageDetails,
  patches,
  isRebasing,
}: {
  packageDetails: PackageDetails
  patches: PatchState[]
  isRebasing: boolean
}) {
  const fileName = join(packageDetails.path, STATE_FILE_NAME)

  const state: PatchApplicationState = {
    patches,
    version,
    isRebasing,
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

export function verifyAppliedPatches({
  appPath,
  patchDir,
  state,
}: {
  appPath: string
  patchDir: string
  state: PatchApplicationState
}) {
  const patchesDirectory = join(appPath, patchDir)
  for (const patch of state.patches) {
    if (!patch.didApply) {
      break
    }
    const fullPatchPath = join(patchesDirectory, patch.patchFilename)
    if (!existsSync(fullPatchPath)) {
      console.log(
        chalk.blueBright("Expected patch file"),
        fullPatchPath,
        "to exist but it is missing. Try removing and reinstalling node_modules first.",
      )
      process.exit(1)
    }
    if (patch.patchContentHash !== hashFile(fullPatchPath)) {
      console.log(
        chalk.blueBright("Patch file"),
        fullPatchPath,
        "has changed since it was applied. Try removing and reinstalling node_modules first.",
      )
      process.exit(1)
    }
  }
}
