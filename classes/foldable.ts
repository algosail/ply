/**
 * Operations and types for reducing contained values to a result.
 *
 * @module
 */

import type { Kind, Nullary, Shape } from '../core/shape.ts'
import type { MatchableIn, SlotAOf, SlotBOf } from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import type { MonoidDict } from './monoid.ts'
import type { Maybe } from '../data/maybe.ts'
import { dispatch, lazily } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { StrMap } from '../natives/strmap.ts'
import { just, nothing } from '../data/maybe.ts'
import { equals } from './setoid.ts'

/**
 * Implement these methods on a custom value to support reducing contained
 * values to a result.
 */
export interface FoldableMethods<S, A, B = never> {
  /** Combines contained values with an accumulator, starting at `init`. */
  reduce<Acc>(f: (acc: Acc, a: A) => Acc, init: Acc): Acc
}

/**
 * Operations for reducing contained values to a result on values described by
 * `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface FoldableDict<S extends Shape> {
  /** Combines contained values with an accumulator, starting at `init`. */
  reduce<A, Acc, B>(
    fa: Kind<S, A, B>,
    f: (acc: Acc, a: A) => Acc,
    init: Acc,
  ): Acc
}

/** Names of the operations in `FoldableDict`. */
export type FoldableKeys = keyof FoldableDict<Shape> & string

/** Native generic types accepted by the `Foldable` constraint. */
export interface FoldableShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `StrMap` values. */
  readonly StrMap: StrMapShape
}

/**
 * A constraint for values that support reducing contained values to a result.
 */
export type Foldable<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | FoldableMethods<S, A, B>
  | MatchableIn<FoldableShapes, A, B>

type FoldableDicts = <S extends Shape>(s: S) => FoldableDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const foldableNatives: Instances<
  FoldableDicts,
  FoldableShapes
> = lazily<FoldableDicts, FoldableShapes>({
  Array: () => Arr,
  StrMap: () => StrMap,
})

/**
 * Combines values from left to right, starting with an initial accumulator.
 * The callback receives `(accumulator, value)`. Records use sorted key order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.reduce((acc: number, a: number) => acc + a)(0)([1, 2, 3]) // => 6
 * P.reduce((acc: string, a: number) => acc + a)('')({ c: 3, a: 1, b: 2 })
 * // => '123'
 * ```
 */
export function reduce<A, Acc>(
  f: (acc: Acc, a: A) => Acc,
): (init: Acc) => <F extends Foldable<F, A>>(fa: F) => Acc {
  return (init: Acc) => <F extends Foldable<F, A>>(fa: F) =>
    dispatch('reduce', 'Foldable', foldableNatives, fa, f, init) as Acc
}

/**
 * Combines values from left to right with a curried callback.
 * The callback receives the value first, then the accumulator:
 * `f(value)(acc)`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.reduce_((a: number) => (acc: number) => acc + a)(0)([1, 2, 3]) // => 6
 * ```
 *
 * @see {@link reduce}
 */
export function reduce_<A, Acc>(
  f: (a: A) => (acc: Acc) => Acc,
): (init: Acc) => <F extends Foldable<F, A>>(fa: F) => Acc {
  return (init: Acc) => <F extends Foldable<F, A>>(fa: F): Acc =>
    reduce<A, Acc>((acc: Acc, a: A) => f(a)(acc))(init)(fa as never)
}

/**
 * Combines values from right to left, starting with an initial accumulator.
 * The callback receives `(value, accumulator)`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.foldr((a: number, acc: number) => a - acc)(0)([1, 2, 3]) // => 2
 * P.reduce((acc: number, a: number) => acc - a)(0)([1, 2, 3]) // => -6
 * ```
 */
export function foldr<A, Acc>(
  f: (a: A, acc: Acc) => Acc,
): (init: Acc) => <F extends Foldable<F, A>>(fa: F) => Acc {
  return (init: Acc) => <F extends Foldable<F, A>>(fa: F): Acc => {
    const xs = reduce<A, A[]>((acc: A[], a: A) => {
      acc.push(a)
      return acc
    })([])(fa as never)
    let acc = init
    for (let i = xs.length - 1; i >= 0; i--) acc = f(xs[i], acc)
    return acc
  }
}

/**
 * Transforms values and combines the results using a chosen monoid.
 * For example, use `Sum` to add results or `Concat` to join strings.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.foldMap(P.Concat)((n: number) => `${n}`)([1, 2]) // => '12'
 * ```
 */
export function foldMap<B>(
  M: MonoidDict<Nullary<B>>,
): <A>(f: (a: A) => B) => <F extends Foldable<F, A>>(fa: F) => B {
  return <A>(f: (a: A) => B) => <F extends Foldable<F, A>>(fa: F): B =>
    reduce<A, B>((acc: B, a: A) => M.concat(acc, f(a)))(M.empty())(fa as never)
}

/**
 * Combines values using a chosen monoid, inserting a separator between them.
 * Returns the monoid's empty value for an empty collection.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.intercalate(P.Concat)(', ')(['a', 'b']) // => 'a, b'
 * ```
 */
export function intercalate<B>(
  M: MonoidDict<Nullary<B>>,
): (sep: B) => <F extends Foldable<F, B>>(fa: F) => B {
  return (sep: B) => <F extends Foldable<F, B>>(fa: F): B => {
    const acc = reduce<B, { first: boolean; value: B }>(
      (st: { first: boolean; value: B }, x: B) =>
        st.first ? { first: false, value: x } : {
          first: false,
          value: M.concat(M.concat(st.value, sep), x),
        },
    )({ first: true, value: M.empty() })(fa as never)
    return acc.value
  }
}

