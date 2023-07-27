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

echo "rebase to the second patch"
patch-package left-pad --rebase patches/*002+world.patch

echo "replace world with universe"
./node_modules/.bin/replace 'world' 'universe' node_modules/left-pad/index.js

echo "SNAPSHOT: when continuing the rebase, the final patch should fail to apply because it's out of date"
patch-package left-pad
echo "END SNAPSHOT"

echo "replace 'use universe' with 'goodbye universe' manually"
./node_modules/.bin/replace 'use universe' 'goodbye universe' node_modules/left-pad/index.js

echo "SNAPSHOT: when continuing the rebase, the final patch should apply"
patch-package left-pad
echo "END SNAPSHOT"

echo "SNAPSHOT: the patches should go from 'use strict' to 'use hello' to 'use universe' to 'goodbye universe'" 
cat patches/*
echo "END SNAPSHOT"
