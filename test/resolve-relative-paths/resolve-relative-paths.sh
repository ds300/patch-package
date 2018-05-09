set -e

echo 'Add patch-package'
yarn add $1

echo 'check local-package has not been patched'
if grep -e '\bpatched' node_modules/local-package/index.js
then
  exit 1
fi

echo 'edit file'
replace unpatched patched node_modules/local-package/index.js

echo 'check local-package _has_ been patched in node_modules'
grep -e '\bpatched' node_modules/local-package/index.js

echo 'check local-package _has not_ been patched in root folder'
if grep -e '\bpatched' local-package/index.js
then
  exit 1
fi

echo 'patch-package should be able to create a patch file'
patch-package local-package

echo "SNAPSHOT: a patch file got produced"
ls patches/local-package*.patch
cat patches/local-package*.patch
echo "END SNAPSHOT"
