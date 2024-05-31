import { blueBright } from "chalk"

export function createGitDiffArguments(enforceTextFileType: boolean) {

  const gitDiffArgs = [
    "diff",
    "--cached",
    "--no-color",
    "--ignore-space-at-eol",
    "--no-ext-diff",
    "--src-prefix=a/",
    "--dst-prefix=b/",
  ]

  if (enforceTextFileType) {
    console.log(blueBright("Treating all files as text."))
    gitDiffArgs.push("--text")
  }

  return gitDiffArgs
}
