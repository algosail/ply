/**
 * Operations and types for combining values with an empty starting value.
 *
 * @module
 */

import type { Kind, Nullary, Shape } from '../core/shape.ts'
import type {
  Assert,
  MatchableIn,
  RepIn,
  SlotAOf,
  SlotBOf,
  SubclassOf,
  Superclass,
} from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import type { StrShape } from '../natives/string.ts'
import type {
  SemigroupDict,
  SemigroupKeys,
  SemigroupShapes,
} from './semigroup.ts'
import { lazily, nameOf, typeRepIn } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { StrMap } from '../natives/strmap.ts'
import { Str } from '../natives/string.ts'

/** The static `empty` operation required from a custom type representative. */
export interface EmptySig<S extends Shape, B, M extends string> {
  /** Returns the identity value for `concat`. */
  empty<A>(): Superclass<S, M, Kind<S, A, B>>
}

/**
 * Operations for combining values with an empty starting value on values
 * described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface MonoidDict<S extends Shape>
  extends SemigroupDict<S>, EmptySig<S, unknown, never> {}

/**
 * A type representative accepted by `empty`.
 * Use this to type a helper that accepts the desired result type.
 */
export type MonoidTypeRep<S extends Shape, B = never> = RepIn<
  S,
  B,
  (MonoidShapes & MonoidPrimitives),
  EmptySig<S, B, SemigroupKeys>
>

/** Names of the operations in `MonoidDict`. */
export type MonoidKeys = keyof MonoidDict<Shape> & string

/** Native generic types accepted by the `Monoid` constraint. */
export interface MonoidShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `StrMap` values. */
  readonly StrMap: StrMapShape
}

/**
 * A constraint for values that support combining values with an empty starting
 * value.
 */
export type Monoid<S, A = SlotAOf<S>, B = SlotBOf<S>> = MatchableIn<
  MonoidShapes,
  A,
  B
>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _MonoidUnderSemigroup = Assert<
  SubclassOf<MonoidShapes, SemigroupShapes>
>

/**
 * Additional scalar types supported by combining values with an empty starting
 * value.
 */
export interface MonoidPrimitives {
  /** The shape used for `String` values. */
  readonly String: StrShape
}

type MonoidNatives = MonoidShapes & MonoidPrimitives
type MonoidDicts = <S extends Shape>(s: S) => MonoidDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const monoidNatives: Instances<
  MonoidDicts,
  MonoidNatives
> = lazily<MonoidDicts, MonoidNatives>({
  Array: () => Arr,
  StrMap: () => StrMap,
  String: () => Str,
})

/**
 * Returns the empty value for the chosen type, such as `[]` for `Arr`
 * or an empty string for `Str`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.empty(P.Arr) // => []
 * P.empty(P.Str) // => ''
 * P.empty(P.StrMap) // => {}
 * ```
 */
export function empty<S extends Shape, B, A = never>(
  T: MonoidTypeRep<S, B>,
): Kind<S, A, B>
export function empty(T: unknown): unknown {
  const f = typeRepIn(monoidNatives, T, 'empty')
  if (f === undefined) {
    throw new TypeError(
      `empty: ${nameOf(T)} has no Monoid`,
    )
  }
  return f()
}

/**
 * Combines an array using a chosen monoid.
 * Returns the monoid's empty value for an empty array.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mconcat(P.Sum)([1, 2, 3]) // => 6
 * P.mconcat(P.Sum)([]) // => 0
 * P.mconcat(P.Concat)(['a', 'b', 'c']) // => 'abc'
 * ```
 */
export function mconcat<A>(M: MonoidDict<Nullary<A>>): (xs: readonly A[]) => A {
  return (xs: readonly A[]): A =>
    xs.reduce((acc, x) => M.concat(acc, x), M.empty())
}
