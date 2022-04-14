# postinstall
cd "$(dirname "$0")"

ls -la
ls -la ..

# if we're running in the main repo is ok
if ls ../patch-package; then
  exit 0
fi
# if we are installed alone then fail
exit 1
