# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

echo "SNAPSHOT: no package present failure"
if patch-package; then
  exit 1
fi
echo "END SNAPSHOT"
