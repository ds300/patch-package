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
