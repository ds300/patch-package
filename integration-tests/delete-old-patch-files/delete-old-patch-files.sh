# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
shopt -s expand_aliases # enable alias
alias patch-package=./node_modules/.bin/patch-package

echo "apply patch-package"
patch-package

echo "make sure the changes were applied"
grep patch-package node_modules/@types/lodash/index.d.ts
grep patchPackage node_modules/lodash/index.js

echo "make sure the files were still named like before"
ls patches/lodash:4.17.11.patch
ls patches/@types/lodash:4.14.120.patch

echo "make patch files again"
patch-package lodash @types/lodash

echo "make sure the changes were still applied"
grep patch-package node_modules/@types/lodash/index.d.ts
grep patchPackage node_modules/lodash/index.js

echo "make sure the file names have changed"
if ls patches/lodash:4.17.11.patch; then
  exit 1
fi
if ls patches/@types/lodash:4.14.120.patch; then
  exit 1
fi
ls patches/lodash+4.17.11.patch
ls patches/@types+lodash+4.14.120.patch
