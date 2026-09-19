/**
 * Operations and types for combining values and undoing them with `invert`.
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
import type { MonoidDict, MonoidShapes } from './monoid.ts'
import type { SemigroupMethods } from './semigroup.ts'
import { hasMethod, nameOf } from '../core/instance.ts'
import type { Instances } from '../core/named.ts'

/**
 * Implement these methods on a custom value to support combining values and
 * undoing them with `invert`.
 */
export interface GroupMethods<S, A, B = never>
  extends SemigroupMethods<S, A, B> {
  /** Returns a value that cancels this value under `concat`. */
  invert(): S
}

/**
 * Operations for combining values and undoing them with `invert` on values
 * described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface GroupDict<S extends Shape> extends MonoidDict<S> {
  /** Returns a value that cancels this value under `concat`. */
  invert<A, B>(a: Kind<S, A, B>): Kind<S, A, B>
}

/** Names of the operations in `GroupDict`. */
export type GroupKeys = keyof GroupDict<Shape> & string

/** Native generic types accepted by the `Group` constraint. */
export type GroupShapes = Record<never, never>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _GroupUnderMonoid = Assert<SubclassOf<GroupShapes, MonoidShapes>>

/**
 * A constraint for values that support combining values and undoing them with
 * `invert`.
 */
export type Group<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | GroupMethods<S, A, B>
  | MatchableIn<GroupShapes, A, B>

type GroupDicts = <S extends Shape>(s: S) => GroupDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const groupNatives: Instances<GroupDicts, GroupShapes> = {}

/**
 * Returns a value that cancels the input when combined with `concat`.
 * The input must implement `invert`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const add = (value: number) => ({
 *   '@@type': 'Add' as const,
 *   value,
 *   concat(that: { value: number }) { return add(this.value + that.value) },
 *   invert() { return add(-this.value) },
 * })
 *
 * P.invert(add(3)).value // => -3
 * P.invert(P.invert(add(3))).value // => 3

 * P.concat(add(3))(P.invert(add(3))).value // => 0
 * P.concat(P.invert(add(3)))(add(3)).value // => 0
 * ```
 */
export function invert<S extends Group<S>>(a: S): S {
  if (hasMethod(a, 'invert')) return a.invert() as S
  throw new TypeError(`invert: ${nameOf(a)} has no Group`)
}
