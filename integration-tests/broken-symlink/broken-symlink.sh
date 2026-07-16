# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

echo "make a symbolic link pointing at a file that does not exist"
ln -s ./not-a-real-file node_modules/left-pad/broken-symlink

echo "replace pad with yarn in left-pad/index.js"
npx replace pad yarn node_modules/left-pad/index.js

echo "SNAPSHOT: patch-package creates a patch for a package containing a broken symlink"
patch-package left-pad
echo "END SNAPSHOT"

echo "SNAPSHOT: the patch does not contain the broken symlink"
cat patches/left-pad+1.3.0.patch
echo "END SNAPSHOT"
