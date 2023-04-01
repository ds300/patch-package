# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

(>&2 echo "SNAPSHOT: patch-package returns 1 on missing package")
if patch-package;
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")

echo "SNAPSHOT: adding --ignore-missing forces patch-package to return 0"
patch-package --ignore-missing;
echo "END SNAPSHOT"
