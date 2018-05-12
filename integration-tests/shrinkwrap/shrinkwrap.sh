# make sure errors stop the script
set -e

echo "add patch-package"
npm i $1

rimraf node_modules

npm i

echo "SNAPSHOT: left pad should contain patch-package"
grep patch-package node_modules/left-pad/index.js
echo "END SNAPSHOT"
