#! /usr/bin/env node

const updateNotifier = require("update-notifier")
const pkg = require("./package.json")

updateNotifier({ pkg }).notify()

require("./dist/index.js");
