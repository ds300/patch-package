import * as slash from "slash"
import * as path from "path"

export const join: typeof path.join = function join() {
  return slash(path.join.apply(null, arguments))
}

export { dirname } from "path"

export const resolve: typeof path.resolve = function resolve() {
  return slash(path.resolve.apply(null, arguments))
}

export const relative: typeof path.relative = function relative() {
  return slash(path.relative.apply(null, arguments))
}
