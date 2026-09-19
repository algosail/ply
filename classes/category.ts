/**
 * Operations and types for composing values with an identity.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
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
import type { FnShape } from '../natives/function.ts'
import type {
  SemigroupoidDict,
  SemigroupoidKeys,
  SemigroupoidShapes,
} from './semigroupoid.ts'
import { lazily, nameOf, typeRepIn } from '../core/instance.ts'
import { Fn } from '../natives/function.ts'

/** The static `id` operation required from a custom type representative. */
export interface IdSig<S extends Shape, B, M extends string> {
  /** Returns the identity for composition. */
  id<A>(): Superclass<S, M, Kind<S, A, A>>
}

/**
 * Operations for composing values with an identity on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface CategoryDict<S extends Shape>
  extends SemigroupoidDict<S>, IdSig<S, unknown, never> {}

/**
 * A type representative accepted by `id`.
 * Use this to type a helper that accepts the desired result type.
 */
export type CategoryTypeRep<S extends Shape, B = never> = RepIn<
  S,
  B,
  CategoryShapes,
  IdSig<S, B, SemigroupoidKeys>
>

/** Names of the operations in `CategoryDict`. */
export type CategoryKeys = keyof CategoryDict<Shape> & string

/** Native generic types accepted by the `Category` constraint. */
export interface CategoryShapes {
  /** The shape used for `Fn` values. */
  readonly Fn: FnShape
}

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _CategoryUnderSemigroupoid = Assert<
  SubclassOf<CategoryShapes, SemigroupoidShapes>
>

/** A constraint for values that support composing values with an identity. */
export type Category<S, A = SlotAOf<S>, B = SlotBOf<S>> = MatchableIn<
  CategoryShapes,
  A,
  B
>

type CategoryDicts = <S extends Shape>(s: S) => CategoryDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const categoryNatives: Instances<
  CategoryDicts,
  CategoryShapes
> = lazily<CategoryDicts, CategoryShapes>({
  Fn: () => Fn,
})

/**
 * Creates an identity for the chosen type.
 * With `Fn`, returns a function that passes its input through unchanged.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.id(P.Fn)(1) // => 1
 * P.compose(P.id(P.Fn))((s: string) => s.length)('abc') // => 3
 * ```
 */
export function id<L extends Shape, A>(T: CategoryTypeRep<L>): Kind<L, A, A>
export function id(T: unknown): unknown {
  const f = typeRepIn(categoryNatives, T, 'id')
  if (f === undefined) {
    throw new TypeError(
      `id: ${nameOf(T)} has no Category`,
    )
  }
  return f()
}
