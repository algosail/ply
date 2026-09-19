/**
 * Choose how to combine values with `foldMap` or `mconcat`.
 * Use `Sum` for addition, `Concat` for strings, or `First` for the first
 * present value.
 *
 * @module
 */

import type { Nullary } from '../core/shape.ts'
import type { MonoidDict } from '../classes/monoid.ts'
import type { Maybe } from './maybe.ts'
import { lte } from '../classes/ord.ts'
import { nothing } from './maybe.ts'

/**
 * Adds numbers with `foldMap` or `mconcat`. The empty result is `0`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.Sum)([1, 2, 3]) // => 6
 * P.mconcat(P.Sum)([]) // => 0
 * ```
 */
export const Sum: MonoidDict<Nullary<number>> = {
  empty: () => 0,
  concat: (a, b) => a + b,
}

/**
 * Multiplies numbers with `foldMap` or `mconcat`. The empty result is `1`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.Product)([2, 3, 4]) // => 24
 * P.mconcat(P.Product)([]) // => 1
 * ```
 */
export const Product: MonoidDict<Nullary<number>> = {
  empty: () => 1,
  concat: (a, b) => a * b,
}

/**
 * Selects the smallest number with `foldMap` or `mconcat`.
 * The empty result is `Infinity`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.Min)([3, 1, 2]) // => 1
 * P.mconcat(P.Min)([]) // => Infinity
 * ```
 */
export const Min: MonoidDict<Nullary<number>> = {
  empty: () => Infinity,
  concat: (a, b) => lte(b)(a) ? a : b,
}

/**
 * Selects the largest number with `foldMap` or `mconcat`.
 * The empty result is `-Infinity`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.Max)([3, 1, 2]) // => 3
 * P.mconcat(P.Max)([]) // => -Infinity
 * ```
 */
export const Max: MonoidDict<Nullary<number>> = {
  empty: () => -Infinity,
  concat: (a, b) => lte(b)(a) ? b : a,
}

/**
 * Joins strings with `foldMap` or `mconcat`. The empty result is an empty
 * string.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.Concat)(['a', 'b']) // => 'ab'
 * P.foldMap(P.Concat)((n: number) => `${n}`)([1, 2, 3]) // => '123'
 * ```
 */
export const Concat: MonoidDict<Nullary<string>> = {
  empty: () => '',
  concat: (a, b) => a + b,
}

/**
 * Combines booleans with logical AND. The empty result is `true`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.All)([true, false]) // => false
 * P.mconcat(P.All)([]) // => true
 * ```
 */
export const All: MonoidDict<Nullary<boolean>> = {
  empty: () => true,
  concat: (a, b) => a && b,
}

/**
 * Combines booleans with logical OR. The empty result is `false`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.Any)([false, true]) // => true
 * P.foldMap(P.Any)((n: number) => n > 2)([1, 2, 3]) // => true
 * ```
 */
export const Any: MonoidDict<Nullary<boolean>> = {
  empty: () => false,
  concat: (a, b) => a || b,
}

/**
 * Creates a monoid that keeps the first `Just`.
 * The empty result is `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.First<number>())([P.nothing(), P.just(1), P.just(2)]) // => Just (1)
 * ```
 */
export const First = <A>(): MonoidDict<Nullary<Maybe<A>>> => ({
  empty: () => nothing(),
  concat: (a, b) => a.tag === 'just' ? a : b,
})

/**
 * Creates a monoid that keeps the last `Just`.
 * The empty result is `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.Last<number>())([P.nothing(), P.just(1), P.just(2)]) // => Just (2)
 * ```
 */
export const Last = <A>(): MonoidDict<Nullary<Maybe<A>>> => ({
  empty: () => nothing(),
  concat: (a, b) => b.tag === 'just' ? b : a,
})

/**
 * Creates a monoid that merges records, with later values winning on duplicate
 * keys.
 * The empty result is an empty record.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.RightUnion<number>())([{ a: 1 }, { a: 2, b: 3 }])
 * // => { a: 2, b: 3 }
 * ```
 */
export const RightUnion = <A>(): MonoidDict<Nullary<Record<string, A>>> => ({
  empty: () => ({}),
  concat: (a, b) => ({ ...a, ...b }),
})

/**
 * Creates a monoid that composes functions from right to left.
 * The empty result is the identity function.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.Endo<number>())([(n) => n + 1, (n) => n * 2])(5) // => 11
 * ```
 */
export const Endo = <A>(): MonoidDict<Nullary<(a: A) => A>> => ({
  empty: () => (a: A) => a,
  concat: (f, g) => (a: A) => f(g(a)),
})
