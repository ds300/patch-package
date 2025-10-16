export type Result<V, E> =
  | {
      ok: true
      value: V
    }
  | {
      ok: false
      error: E
    }

export const Result = {
  ok: <V, E>(value: V): Result<V, E> => ({ ok: true, value }),
  err: <V, E>(error: E): Result<V, E> => ({ ok: false, error }),
}
