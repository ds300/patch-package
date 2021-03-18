# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
shopt -s expand_aliases # enable alias
alias patch-package=./node_modules/.bin/patch-package

echo "edit a file"
npx replace exports patchPackage node_modules/lodash/_baseClamp.js

echo "add a file"
echo "this is a new file" > node_modules/lodash/newFile.md

echo "remove a file"
rm node_modules/lodash/fp/__.js

echo "make the patch file"
patch-package lodash

echo "reinstall node modules"
rm -rf node_modules
yarn

echo "make sure the patch is unapplied"
if ls node_modules/lodash/newFile.md
then
  exit 1
fi
if grep patchPackage node_modules/lodash/_baseClamp.js
then
  exit 1
fi
ls node_modules/lodash/fp/__.js

echo "apply the patch"
patch-package

echo "make sure the patch is applied"
ls node_modules/lodash/newFile.md
if node_modules/lodash/fp/__.js
then
  exit 1
fi
grep patchPackage node_modules/lodash/_baseClamp.js

echo "apply the patch again to make sure it's an idempotent operation"
patch-package

echo "make sure the patch is still applied"
ls node_modules/lodash/newFile.md
if node_modules/lodash/fp/__.js
then
  exit 1
fi
grep patchPackage node_modules/lodash/_baseClamp.js


echo "unapply the patch"
patch-package --reverse

echo "make sure the patch is unapplied"
if ls node_modules/lodash/newFile.md
then
  exit 1
fi
if grep patchPackage node_modules/lodash/_baseClamp.js
then
  exit 1
fi
ls node_modules/lodash/fp/__.js

echo "unapply the patch again to make sure it's an idempotent operation"
patch-package --reverse

echo "make sure the patch is still unapplied"
if ls node_modules/lodash/newFile.md
then
  exit 1
fi
if grep patchPackage node_modules/lodash/_baseClamp.js
then
  exit 1
fi
ls node_modules/lodash/fp/__.js
