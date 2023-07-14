#!/bin/bash
# make sure errors stop the script
set -e

npm install

echo "add patch-package"
npm add $1

function patch-package {
  ./node_modules/.bin/patch-package "$@"
}

echo "apply the patches"
patch-package

echo "rebase to the second patch"
patch-package left-pad --rebase patches/*002+world.patch

echo "add some stuff later in the file"
echo "'some stuff'" >> node_modules/left-pad/index.js

echo "SNAPSHOT: update the second patch and fast forward to the end"
patch-package left-pad
echo "ls patches"
ls patches
echo "END SNAPSHOT"

echo "SNAPSHOT: the state file should show three patches applied and isRebasing: false" 
cat node_modules/left-pad/.patch-package.json
echo "END SNAPSHOT"

echo "SNAPSHOT: The patch file was updated with the new bits"
cat patches/*world.patch
echo "END SNAPSHOT"
