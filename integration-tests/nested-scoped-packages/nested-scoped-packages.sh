# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "@microsoft/mezzurite-core => @types/angular should not contain patch-package"
if grep patch-package ./node_modules/@microsoft/mezzurite-core/node_modules/@types/angular/index.d.ts ; then
  exit 1
fi

echo "edit @microsoft/mezzurite-core => @types/angular"
yarn replace angular patch-package ./node_modules/@microsoft/mezzurite-core/node_modules/@types/angular/index.d.ts 

echo "SNAPSHOT: create the patch"
npx patch-package @microsoft/mezzurite-core/@types/angular
echo "END SNAPSHOT"

echo "the patch file was created"
ls patches/@microsoft+mezzurite-core++@types+angular+1.6.53.patch

echo "reinstall node_modules"
yarn rimraf node_modules
yarn

echo "@microsoft/mezzurite-core => @types/angular should not contain patch-package"
if grep patch-package ./node_modules/@microsoft/mezzurite-core/node_modules/@types/angular/index.d.ts ; then
  exit 1
fi

echo "SNAPSHOT: run patch-package"
npx patch-package
echo "END SNAPSHOT"

echo "@microsoft/mezzurite-core => @types/angular should contain patch-package"
grep patch-package ./node_modules/@microsoft/mezzurite-core/node_modules/@types/angular/index.d.ts