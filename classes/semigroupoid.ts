/**
 * Operations and types for composing values.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type {
  ComposableWith,
  KindOf,
  MatchableIn,
  SlotAOf,
  SlotBOf,
} from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { FnShape } from '../natives/function.ts'
import { dispatch, lazily } from '../core/instance.ts'
import { Fn } from '../natives/function.ts'

/** Implement these methods on a custom value to support composing values. */
export interface SemigroupoidMethods<S, A, B = never> {
  /** Composes this value with `that`, running this value first. */
  compose<K>(that: KindOf<S, K, A>): KindOf<S, K, B>
}

/**
 * Operations for composing values on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface SemigroupoidDict<S extends Shape> {
  /** Composes `g` with `f`, running `g` first. */
  compose<A, B, K>(g: Kind<S, A, B>, f: Kind<S, K, A>): Kind<S, K, B>
}

/** Names of the operations in `SemigroupoidDict`. */
export type SemigroupoidKeys = keyof SemigroupoidDict<Shape> & string

/** Native generic types accepted by the `Semigroupoid` constraint. */
export interface SemigroupoidShapes {
  /** The shape used for `Fn` values. */
  readonly Fn: FnShape
}

/** A constraint for values that support composing values. */
export type Semigroupoid<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | SemigroupoidMethods<S, A, B>
  | MatchableIn<SemigroupoidShapes, A, B>

type SemigroupoidDicts = <S extends Shape>(s: S) => SemigroupoidDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const semigroupoidNatives: Instances<
  SemigroupoidDicts,
  SemigroupoidShapes
> = lazily<SemigroupoidDicts, SemigroupoidShapes>({
  Fn: () => Fn,
})

/**
 * Composes two functions: `compose(f)(g)(x)` runs `f(g(x))`.
 * Also supports values with a `compose` method.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.compose(P.size)(P.words)('one two three') // => 3
 * P.compose(P.pair('y', 'z'))(P.pair('x', 'y')) // => Pair ("x") ("z")
 * ```
 */
export function compose<
  G extends Semigroupoid<G> | ((b: never) => unknown),
>(f: G): <F extends Semigroupoid<F> & ComposableWith<F, G>>(
  g: F,
) => KindOf<F, SlotAOf<G>> {
  return <F extends Semigroupoid<F> & ComposableWith<F, G>>(g: F) =>
    dispatch('compose', 'Semigroupoid', semigroupoidNatives, g, f) as KindOf<
      F,
      SlotAOf<G>
    >
}
