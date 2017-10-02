import { red } from "chalk"

export default function makeRegExp(
  reString: string,
  name: string,
  defaultValue: RegExp,
  caseSensitive: boolean,
): RegExp {
  if (!reString) {
    return defaultValue
  } else {
    try {
      return new RegExp(reString, caseSensitive ? "" : "i")
    } catch (_) {
      console.error(`${red.bold("***ERROR***")}
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
