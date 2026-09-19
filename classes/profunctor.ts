/**
 * Operations and types for adapting inputs and outputs.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type { KindOf, MatchableIn, SlotAOf, SlotBOf } from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { FnShape } from '../natives/function.ts'
import { dispatch, lazily } from '../core/instance.ts'
import { Fn } from '../natives/function.ts'

/**
 * Implement these methods on a custom value to support adapting inputs and
 * outputs.
 */
export interface ProfunctorMethods<S, A, B = never> {
  /** Transforms inputs with `f` and outputs with `g`. */
  promap<X, Y>(f: (y: Y) => B, g: (a: A) => X): KindOf<S, X, Y>
}

/**
 * Operations for adapting inputs and outputs on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface ProfunctorDict<S extends Shape> {
  /** Transforms inputs with `f` and outputs with `g`. */
  promap<A, B, X, Y>(
    fa: Kind<S, A, B>,
    f: (y: Y) => B,
    g: (a: A) => X,
  ): Kind<S, X, Y>
}

/** Names of the operations in `ProfunctorDict`. */
export type ProfunctorKeys = keyof ProfunctorDict<Shape> & string

/** Native generic types accepted by the `Profunctor` constraint. */
export interface ProfunctorShapes {
  /** The shape used for `Fn` values. */
  readonly Fn: FnShape
}

/** A constraint for values that support adapting inputs and outputs. */
export type Profunctor<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | ProfunctorMethods<S, A, B>
  | MatchableIn<ProfunctorShapes, A, B>

type ProfunctorDicts = <S extends Shape>(s: S) => ProfunctorDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const profunctorNatives: Instances<
  ProfunctorDicts,
  ProfunctorShapes
> = lazily<ProfunctorDicts, ProfunctorShapes>({
  Fn: () => Fn,
})

/**
 * Adapts both the input and output of a function.
 * Supply the input transformation, the output transformation, then the
 * function.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const step = (n: number) => n + 1
 *
 * P.promap((s: string) => s.length)((n: number) => n > 3)(step)('abc')
 * // => true
 * P.promap((s: string) => s.length)((n: number) => n > 3)(step)('ab')
 * // => false
 * ```
 */
export function promap<M, I>(
  f: (m: M) => I,
): <O, B>(
  g: (o: O) => B,
) => <F extends Profunctor<F, O, I> | ((i: I) => O)>(fa: F) => KindOf<F, B, M> {
  return <O, B>(g: (o: O) => B) =>
  <F extends Profunctor<F, O, I> | ((i: I) => O)>(fa: F) =>
    dispatch('promap', 'Profunctor', profunctorNatives, fa, f, g) as KindOf<
      F,
      B,
      M
    >
}
