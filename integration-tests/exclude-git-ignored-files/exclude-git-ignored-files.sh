# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "intitialize a git repo"
git init

addedFileName=addedFileName.md
addedFile=node_modules/lodash/$addedFileName
addedIgnoredFileName=addedIgnoredFileName.md
addedIgnoredFile=node_modules/lodash/$addedIgnoredFileName
removedFileName=fp/__.js
removedFile=node_modules/lodash/$removedFileName
removedIgnoredFileName=fp.js
removedIgnoredFile=node_modules/lodash/$removedIgnoredFileName

echo "add not ignored file"
echo "this should be patched" > $addedFile

echo "add ignored file"
echo "this should be ginored" > $addedIgnoredFile

echo "remove a not ignored file"
rm $removedFile

echo "remove an ignored file"
rm $removedIgnoredFile

echo "config .gitignore"
echo $addedIgnoredFileName > .gitignore
echo $removedIgnoredFileName >> .gitignore

echo "generate patch file"
npx patch-package lodash --git-ignore

echo "remove node_modules"
rm -rf node_modules

echo "resintall and patch node_modules"
yarn
npx patch-package

echo "check that not ignored file was added"
ls $addedFile

echo "check that ignored file was not added"
if ls $addedIgnoredFile
then
  exit 1
fi

echo "check that not ignored file was removed"
if ls $removedFile
then
  exit 1
fi

echo "check that ignored file was not removed"
ls $removedIgnoredFile
