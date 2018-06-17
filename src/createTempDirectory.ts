import * as tmp from "tmp"

export const createTempDirectory = () => {
  return tmp.dirSync({ unsafeCleanup: true })
}
