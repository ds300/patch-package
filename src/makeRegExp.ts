import chalk from "chalk"

export const makeRegExp = (
  reString: string,
  name: string,
  defaultValue: RegExp,
  caseSensitive: boolean,
): RegExp => {
  if (!reString) {
    return defaultValue
  } else {
    try {
      return new RegExp(reString, caseSensitive ? "" : "i")
    } catch (_) {
      console.log(`${chalk.red.bold("***ERROR***")}
Invalid format for option --${name}

  Unable to convert the string ${JSON.stringify(
    reString,
  )} to a regular expression.
`)

      process.exit(1)
      return /unreachable/
    }
  }
}
