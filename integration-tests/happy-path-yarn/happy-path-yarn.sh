# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
shopt -s expand_aliases # enable alias
alias patch-package=./node_modules/.bin/patch-package

echo "Add left-pad"
yarn add left-pad@1.1.3

echo "replace pad with yarn in left-pad/index.js"
npx replace pad yarn node_modules/left-pad/index.js

echo "SNAPSHOT: making patch"
patch-package left-pad
echo "END SNAPSHOT"

echo "SNAPSHOT: the patch looks like this"
cat patches/left-pad+1.1.3.patch
echo "END SNAPSHOT"

echo "reinstall node_modules"
npx rimraf node_modules
yarn

echo "patch-package didn't run"
if grep yarn node_modules/left-pad/index.js ; then
  exit 1
fi

echo "add patch-package to postinstall hook"
node ./add-postinstall.js

echo "reinstall node_modules"
npx rimraf node_modules
yarn

echo "patch-package did run"
grep yarn node_modules/left-pad/index.js
