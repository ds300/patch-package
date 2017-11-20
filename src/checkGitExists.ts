import spawn from "./spawnSafe"
import { red } from "chalk"
import * as process from "process"

export default function checkGitExists() {
  const result = spawn("git", ["help"], {
    logStdErrOnError: false,
    throwOnError: false,
  })

  if (result.status !== 0 || result.error) {
    console.error(`
${red.bold("**ERROR**")} ${red(`patch-package requires Git`)}

  Please make sure that git is available in all of the necessary environments for your project.
`)
    process.exit(1)
  }
}
