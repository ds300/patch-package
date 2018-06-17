import * as fs from "fs-extra"
import { join, resolve } from "../src/path"
import * as tmp from "tmp"
import { spawnSafeSync } from "../src/spawnSafe"

export const patchPackageTarballPath = resolve(
  fs
    .readdirSync(".")
    .filter(nm => nm.match(/^patch-package\.test\.\d+\.tgz$/))[0],
)

export function runIntegrationTest(
  projectName: string,
  shouldProduceSnapshots: boolean = true,
) {
  describe(`Test ${projectName}:`, () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    fs.copySync(join(__dirname, projectName), tmpDir.name, {
      recursive: true,
    })

    const result = spawnSafeSync(
      `./${projectName}.sh`,
      [patchPackageTarballPath],
      {
        cwd: tmpDir.name,
        throwOnError: false,
      },
    )

    it("should exit with 0 status", () => {
      expect(result.status).toBe(0)
    })

    const output = result.stdout.toString() + "\n" + result.stderr.toString()

    if (result.status !== 0) {
      console.error(output)
    }

    it("should produce output", () => {
      expect(output.trim()).toBeTruthy()
    })

    const snapshots = output.match(/SNAPSHOT: ?([\s\S]*?)END SNAPSHOT/g)

    if (shouldProduceSnapshots) {
      it("should produce some snapshots", () => {
        expect(snapshots && snapshots.length).toBeTruthy()
      })
      if (snapshots) {
        snapshots.forEach(snapshot => {
          const snapshotDescriptionMatch = snapshot.match(/SNAPSHOT: (.*)/)
          if (snapshotDescriptionMatch) {
            it(snapshotDescriptionMatch[1], () => {
              expect(snapshot).toMatchSnapshot()
            })
          } else {
            throw new Error("bad snapshot format")
          }
        })
      }
    } else {
      it("should not produce any snapshots", () => {
        expect(snapshots && snapshots.length).toBeFalsy()
      })
    }
  })
}
