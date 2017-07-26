# Changelog

## 3.3.0

- Use `+` instead of `:` in patch file names because `:` is illegal on Windows.
## 3.2.1

- Make update-notifier message show local install

## 3.2.0

- Add update-notifier to notify users of patch-package updates

## 3.1.0

- Add support for scoped packages

## 3.0.0

- Add support for npm5
- Make yarn patching a cli option, off by default

## 2.1.1

Improve error messages

## 2.1.0

Reduce yarn error to a warning

## 2.0.0

- Require yarn as a peer dependency
- Remove support for NPM

Moving fast and breaking things. It turns out yarn doesn't run the
prepare hook after removing a package, so we use patch-package to
patch a local version of yarn. I'm not proud of this. Probably
wouldn't have released this in the first place if I had known that
yarn didn't have all the right hooks. Oh well. Now I have a reason
to contribute to Yarn I guess.

## 1.2.1

- Fix patch creation logic around nested node_modules

## 1.2.0

- Enable picking up changes in nested node_modules folders.
- Enable adding new files, not just patching existing files.

## 1.1.1

- Fix bug that made exit code 1 regardless of success or failure.

## 1.1.0

- Make applying patches work
- Add nice colorful log messages.

## 1.0.0

Initial broken release
