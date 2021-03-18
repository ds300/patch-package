# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
shopt -s expand_aliases # enable alias
alias patch-package=./node_modules/.bin/patch-package

echo "SNAPSHOT: left-pad, lodash, and zfs apply"
(>&2 echo "SNAPSHOT: underscore does not apply, left-pad warns")
if patch-package;
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")
echo "END SNAPSHOT"