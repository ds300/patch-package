# patch-package 📦👌

## Can't afford to wait for that PR to land? Need a quick fix right now?

`patch-package` lets app authors instantly make and keep small necessary fixes to npm
dependencies

```sh
# fix a bug in one of your deps
vim node_modules/some-package/brokenFile.js
# run patch-package to create a .patch file
patch-package some-package
# commit the patch file to share the fix with your team
git add patches/some-package:3.14.15.patch
git commit -m "fix brokenFile.js in some-package"
```

Patches created by `patch-package` are automatically and gracefully applied
any time the contents of node_modules is installed by `npm`(>=5) or `yarn`. If a patched dependency gets a version bump the patch file you created might not make sense anymore, so `patch-package` will explicitly prompt you to check.

## Set-up

You'll need `patch-package`. If you use `yarn`, you [might like to have a local copy of that too](#why-patch-yarn).

    yarn add --dev patch-package

In package.json

    "scripts": {
      "prepare": "patch-package"
    }

## Usage

### Making patches

First make changes to the files of a particular package in your node_modules folder, then run

    patch-package package-name

where `package-name` matches the name of the package you made changes to.

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
- Patches can be reviewed as part of your normal review process, forks probably can't

## When to fork instead

- The change is too consequential to be developed in situ.
- The change would be useful to other people as-is.
- You can afford to make a proper PR to upstream.

## Isn't this dangerous?

Nah. You're just fixing your dependencies. Just don't do anything wild with it
unless you're certain you're the only consumer of the affected dependency.

## Why patch Yarn?

Most times when you do a `yarn`, `yarn add`, `yarn remove`, or `yarn install` (which is the same as just `yarn`) Yarn will completely replace the contents of your node_modules with freshly unpackaged modules. patch-package uses the `prepare` hook to modify these fresh modules, so that they behave well according to your will.

Plain unpatched Yarn only runs the `prepare` hook after `yarn` and `yarn add`, but not after `yarn remove`. patch-package benefits from a local copy of yarn so that it can patch it to run the `prepare` hook after `yarn remove` and thus make sure that your node_modules is always* patched and ready to go. It's a [simple one-line change](./yarn.patch)

All that you need to do to enable this patch is install a project-local copy of yarn:

    yarn add --dev yarn

And then run

    which yarn

The output should be `./node_modules/.bin/yarn`. If not, make sure `./node_modules/.bin/` is at the start of your `PATH` environment variable.

\* If you ever run `yarn remove` from a non-root project directory, things might break. But just run `yarn` again to restore order.

## License

MIT

[![Empowered by Futurice's open source sponsorship program](https://img.shields.io/badge/sponsor-chilicorn-ff69b4.svg)](http://futurice.com/blog/sponsoring-free-time-open-source-activities?utm_source=github&utm_medium=spice&utm_campaign=patch-package)
