# make sure errors stop the script
set -e

npm install

echo "add patch-package"
npm add $1
alias patch-package=./node_modules/.bin/patch-package


echo "SNAPSHOT: patch-package happily applies both good patches"
patch-package
echo "END SNAPSHOT"

cp *broken.patch patches/

(>&2 echo "SNAPSHOT: patch-package fails when a patch in the sequence is invalid")
if patch-package
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")
