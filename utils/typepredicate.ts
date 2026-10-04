import { is } from '../classes/checkable.ts'
import { Arr } from '../natives/array.ts'
import { Bool } from '../natives/boolean.ts'
import { Big } from '../natives/bigint.ts'
import { Dates } from '../natives/date.ts'
import { Fn } from '../natives/function.ts'
import { Maps } from '../natives/map.ts'
import { Re } from '../natives/regexp.ts'
import { Sets } from '../natives/set.ts'
import { Str } from '../natives/string.ts'
import { StrMap } from '../natives/strmap.ts'
import { Either } from '../data/either.ts'
import { Equivalence } from '../data/equivalence.ts'
import { Identity } from '../data/identity.ts'
import { Maybe } from '../data/maybe.ts'
import { Pair } from '../data/pair.ts'
import { Predicate } from '../data/predicate.ts'

/**
 * Whether a value is an array.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isArray([1]) // => true
 * P.isArray('1') // => false
 * ```
 */
export const isArray: (x: unknown) => x is readonly unknown[] = is(Arr)

/**
 * Whether a value is a boolean.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isBoolean(false) // => true
 * P.isBoolean(0) // => false
 * ```
 */
export const isBoolean: (x: unknown) => x is boolean = is(Bool)

/**
 * Whether a value is a bigint.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isBigInt(0n) // => true
 * P.isBigInt('1') // => false
 * ```
 */
export const isBigInt: (x: unknown) => x is bigint = is(Big)

/**
 * Checks whether a value is a Date, including an invalid Date.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isDate(new Date(0)) // => true
 * P.isDate(0) // => false
 * ```
 */
export const isDate: (x: unknown) => x is Date = is(Dates)

/**
 * Whether a value is callable.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isFunction(P.I) // => true
 * P.isFunction('I') // => false
 * ```
 */
export const isFunction: (x: unknown) => x is (...args: never[]) => unknown =
  is(Fn)

/**
 * Whether a value is a map.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isMap(new Map()) // => true
 * P.isMap('Map') // => false
 * ```
 */
export const isMap: (x: unknown) => x is Map<unknown, unknown> = is(Maps)

/**
 * Checks whether a value is a number other than `NaN`. Infinity is accepted.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isNumber(1) // => true
 * P.isNumber(Number.NaN) // => false
 * ```
 */
export function isNumber(x: unknown): x is number {
  return typeof x === 'number' && !Number.isNaN(x)
}

/**
 * Whether a value is a regular expression.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isRegexp(/abc/) // => true
 * P.isRegexp('abc') // => false
 * ```
 */
export const isRegexp: (x: unknown) => x is RegExp = is(Re)

/**
 * Whether a value is a set.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isSet(new Set()) // => true
 * P.isSet('Set') // => false
 * ```
 */
export const isSet: (x: unknown) => x is Set<unknown> = is(Sets)

/**
 * Whether a value is a string.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isString('a') // => true
 * P.isString(1) // => false
 * ```
 */
export const isString: (x: unknown) => x is string = is(Str)

/**
 * Checks for a plain object with `Object.prototype` or `null` as its prototype.
 * Arrays and class instances are excluded.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isStrMap({ a: 1 }) // => true
 * P.isStrMap([1]) // => false
 * P.isStrMap(null) // => false
 * ```
 */
export const isStrMap: (x: unknown) => x is StrMap<unknown> = is(StrMap)

/**
 * Whether a value is an either.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isEither(P.nothing()) // => true
 * P.isEither({ a: 1 }) // => false
 * ```
 */
export const isEither: (x: unknown) => x is Either<unknown, unknown> = is(
  Either,
)

/**
 * Whether a value is an equivalence.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isEquivalence(P.equivalence(() => true)) // => true
 * P.isEquivalence({ a: 1 }) // => false
 * ```
 */
export const isEquivalence: (x: unknown) => x is Equivalence<unknown> = is(
  Equivalence,
)

/**
 * Whether a value is an identity.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isIdentity(P.identity(1)) // => true
 * P.isIdentity({ a: 1 }) // => false
 * ```
 */
export const isIdentity: (x: unknown) => x is Identity<unknown> = is(
  Identity,
)

/**
 * Whether a value is a maybe.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isMaybe(P.just(1)) // => true
 * P.isMaybe({ a: 1 }) // => false
 * ```
 */
export const isMaybe: (x: unknown) => x is Maybe<unknown> = is(
  Maybe,
)

/**
 * Whether a value is a pair.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isPair(P.pair(1, 2)) // => true
 * P.isPair([1, 2]) // => false
 * ```
 */
export const isPair: (x: unknown) => x is Pair<unknown, unknown> = is(
  Pair,
)

/**
 * Whether a value is a predicate.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isPredicate(P.predicate(() => true)) // => true
 * P.isPredicate(() => true) // => false
 * ```
 */
export const isPredicate: (x: unknown) => x is Predicate<unknown> = is(
  Predicate,
)
