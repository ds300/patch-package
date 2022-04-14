#!/usr/bin/env bash
set -e

export CI=true

yarn clean
yarn build
version=$(node -e 'console.log(require("./package.json").version)')
yarn version --new-version 0.0.0 --no-git-tag-version --no-commit-hooks
yarn pack --filename patch-package.test.$(date +%s).tgz
yarn version --new-version $version --no-git-tag-version --no-commit-hooks
yarn jest --testPathPattern=/integration-tests/broken-patch-file/.+\\.test\\.ts$ --runInBand
# yarn jest --testPathPattern=/integration-tests/happy-path-yarn/.+\\.test\\.ts$ --runInBand
