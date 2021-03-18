# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
shopt -s expand_aliases # enable alias
alias patch-package=./node_modules/.bin/patch-package

echo "make symbolic link"
ln -s package.json node_modules/left-pad/package.parent.json

(>&2 echo "SNAPSHOT: patch-package fails to create a patch when there are symbolic links")
if patch-package left-pad
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")
