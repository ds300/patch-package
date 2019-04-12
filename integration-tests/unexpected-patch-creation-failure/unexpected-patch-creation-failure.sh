# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "modify left-pad"
npx replace leftPad patchPackage node_modules/left-pad/index.js

echo "force patch-package to fail"
npx replace 'parsePatchFile\(' 'blarseBlatchBlile(' node_modules/patch-package/dist/makePatch.js

echo "there is no error log file"
if ls ./patch-package-error.json.gz
then
  exit 1
fi

(>&2 echo "SNAPSHOT: patch-package fails to parse a patch it created")
if yarn patch-package left-pad
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")

echo "there is now an error log file"
ls ./patch-package-error.json.gz

echo "and it can be unzipped"
gzip -d ./patch-package-error.json.gz

echo "SNAPSHOT: the json file"
cat ./patch-package-error.json
echo "END SNAPSHOT"