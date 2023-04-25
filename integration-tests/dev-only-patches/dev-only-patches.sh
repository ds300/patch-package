# make sure errors stop the script
set -e

echo "set production mode"
export NODE_ENV=production
export CI="true"

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

echo "SNAPSHOT: patch-package happily ignores slash on CI because it's a dev dep"
patch-package
echo "END SNAPSHOT"

echo "create fake-package+3.0.0.patch"
cp patches/slash+3.0.0.patch patches/fake-package+3.0.0.patch

(>&2 echo "SNAPSHOT: patch-package fails to find fake-package")
if patch-package
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")

echo "rename fake-package patch file to .dev.patch"
mv patches/fake-package+3.0.0.patch patches/fake-package+3.0.0.dev.patch

echo "SNAPSHOT: fake-package should be skipped"
patch-package
echo "END SNAPSHOT"
