const fs = require("fs")
const file = "node_modules/alphabet/index.js"

const offset = Number(require("process").argv[2] || 0)

const eolWhitespace = ["   ", " \r", "\r"]

const lines = fs.readFileSync(file).toString().trim().split("\n")
const withWhitespace = lines
  .map(
    (line, i) =>
      line.trim() + eolWhitespace[(i + offset) % eolWhitespace.length]
  )
  .join("\n")

const buf = Buffer.from(withWhitespace)

fs.writeFileSync(file, buf)
