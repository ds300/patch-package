#!/usr/bin/env node

const fs = require("fs")

const [filename, needle, replacement] = require("process").argv.slice(2)

fs.writeFileSync(
  filename,
  fs.readFileSync(filename).toString().split(needle).join(replacement),
)
