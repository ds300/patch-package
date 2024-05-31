import { createGitDiffArguments } from "./gitDiffArguments"

const gitDiffTextArgument = "--text"

describe("createGitDiffArguments", () => {

  it("should return --text as one of arguments when enforceTextFileType is true", () => {

    const enforceTextFileType = true

    expect(createGitDiffArguments(enforceTextFileType)).toContain(gitDiffTextArgument)
  })

  it("shouldn't return --text as one of arguments when enforceTextFileType is false", () => {

    const enforceTextFileType = false

    expect(createGitDiffArguments(enforceTextFileType)).not.toContain(gitDiffTextArgument)
  })
})
