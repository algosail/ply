import type {
  Assert,
  MatchableIn,
  RepIn,
  SlotAOf,
  SlotBOf,
  SubclassOf,
  Superclass,
} from '../core/kind.ts'
import type { Kind, Shape } from '../core/shape.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { FnShape } from '../natives/function.ts'
import type { SetShape } from '../natives/set.ts'
import type { ApplyDict, ApplyKeys, ApplyShapes } from './apply.ts'
import { lazily, nameOf, typeRepIn } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { Fn } from '../natives/function.ts'
import { Sets } from '../natives/set.ts'

/** The static `of` operation required from a custom type representative. */
export interface OfSig<L extends Shape, B, M extends string> {
  /** Wraps a value in this type. */
  of<A>(a: A): Superclass<L, M, Kind<L, A, B>>
}

/** Operations for wrapping values with `of` and applying wrapped functions on values described by `S`. */
export interface ApplicativeDict<S extends Shape>
  extends ApplyDict<S>, OfSig<S, unknown, never> {}

/** A type representative accepted by `of`. */
export type ApplicativeTypeRep<S extends Shape, B = never> =
  RepIn<S, B, ApplicativeShapes, OfSig<S, B, ApplyKeys>>

/** Names of the operations in `ApplicativeDict`. */
export type ApplicativeKeys = keyof ApplicativeDict<Shape> & string

/** Native generic types accepted by the `Applicative` constraint. */
export interface ApplicativeShapes {
  readonly Array: ArrayShape
  readonly Fn: FnShape
  readonly Set: SetShape
}

/** Checks that the declared native types also satisfy the parent capabilities. */
export type _ApplicativeUnderApply = Assert<SubclassOf<ApplicativeShapes, ApplyShapes>>

/** A constraint for values that support wrapping values with `of` and applying wrapped functions. */
export type Applicative<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  MatchableIn<ApplicativeShapes, A, B>

type ApplicativeDicts = <S extends Shape>(s: S) => ApplicativeDict<S>

/** Native implementations of this module's operations, keyed by type name. */
export const applicativeNatives = lazily<ApplicativeDicts, ApplicativeShapes> ({
  Array: () => Arr,
  Fn: () => Fn,
  Set: () => Sets,
})

/**
 * Wraps a value in the chosen type, such as `Arr`, `Maybe`, or `Either`.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.of (P.Arr) (1) // => [1]
 * P.of (P.Sets) (1) // => Set ([1])
 * P.of (P.Maybe) (1) // => Just (1)
 * P.of (P.Either) (1) // => Right (1)
 * ```
 */
export function of<L extends Shape, B>(T: ApplicativeTypeRep<L, B>): <A>(a: A) => Kind<L, A, B>
export function of(T: unknown) {
  const f = typeRepIn (applicativeNatives, T, 'of')
  if (f === undefined) {
    throw new TypeError (
      `of: ${nameOf (T)} has no Applicative`,
    )
  }
  return (a: unknown): unknown => f (a as never)
}
