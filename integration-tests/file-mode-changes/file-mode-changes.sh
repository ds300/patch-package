# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "check file permissions 1"
./assert-executable.js node_modules/prettier/bin-prettier.js
./assert-not-executable.js node_modules/prettier/index.js

echo "change file modes"
npx shx chmod -x node_modules/prettier/bin-prettier.js
npx shx chmod +x node_modules/prettier/index.js

echo "check file permissions 2"
./assert-executable.js node_modules/prettier/index.js
./assert-not-executable.js node_modules/prettier/bin-prettier.js

echo "patch prettier"
npx patch-package prettier

echo "SNAPSHOT: the patch file"
cat patches/prettier*
echo "END SNAPSHOT"

echo "reinstall node modules"
npx shx rm -rf node_modules
yarn

echo "check file permissions 3"
./assert-executable.js node_modules/prettier/bin-prettier.js
./assert-not-executable.js node_modules/prettier/index.js

echo "run patch-package"
npx patch-package

echo "check file permissions 4"
./assert-executable.js node_modules/prettier/index.js
./assert-not-executable.js node_modules/prettier/bin-prettier.js
