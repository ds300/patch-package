# patch-package 📦👌

### Can't afford to wait for that PR to land? Need a quick fix right now?

patch-package lets you easily make small necessary changes to packages in your
`node_modules` folder, without the headache of forking repos or worse.

```sh
# fix a bug in one of your deps
vim node_modules/some-package/brokenFile.js
# run patch-package to create a .patch file
patch-package some-package
# commit the patch file
git add patches/some-package:3.14.15.patch
git commit -m "fix brokenFile.js in some-package"
```

Patches created by `patch-package` are automatically and gracefully applied
any time the contents of node_modules is changed by Yarn. You get warnings
if the versions of patched dependencies change, and errors when the patch can
no longer be applied.

## Set-up

You'll need `patch-package`, and also to run a project-local copy of `yarn` (so patch-package can patch it... don't worry, it's a one-line change)

    yarn add -D patch-package yarn

In package.json

    "scripts": {
      "prepare": "patch-package"
    }

Run

    which yarn

The output should be `./node_modules/.bin/yarn`. If not, make sure `./node_modules/.bin/` is at the start of your `PATH` environment variable.

## Usage

### Making patches

First make changes to the files of a particular package in your node_modules folder, then run

    patch-package package-name

where `package-name` matches the name of the package you made changes to. This could take several minutes if you don't use Yarn yet.

If this is the first time you've used `patch-package`, it will create a folder called `patches` in
the root dir of your app. Inside will be a file called `package-name:0.44.0.patch` or something,
which is a diff between normal old `package-name` and your fixed version. Commit this to share the fix with your team.

### Updating patches

Use exactly the same process as for making patches in the first place, i.e. make more changes, run patch-package, commit the changes to the patch file.

### Applying patches

Patches are applied automatically by the `prepare` npm/yarn hook if you followed the set-up guide above. For manual use,
run patch-package without arguments to apply all patches in your project.
patch-package cannot apply individual packages just yet, but you can use the unix `patch`
command, of course.

    patch --forward -p1 -i patches/package-name:0.44.2.patch

## Benefits of patching over forking

- Sometimes forks need extra build steps, e.g. with react-native for Android. Forget that noise.
- Get told in big red letters when the dependency changed and you need to check that your fix is still valid.
- Keep your patches colocated with the code that depends on them.

## When to fork instead

- The change is too consequential to be developed in situ.
- The change would be useful to other people as-is.
- You can afford to make a proper PR to upstream.

## Isn't this insanely dangerous?

Nawh. It's not like monkey patching or anything. You're just fixing your
dependencies.

- Patches are easy to review. We do that all day anyway.
- If the dependency gets a version bump, you get a warning telling you there's a mismatch. If everything is still working a-ok, just run `patch-package <package-name>` again and the warning goes away.
- If the dependency changes so much that the patch can't be applied, you get a full-blown error and have to resolve the conflicts, or just remove the patch file if shit got fixed upstream.

## License

MIT

[![Empowered by Futurice's open source sponsorship program](https://img.shields.io/badge/sponsor-chilicorn-ff69b4.svg)](http://futurice.com/blog/sponsoring-free-time-open-source-activities?utm_source=github&utm_medium=spice&utm_campaign=patch-package)
