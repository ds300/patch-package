# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "edit some files"
sed -i '' -e 's/baseClamp/patchPackage/g' node_modules/lodash/_baseClamp.js
sed -i '' -e 's/baseClone/patchPackage/g' node_modules/lodash/_baseClone.js
sed -i '' -e 's/flip/flop/g' node_modules/lodash/flip.js

echo "add a file"
echo "this is a new file" > node_modules/lodash/newFile.md

echo "remove a file"
rm node_modules/lodash/xor.js

echo "run patch-package with only xor included"
patch-package lodash --include xor

echo "SNAPSHOT: only xor being deleted"
cat patches/lodash*
echo "END SNAPSHOT"

echo "run patch-package excluding the base files"
patch-package lodash --exclude base

echo "SNAPSHOT: no base files"
cat patches/lodash*
echo "END SNAPSHOT"

echo "run patch-package including base and excluding clone"
patch-package lodash --include base --exclude clone

echo "SNAPSHOT: only base files, no clone files"
cat patches/lodash*
echo "END SNAPSHOT"

echo "run patch package excluding all but flip"
patch-package lodash --exclude '^(?!.*flip)'

echo "SNAPSHOT: exclude all but flip"
cat patches/lodash*
echo "END SNAPSHOT"

echo "run patch package including newfile (case insensitive)"
patch-package lodash --include newfile

echo "run patch package including newfile (case sensitive)"
if patch-package lodash --include newfile --case-sensitive-path-filtering
then
  exit 1
fi

echo "run patch package including newFile (case insensitive)"
patch-package lodash --include newFile --case-sensitive-path-filtering
