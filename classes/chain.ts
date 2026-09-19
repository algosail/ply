/**
 * Operations and types for sequencing wrapped computations with `chain`.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type {
  Assert,
  BothB,
  KindOf,
  MatchableIn,
  SameTypeAs,
  SlotAOf,
  SlotBOf,
  SubclassOf,
} from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { FnShape } from '../natives/function.ts'
import type { SetShape } from '../natives/set.ts'
import type { ApplyDict, ApplyMethods, ApplyShapes } from './apply.ts'
import { dispatch, lazily } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { Fn } from '../natives/function.ts'
import { Sets } from '../natives/set.ts'

/**
 * Implement these methods on a custom value to support sequencing wrapped
 * computations with `chain`.
 */
export interface ChainMethods<S, A, B = never> extends ApplyMethods<S, A, B> {
  /** Applies a function returning the same wrapper and flattens the result. */
  chain<X>(f: (a: A) => KindOf<S, X, B>): KindOf<S, X, B>
}

/**
 * Operations for sequencing wrapped computations with `chain` on values
 * described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface ChainDict<S extends Shape> extends ApplyDict<S> {
  /** Applies a function returning the same wrapper and flattens the result. */
  chain<A, X, B>(
    fa: Kind<S, A, B>,
    f: (a: A) => Kind<S, X, B>,
  ): Kind<S, X, B>
}

/** Names of the operations in `ChainDict`. */
export type ChainKeys = keyof ChainDict<Shape> & string

/** Native generic types accepted by the `Chain` constraint. */
export interface ChainShapes {
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
export type _ChainUnderApply = Assert<SubclassOf<ChainShapes, ApplyShapes>>

/**
 * A constraint for values that support sequencing wrapped computations with
 * `chain`.
 */
export type Chain<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | ChainMethods<S, A, B>
  | MatchableIn<ChainShapes, A, B>

type ChainDicts = <S extends Shape>(s: S) => ChainDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const chainNatives: Instances<
  ChainDicts,
  ChainShapes
> = lazily<ChainDicts, ChainShapes>({
  Array: () => Arr,
  Fn: () => Fn,
  Set: () => Sets,
})

/**
 * Transforms values with a function that returns the same kind of wrapper,
 * then removes one level of nesting. Skips `Nothing` and `Left`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.chain((n: number) => [n, -n])([1, 2]) // => [1, -1, 2, -2]
 * P.chain((n: number) => P.just(n + 1))(P.just(1)) // => Just (2)
 * P.chain((n: number) => P.just(n + 1))(P.nothing<number>()) // => Nothing
 * ```
 */
export function chain<A, G>(
  f: (a: A) => G,
): <F extends Chain<F, A> & SameTypeAs<G, F>>(
  fa: F,
) => KindOf<F, SlotAOf<G>, BothB<F, SlotBOf<F>, SlotBOf<G>>> {
  return <F extends Chain<F, A> & SameTypeAs<G, F>>(fa: F) =>
    dispatch('chain', 'Chain', chainNatives, fa, f) as KindOf<
      F,
      SlotAOf<G>,
      BothB<F, SlotBOf<F>, SlotBOf<G>>
    >
}

/**
 * Removes one level of nesting from arrays or wrapped values of the same type.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.join([[1, 2], [3]]) // => [1, 2, 3]
 * P.join(P.just(P.just(1))) // => Just (1)
 * P.join(P.just(P.nothing<number>())) // => Nothing
 * ```
 */
export function join<F extends Chain<F> & SameTypeAs<SlotAOf<F>, F>>(
  mma: F,
): KindOf<F, SlotAOf<SlotAOf<F>>> {
  return (chain as (f: unknown) => (fa: unknown) => unknown)(
    (x: unknown) => x,
  )(mma) as KindOf<F, SlotAOf<SlotAOf<F>>>
}
