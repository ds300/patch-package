# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "SNAPSHOT: left-pad typings should contain patch-package"
if ! grep patch-package node_modules/@types/left-pad/index.d.ts ; then
  exit 1
fi
echo "END SNAPSHOT"

echo "modify add.d.t.s"
replace add patch-package node_modules/@types/lodash/add.d.ts

echo "patch-package can make patches for scoped packages"
patch-package @types/lodash

echo "remove node_modules"
rimraf node_modules

echo "reinstall node_modules"
yarn

echo "SNAPSHOT: add.d.ts should contain patch-package"
if ! grep patch-package node_modules/@types/lodash/add.d.ts ; then
  exit 1
fi
echo "END SNAPSHOT"