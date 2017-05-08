# patch-package 📦👌

### When forking is too much, patch it.

patch-package lets you easily and persistently fix bugs in (or add functionality to) packages in your
`node_modules` folder, and share the changes with your team.

You simply make changes to one of the package directories under `node_modules`,
run `patch-package <package-name>` and patch-package will create a patch file
for you to commit. The patch is gracefully applied any time the contents of `node_modules`
gets updated by yarn/npm, and, of course, you'll receive warnings if things ever change.

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
the root dir of your app. Inside will be a file called `react-native:0.44.0.patch` or something,
which is a diff between normal old react-native and your special custom version. Commit this and you and your team will enjoy the same changes from here on out.

Repeat the same process to update the patch file, or just delete it if you don't need the changes anymore.

## When to patch

- The change is reasonably small.
- Your change is of no use upstream.
- You can't afford to make a useful PR to upstream.
- Your contract prevents you from making any code you write public (get a new contract asap, btw).
- You just don't have the time, man

## When to fork

- The change is too consequential to be developed in situ.
- The change would be useful to other people as-is.
- You can afford to make a proper PR to upstream.

## Isn't this totally insanely dangerous?

Nawh. It's not like monkey patching or anything. You're just fixing your
dependencies.

- Patches are easy to review. We do that all day anyway.
- If the dependency gets a version bump, you get a warning telling you there's a mismatch. If everything is still working a-ok, just run `patch-package <package-name>` again and the warning goes away.
- If the dependency changes so much that the patch can't be applied, you get a super extra important warning and have to resolve the conflicts, or just remove the patch file if shit got fixed upstream.
- No relying on github, or dealing with repos and permissions, or messing with version numbers, or having to manually pull upstream fixes, or any of that mess.

## License

MIT
