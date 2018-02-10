# Changelog

## 5.1.1

- Fix idempotency regression. See #39

## 5.1.0

- Add `--reverse` option for patch application. See #37

## 5.0.0

- Remove yarn patching code
- Recommend postinstall-prepare in README for yarn compatibiltiy

## 4.0.0

- Ignore all package.json files by default
- Exit with appropriate error when git is not available

## 3.6.1

- Fix bug where patch-package was complaining about failing when it had, in fact, succeeded. See #31

## 3.6.0

- Remove git headers from patch files to prevent git from thinking files are part of the index

## 3.5.3

- Change the way patch files are re-written when the project root dir is not the same as the git root dir.
- Remove redundant windows warning about whitespace

## 3.5.2

- Update README

## 3.5.1

- Ignore end-of-line whitespace when creating and applying patch files

## 3.5.0

- Add support for filtering particular paths

## 3.4.6

- Ensure use of unix-style paths everywhere

## 3.4.5

- Fix description of a hunk in error message

## 3.4.4

- Don't use `git apply` with `--unsafe-paths` since it is useless.

## 3.4.3

- Fix typo in error message

## 3.4.2

- Revert previous fix and suggest editing .gitattributes as an alternative

## 3.4.1

- Fix CRLF handling on Windows

## 3.4.0
- Add npm shrinkwrap support

## 3.3.6
- Use posix paths and line separators even on windows, for git's sake.

## 3.3.5
- Resolve paths in patch files for situations where the git root is not
the same as the app root.

## 3.3.4

- Pass --unsafe-paths option to `git apply` to let it work on arbitrary
  file paths (i.e. files which are not in a git repo or files which are
  outside of the working directory)

## 3.3.3

- Fix bug introduced in 3.3.2
- Add progress reporting during patch making

## 3.3.2

Windows fixes:

- Use `cross-spawn` for spawning child processes
- Use `git apply` for applying patches, rather than `patch`

Contribution by [@ashmind](https://github.com/ashmind)

## 3.3.1

- Use `fs-extra` to copy files instead of the `cp` shell command, which doesn't
  work on Windows

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
