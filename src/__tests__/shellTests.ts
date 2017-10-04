import { patchPackageTarballPath } from "./testProjects"
import * as fs from "fs-extra"
import * as path from "../path"
import * as tmp from "tmp"
import spawnSync from "../spawnSafe"

export function runShellTest(projectName: string) {
  describe(`Test ${projectName}:`, () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    fs.copySync(path.join("test", projectName), tmpDir.name, {
      recursive: true,
    })

    const output = spawnSync(`./${projectName}.sh`, [patchPackageTarballPath], {
      cwd: tmpDir.name,
    }).stdout.toString()

    it("should produce output", () => {
      expect(output.trim()).toBeTruthy()
    })

    const snapshots = output.match(/SNAPSHOT: ?([\s\S]*?)END SNAPSHOT/g)

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
          throw new Error("bad snapshot formate")
        }
      })
    }
  })
}
