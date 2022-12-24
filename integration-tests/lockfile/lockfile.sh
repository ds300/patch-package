# make sure errors stop the script
set -e

echo "add patch-package"
npm i $1
set -x
alias patch-package=./node_modules/.bin/patch-package

echo "Add left-pad"
npm i left-pad@1.3.0

testLockFile() {
    set -x
    echo "Version test $1"
    npm i --lockfile-version $1

    echo "cleanup patches"
    npx rimraf patches

    echo "replace pad with yarn in left-pad/index.js"
    npx replace pad npm node_modules/left-pad/index.js

    echo "patch-package should run"
    patch-package left-pad

    echo "check that the patch is created"
    test -f patches/left-pad+1.3.0.patch || exit 1
}

echo "test lockfile v3"
testLockFile 3

echo "test lockfile v2"
testLockFile 2

echo "test lockfile v1"
testLockFile 1
