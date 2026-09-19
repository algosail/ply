/**
 * Operations and types for repeating wrapped computations with `chainRec`.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type {
  Assert,
  KindOf,
  MatchableIn,
  RepIn,
  ShapeOf,
  SlotAOf,
  SlotBOf,
  SubclassOf,
  Superclass,
} from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type {
  ChainDict,
  ChainKeys,
  ChainMethods,
  ChainShapes,
} from './chain.ts'
import { lazily, nameOf, typeRepIn } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'

/**
 * The static `chainRec` operation required from a custom type representative.
 */
export interface ChainRecSig<S extends Shape, B, M extends string> {
  /** Repeats a step function, following `loop` steps and collecting `done` results. */
  chainRec<Loop, A>(
    f: (x: Loop) => Superclass<S, M, Kind<S, Step<Loop, A>, B>>,
    init: Loop,
  ): Superclass<S, M, Kind<S, A, B>>
}

/**
 * Operations for repeating wrapped computations with `chainRec` on values
 * described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface ChainRecDict<S extends Shape>
  extends ChainDict<S>, ChainRecSig<S, unknown, never> {}

/**
 * A type representative accepted by `chainRec`.
 * Use this to type a helper that accepts the desired result type.
 */
export type ChainRecTypeRep<S extends Shape, B = never> = RepIn<
  S,
  B,
  ChainRecShapes,
  ChainRecSig<S, B, ChainKeys>
>

/** Names of the operations in `ChainRecDict`. */
export type ChainRecKeys = keyof ChainRecDict<Shape> & string

/** Native generic types accepted by the `ChainRec` constraint. */
export interface ChainRecShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
}

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _ChainRecUnderChain = Assert<
  SubclassOf<ChainRecShapes, ChainShapes>
>

/**
 * A constraint for values that support repeating wrapped computations with
 * `chainRec`.
 */
export type ChainRec<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | ChainMethods<S, A, B>
  | MatchableIn<ChainRecShapes, A, B>

/**
 * A request to continue or finish a `chainRec` branch.
 * Create steps with `loop` and `done`.
 */
export type Step<A, B> =
  | { readonly tag: 'loop'; readonly value: A }
  | { readonly tag: 'done'; readonly value: B }

type ChainRecDicts = <S extends Shape>(s: S) => ChainRecDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const chainRecNatives: Instances<
  ChainRecDicts,
  ChainRecShapes
> = lazily<ChainRecDicts, ChainRecShapes>({
  Array: () => Arr,
})

/** Extracts the result type from a completed `chainRec` step. */
export type DoneOf<S> = S extends
  { readonly tag: 'done'; readonly value: infer B } ? B
  : never
/** Extracts the next input type from a continuing `chainRec` step. */
export type LoopOf<S> = S extends
  { readonly tag: 'loop'; readonly value: infer A } ? A
  : never

/**
 * Requests another `chainRec` step with the supplied value as its next input.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.loop(1) // => { tag: 'loop', value: 1 }
 * ```
 */
export const loop = <A, B>(value: A): Step<A, B> => ({ tag: 'loop', value })

/**
 * Finishes a `chainRec` branch with the supplied result.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.done('x') // => { tag: 'done', value: 'x' }
 * ```
 */
export const done = <A, B>(value: B): Step<A, B> => ({ tag: 'done', value })

/**
 * Repeats a step function without growing the call stack.
 * Return wrapped `loop` values to continue or `done` values to finish.
 * Annotate the step function's return type with `Step<Input, Result>`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const countdown = (n: number): P.Step<number, string>[] =>
 *   n === 0 ? [P.done('end')] : [P.loop(n - 1)]
 * P.chainRec(P.Arr, countdown, 3) // => ['end']
 *
 * const fan = (n: number): P.Step<number, number>[] =>
 *   n < 3 ? [P.loop(n + 1), P.done(n)] : [P.done(n)]
 * P.chainRec(P.Arr, fan, 0) // => [3, 2, 1, 0]
 * ```
 */
export function chainRec<G>(
  T: ChainRecTypeRep<ShapeOf<G>>,
  f: (x: LoopOf<SlotAOf<G>>) => G,
  init: LoopOf<SlotAOf<G>>,
): KindOf<G, DoneOf<SlotAOf<G>>> {
  const step = typeRepIn(chainRecNatives, T, 'chainRec')
  if (step === undefined) {
    throw new TypeError(
      `chainRec: ${nameOf(T)} has no ChainRec`,
    )
  }
  return (step as (f: unknown, init: unknown) => unknown)(
    f,
    init,
  ) as KindOf<G, DoneOf<SlotAOf<G>>>
}
