/**
 * Operations and types for slicing, sorting, and rebuilding collections.
 *
 * @module
 */

import type { Shape } from '../core/shape.ts'
import type {
  Assert,
  KindOf,
  MatchableIn,
  SlotAOf,
  SlotBOf,
  SubclassOf,
} from '../core/kind.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { ApplyMethods } from './apply.ts'
import type {
  ApplicativeSemigroupDict,
  ApplicativeSemigroupShapes,
} from './_append.ts'
import type {
  Foldable,
  FoldableDict,
  FoldableMethods,
  FoldableShapes,
} from './foldable.ts'
import type { MonoidDict, MonoidShapes } from './monoid.ts'
import type { SemigroupMethods } from './semigroup.ts'
import type { Constructed } from '../core/named.ts'
import { integer } from '../core/domain.ts'
import { emptyIn, ofIn } from '../core/instance.ts'
import type { Maybe } from '../data/maybe.ts'
import { just, nothing } from '../data/maybe.ts'
import { toArray } from './foldable.ts'
import { applicativeNatives } from './applicative.ts'
import { monoidNatives } from './monoid.ts'
import { lte } from './ord.ts'
import { concat } from './semigroup.ts'

/**
 * Operations for slicing, sorting, and rebuilding collections on values
 * described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface ApplicativeFoldableMonoidDict<S extends Shape>
  extends ApplicativeSemigroupDict<S>, FoldableDict<S>, MonoidDict<S> {}

/** Names of the operations in `ApplicativeFoldableMonoidDict`. */
export type ApplicativeFoldableMonoidKeys =
  & keyof ApplicativeFoldableMonoidDict<Shape>
  & string

/**
 * Native generic types accepted by the `ApplicativeFoldableMonoid` constraint.
 */
export interface ApplicativeFoldableMonoidShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
}

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _RebuildableUnderBuildable = Assert<
  SubclassOf<ApplicativeFoldableMonoidShapes, ApplicativeSemigroupShapes>
>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _RebuildableUnderFoldable = Assert<
  SubclassOf<ApplicativeFoldableMonoidShapes, FoldableShapes>
>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _RebuildableUnderMonoid = Assert<
  SubclassOf<ApplicativeFoldableMonoidShapes, MonoidShapes>
>

/**
 * A constraint for values that support slicing, sorting, and rebuilding
 * collections.
 */
export type ApplicativeFoldableMonoid<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | (
    & FoldableMethods<S, A, B>
    & ApplyMethods<S, A, B>
    & SemigroupMethods<S, A, B>
    & Constructed<{ of(a: never): unknown; empty(): unknown }>
  )
  | MatchableIn<ApplicativeFoldableMonoidShapes, A, B>

const elementsOf = (fa: unknown): unknown[] =>
  toArray(fa as Foldable<unknown, unknown>)

const rebuild = (sample: unknown, xs: readonly unknown[]): unknown => {
  const single = ofIn(applicativeNatives, sample)
  const empty = emptyIn(monoidNatives, sample)
  return xs.reduce(
    (acc: unknown, x) => concat(acc as never)(single(x) as never),
    empty(),
  )
}

const comparing =
  (key: (a: unknown) => unknown) => (a: unknown, b: unknown) => {
    const ka = key(a), kb = key(b)
    const le = (x: unknown, y: unknown) => lte(y as never)(x as never)
    return le(ka, kb) ? (le(kb, ka) ? 0 : -1) : 1
  }

/**
 * Returns a collection with its values in reverse order, without changing the
 * input.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.reverse([1, 2, 3]) // => [3, 2, 1]
 * ```
 */
export function reverse<A>(fa: readonly A[]): A[]
/**
 * Returns a collection with its values in reverse order, without changing the
 * input.
 */
export function reverse<F extends ApplicativeFoldableMonoid<F>>(
  fa: F,
): KindOf<F, SlotAOf<F>>
export function reverse(fa: unknown): unknown {
  if (Array.isArray(fa)) return [...fa].reverse()
  return rebuild(fa, elementsOf(fa).reverse())
}

/**
 * Returns values in ascending order using ply's ordering, without changing the
 * input.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.sort([3, 1, 2]) // => [1, 2, 3]
 * P.sort(['pear', 'fig', 'apple']) // => ['apple', 'fig', 'pear']
 * ```
 */
export function sort<A>(fa: readonly A[]): A[]
/**
 * Returns values in ascending order using ply's ordering, without changing the
 * input.
 */
export function sort<F extends ApplicativeFoldableMonoid<F>>(
  fa: F,
): KindOf<F, SlotAOf<F>>
export function sort(fa: unknown): unknown {
  const cmp = comparing((x: unknown) => x)
  if (Array.isArray(fa)) return [...fa].sort(cmp)
  return rebuild(fa, elementsOf(fa).sort(cmp))
}

