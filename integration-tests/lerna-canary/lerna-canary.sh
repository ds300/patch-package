# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "Add @parcel/codeframe"
yarn add @parcel/codeframe@2.0.0-nightly.137

echo "replace codeframe with yarn in @parcel/codefram/src/codeframe.js"
npx replace codeframe yarn node_modules/@parcel/codeframe/src/codeframe.js

echo "SNAPSHOT: making patch"
npx patch-package @parcel/codeframe
echo "END SNAPSHOT"

echo "SNAPSHOT: the patch looks like this"
cat patches/@parcel/codeframe+2.0.0-nightly.137.patch
echo "END SNAPSHOT"

echo "reinstall node_modules"
npx rimraf node_modules
yarn

echo "patch-package didn't run"
if grep yarn node_modules/@parcel/codeframe/src/codeframe.js ; then
  exit 1
fi

echo "add patch-package to postinstall hook"
node ./add-postinstall.js

echo "reinstall node_modules"
npx rimraf node_modules
yarn

echo "patch-package did run"
grep yarn node_modules/@parcel/codeframe/src/codeframe.js
