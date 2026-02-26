import * as fs from "fs"
import { join as pathJoin } from "path"
import { join, resolve } from "../src/path"
import * as tmp from "tmp"
import { spawnSafeSync } from "../src/spawnSafe"
import { resolveRelativeFileDependencies } from "../src/resolveRelativeFileDependencies"

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = pathJoin(src, entry.name)
    const destPath = pathJoin(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

export const patchPackageTarballPath = resolve(
  fs
    .readdirSync(".")
    .filter((nm: string) => nm.match(/^patch-package\.test\.\d+\.tgz$/))[0],
)

export function runIntegrationTest({
  projectName,
  shouldProduceSnapshots,
}: {
  projectName: string
  shouldProduceSnapshots: boolean
}) {
  describe(`Test ${projectName}:`, () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    copyDirSync(join(__dirname, projectName), tmpDir.name)

    // remove node_modules folder when running locally, to avoid leaking state from source dir
    fs.rmSync(join(tmpDir.name, "node_modules"), {
      recursive: true,
      force: true,
    })

    const packageJson = require(join(tmpDir.name, "package.json"))
    packageJson.dependencies = resolveRelativeFileDependencies(
      join(__dirname, projectName),
      packageJson.dependencies,
    )

    fs.writeFileSync(
      join(tmpDir.name, "package.json"),
      JSON.stringify(packageJson),
    )

    const result = spawnSafeSync(
      `./${projectName}.sh`,
      [patchPackageTarballPath],
      {
        cwd: tmpDir.name,
        throwOnError: false,
        env: {
          ...process.env,
          PATCH_PACKAGE_INTEGRATION_TEST: "1",
        },
        shell: true,
      },
    )

    it("should exit with 0 status", () => {
      expect(result.status).toBe(0)
    })

    const output = result.stdout.toString() + "\n" + result.stderr.toString()

    if (result.status !== 0) {
      console.log(output)
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
        snapshots.forEach((snapshot, i) => {
          const snapshotDescriptionMatch = snapshot.match(/SNAPSHOT: (.*)/)
          if (snapshotDescriptionMatch) {
            it(
              `${i.toString().padStart(2, "0")}: ` +
                snapshotDescriptionMatch[1],
              () => {
                expect(snapshot).toMatchSnapshot()
              },
            )
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