/**
 * Sorts values by a derived key in ascending order, without changing the
 * input.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.sortBy((s: string) => s.length)(['pear', 'fig', 'apple'])
 * // => ['fig', 'pear', 'apple']
 * ```
 */
export function sortBy<A>(
  f: (a: A) => unknown,
): <F extends ApplicativeFoldableMonoid<F, A>>(fa: F) => KindOf<F, A> {
  return <F extends ApplicativeFoldableMonoid<F, A>>(fa: F) => {
    const cmp = comparing(f as (a: unknown) => unknown)
    if (Array.isArray(fa)) return [...fa].sort(cmp) as KindOf<F, A>
    return rebuild(fa, elementsOf(fa as never).sort(cmp)) as KindOf<F, A>
  }
}

interface Slice {
  <A>(xs: readonly A[]): Maybe<A[]>
  <F extends ApplicativeFoldableMonoid<F>>(fa: F): Maybe<KindOf<F, SlotAOf<F>>>
}

const sliced = (
  fa: unknown,
  at: (len: number) => [number, number] | undefined,
): unknown => {
  const xs = elementsOf(fa)
  const span = at(xs.length)
  if (span === undefined) return nothing()
  const part = xs.slice(span[0], span[1])
  return just(Array.isArray(fa) ? part : rebuild(fa, part))
}

/**
 * Returns the first `n` values wrapped in `Just`.
 * Returns `Nothing` when `n` is negative or exceeds the size.
 *
 * @throws {TypeError} If `n` is not an integer.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import * as P from '@algosail/ply'
 *
 * P.take(2)([1, 2, 3]) // => Just ([1, 2])
 * P.take(5)([1, 2, 3]) // => Nothing
 * assertThrows(() => P.take(1.5), TypeError, 'take: 1.5 is not an integer')
 * ```
 */
export function take(n: number): Slice {
  integer('take', n)
  return ((fa: unknown) =>
    sliced(fa, (len) => n < 0 || n > len ? undefined : [0, n])) as Slice
}

/**
 * Returns the collection without its first `n` values, wrapped in `Just`.
 * Returns `Nothing` when `n` is negative or exceeds the size.
 *
 * @throws {TypeError} If `n` is not an integer.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.drop(1)([1, 2, 3]) // => Just ([2, 3])
 * P.drop(5)([1, 2, 3]) // => Nothing
 * ```
 */
export function drop(n: number): Slice {
  integer('drop', n)
  return ((fa: unknown) =>
    sliced(fa, (len) => n < 0 || n > len ? undefined : [n, len])) as Slice
}

/**
 * Returns the last `n` values wrapped in `Just`.
 * Returns `Nothing` when `n` is negative or exceeds the size.
 *
 * @throws {TypeError} If `n` is not an integer.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.takeLast(2)([1, 2, 3]) // => Just ([2, 3])
 * P.takeLast(5)([1, 2, 3]) // => Nothing
 * ```
 */
export function takeLast(n: number): Slice {
  integer('takeLast', n)
  return ((fa: unknown) =>
    sliced(fa, (len) => n < 0 || n > len ? undefined : [len - n, len])) as Slice
}

/**
 * Returns the collection without its last `n` values, wrapped in `Just`.
 * Returns `Nothing` when `n` is negative or exceeds the size.
 *
 * @throws {TypeError} If `n` is not an integer.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.dropLast(1)([1, 2, 3]) // => Just ([1, 2])
 * P.dropLast(5)([1, 2, 3]) // => Nothing
 * ```
 */
export function dropLast(n: number): Slice {
  integer('dropLast', n)
  return ((fa: unknown) =>
    sliced(fa, (len) => n < 0 || n > len ? undefined : [0, len - n])) as Slice
}

/**
 * Returns all values except the first, wrapped in `Just`.
 * Returns `Nothing` for an empty collection.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.tail([1, 2, 3]) // => Just ([2, 3])
 * P.tail([]) // => Nothing
 * ```
 */
export function tail<A>(xs: readonly A[]): Maybe<A[]>
/** Returns all values except the first, wrapped in `Just`. */
export function tail<F extends ApplicativeFoldableMonoid<F>>(
  fa: F,
): Maybe<KindOf<F, SlotAOf<F>>>
export function tail(fa: unknown): unknown {
  return sliced(fa, (len) => len === 0 ? undefined : [1, len])
}

/**
 * Returns all values except the last, wrapped in `Just`.
 * Returns `Nothing` for an empty collection.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.init([1, 2, 3]) // => Just ([1, 2])
 * P.init([]) // => Nothing
 * ```
 */
export function init<A>(xs: readonly A[]): Maybe<A[]>
/** Returns all values except the last, wrapped in `Just`. */
export function init<F extends ApplicativeFoldableMonoid<F>>(
  fa: F,
): Maybe<KindOf<F, SlotAOf<F>>>
export function init(fa: unknown): unknown {
  return sliced(fa, (len) => len === 0 ? undefined : [0, len - 1])
}
