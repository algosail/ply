/**
 * Operations and types for extracting values and computing from their
 * wrappers.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type {
  Assert,
  MatchableIn,
  SlotAOf,
  SlotBOf,
  SubclassOf,
} from '../core/kind.ts'
import type { ExtendDict, ExtendMethods, ExtendShapes } from './extend.ts'
import { dispatch } from '../core/instance.ts'
import type { Instances } from '../core/named.ts'

/**
 * Implement these methods on a custom value to support extracting values and
 * computing from their wrappers.
 */
export interface ComonadMethods<S, A, B = never>
  extends ExtendMethods<S, A, B> {
  /** Returns the contained value. */
  extract(): A
}

/**
 * Operations for extracting values and computing from their wrappers on values
 * described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface ComonadDict<S extends Shape> extends ExtendDict<S> {
  /** Returns the contained value. */
  extract<A, B>(fa: Kind<S, A, B>): A
}

/** Names of the operations in `ComonadDict`. */
export type ComonadKeys = keyof ComonadDict<Shape> & string

/** Native generic types accepted by the `Comonad` constraint. */
export type ComonadShapes = Record<never, never>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _ComonadUnderExtend = Assert<
  SubclassOf<ComonadShapes, ExtendShapes>
>

/**
 * A constraint for values that support extracting values and computing from
 * their wrappers.
 */
export type Comonad<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | ComonadMethods<S, A, B>
  | MatchableIn<ComonadShapes, A, B>

type ComonadDicts = <S extends Shape>(s: S) => ComonadDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const comonadNatives: Instances<ComonadDicts, ComonadShapes> = {}

/**
 * Unwraps an `Identity`, or returns the second value of a `Pair`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.extract(P.identity(1)) // => 1
 * P.extract(P.pair('log', 42)) // => 42
 * ```
 */
export function extract<F extends Comonad<F>>(fa: F): SlotAOf<F> {
  return dispatch('extract', 'Comonad', comonadNatives, fa) as SlotAOf<F>
}
