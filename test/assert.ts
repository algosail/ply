import nodeAssert from 'node:assert/strict'

/**
 * The value is truthy.
 * @example
 * assert (found)
 */
export function assert(value: unknown, message?: string): asserts value {
  nodeAssert.ok (value, message)
}

/**
 * `-0` equals `0`, and `NaN` equals `NaN`.
 * @example
 * sameValueZero (-0, 0)
 */
const sameValueZero = (a: unknown, b: unknown): boolean =>
  a === b || Object.is (a, b)

const seenEqual = (
  seen: Map<unknown, unknown>,
  a: object,
  b: object,
): boolean => seen.get (a) === b

/**
 * Deep equality.
 * @example
 * equal (left, right)
 */
export const equal = (actual: unknown, expected: unknown): boolean => {
  const seen = new Map<unknown, unknown> ()
  const compare = (a: unknown, b: unknown): boolean => {
    if (sameValueZero (a, b)) return true
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
      return false
    }
    if (a instanceof Date && b instanceof Date) {
      return Object.is (a.getTime (), b.getTime ())
    }
    if (Object.getPrototypeOf (a) !== Object.getPrototypeOf (b)) return false
    if (seenEqual (seen, a, b)) return true
    seen.set (a, b)
    if (a instanceof RegExp && b instanceof RegExp) return String (a) === String (b)
    if (ArrayBuffer.isView (a) && ArrayBuffer.isView (b)) {
      if (a.byteLength !== b.byteLength) return false
      const left = new Uint8Array (a.buffer, a.byteOffset, a.byteLength)
      const right = new Uint8Array (b.buffer, b.byteOffset, b.byteLength)
      for (let i = 0; i < left.length; i++) {
        if (left[i] !== right[i]) return false
      }
      return true
    }
    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false
      const pending = [...b]
      for (const item of a) {
        const at = pending.findIndex ((other) => compare (item, other))
        if (at < 0) return false
        pending.splice (at, 1)
      }
      return true
    }
    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false
      const pending = [...b]
      for (const [key, value] of a) {
        const at = pending.findIndex (
          ([otherKey, otherValue]) =>
            compare (key, otherKey) && compare (value, otherValue),
        )
        if (at < 0) return false
        pending.splice (at, 1)
      }
      return true
    }
    const keys = new Set<PropertyKey> ([
      ...Reflect.ownKeys (a),
      ...Reflect.ownKeys (b),
    ])
    for (const key of keys) {
      const inA = key in a
      const inB = key in b
      if (inA !== inB) return false
      if (inA && !compare (
        (a as Record<PropertyKey, unknown>)[key],
        (b as Record<PropertyKey, unknown>)[key],
      )) return false
    }
    return true
  }
  return compare (actual, expected)
}

/**
 * Deep equality.
 * @example
 * assertEquals (1, 1)
 */
export const assertEquals = (
  actual: unknown,
  expected: unknown,
  message?: string,
): void => {
  if (equal (actual, expected)) return
  nodeAssert.deepStrictEqual (actual, expected, message)
}

/**
 * Same value, by `Object.is`.
 * @example
 * assertStrictEquals (read, read)
 */
export const assertStrictEquals = (
  actual: unknown,
  expected: unknown,
  message?: string,
): void => {
  nodeAssert.strictEqual (actual, expected, message)
}

const matches =
  (ctor?: new (...args: never) => Error, includes?: string) =>
  (err: unknown): boolean => {
    if (ctor !== undefined && !(err instanceof ctor)) return false
    if (includes === undefined) return true
    const said = err instanceof Error ? err.message : String (err)
    return said.includes (includes)
  }

/**
 * `fn` throws an `Error`, and the message contains `includes` when given.
 * @example
 * assertThrows (() => fail (), Error, 'missing')
 */
export const assertThrows = (
  fn: () => unknown,
  ctor?: new (...args: never) => Error,
  includes?: string,
  message?: string,
): void => {
  nodeAssert.throws (fn, matches (ctor, includes), message)
}
