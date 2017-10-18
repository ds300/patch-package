const fs = require("fs")
const file = "node_modules/alphabet/index.js"

fs.writeFileSync(
  file,
  fs.readFileSync(file).toString().split("\n").map(s => s.trim()).join("\n") +
    "\n",
)
