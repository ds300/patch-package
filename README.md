# patch-package

### When forking just won't work, patch it.

patch-package lets you easily fix bugs in (or add functionality to) packages in your
`node_modules` folder and share the results with your team. You simply make the changes in situ,
run `patch-package <package-name>` and patch-package will create a patch file
for you to commit, which gets applied any time the contents of `node_modules` is updated by yarn/npm.

## Set-up

    yarn add -D patch-package

In package.json

    "scripts": {
      "prepare": "patch-package"
    }

## Usage

Make changes to the files of a particular module in your node_modules folder,
e.g. react-native. Then run:

    patch-package react-native

If this is the first
time you've used `patch-package`, it will create a folder called `patches` in
the root dir of your app. Inside will be a file called `react-native:0.44.0.patch`
which is a diff between normal old react-native and your special version. Commit this and you and your team will enjoy the same changes from here on out.

Do exactly the same thing to update the patch file, or just delete it
if you don't need the changes anymore.

## License

MIT
