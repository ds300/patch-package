# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

(>&2 echo "SNAPSHOT: patch-package fails when patch file is invalid")
if npx patch-package
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")
