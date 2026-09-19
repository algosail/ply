/**
 * Operations and types for keeping or discarding contained values.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type { KindOf, MatchableIn, SlotAOf, SlotBOf } from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { MapShape } from '../natives/map.ts'
import type { SetShape } from '../natives/set.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import type { Either } from '../data/either.ts'
import type { Maybe } from '../data/maybe.ts'
import { dispatch, lazily, nameOf, opIn } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { Sets } from '../natives/set.ts'
import { Maps } from '../natives/map.ts'
import { StrMap } from '../natives/strmap.ts'
import { map } from './functor.ts'

/**
 * Implement these methods on a custom value to support keeping or discarding
 * contained values.
 */
export interface FilterableMethods<S, A, B = never> {
  /** Keeps only values that pass the predicate. */
  filter(p: (a: A) => boolean): S
}

/**
 * Operations for keeping or discarding contained values on values described by
 * `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface FilterableDict<S extends Shape> {
  /** Keeps only values that pass the predicate. */
  filter<A, B>(fa: Kind<S, A, B>, p: (a: A) => boolean): Kind<S, A, B>
}

/** Names of the operations in `FilterableDict`. */
export type FilterableKeys = keyof FilterableDict<Shape> & string

/** Native generic types accepted by the `Filterable` constraint. */
export interface FilterableShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `Set` values. */
  readonly Set: SetShape
  /** The shape used for `Map` values. */
  readonly Map: MapShape
  /** The shape used for `StrMap` values. */
  readonly StrMap: StrMapShape
}

/**
 * A constraint for values that support keeping or discarding contained values.
 */
export type Filterable<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | FilterableMethods<S, A, B>
  | MatchableIn<FilterableShapes, A, B>

type FilterableDicts = <S extends Shape>(s: S) => FilterableDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const filterableNatives: Instances<
  FilterableDicts,
  FilterableShapes
> = lazily<FilterableDicts, FilterableShapes>({
  Array: () => Arr,
  Set: () => Sets,
  Map: () => Maps,
  StrMap: () => StrMap,
})

/**
 * Keeps values that pass the predicate, preserving the collection type.
 * For `Maybe`, a rejected `Just` becomes `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.filter((n: number) => n % 2 === 0)([1, 2, 3, 4]) // => [2, 4]
 * P.filter((n: number) => n > 1)({ a: 1, b: 2 }) // => { b: 2 }
 * P.filter((n: number) => n > 1)(P.just(1)) // => Nothing
 * ```
 */
export function filter<A>(
  p: (a: A) => boolean,
): <F extends Filterable<F, A>>(fa: F) => KindOf<F, A> {
  return <F extends Filterable<F, A>>(fa: F) =>
    dispatch('filter', 'Filterable', filterableNatives, fa, p) as KindOf<F, A>
}

const requireFilterable = (op: string, fa: unknown): void => {
  if (opIn(filterableNatives, fa, 'filter') === undefined) {
    throw new TypeError(
      `${op}: ${nameOf(fa)} has no Filterable` +
        ' (no method on the value, no entry in the instance table)',
    )
  }
}

/**
 * Removes values that pass the predicate, preserving the collection type.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.reject((n: number) => n % 2 === 0)([1, 2, 3, 4]) // => [1, 3]
 * P.reject((n: number) => n > 1)(P.just(2)) // => Nothing
 * ```
 */
export function reject<A>(
  p: (a: A) => boolean,
): <F extends Filterable<F, A>>(fa: F) => KindOf<F, A> {
  return <F extends Filterable<F, A>>(fa: F) => {
    requireFilterable('reject', fa)
    return filter<A>((a: A) => !p(a))(fa as never) as KindOf<F, A>
  }
}

const mapKeepBranch = (
  op: string,
  fa: unknown,
  f: unknown,
  tag: string,
  field: string,
): unknown => {
  requireFilterable(op, fa)
  const marked = map(f as never)(fa as never)
  const kept = filter((x: { tag: string }) => x.tag === tag)(marked as never)
  return map((x: Record<string, unknown>) => x[field])(kept as never)
}

/**
 * Transforms values with a function returning `Maybe`.
 * Keeps and unwraps `Just` results, and discards `Nothing` results.
 *
 * @example
 * ```ts
 * import type { Maybe } from '@algosail/ply'
 * import * as P from '@algosail/ply'
 *
 * const tenfold = (n: number): Maybe<number> =>
 *   n % 2 === 0 ? P.just(n * 10) : P.nothing()
 *
 * P.filterMap(tenfold)([1, 2, 3, 4]) // => [20, 40]
 * P.filterMap(tenfold)({ a: 1, b: 2 }) // => { b: 20 }
 * ```
 */
export function filterMap<A, B>(
  f: (a: A) => Maybe<B>,
): <F extends Filterable<F, A>>(fa: F) => KindOf<F, B> {
  return <F extends Filterable<F, A>>(fa: F) =>
    mapKeepBranch('filterMap', fa, f, 'just', 'value') as KindOf<F, B>
}

/**
 * Splits values into two collections: matches first, non-matches second.
 * The predicate is evaluated separately for each collection.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.partition((n: number) => n % 2 === 0)([1, 2, 3, 4])
 * // => [[2, 4], [1, 3]]
 * P.partition((n: number) => n > 1)({ a: 1, b: 2 })
 * // => [{ b: 2 }, { a: 1 }]
 * ```
 */
export function partition<A>(
  p: (a: A) => boolean,
): <F extends Filterable<F, A>>(fa: F) => [KindOf<F, A>, KindOf<F, A>] {
  return <F extends Filterable<F, A>>(fa: F): [KindOf<F, A>, KindOf<F, A>] => {
    requireFilterable('partition', fa)
    return [
      filter<A>(p)(fa as never) as KindOf<F, A>,
      reject<A>(p)(fa as never) as KindOf<F, A>,
    ]
  }
}

/**
 * Transforms and splits values into unwrapped `Left` and `Right` collections.
 * Returns the left collection first. Evaluates the function once per side.
 *
 * @example
 * ```ts
 * import type { Either } from '@algosail/ply'
 * import * as P from '@algosail/ply'
 *
 * const big = (n: number): Either<string, number> =>
 *   n > 2 ? P.right(n) : P.left(String(n))
 *
 * P.partitionMap(big)([1, 2, 3, 4]) // => [['1', '2'], [3, 4]]
 * ```
 */
export function partitionMap<A, E, R>(
  f: (a: A) => Either<E, R>,
): <F extends Filterable<F, A>>(fa: F) => [KindOf<F, E>, KindOf<F, R>] {
  return <F extends Filterable<F, A>>(fa: F): [KindOf<F, E>, KindOf<F, R>] => [
    mapKeepBranch('partitionMap', fa, f, 'left', 'value') as KindOf<F, E>,
    mapKeepBranch('partitionMap', fa, f, 'right', 'value') as KindOf<F, R>,
  ]
}
