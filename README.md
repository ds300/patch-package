# patch-package 📦👌

### Can't wait for the fix? Forking too tedious? Patch it!

patch-package lets you easily and persistently make small changes to packages in your
`node_modules` folder, and share the results with your team. This is especially useful
if you or somebody else fixes a bug or adds a feature in one of your dependencies,
but you can't wait for the change to be reviewed, merged, and then published.

You simply make local changes to one of the package directories under `node_modules`, then
run `patch-package <package-name>` and it will create a patch file
for you to commit. The patch will be gracefully applied any time the contents of `node_modules`
gets updated by yarn/npm, and, of course, you'll receive warnings if things ever change.

## Set-up

    yarn add -D patch-package

In package.json

    "scripts": {
      "prepare": "patch-package"
    }

## Usage

Make changes to the files of a particular package in your node_modules folder,
e.g. react-native. Then run:

    patch-package react-native

If this is the first
time you've used `patch-package`, it will create a folder called `patches` in
the root dir of your app. Inside will be a file called `react-native:0.44.0.patch` or something,
which is a diff between normal old react-native and your fixed version. Commit this and you and your team will enjoy the same changes from here on out.

Repeat the same process to update the patch file, or just delete it if you don't need the changes anymore.

## Benefits of patching over forking

- Sometimes forks need extra build steps, e.g. with react-native for Android. Forget that noise.
- Get told in big red letters when the dependency changed and you need to check that your fix is still valid.
- Keep your patches colocated with the code that depends on them.

## When to fork instead

- The change is too consequential to be developed in situ.
- The change would be useful to other people as-is.
- You can afford to make a proper PR to upstream.

## Isn't this totally insanely dangerous?

Nawh. It's not like monkey patching or anything. You're just fixing your
dependencies.

- Patches are easy to review. We do that all day anyway.
- If the dependency gets a version bump, you get a warning telling you there's a mismatch. If everything is still working a-ok, just run `patch-package <package-name>` again and the warning goes away.
- If the dependency changes so much that the patch can't be applied, you get a error and have to resolve the conflicts, or just remove the patch file if shit got fixed upstream.

## License

MIT
