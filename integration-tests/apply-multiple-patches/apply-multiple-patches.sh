# make sure errors stop the script
set -e

npm install

echo "add patch-package"
npm add $1
alias patch-package=./node_modules/.bin/patch-package


echo "SNAPSHOT: patch-package happily applies all three good patches"
patch-package
echo "END SNAPSHOT"

echo "SNAPSHOT: patch-package stores a state file to list the patches that have been applied"
cat node_modules/left-pad/.patch-package.json
echo "END SNAPSHOT"

echo "it should work if we apply them again even though they touch the same parts of the code"
if ! patch-package
then
  exit 1
fi

cp *broken.patch patches/

rm -rf node_modules
npm install
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

echo "SNAPSHOT: patch-package stores a state file of only the first patch if there was an error"
cat node_modules/left-pad/.patch-package.json
echo "END SNAPSHOT"


rm patches/*hello.patch
(>&2 echo "SNAPSHOT: patch-package fails when a patch file is removed")
if patch-package
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")