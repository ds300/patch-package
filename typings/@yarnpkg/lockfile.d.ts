declare module "@yarnpkg/lockfile" {
  export function parse(
    s: string,
  ): {
    type: "success" | "error"
    object: {
      [identifier: string]: {
        resolved?: string
        version: string
      }
    }
  }
}
