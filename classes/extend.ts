/**
 * Operations and types for computing from a whole wrapper.
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
 * Implement these methods on a custom value to support computing from a whole
 * wrapper.
 */
export interface ExtendMethods<S, A, B = never>
  extends FunctorMethods<S, A, B> {
  /** Computes a new contained value from the whole wrapper. */
  extend<X>(f: (w: S) => X): KindOf<S, X, B>
}

/**
 * Operations for computing from a whole wrapper on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface ExtendDict<S extends Shape> extends FunctorDict<S> {
  /** Computes a new contained value from the whole wrapper. */
  extend<A, B, X>(
    fa: Kind<S, A, B>,
    f: (w: Kind<S, A, B>) => X,
  ): Kind<S, X, B>
}

/** Names of the operations in `ExtendDict`. */
export type ExtendKeys = keyof ExtendDict<Shape> & string

/** Native generic types accepted by the `Extend` constraint. */
export type ExtendShapes = Record<never, never>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _ExtendUnderFunctor = Assert<
  SubclassOf<ExtendShapes, FunctorShapes>
>

/** A constraint for values that support computing from a whole wrapper. */
export type Extend<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | ExtendMethods<S, A, B>
  | MatchableIn<ExtendShapes, A, B>

type ExtendDicts = <S extends Shape>(s: S) => ExtendDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const extendNatives: Instances<ExtendDicts, ExtendShapes> = {}

/**
 * Computes a new value from the whole wrapper.
 * For `Pair`, replaces the second value and keeps the first.
 *
 * @example
 * ```ts
 * import type { Identity, Pair } from '@algosail/ply'
 * import * as P from '@algosail/ply'
 *
 * P.extend((w: Pair<string, number>) => P.extract(w) * 2)(P.pair('log', 21))
 * // => Pair ("log") (42)
 * P.extend((w: Identity<number>) => P.extract(w) + 1)(P.identity(1))
 * // => Identity (2)
 * ```
 */
export function extend<F extends Extend<F>, B>(
  f: (w: F) => B,
): (fa: F) => KindOf<F, B> {
  return (fa: F) =>
    dispatch('extend', 'Extend', extendNatives, fa, f) as KindOf<F, B>
}

/**
 * Wraps a value together with its existing wrapper.
 * For `Pair`, keeps the first value and places the original pair in the
 * second.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.duplicate(P.identity(1)) // => Identity (Identity (1))
 * P.duplicate(P.pair('log', 1)) // => Pair ("log") (Pair ("log") (1))
 * ```
 */
export function duplicate<F extends Extend<F>>(fa: F): KindOf<F, F> {
  return dispatch('extend', 'Extend', extendNatives, fa, (w: F) => w) as KindOf<
    F,
    F
  >
}
