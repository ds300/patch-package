import slash from "slash"
import path from "path"

export const join: typeof path.join = (...args) => slash(path.join(...args))

export { dirname } from "path"

export const resolve: typeof path.resolve = (...args) =>
  slash(path.resolve(...args))

export const relative: typeof path.relative = (...args) =>
  slash(path.relative(...args))
