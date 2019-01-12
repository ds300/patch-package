# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "wrap-ansi=>string-width should not contain patch-package"
if grep patch-package node_modules/wrap-ansi/node_modules/string-width/index.js ; then
  exit 1
fi

echo "edit wrap-ansi=>string-width"
yarn replace width patch-package node_modules/wrap-ansi/node_modules/string-width/index.js 

echo "SNAPSHOT: create the patch"
npx patch-package wrap-ansi/string-width
echo "END SNAPSHOT"

echo "SNAPSHOT: the patch file contents"
cat patches/wrap-ansi++string-width+2.1.1.patch
echo "END SNAPSHOT"

echo "reinstall node_modules"
yarn rimraf node_modules
yarn

echo "wrap-ansi=>string-width should not contain patch-package"
if grep patch-package node_modules/wrap-ansi/node_modules/string-width/index.js ; then
  exit 1
fi

echo "SNAPSHOT: run patch-package"
npx patch-package
echo "END SNAPSHOT"

echo "wrap-ansi=>string-width should contain patch-package"
grep patch-package node_modules/wrap-ansi/node_modules/string-width/index.js