/**
 * Operations and types for applying wrapped functions with `ap`.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type {
  Assert,
  BothB,
  KindOf,
  MatchableIn,
  ReturnOfSlotA,
  SameTypeAs,
  SlotAOf,
  SlotBOf,
  SubclassOf,
} from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { FnShape } from '../natives/function.ts'
import type { SetShape } from '../natives/set.ts'
import type { FunctorDict, FunctorMethods, FunctorShapes } from './functor.ts'
import { dispatch, lazily } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { Fn } from '../natives/function.ts'
import { Sets } from '../natives/set.ts'
import { map } from './functor.ts'

/**
 * Implement these methods on a custom value to support applying wrapped
 * functions with `ap`.
 */
export interface ApplyMethods<S, A, B = never> extends FunctorMethods<S, A, B> {
  /** Applies the wrapped functions to the contained values. */
  ap<X>(ff: KindOf<S, (a: A) => X, B>): KindOf<S, X, B>
}

/**
 * Operations for applying wrapped functions with `ap` on values described by
 * `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface ApplyDict<S extends Shape> extends FunctorDict<S> {
  /** Applies the wrapped functions to the contained values. */
  ap<A, X, B>(
    fa: Kind<S, A, B>,
    ff: Kind<S, (a: A) => X, B>,
  ): Kind<S, X, B>
}

/** Names of the operations in `ApplyDict`. */
export type ApplyKeys = keyof ApplyDict<Shape> & string

/** Native generic types accepted by the `Apply` constraint. */
export interface ApplyShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `Fn` values. */
  readonly Fn: FnShape
  /** The shape used for `Set` values. */
  readonly Set: SetShape
}

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _ApplyUnderFunctor = Assert<SubclassOf<ApplyShapes, FunctorShapes>>

/**
 * A constraint for values that support applying wrapped functions with `ap`.
 */
export type Apply<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | ApplyMethods<S, A, B>
  | MatchableIn<ApplyShapes, A, B>

type ApplyDicts = <S extends Shape>(s: S) => ApplyDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const applyNatives: Instances<
  ApplyDicts,
  ApplyShapes
> = lazily<ApplyDicts, ApplyShapes>({
  Array: () => Arr,
  Fn: () => Fn,
  Set: () => Sets,
})

/**
 * Applies wrapped functions to wrapped values of the same type.
 * For arrays, applies every function to every value, in function order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.ap([(n: number) => n + 1])([1, 2]) // => [2, 3]
 * P.ap([Math.floor, Math.ceil])([1.5, 2.5]) // => [1, 2, 2, 3]
 * P.ap(P.just((n: number) => n + 1))(P.just(1)) // => Just (2)
 * P.ap(P.nothing<(n: number) => number>())(P.just(1)) // => Nothing
 * ```
 */
export function ap<G extends Apply<G>>(
  ff: G,
): <F extends Apply<F> & SameTypeAs<F, G>>(
  fa: F,
) => KindOf<G, ReturnOfSlotA<G>, BothB<G, SlotBOf<G>, SlotBOf<F>>> {
  return <F extends Apply<F> & SameTypeAs<F, G>>(fa: F) =>
    dispatch('ap', 'Apply', applyNatives, fa, ff) as KindOf<
      G,
      ReturnOfSlotA<G>,
      BothB<G, SlotBOf<G>, SlotBOf<F>>
    >
}

/**
 * Applies a curried two-argument function to two wrapped values.
 * For arrays, returns every combination; for `Maybe`, both values must be
 * `Just`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const sum = (a: number) => (b: number) => a + b
 * P.lift2(sum)([1, 2])([10, 20]) // => [11, 21, 12, 22]
 * P.lift2(sum)(P.just(1))(P.nothing<number>()) // => Nothing
 * ```
 */
export function lift2<A, B, C>(
  f: (a: A) => (b: B) => C,
): <F extends Apply<F, A>>(
  fa: F,
) => <G extends Apply<G, B> & SameTypeAs<G, F>>(fb: G) => KindOf<F, C> {
  return <F extends Apply<F, A>>(fa: F) =>
  <G extends Apply<G, B> & SameTypeAs<G, F>>(fb: G) => {
    const ff = map(f)(fa as never)
    return ap(ff as never)(fb as never) as KindOf<F, C>
  }
}

/**
 * Applies a curried three-argument function to three wrapped values.
 * For arrays, returns every combination; for `Maybe`, all values must be
 * `Just`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const sum3 = (a: number) => (b: number) => (c: number) => a + b + c
 * P.lift3(sum3)(P.just(1))(P.just(2))(P.just(3)) // => Just (6)
 * P.lift3(sum3)([1, 2])([10])([100]) // => [111, 112]
 * ```
 */
export function lift3<A, B, C, D>(
  f: (a: A) => (b: B) => (c: C) => D,
): <F extends Apply<F, A>>(
  fa: F,
) => <G extends Apply<G, B> & SameTypeAs<G, F>>(
  fb: G,
) => <H extends Apply<H, C> & SameTypeAs<H, F>>(fc: H) => KindOf<F, D> {
  return <F extends Apply<F, A>>(fa: F) =>
  <G extends Apply<G, B> & SameTypeAs<G, F>>(fb: G) =>
  <H extends Apply<H, C> & SameTypeAs<H, F>>(fc: H) => {
    const ab = lift2<A, B, (c: C) => D>(
      (a: A) => (b: B) => (c: C) => f(a)(b)(c),
    )(fa)(fb)
    return ap(ab as never)(fc as never) as KindOf<F, D>
  }
}

/**
 * Combines two wrapped values and keeps the values from the first argument.
 * For `Maybe`, returns `Nothing` if either argument is `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.apFirst([1, 2])([3, 4]) // => [1, 1, 2, 2]
 * P.apFirst(P.just(1))(P.nothing<number>()) // => Nothing
 * ```
 */
export function apFirst<G extends Apply<G>>(
  fa: G,
): <F extends Apply<F> & SameTypeAs<F, G>>(
  fb: F,
) => KindOf<G, SlotAOf<G>, BothB<G, SlotBOf<G>, SlotBOf<F>>> {
  return <F extends Apply<F> & SameTypeAs<F, G>>(
    fb: F,
  ): KindOf<G, SlotAOf<G>, BothB<G, SlotBOf<G>, SlotBOf<F>>> => {
    const ff = map((a: SlotAOf<G>) => () => a)(fa as never)
    return ap(ff as never)(fb as never) as KindOf<
      G,
      SlotAOf<G>,
      BothB<G, SlotBOf<G>, SlotBOf<F>>
    >
  }
}

/**
 * Combines two wrapped values and keeps the values from the second argument.
 * For `Maybe`, returns `Nothing` if either argument is `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.apSecond([1, 2])([3, 4]) // => [3, 4, 3, 4]
 * P.apSecond(P.just(1))(P.just(2)) // => Just (2)
 * ```
 */
export function apSecond<G extends Apply<G>>(
  fa: G,
): <F extends Apply<F> & SameTypeAs<F, G>>(
  fb: F,
) => KindOf<F, SlotAOf<F>, BothB<G, SlotBOf<G>, SlotBOf<F>>> {
  return <F extends Apply<F> & SameTypeAs<F, G>>(
    fb: F,
  ): KindOf<F, SlotAOf<F>, BothB<G, SlotBOf<G>, SlotBOf<F>>> => {
    const ff = map(() => (b: SlotAOf<F>) => b)(fa as never)
    return ap(ff as never)(fb as never) as KindOf<
      F,
      SlotAOf<F>,
      BothB<G, SlotBOf<G>, SlotBOf<F>>
    >
  }
}
