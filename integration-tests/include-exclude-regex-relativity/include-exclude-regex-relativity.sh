# make sure errors stop the script
set -e

echo "add patch-package"
yarn add $1

echo "mutate words.js"
npx replace words patch-packages node_modules/lodash/words.js

echo "patch-package includes words.js in a patch by default"
npx patch-package lodash

echo "patch-package doesn't include words.js if excluded with relative path"
if npx patch-package lodash --exclude '^words' ; then
  exit 1
fi

echo "patch-package includes words.js if included with relative path"
npx patch-package lodash --include '^words'

echo "patch-package doesn't exclude words.js if excluded with node_modules path"
npx patch-package lodash --exclude node_modules/lodash/words.js

echo "patch-package doesn't include words.js if included with node_modules path"
if npx patch-package lodash --include node_modules/lodash/words.js ; then
  exit 1
fi

echo "patch-package doesn't exclude words.js if excluded with lodash path"
npx patch-package lodash --exclude lodash/words.js

echo "patch-package doesn't include words.js if included with lodash path"
if npx patch-package lodash --include lodash/words.js ; then
  exit 1
fi

echo "patch-package does exclude words.js if excluded without prefix"
if npx patch-package lodash --exclude words.js ; then
  exit 1
fi
