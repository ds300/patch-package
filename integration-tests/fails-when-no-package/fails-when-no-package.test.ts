import { runIntegrationTest } from "../runIntegrationTest"
runIntegrationTest({
  projectName: "fails-when-no-package",
  shouldProduceSnapshots: true,
})
