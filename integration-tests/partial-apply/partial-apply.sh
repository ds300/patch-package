#!/bin/bash
# make sure errors stop the script
set -e

npm install

echo "add patch-package"
npm add $1

function patch-package {
  ./node_modules/.bin/patch-package "$@"
}

echo "SNAPSHOT: patch-package fails when one of the patches in the sequence fails"
if patch-package
then
  exit 1
fi
echo "END SNAPSHOT"


echo "SNAPSHOT: patch-package --partial saves a log"
patch-package --partial
echo 'patch-package-errors.log'
cat patch-package-errors.log
echo "END SNAPSHOT"
