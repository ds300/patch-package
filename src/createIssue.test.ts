import { shouldRecommendIssue } from "./createIssue"

describe(shouldRecommendIssue, () => {
  it("Allows most repos", () => {
    const eigen = shouldRecommendIssue({
      org: "artsy",
      repo: "eigen",
      provider: "GitHub",
    })
    expect(eigen).toBeTruthy()

    const typescript = shouldRecommendIssue({
      org: "Microsoft",
      repo: "TypeScript",
      provider: "GitHub",
    })
    expect(typescript).toBeTruthy()
  })

  it("does not recommend DefinitelyTyped", () => {
    const typescript = shouldRecommendIssue({
      org: "DefinitelyTyped",
      repo: "DefinitelyTyped",
      provider: "GitHub",
    })
    expect(typescript).toBeFalsy()
  })
})
