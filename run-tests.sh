#!/usr/bin/env bash
set -e

export CI=true

yarn clean
yarn build
yarn pack --filename patch-package.test.$(date +%s).tgz
jest "$@"
