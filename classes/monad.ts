/**
 * Types for values that support both wrapping with `of` and sequencing with
 * `chain`.
 *
 * @module
 */

import type { Shape } from '../core/shape.ts'
import type {
  Assert,
  MatchableIn,
  RepIn,
  SlotAOf,
  SlotBOf,
  SubclassOf,
} from '../core/kind.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { FnShape } from '../natives/function.ts'
import type { SetShape } from '../natives/set.ts'
import type { ChainDict, ChainKeys, ChainShapes } from './chain.ts'
import type {
  ApplicativeDict,
  ApplicativeShapes,
  OfSig,
} from './applicative.ts'

/**
 * Operations for wrapping and chaining values on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface MonadDict<S extends Shape>
  extends ApplicativeDict<S>, ChainDict<S> {
}

/**
 * A type representative accepted by `of`.
 * Use this to type a helper that accepts the desired result type.
 */
export type MonadTypeRep<S extends Shape, B = never> = RepIn<
  S,
  B,
  MonadShapes,
  OfSig<S, B, ChainKeys>
>

/** Names of the operations in `MonadDict`. */
export type MonadKeys = keyof MonadDict<Shape> & string

/** Native generic types accepted by the `Monad` constraint. */
export interface MonadShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `Fn` values. */
  readonly Fn: FnShape
  /** The shape used for `Set` values. */
  readonly Set: SetShape
}

/** A constraint for values that support wrapping and chaining values. */
export type Monad<S, A = SlotAOf<S>, B = SlotBOf<S>> = MatchableIn<
  MonadShapes,
  A,
  B
>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _MonadUnderApplicative = Assert<
  SubclassOf<MonadShapes, ApplicativeShapes>
>

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _MonadUnderChain = Assert<SubclassOf<MonadShapes, ChainShapes>>
