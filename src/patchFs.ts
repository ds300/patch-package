import {
  PatchedPackageDetails,
  getPackageDetailsFromPatchFilename,
} from "./PackageDetails"
import { relative } from "./path"
import klawSync from "klaw-sync"

export const getPatchFiles = (patchesDir: string) => {
  try {
    return klawSync(patchesDir, { nodir: true })
      .map(({ path }) => relative(patchesDir, path))
      .filter((path) => path.endsWith(".patch"))
  } catch (e) {
    return []
  }
}

interface GroupedPatches {
  numPatchFiles: number
  pathSpecifierToPatchFiles: Record<string, PatchedPackageDetails[]>
  warnings: string[]
}
export const getGroupedPatches = (patchesDirectory: string): GroupedPatches => {
  const files = getPatchFiles(patchesDirectory)

  if (files.length === 0) {
    return {
      numPatchFiles: 0,
      pathSpecifierToPatchFiles: {},
      warnings: [],
    }
  }

  const warnings: string[] = []

  const pathSpecifierToPatchFiles: Record<string, PatchedPackageDetails[]> = {}
  for (const file of files) {
    const details = getPackageDetailsFromPatchFilename(file)
    if (!details) {
      warnings.push(`Unrecognized patch file in patches directory ${file}`)
      continue
    }
    if (!pathSpecifierToPatchFiles[details.pathSpecifier]) {
      pathSpecifierToPatchFiles[details.pathSpecifier] = []
    }
    pathSpecifierToPatchFiles[details.pathSpecifier].push(details)
  }
  for (const arr of Object.values(pathSpecifierToPatchFiles)) {
    arr.sort((a, b) => {
      return (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0)
    })
  }

  return {
    numPatchFiles: files.length,
    pathSpecifierToPatchFiles,
    warnings,
  }
}
