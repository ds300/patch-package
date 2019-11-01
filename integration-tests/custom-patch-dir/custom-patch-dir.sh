# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "modify left-pad"
npx replace pad patch-package node_modules/left-pad/index.js

mkdir my

echo "make patch file"
npx patch-package left-pad --patch-dir my/patches

ls my/patches/left-pad*

echo "reinstall node_modules"
rimraf node_modules
yarn

echo "run patch-package"
npx patch-package --patch-dir my/patches

grep patch-package node_modules/left-pad/index.js