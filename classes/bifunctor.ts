/**
 * Operations and types for transforming both sides with `bimap`.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type {
  Assert,
  KindOf,
  MatchableIn,
  SlotAOf,
  SlotBOf,
  SubclassOf,
} from '../core/kind.ts'
import type { FunctorDict, FunctorMethods, FunctorShapes } from './functor.ts'
import { dispatch } from '../core/instance.ts'
import type { Instances } from '../core/named.ts'

/**
 * Implement these methods on a custom value to support transforming both sides
 * with `bimap`.
 */
export interface BifunctorMethods<S, A, B = never>
  extends FunctorMethods<S, A, B> {
  /** Transforms the left side with `f` and the right side with `g`. */
  bimap<X, Y>(f: (b: B) => Y, g: (a: A) => X): KindOf<S, X, Y>
}

/**
 * Operations for transforming both sides with `bimap` on values described by
 * `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface BifunctorDict<S extends Shape> extends FunctorDict<S> {
  /** Transforms the left side with `f` and the right side with `g`. */
  bimap<A, B, X, Y>(
    fa: Kind<S, A, B>,
    f: (b: B) => Y,
    g: (a: A) => X,
  ): Kind<S, X, Y>
}

/** Names of the operations in `BifunctorDict`. */
export type BifunctorKeys = keyof BifunctorDict<Shape> & string

/** Native generic types accepted by the `Bifunctor` constraint. */
export type BifunctorShapes = Record<never, never>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _BifunctorUnderFunctor = Assert<
  SubclassOf<BifunctorShapes, FunctorShapes>
>

/**
 * A constraint for values that support transforming both sides with `bimap`.
 */
export type Bifunctor<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | BifunctorMethods<S, A, B>
  | MatchableIn<BifunctorShapes, A, B>

type BifunctorDicts = <S extends Shape>(s: S) => BifunctorDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const bifunctorNatives: Instances<BifunctorDicts, BifunctorShapes> = {}

/**
 * Transforms both sides of a `Pair`, or the active branch of an `Either`.
 * Supply the left transformation first, then the right transformation.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const f = P.bimap((e: string) => e.length)((n: number) => n + 1)
 * f(P.right<string, number>(1)) // => Right (2)
 * f(P.left<string, number>('no')) // => Left (2)
 *
 * P.bimap((l: string) => l.toUpperCase())((n: number) => n + 1)(
 *   P.pair('log', 1),
 * ) // => Pair ("LOG") (2)
 * ```
 */
export function bimap<B, Y>(
  f: (b: B) => Y,
): <A, X>(
  g: (a: A) => X,
) => <F extends Bifunctor<F, A, B>>(fa: F) => KindOf<F, X, Y> {
  return <A, X>(g: (a: A) => X) => <F extends Bifunctor<F, A, B>>(fa: F) =>
    dispatch('bimap', 'Bifunctor', bifunctorNatives, fa, f, g) as KindOf<
      F,
      X,
      Y
    >
}

/**
 * Transforms a `Left` value or the first value of a `Pair`.
 * Leaves `Right` values unchanged.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const shout = P.mapLeft((e: string) => e.toUpperCase())
 * shout(P.left<string, number>('no')) // => Left ("NO")
 * shout(P.right<string, number>(1)) // => Right (1)
 * ```
 */
export function mapLeft<B, Y>(
  f: (b: B) => Y,
): <F extends Bifunctor<F, SlotAOf<F>, B>>(fa: F) => KindOf<F, SlotAOf<F>, Y> {
  return <F extends Bifunctor<F, SlotAOf<F>, B>>(fa: F) =>
    dispatch(
      'bimap',
      'Bifunctor',
      bifunctorNatives,
      fa,
      f,
      (a: unknown) => a,
    ) as KindOf<
      F,
      SlotAOf<F>,
      Y
    >
}
