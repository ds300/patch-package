# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

export NODE_ENV="development"
export CI=""

(>&2 echo "SNAPSHOT: at dev time patch-package warns but returns 0")
if ! patch-package;
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")

echo "adding --error-on-warn forces patch-package to return 1 at dev time"
if patch-package --error-on-warn;
then
  exit 1
fi
