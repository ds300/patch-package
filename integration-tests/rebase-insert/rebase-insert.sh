#!/bin/bash
# make sure errors stop the script
set -ea

npm install

echo "add patch-package"
npm add $1

function patch-package {
  ./node_modules/.bin/patch-package "$@"
}

echo "apply the patches"
patch-package


echo "SNAPSHOT: Rebase to the second patch"
patch-package left-pad --rebase patches/*002+world.patch
echo "END SNAPSHOT"

echo "SNAPSHOT: the state file should show two patches applied and isRebasing: true"
cat node_modules/left-pad/.patch-package.json
echo "END SNAPSHOT"

echo "add some stuff later in the file"
echo "'some stuff'" >> node_modules/left-pad/index.js

echo "SNAPSHOT: insert a patch in the sequence and fast forward to the end"
patch-package left-pad --append 'some-stuff'
echo "ls patches"
ls patches
echo "END SNAPSHOT"

echo "SNAPSHOT: the state file should show three patches applied and isRebasing: false" 
cat node_modules/left-pad/.patch-package.json
echo "END SNAPSHOT"

echo "SNAPSHOT: The patch file created only shows the new bits"
cat patches/*some-stuff.patch
echo "END SNAPSHOT"
