# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

# this test makes sure that we can patch packages with build metadata in their version strings e.g. 4.5.6+commitsha
echo "Add @parcel/codeframe"
yarn add @parcel/codeframe@2.0.0-nightly.137

echo "replace codeframe with yarn in @parcel/codefram/src/codeframe.js"
npx replace codeFrame patch-package node_modules/@parcel/codeframe/src/codeframe.js

echo "SNAPSHOT: making patch"
patch-package @parcel/codeframe
echo "END SNAPSHOT"

echo "SNAPSHOT: the patch looks like this"
cat patches/@parcel+codeframe+2.0.0-nightly.137.patch
echo "END SNAPSHOT"

echo "reinstall node_modules"
npx rimraf node_modules
yarn

echo "patch-package didn't run"
if grep yarn node_modules/@parcel/codeframe/src/codeframe.js ; then
  exit 1
fi

echo "reinstall node_modules"
npx rimraf node_modules
yarn

echo "SNAPSHOT: the patch applies"
patch-package
echo "END SNAPSHOT"