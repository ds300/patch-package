import { generateTestCase } from "./testCases"
import { executeTestCase } from "./executeTestCase"

describe("property based tests", () => {
  for (let i = 0; i < 200; i++) {
    executeTestCase(generateTestCase())
  }
})
