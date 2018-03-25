// tslint:disable

import { patch } from "../patch"
import * as fs from "fs-extra"
import * as path from "path"

const properReadFileSync = fs.readFileSync
const properWriteFileSync = fs.writeFileSync
const properUnlinkSync = fs.unlinkSync
const properMoveSync = fs.moveSync

function getMockData() {
  const files = fs.readdirSync(
    path.join(__dirname, "patch-algorithm-test-files"),
  )

  const mockFs: { [fileName: string]: string } = {}
  const patches: { fileName: string; patchContents: string }[] = []

  files.forEach(fileName => {
    if (fileName.endsWith(".patch")) {
      patches.push({
        fileName,
        patchContents: fs
          .readFileSync(
            path.join(__dirname, "patch-algorithm-test-files", fileName),
          )
          .toString(),
      })
    } else {
      mockFs[fileName] = fs
        .readFileSync(
          path.join(__dirname, "patch-algorithm-test-files", fileName),
        )
        .toString()
    }
  })

  return { mockFs, patches }
}

const DATA = Object.freeze(getMockData())

beforeEach(() => {
  // tslint:disable
  ;(fs as any).readFileSync = jest.fn(path => {
    return DATA.mockFs[path]
  })
})

afterEach(() => {
  ;(fs as any).readFileSync = properReadFileSync
  ;(fs as any).writeFileSync = properWriteFileSync
  ;(fs as any).unlinkSync = properUnlinkSync
  ;(fs as any).moveSync = properMoveSync
})

DATA.patches.forEach(({ fileName, patchContents }) => {
  describe(fileName, () => {
    it("can be applied", () => {
      const result = patch(patchContents)
      expect(result.error).toBeFalsy()

      if (result.error) return

      expect(result.effects).toMatchSnapshot()
    })
  })
})
