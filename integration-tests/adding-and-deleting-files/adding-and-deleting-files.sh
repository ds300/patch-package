# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "add a file"
echo "this is a new file" > node_modules/lodash/newFile.md

echo "remove a file"
rm node_modules/lodash/fp/__.js

echo "generate patch file"
npx patch-package lodash

echo "remove node_modules"
rm -rf node_modules

echo "resintall and patch node_modules"
yarn
npx patch-package

echo "check that the file was added"
ls node_modules/lodash/newFile.md

echo "check that the file was removed"
if ls node_modules/lodash/fp/__.js
then
  exit 1
fi
