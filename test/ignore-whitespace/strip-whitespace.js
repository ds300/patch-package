const fs = require("fs")
const file = "node_modules/alphabet/index.js"

fs.writeFileSync(
  "package-with-whitespace/index.js",
  fs
    .readFileSync("package-with-whitespace/index.js")
    .toString()
    .split("\n")
    .map(s => s.trim())
    .join("\n") + "\n",
)
