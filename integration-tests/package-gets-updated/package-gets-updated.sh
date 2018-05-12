# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "SNAPSHOT: left-pad should contain patch-package"
grep patch-package node_modules/left-pad/index.js
echo "END SNAPSHOT"

(>&2 echo "SNAPSHOT: warning when the patch was applied but version changed")
yarn add left-pad@1.1.2
(>&2 echo "END SNAPSHOT")

echo "SNAPSHOT: left-pad should still contain patch-package"
grep patch-package node_modules/left-pad/index.js
echo "END SNAPSHOT"

(>&2 echo "SNAPSHOT: fail when the patch was not applied")
if yarn add left-pad@1.1.3 ; then
  exit 1
fi
(>&2 echo "END SNAPSHOT")

echo "left-pad should not contain patch-package"
if grep patch-package node_modules/left-pad/index.js ; then
  exit 1
fi
