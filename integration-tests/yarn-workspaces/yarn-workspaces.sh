# make sure errors stop the script
set -e

echo "tarball $1"
echo "add patch-package to root"
yarn add $1 --ignore-workspace-root-check

echo "set up postinstall scripts"
node ./add-postinstall-commands.js package.json packages/a/package.json packages/b/package.json

echo "modify hoisted left-pad"
npx replace leftPad patch-package node_modules/left-pad/index.js

echo "create patch file"
yarn patch-package left-pad

echo "modify unhoisted left-pad"
npx replace leftPad patch-package packages/a/node_modules/left-pad/index.js

echo "create patch file"
cd packages/a
yarn patch-package left-pad

echo "go back to root"
cd ../../

echo "delete all node modules"
rimraf **/node_modules

echo "execute yarn from root"
yarn

echo "hoisted left-pad was patched"
grep patch-package node_modules/left-pad/index.js

echo "unhoisted left-pad was patched"
grep patch-package packages/a/node_modules/left-pad/index.js

echo "delete all node modules"
rimraf **/node_modules

echo "execute yarn from a"
cd packages/a
yarn
cd ../../

echo "hoisted left-pad was patched"
grep patch-package node_modules/left-pad/index.js

echo "unhoisted left-pad was patched"
grep patch-package packages/a/node_modules/left-pad/index.js
