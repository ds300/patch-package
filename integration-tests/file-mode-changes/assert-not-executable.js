#!/usr/bin/env node
const file = process.argv[2]

const mode = require("fs").statSync(file).mode

if ((mode & 0b001000000) > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
