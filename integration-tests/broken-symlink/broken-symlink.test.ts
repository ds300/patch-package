import { runIntegrationTest } from "../runIntegrationTest"
runIntegrationTest({
  projectName: "broken-symlink",
  shouldProduceSnapshots: true,
})
