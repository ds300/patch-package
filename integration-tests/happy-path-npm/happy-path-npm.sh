# make sure errors stop the script
set -e

npm i

echo "add patch-package"
npm i $1

echo "Add left-pad"
npm i left-pad@1.1.3

echo "replace pad with yarn in left-pad/index.js"
npx replace pad npm node_modules/left-pad/index.js

echo "SNAPSHOT: making patch"
npx patch-package left-pad
echo "END SNAPSHOT"

echo "SNAPSHOT: the patch looks like this"
cat patches/left-pad+1.1.3.patch
echo "END SNAPSHOT"

echo "reinstall node_modules"
npx rimraf node_modules
npm i

echo "patch-package didn't run"
if grep npm node_modules/left-pad/index.js ; then
  exit 1
fi

echo "add patch-package to postinstall hook"
node ./add-postinstall.js

echo "reinstall node_modules"
npx rimraf node_modules
npm i

echo "patch-package did run"
grep npm node_modules/left-pad/index.js
