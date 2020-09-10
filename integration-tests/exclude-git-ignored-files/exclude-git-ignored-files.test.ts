import { runIntegrationTest } from "../runIntegrationTest"

runIntegrationTest({
  projectName: "exclude-git-ignored-files",
  shouldProduceSnapshots: false,
})
