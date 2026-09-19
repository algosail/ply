/**
 * Operations and types for combining alternatives with an empty starting
 * value.
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
import type { ArrayShape } from '../natives/array.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import type { AltDict, AltKeys, AltShapes } from './alt.ts'
import { lazily, nameOf, typeRepIn } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { StrMap } from '../natives/strmap.ts'
import { alt } from './alt.ts'

/** The static `zero` operation required from a custom type representative. */
export interface ZeroSig<S extends Shape, B, M extends string> {
  /** Returns an empty alternative of this type. */
  zero<A>(): Superclass<S, M, Kind<S, A, B>>
}

/**
 * Operations for combining alternatives with an empty starting value on values
 * described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface PlusDict<S extends Shape>
  extends AltDict<S>, ZeroSig<S, unknown, never> {}

/**
 * A type representative accepted by `zero`.
 * Use this to type a helper that accepts the desired result type.
 */
export type PlusTypeRep<S extends Shape, B = never> = RepIn<
  S,
  B,
  PlusShapes,
  ZeroSig<S, B, AltKeys>
>

/** Names of the operations in `PlusDict`. */
export type PlusKeys = keyof PlusDict<Shape> & string

/** Native generic types accepted by the `Plus` constraint. */
export interface PlusShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `StrMap` values. */
  readonly StrMap: StrMapShape
}

/**
 * A constraint for values that support combining alternatives with an empty
 * starting value.
 */
export type Plus<S, A = SlotAOf<S>, B = SlotBOf<S>> = MatchableIn<
  PlusShapes,
  A,
  B
>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _PlusUnderAlt = Assert<SubclassOf<PlusShapes, AltShapes>>

type PlusDicts = <S extends Shape>(s: S) => PlusDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const plusNatives: Instances<
  PlusDicts,
  PlusShapes
> = lazily<PlusDicts, PlusShapes>({
  Array: () => Arr,
  StrMap: () => StrMap,
})

/**
 * Returns the empty alternative for the chosen type.
 * For example, `Arr` gives `[]` and `Maybe` gives `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.zero(P.Arr) // => []
 * P.zero(P.StrMap) // => {}
 * P.zero(P.Maybe) // => Nothing
 * ```
 */
export function zero<L extends Shape, B, A = never>(
  T: PlusTypeRep<L, B>,
): Kind<L, A, B>
export function zero(T: unknown): unknown {
  const f = typeRepIn(plusNatives, T, 'zero')
  if (f === undefined) {
    throw new TypeError(`zero: ${nameOf(T)} has no Plus`)
  }
  return f()
}

/**
 * Combines an array of alternatives in order.
 * For `Maybe`, returns the first `Just`, or `Nothing` if none are present.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.altAll(P.Arr)([[1, 2], [3]]) // => [1, 2, 3]
 * P.altAll(P.Arr)([]) // => []
 * P.altAll(P.Maybe)([P.nothing(), P.just(2), P.just(3)]) // => Just (2)
 * ```
 */
export function altAll<L extends Shape, B>(
  T: PlusTypeRep<L, B>,
): <F extends Kind<L, unknown, B>>(xs: readonly F[]) => Kind<L, SlotAOf<F>, B>
export function altAll(T: unknown): (xs: readonly unknown[]) => unknown {
  const neutral = (zero as (t: unknown) => unknown)(T)
  return (xs: readonly unknown[]): unknown =>
    xs.reduce(
      (acc: unknown, x) =>
        (alt as (b: unknown) => (a: unknown) => unknown)(x)(acc),
      neutral,
    )
}
