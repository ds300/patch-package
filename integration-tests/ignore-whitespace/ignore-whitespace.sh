# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

echo "add random bits of whitespace"
node add-whitespace.js

echo "try to make patch file (should be empty)"
(>&2 echo "SNAPSHOT: empty changeset when adding whitespace")
if patch-package alphabet
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")

echo "make a change to line a"
node strip-whitespace.js
npx replace 'a' 'patch-package' node_modules/alphabet/index.js
node add-whitespace.js 2

echo "make patch file for line a"
patch-package alphabet

echo "SNAPSHOT: line a changed"
cat patches/alphabet*.patch
echo "END SNAPSHOT"

echo "make sure the patch can be applied to clean files"
rm -rf node_modules
yarn
patch-package
grep patch-package node_modules/alphabet/index.js

echo "make sure the patch can be applied to dirty files"
rm -rf node_modules
yarn
node add-whitespace.js
patch-package
grep patch-package node_modules/alphabet/index.js

echo "make sure the patch can be applied to dirty files with different whitespace"
rm -rf node_modules
yarn
node add-whitespace.js 1
patch-package
grep patch-package node_modules/alphabet/index.js
