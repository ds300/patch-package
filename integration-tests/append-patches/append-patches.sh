# make sure errors stop the script
set -e

npm install

echo "add patch-package"
npm add $1
alias patch-package=./node_modules/.bin/patch-package

function replace {
  npx replace "$1" "$2" node_modules/left-pad/index.js
}

echo "making an initial patch file does not add a sequence number to the file by default"
replace 'use strict' 'use patch-package'

patch-package left-pad

echo "SNAPSHOT: basic patch file"
ls patches
echo "END SNAPSHOT"

echo "using --apend creates a patch file with a sequence number and updates the original patch file"

replace 'use patch-package' 'use a million dollars'

patch-package left-pad --append 'MillionDollars'

echo "SNAPSHOT: after appending a patch file"
ls patches
echo "END SNAPSHOT"

echo "SNAPSHOT: the second patch file should go from patch-package to a million dollars"
cat patches/left-pad*MillionDollars.patch
echo "END SNAPSHOT"

echo "we can squash the patches together by deleting the patch files"
rm patches/left-pad*patch

patch-package left-pad --append 'FirstPatch'

echo "SNAPSHOT: creating a first patch file with --append"
ls patches
echo "END SNAPSHOT"

echo "SNAPSHOT: the squashed patch file should go from use strict to a million dollars"
cat patches/left-pad*FirstPatch.patch
echo "END SNAPSHOT"

echo "i can update an appended patch file"

replace 'use a million dollars' 'use a billion dollars'

patch-package left-pad --append 'BillionDollars'

echo "SNAPSHOT: after appending a billion dollars"
ls patches
echo "END SNAPSHOT"

replace 'use a billion dollars' 'use a trillion dollars'
patch-package left-pad 

echo "SNAPSHOT: after updating the appended patch file to a TRILLION dollars"
cat patches/left-pad*BillionDollars.patch
echo "END SNAPSHOT"

echo "if one of the patches in the sequence is invalid, the sequence is not applied"
npx replace 'use strict' 'use bananas'  patches/*FirstPatch.patch

(>&2 echo "SNAPSHOT: patch-package fails when a patch in the sequence is invalid")
if patch-package left-pad --append 'Bananas' ; then
  exit 1
fi
(>&2 echo "END SNAPSHOT")