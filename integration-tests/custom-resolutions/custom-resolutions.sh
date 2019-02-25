# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "the index.js"
cat patch-package node_modules/dependency/index.js

echo "make changes to dependency/index.js"
npx replace dependency patch-package node_modules/dependency/index.js

echo "doesn't fail when making a patch"
npx patch-package dependency
