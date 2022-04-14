# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

echo "SNAPSHOT: left-pad should contain patch-package"
grep patch-package node_modules/left-pad/index.js
echo "END SNAPSHOT"
