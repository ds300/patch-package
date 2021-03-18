import * as fs from "fs-extra"
import * as path from "path"
import { spawnSafeSync } from "../src/spawnSafe"

const testName = process.argv[2]

if (!testName || !testName.match(/[0-9a-zA-Z\-]+/)) {
  console.error(`invalid name format '${testName}'`)
  console.error("try something like this: blah-and-so-forth")
}

console.log("making an integration test called", testName)

const testDir = path.join(__dirname, testName)

fs.mkdirpSync(testDir)

// initialise npm project
fs.writeFileSync(
  path.join(testDir, `package.json`),
  `{
  "name": "${testName}",
  "version": "1.0.0",
  "description": "integration test for patch-package",
  "main": "index.js",
  "author": "",
  "license": "ISC",
  "dependencies": {}
}
`,
)

spawnSafeSync("yarn", [], { cwd: testDir })

// create shell script boilerplate
fs.writeFileSync(
  path.join(testDir, `${testName}.sh`),
  `# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package
`,
  { mode: 0o755 },
)

// create typescript file boilerplate
fs.writeFileSync(
  path.join(testDir, `${testName}.test.ts`),
  `import { runIntegrationTest } from "../runIntegrationTest"
runIntegrationTest({projectName: "${testName}", shouldProduceSnapshots: false})
`,
)
