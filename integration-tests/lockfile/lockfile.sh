# make sure errors stop the script
set -e

echo "add patch-package"
npm i $1
alias patch-package=./node_modules/.bin/patch-package

function testLockFile() {
    echo "Version test $1"
    npm i --lockfile-version $1

    echo "cleanup patches"
    npx rimraf patches

    echo "replace pad with yarn in left-pad/index.js"
    npx replace pad npm node_modules/left-pad/index.js

    echo "patch-package should run"
    patch-package left-pad

    echo "SNAPSHOT: check patch with lockfile $1"
    cat patches/left-pad+1.3.0.patch
    echo "END SNAPSHOT"
}

echo "test lockfile v1"
testLockFile 1

echo "test lockfile v2"
testLockFile 2

echo "test lockfile v3"
testLockFile 3
