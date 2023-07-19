#!/bin/bash
# make sure errors stop the script
set -e

npm install

echo "add patch-package"
npm add $1

function patch-package {
  ./node_modules/.bin/patch-package "$@"
}

patch-package

echo "SNAPSHOT: rebase to zero"
patch-package left-pad --rebase 0
echo "END SNAPSHOT"

echo "replace while (true) with while (1)"
./node_modules/.bin/replace 'while \(true\)' 'while (1)' node_modules/left-pad/index.js

echo "SNAPSHOT: it creates a new patch at the start and renames all the other patches, applying them"
patch-package left-pad --append 'WhileOne'
ls patches
echo "the state file"
cat node_modules/left-pad/.patch-package.json
echo "the js file"
cat node_modules/left-pad/index.js
echo "END SNAPSHOT"

echo "SNAPSHOT: rebase to zero again"
patch-package left-pad --rebase 0
echo "END SNAPSHOT"

echo "replace function with const"
./node_modules/.bin/replace 'function leftPad' 'const leftPad = function' node_modules/left-pad/index.js

echo "SNAPSHOT: it creates a new patch at the start called 'initial' if you dont do --append"
patch-package left-pad 
ls patches
echo "END SNAPSHOT"