#!/bin/bash
# make sure errors stop the script
set -e

npm install

echo "add patch-package"
npm add $1

function patch-package {
  ./node_modules/.bin/patch-package "$@"
}

echo "applicaiton works (tested elsewhere)"
patch-package

echo "SNAPSHOT: the patches were applied"
grep goodbye node_modules/left-pad/index.js
echo "END SNAPSHOT"

echo "SNAPSHOT: --reverse undoes the patches"
patch-package --reverse
echo "END SNAPSHOT"

if grep goodbye node_modules/left-pad/index.js; then
  echo "ERROR: patches were not reversed"
  exit 1
fi

echo "SNAPSHOT: The patches can be reapplied"
patch-package
echo "END SNAPSHOT"

patch-package --reverse

echo "SNAPSHOT: if one of the patches fails then reverse only undoes the ones that succeeded"
./node_modules/.bin/replace world schmorld patches/*+goodbye.patch
echo "apply broken"
if patch-package; then
  exit 1
fi
echo "reverse all but broken"
patch-package --reverse
echo "END SNAPSHOT"
