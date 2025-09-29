# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

export NODE_ENV="development"
export CI="true"

echo "SNAPSHOT: expect-patch flag prints an error message and by default does not fail"
if ! patch-package --expect-patch;
then
  exit 1
fi
echo "END SNAPSHOT"

echo "SNAPSHOT: expect-patch is silent when patches happen"
if ! patch-package --expect-patch --patch-dir patches-custom;
then
  exit 1
fi
echo "END SNAPSHOT"

echo "SNAPSHOT: expect-patch flag produces error for error-on-fail flag"
if patch-package --expect-patch --error-on-fail;
then
  exit 1
fi
echo "END SNAPSHOT"