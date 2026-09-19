/**
 * Operations and types for collecting wrapped results with `traverse`.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type {
  Assert,
  KindOf,
  MatchableIn,
  MemberOf,
  ShapeOf,
  SlotAOf,
  SlotBOf,
  SubclassOf,
  Superclass,
} from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { ApplyKeys, ApplyMethods, ApplyShapes } from './apply.ts'
import type {
  FoldableDict,
  FoldableMethods,
  FoldableShapes,
} from './foldable.ts'
import type { FunctorDict, FunctorMethods, FunctorShapes } from './functor.ts'
import type { ApplicativeTypeRep } from './applicative.ts'
import { dispatch, lazily } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'

/**
 * Implement these methods on a custom value to support collecting wrapped
 * results with `traverse`.
 */
export interface TraversableMethods<S, A, B = never>
  extends FunctorMethods<S, A, B>, FoldableMethods<S, A, B> {
  /** Transforms contained values into another wrapper and collects the results. */
  traverse<G extends ApplyMethods<G, SlotAOf<G>, SlotBOf<G>>>(
    T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: A) => G,
  ): KindOf<G, KindOf<S, SlotAOf<G>, B>>
}

/**
 * Operations for collecting wrapped results with `traverse` on values
 * described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface TraversableDict<S extends Shape>
  extends FunctorDict<S>, FoldableDict<S> {
  /** Transforms contained values into another wrapper and collects the results. */
  traverse<A, B, G extends ApplyMethods<never, SlotAOf<G>, SlotBOf<G>>>(
    fa: Kind<S, A, B>,
    T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: A) => G,
  ): KindOf<G, Kind<S, SlotAOf<G>, B>>
}

/** Names of the operations in `TraversableDict`. */
export type TraversableKeys = keyof TraversableDict<Shape> & string

/** Native generic types accepted by the `Traversable` constraint. */
export interface TraversableShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
}

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _TraversableUnderFunctor = Assert<
  SubclassOf<TraversableShapes, FunctorShapes>
>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _TraversableUnderFoldable = Assert<
  SubclassOf<TraversableShapes, FoldableShapes>
>

/**
 * A constraint for values that support collecting wrapped results with
 * `traverse`.
 */
export type Traversable<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | TraversableMethods<S, A, B>
  | MatchableIn<TraversableShapes, A, B>

type TraversableDicts = <S extends Shape>(s: S) => TraversableDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const traversableNatives: Instances<
  TraversableDicts,
  TraversableShapes
> = lazily<TraversableDicts, TraversableShapes>({
  Array: () => Arr,
})

/**
 * Transforms values into a chosen wrapper and collects them inside one result.
 * With `Maybe`, any `Nothing` makes the whole result `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.traverse(P.Maybe)((n: number) => n > 0 ? P.just(n) : P.nothing())([1, 2])
 * // => Just ([1, 2])
 * P.traverse(P.Maybe)((n: number) => n > 0 ? P.just(n) : P.nothing())([1, -2])
 * // => Nothing
 * ```
 */
export function traverse<S extends Shape>(
  T_: ApplicativeTypeRep<S, unknown>,
): <A, B, Y>(
  f: (a: A) => Kind<S, B, Y>,
) => <T extends Traversable<T, A>>(ta: T) => Kind<S, KindOf<T, B>, Y> {
  return <A, B, Y>(f: (a: A) => Kind<S, B, Y>) =>
  <T extends Traversable<T, A>>(ta: T) =>
    dispatch(
      'traverse',
      'Traversable',
      traversableNatives,
      ta,
      T_,
      f,
    ) as Kind<S, KindOf<T, B>, Y>
}

/** Requires wrapped results from custom types to support `ap` and `map`. */
export type ApplyRep<S extends Shape, R> =
  [Extract<ApplyShapes[keyof ApplyShapes], S>] extends [never]
    ? Superclass<S, ApplyKeys, R>
    : R

/**
 * Turns a collection of wrapped values into one wrapped collection.
 * With `Maybe`, succeeds only when every value is `Just`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.sequence(P.Maybe)([P.just(1), P.just(2)]) // => Just ([1, 2])
 * P.sequence(P.Maybe)([P.just(1), P.nothing()]) // => Nothing
 * P.sequence(P.Arr)([[1, 2], [3]]) // => [[1, 3], [2, 3]]
 * ```
 */
export function sequence<S extends Shape>(
  T_: ApplicativeTypeRep<S, unknown>,
): <T extends Traversable<T, MemberOf<S>>>(ta: T) => ApplyRep<
  S,
  Kind<S, KindOf<T, SlotAOf<SlotAOf<T>>>, SlotBOf<SlotAOf<T>>>
> {
  return <T extends Traversable<T, MemberOf<S>>>(ta: T) =>
    traverse(T_)((x: MemberOf<S>) => x)(
      ta as never,
    ) as ApplyRep<
      S,
      Kind<S, KindOf<T, SlotAOf<SlotAOf<T>>>, SlotBOf<SlotAOf<T>>>
    >
}
