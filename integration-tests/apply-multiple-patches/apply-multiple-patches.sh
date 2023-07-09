# make sure errors stop the script
set -e

npm install

echo "add patch-package"
npm add $1
alias patch-package=./node_modules/.bin/patch-package


echo "SNAPSHOT: patch-package happily applies both good patches"
patch-package
echo "END SNAPSHOT"

echo "it should work if we apply them again even though they touch the same parts of the code"
if ! patch-package
then
  exit 1
fi

cp *broken.patch patches/

(>&2 echo "SNAPSHOT: patch-package fails when a patch in the sequence is invalid")
if patch-package
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")

echo "SNAPSHOT: patch-package only applies the first patch if the second of three is invalid"
if patch-package
then
  exit 1
fi
echo "END SNAPSHOT"