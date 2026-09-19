/**
 * Operations and types for appending and prepending values.
 *
 * @module
 */

import type { Shape } from '../core/shape.ts'
import type {
  Assert,
  KindOf,
  MatchableIn,
  SlotAOf,
  SlotBOf,
  SubclassOf,
} from '../core/kind.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { ApplyMethods } from './apply.ts'
import type { ApplicativeDict, ApplicativeShapes } from './applicative.ts'
import type {
  SemigroupDict,
  SemigroupMethods,
  SemigroupShapes,
} from './semigroup.ts'
import type { Constructed } from '../core/named.ts'
import { ofIn } from '../core/instance.ts'
import { applicativeNatives } from './applicative.ts'
import { concat } from './semigroup.ts'

/**
 * Operations for appending and prepending values on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface ApplicativeSemigroupDict<S extends Shape>
  extends ApplicativeDict<S>, SemigroupDict<S> {}

/** Names of the operations in `ApplicativeSemigroupDict`. */
export type ApplicativeSemigroupKeys =
  & keyof ApplicativeSemigroupDict<Shape>
  & string

/** Native generic types accepted by the `ApplicativeSemigroup` constraint. */
export interface ApplicativeSemigroupShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
}

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _BuildableUnderApplicative = Assert<
  SubclassOf<ApplicativeSemigroupShapes, ApplicativeShapes>
>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _BuildableUnderSemigroup = Assert<
  SubclassOf<ApplicativeSemigroupShapes, SemigroupShapes>
>

/** A constraint for values that support appending and prepending values. */
export type ApplicativeSemigroup<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | (
    & ApplyMethods<S, A, B>
    & SemigroupMethods<S, A, B>
    & Constructed<{ of(a: never): unknown }>
  )
  | MatchableIn<ApplicativeSemigroupShapes, A, B>

/**
 * Adds one value to the end of an array or compatible collection.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.append(9)([1, 2]) // => [1, 2, 9]
 * P.append('!')(P.right<number, string>('ab')) // => Right ("ab!")
 * ```
 */
export function append<A>(
  a: A,
): <F extends ApplicativeSemigroup<F, A>>(fa: F) => KindOf<F, A> {
  return <F extends ApplicativeSemigroup<F, A>>(fa: F) =>
    concat(fa as never)(ofIn(applicativeNatives, fa)(a) as never) as KindOf<
      F,
      A
    >
}

/**
 * Adds one value to the start of an array or compatible collection.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.prepend(0)([1, 2]) // => [0, 1, 2]
 * P.prepend('>')(P.right<number, string>('ab')) // => Right (">ab")
 * ```
 */
export function prepend<A>(
  a: A,
): <F extends ApplicativeSemigroup<F, A>>(fa: F) => KindOf<F, A> {
  return <F extends ApplicativeSemigroup<F, A>>(fa: F) =>
    concat(ofIn(applicativeNatives, fa)(a) as never)(fa as never) as KindOf<
      F,
      A
    >
}
