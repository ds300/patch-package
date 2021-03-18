# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
shopt -s expand_aliases # enable alias
alias patch-package=./node_modules/.bin/patch-package

echo "make changes to dependency/index.js"
echo '// hello i am patch-package' > node_modules/dependency/index.js

echo "doesn't fail when making a patch"
patch-package dependency
