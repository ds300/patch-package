# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

export NODE_ENV="development"
export CI="true"

echo "SNAPSHOT: at dev time patch-package fails but returns 0"
if ! patch-package;
then
  exit 1
fi
echo "END SNAPSHOT"

echo "adding --error-on-fail forces patch-package to return 1 at dev time"
if patch-package --error-on-fail;
then
  exit 1
fi
