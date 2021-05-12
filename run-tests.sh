#!/usr/bin/env bash
set -e

export CI=true

yarn clean
yarn build
version=$(node -e 'console.log(require("./package.json").version)')
yarn version --new-version 0.0.0 --no-git-tag-version --no-commit-hooks
yarn pack --filename patch-package.test.$(date +%s).tgz
yarn version --new-version $version --no-git-tag-version --no-commit-hooks
yarn jest "$@"

# workaround for https://github.com/yarnpkg/yarn/issues/6685
rm -rf /tmp/yarn--* || true
