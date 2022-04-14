# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1
alias patch-package=./node_modules/.bin/patch-package

echo "modify left-pad"
npx replace leftPad patchPackage node_modules/left-pad/index.js

echo "force patch-package to fail"
npx replace 'parsePatchFile\(' 'blarseBlatchBlile(' node_modules/@abbo/patch-package/dist/makePatch.js

echo "there is no error log file"
if ls ./patch-package-error.json.gz
then
  exit 1
fi

(>&2 echo "SNAPSHOT: patch-package fails to parse a patch it created")
if patch-package left-pad
then
  exit 1
fi
(>&2 echo "END SNAPSHOT")

echo "there is now an error log file"
ls ./patch-package-error.json.gz

echo "and it can be unzipped"
gzip -d ./patch-package-error.json.gz

echo "the json file is valid json"
node -e 'JSON.parse(fs.readFileSync("./patch-package-error.json").toString())'