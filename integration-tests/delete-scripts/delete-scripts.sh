set -e

echo 'install without error because package.json is sanitized'
yarn add $1
shopt -s expand_aliases # enable alias
alias patch-package=./node_modules/.bin/patch-package

echo 'unsnitize package.json'
npx replace '<<PREINSTALL>>' preinstall package.json

echo 'install fails because preinstall hook is bad'
if yarn; then
  exit 1
fi

npx replace leftPad patchPackage node_modules/left-pad/index.js

echo 'but patch-package still works because it ignores scripts'
patch-package left-pad

echo "SNAPSHOT: a patch file got produced"
cat patches/left-pad*.patch
echo "END SNAPSHOT"