const reduceUntyped =
  (fa: unknown) =>
  (f: (acc: never, a: never) => unknown, init: unknown): unknown =>
    (reduce as (g: unknown) => (i: unknown) => (x: unknown) => unknown)(f)(
      init,
    )(fa)

/**
 * Collects contained values into an array. Records use sorted key order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.toArray(P.just(1)) // => [1]
 * P.toArray(P.nothing<number>()) // => []
 * P.toArray({ c: 3, a: 1, b: 2 }) // => [1, 2, 3]
 * ```
 */
export function toArray<F extends Foldable<F>>(fa: F): SlotAOf<F>[]
/** Collects contained values into an array. Records use sorted key order. */
export function toArray<A>(fa: Foldable<A, unknown>): A[]
export function toArray(fa: Foldable<unknown, unknown>): unknown[] {
  return reduceUntyped(fa)((acc: unknown[], a: unknown) => {
    acc.push(a)
    return acc
  }, [] as unknown[]) as unknown[]
}

/**
 * Returns the first value as `Just`, or `Nothing` if there are no values.
 * Records use sorted key order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.head([1, 2, 3]) // => Just (1)
 * P.head([]) // => Nothing
 * P.head({ c: 3, a: 1, b: 2 }) // => Just (1)
 * ```
 */
export function head<F extends Foldable<F>>(fa: F): Maybe<SlotAOf<F>>
/** Returns the first value as `Just`, or `Nothing` if there are no values. */
export function head<A>(fa: Foldable<A, unknown>): Maybe<A>
export function head(fa: Foldable<unknown, unknown>): Maybe<unknown> {
  const xs = toArray(fa)
  return xs.length === 0 ? nothing() : just(xs[0])
}

/**
 * Returns the last value as `Just`, or `Nothing` if there are no values.
 * Records use sorted key order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.last([1, 2, 3]) // => Just (3)
 * P.last({ c: 3, a: 1, b: 2 }) // => Just (3)
 * ```
 */
export function last<F extends Foldable<F>>(fa: F): Maybe<SlotAOf<F>>
/** Returns the last value as `Just`, or `Nothing` if there are no values. */
export function last<A>(fa: Foldable<A, unknown>): Maybe<A>
export function last(fa: Foldable<unknown, unknown>): Maybe<unknown> {
  const xs = toArray(fa)
  return xs.length === 0 ? nothing() : just(xs[xs.length - 1])
}

/**
 * Counts the values in a collection or wrapper.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.size({ a: 1, b: 2 }) // => 2
 * P.size(P.nothing<number>()) // => 0
 * ```
 */
export function size(fa: Foldable<unknown, unknown>): number {
  return reduceUntyped(fa)((acc: number) => acc + 1, 0) as number
}

/**
 * Checks whether every value passes the predicate. Returns `true` for no
 * values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.all((n: number) => n > 0)([1, 2]) // => true
 * ```
 */
export function all<A>(
  p: (a: A) => boolean,
): <F extends Foldable<F, A>>(fa: F) => boolean {
  return <F extends Foldable<F, A>>(fa: F): boolean =>
    reduce<A, boolean>((acc: boolean, a: A) => acc && p(a))(true)(fa as never)
}

/**
 * Checks whether at least one value passes the predicate.
 * Returns `false` for no values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.any((n: number) => n > 2)([1, 2]) // => false
 * ```
 */
export function any<A>(
  p: (a: A) => boolean,
): <F extends Foldable<F, A>>(fa: F) => boolean {
  return <F extends Foldable<F, A>>(fa: F): boolean =>
    reduce<A, boolean>((acc: boolean, a: A) => acc || p(a))(false)(fa as never)
}

/**
 * Checks whether no values pass the predicate. Returns `true` for no values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.none((n: number) => n > 2)([1, 2]) // => true
 * ```
 */
export function none<A>(
  p: (a: A) => boolean,
): <F extends Foldable<F, A>>(fa: F) => boolean {
  return <F extends Foldable<F, A>>(fa: F): boolean =>
    reduce<A, boolean>((acc: boolean, a: A) => acc && !p(a))(true)(fa as never)
}

/**
 * Checks whether a collection contains a value, using ply's `equals`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.elem(2)([1, 2, 3]) // => true
 * P.elem({ a: 1 })([{ a: 1 }, { a: 2 }]) // => true
 * ```
 */
export function elem<A>(a: A): <F extends Foldable<F, A>>(fa: F) => boolean {
  return <F extends Foldable<F, A>>(fa: F): boolean =>
    reduce<A, boolean>((acc: boolean, x: A) =>
      acc || equals(a as never)(x as never)
    )(false)(fa as never)
}

/**
 * Checks for a value in a collection supplied first.
 * Uses ply's `equals`, like `elem` with its arguments reversed.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.elem_(['yes', 'oui', 'ja'])('oui') // => true
 * ```
 *
 * @see {@link elem}
 */
export function elem_<F extends Foldable<F>>(
  fa: F,
): (a: SlotAOf<F>) => boolean {
  return (a: SlotAOf<F>): boolean => elem<SlotAOf<F>>(a)(fa as never)
}

/**
 * Calls a function for each value and returns the original collection.
 * Use it for side effects within a pipeline.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.forEach((n: number) => console.log(n))([1, 2])
 * // logs 1, then 2, and gives back [1, 2]
 * ```
 */
export function forEach<A>(
  f: (a: A) => void,
): <F extends Foldable<F, A>>(fa: F) => F {
  return <F extends Foldable<F, A>>(fa: F): F => {
    reduce<A, null>((_acc: null, a: A) => {
      f(a)
      return null
    })(null)(fa as never)
    return fa
  }
}
