/**
 * Read and update record properties. Updates return shallow copies.
 * Use `get` and `gets` for optional reads with validation.
 *
 * @module
 */

import type { Maybe } from '../data/maybe.ts'
import { just, nothing } from '../data/maybe.ts'

/**
 * Copies a record with an existing property set to a new value.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.set('a')(9)({ a: 0, b: 1 }) // => { a: 9, b: 1 }
 * ```
 */
export function set<K extends PropertyKey>(
  key: K,
): <V>(value: V) => <A extends Record<K, V>>(a: A) => A {
  return (value) => (a) => ({
    ...a,
    [key]: value,
  })
}

/**
 * Copies a record with an existing property transformed by a function.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.modify('a')((n: number) => n + 1)({ a: 0, b: 'x' }) // => { a: 1, b: 'x' }
 * ```
 */
export function modify<K extends PropertyKey>(
  key: K,
): <V>(f: (value: V) => V) => <A extends Record<K, V>>(a: A) => A {
  return (f) => (a) => ({
    ...a,
    [key]: f(a[key]),
  })
}

function lookup(key: PropertyKey, a: unknown): Maybe<unknown> {
  if (a === null || a === undefined) return nothing()
  const obj = Object(a) as Record<PropertyKey, unknown>
  return key in obj ? just(obj[key]) : nothing()
}

function lookupPath(
  path: readonly PropertyKey[],
  a: unknown,
): Maybe<unknown> {
  return path.reduce(
    (acc: Maybe<unknown>, key) => acc.chain((x) => lookup(key, x)),
    just(a),
  )
}

/**
 * Reads a property, including an inherited property.
 *
 * @throws {TypeError} If the property is missing.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import * as P from '@algosail/ply'
 *
 * P.prop('a')({ a: 1, b: 2 }) // => 1
 * assertThrows(
 *   () => P.prop('c')({} as { c: number }),
 *   TypeError,
 *   'prop: object has no property named c',
 * )
 * ```
 */
export function prop<K extends PropertyKey>(
  key: K,
): <A extends Record<K, unknown>>(a: A) => A[K] {
  return <A extends Record<K, unknown>>(a: A): A[K] =>
    lookup(key, a).match(
      () => {
        throw new TypeError(
          `prop: object has no property named ${String(key)}`,
        )
      },
      (value) => value as A[K],
    )
}

/**
 * Reads a nested property along a path, including inherited properties.
 * An empty path returns the input.
 *
 * @throws {TypeError} If any property in the path is missing.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import * as P from '@algosail/ply'
 *
 * P.props(['a', 'b'])({ a: { b: 2 } }) // => 2
 * assertThrows(
 *   () => P.props(['a', 'b'])({ a: 1 }),
 *   TypeError,
 *   'props: object has no property named b at path a.b',
 * )
 * ```
 */
export function props(path: readonly PropertyKey[]): (a: unknown) => unknown {
  return (a: unknown): unknown =>
    path.reduce(
      (x: unknown, key) =>
        lookup(key, x).match(
          () => {
            throw new TypeError(
              `props: object has no property named ${String(key)} at path ${
                path.map(String).join('.')
              }`,
            )
          },
          (value) => value,
        ),
      a,
    )
}

/**
 * Reads a property as `Just` if it exists and passes the predicate.
 * Returns `Nothing` otherwise. Inherited properties are included.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const isNumber = (x: unknown): x is number => typeof x === 'number'
 *
 * P.get(isNumber)('a')({ a: 1 }) // => Just (1)
 * P.get(isNumber)('a')({ a: 'x' }) // => Nothing
 * P.get(isNumber)('c')({ a: 1 }) // => Nothing
 * ```
 */
export function get<B>(
  p: (x: unknown) => x is B,
): (key: PropertyKey) => (a: unknown) => Maybe<B>
/** Reads a property as `Just` if it exists and passes the predicate. */
export function get(
  p: (x: unknown) => boolean,
): (key: PropertyKey) => (a: unknown) => Maybe<unknown>
export function get(p: (x: unknown) => boolean) {
  return (key: PropertyKey) => (a: unknown): Maybe<unknown> =>
    lookup(key, a).filter(p)
}

/**
 * Reads a nested property as `Just` if the path exists and the value passes
 * the predicate.
 * Returns `Nothing` otherwise. Inherited properties are included.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const isNumber = (x: unknown): x is number => typeof x === 'number'
 *
 * P.gets(isNumber)(['a', 'b'])({ a: { b: 2 } }) // => Just (2)
 * P.gets(isNumber)(['a', 'b'])({ a: 1 }) // => Nothing
 * ```
 */
export function gets<B>(
  p: (x: unknown) => x is B,
): (path: readonly PropertyKey[]) => (a: unknown) => Maybe<B>
/**
 * Reads a nested property as `Just` if the path exists and the value passes
 * the predicate.
 */
export function gets(
  p: (x: unknown) => boolean,
): (path: readonly PropertyKey[]) => (a: unknown) => Maybe<unknown>
export function gets(p: (x: unknown) => boolean) {
  return (path: readonly PropertyKey[]) => (a: unknown): Maybe<unknown> =>
    lookupPath(path, a).filter(p)
}

/**
 * Copies an object without the specified property.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.remove('b')({ a: 1, b: 2 }) // => { a: 1 }
 * ```
 */
export function remove<K extends PropertyKey>(
  key: K,
): <A extends object>(a: A) => Omit<A, K> {
  return <A extends object>(a: A): Omit<A, K> => {
    const { [key as PropertyKey]: _removed, ...rest } = a as Record<
      PropertyKey,
      unknown
    >
    return rest as Omit<A, K>
  }
}
