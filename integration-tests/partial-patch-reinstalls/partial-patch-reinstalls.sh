# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

echo "SNAPSHOT: left-pad should contain patch-package"
grep patch-package node_modules/left-pad/index.js
echo "END SNAPSHOT"

# Simulates a "dirty" patch where there's stuff already applied
echo "replace pad with yarn in left-pad/index.js"
sed -i 's/pad/yarn/g' node_modules/left-pad/index.js

(echo >&2 "SNAPSHOT: warning when the patch was applied as a reinstall")
patch-package
(echo >&2 "END SNAPSHOT")

echo "SNAPSHOT: left-pad should no longer contain yarn"
grep patch-package node_modules/left-pad/index.js
if grep -q "yarn" node_modules/left-pad/index.js; then
  echo "'yarn' is still appearing. Not reset correctly!"
  exit 1
fi
echo "END SNAPSHOT"
