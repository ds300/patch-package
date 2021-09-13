# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

echo "Add left-pad"
yarn add left-pad@1.1.3

echo "replace pad with yarn in left-pad/index.js"
npx replace pad yarn node_modules/left-pad/index.js

echo "write yarnrc with yarn-path"
echo "yarn-path "yarn.js"" > .yarnrc


echo "SNAPSHOT: uses yarn version specified in yarn-path"
patch-package left-pad 2>&1 | grep -i foobarbaz
echo "END SNAPSHOT"