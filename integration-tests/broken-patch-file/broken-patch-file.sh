# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
shopt -s expand_aliases # enable alias
alias patch-package=./node_modules/.bin/patch-package

(>&2 echo "SNAPSHOT: patch-package fails when patch file is invalid")
if patch-package
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")
