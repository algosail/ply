/**
 * Operations and types for transforming contained values with `map`.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type {
  KindOf,
  MatchableIn,
  ReturnOfSlotA,
  SlotAOf,
  SlotBOf,
} from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { FnShape } from '../natives/function.ts'
import type { MapShape } from '../natives/map.ts'
import type { SetShape } from '../natives/set.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import { dispatch, lazily } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { Fn } from '../natives/function.ts'
import { Maps } from '../natives/map.ts'
import { Sets } from '../natives/set.ts'
import { StrMap } from '../natives/strmap.ts'

/**
 * Implement these methods on a custom value to support transforming contained
 * values with `map`.
 */
export interface FunctorMethods<S, A, B = never> {
  /** Transforms each contained value, preserving the wrapper. */
  map<X>(f: (a: A) => X): KindOf<S, X, B>
}

/**
 * Operations for transforming contained values with `map` on values described
 * by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface FunctorDict<S extends Shape> {
  /** Transforms each contained value, preserving the wrapper. */
  map<A, X, B>(fa: Kind<S, A, B>, f: (a: A) => X): Kind<S, X, B>
}

/** Names of the operations in `FunctorDict`. */
export type FunctorKeys = keyof FunctorDict<Shape> & string

/** Native generic types accepted by the `Functor` constraint. */
export interface FunctorShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `Fn` values. */
  readonly Fn: FnShape
  /** The shape used for `Set` values. */
  readonly Set: SetShape
  /** The shape used for `Map` values. */
  readonly Map: MapShape
  /** The shape used for `StrMap` values. */
  readonly StrMap: StrMapShape
}

/**
 * A constraint for values that support transforming contained values with
 * `map`.
 */
export type Functor<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | FunctorMethods<S, A, B>
  | MatchableIn<FunctorShapes, A, B>

type FunctorDicts = <S extends Shape>(s: S) => FunctorDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const functorNatives: Instances<
  FunctorDicts,
  FunctorShapes
> = lazily<FunctorDicts, FunctorShapes>({
  Array: () => Arr,
  Fn: () => Fn,
  Set: () => Sets,
  Map: () => Maps,
  StrMap: () => StrMap,
})

/**
 * Transforms values inside an array, collection, or wrapped value.
 * Leaves `Nothing` and `Left` unchanged. For functions, transforms the result.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const double = P.map((n: number) => n * 2)
 *
 * double([1, 2, 3]) // => [2, 4, 6]
 * double(P.just(5)) // => Just (10)
 * double(P.nothing<number>()) // => Nothing
 * ```
 */
export function map<A, B>(
  f: (a: A) => B,
): <F extends Functor<F, A>>(fa: F) => KindOf<F, B> {
  return <F extends Functor<F, A>>(fa: F) =>
    dispatch('map', 'Functor', functorNatives, fa, f) as KindOf<F, B>
}

/** Extracts the argument type of a contained function. */
export type ArgOfSlotA<F> = SlotAOf<F> extends (a: infer A) => unknown ? A
  : never

/**
 * Applies each function in a collection or wrapped value to the same argument.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.flip([Math.floor, Math.ceil])(1.5)
 * // => [1, 2]
 * P.flip({ floor: Math.floor, ceil: Math.ceil })(1.5)
 * // => { floor: 1, ceil: 2 }
 * ```
 */
export function flip<F extends Functor<F, (a: never) => unknown>>(
  ff: F,
): (a: ArgOfSlotA<F>) => KindOf<F, ReturnOfSlotA<F>> {
  return (a: ArgOfSlotA<F>): KindOf<F, ReturnOfSlotA<F>> =>
    map((g: (x: ArgOfSlotA<F>) => ReturnOfSlotA<F>) => g(a))(
      ff as never,
    ) as KindOf<F, ReturnOfSlotA<F>>
}

/**
 * Replaces each contained value with the supplied value.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.voidRight('x')([1, 2, 3]) // => ['x', 'x', 'x']
 * P.voidRight('x')(P.just(1)) // => Just ('x')
 * P.voidRight('x')(P.nothing<number>()) // => Nothing
 * ```
 */
export function voidRight<B>(
  b: B,
): <F extends Functor<F, unknown>>(fa: F) => KindOf<F, B> {
  return <F extends Functor<F, unknown>>(fa: F): KindOf<F, B> =>
    map((_: unknown) => b)(fa)
}

/**
 * Replaces each contained value with `undefined`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.voided([1, 2, 3]) // => [undefined, undefined, undefined]
 * P.voided(P.just(1)) // => Just (undefined)
 * ```
 */
export function voided<F extends Functor<F, unknown>>(fa: F): KindOf<F, void> {
  return voidRight<void>(undefined)(fa)
}
