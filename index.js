#! /usr/bin/env node

const updateNotifier = require("update-notifier")
const pkg = require("./package.json")

const isCi = require("is-ci")

if (!isCi) {
  updateNotifier({ pkg }).notify({ isGlobal: false })
}

require("./dist/index.js")
