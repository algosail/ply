/**
 * Operations and types for combining values with `concat`.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type { MatchableIn, SlotAOf, SlotBOf } from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import type { StrShape } from '../natives/string.ts'
import { dispatch, lazily } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { StrMap } from '../natives/strmap.ts'
import { Str } from '../natives/string.ts'

/**
 * Implement these methods on a custom value to support combining values with
 * `concat`.
 */
export interface SemigroupMethods<S, A, B = never> {
  /** Combines this value with `that`, in that order. */
  concat(that: S): S
}

/**
 * Operations for combining values with `concat` on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface SemigroupDict<S extends Shape> {
  /** Combines the two values in order. */
  concat<A, B>(a: Kind<S, A, B>, b: Kind<S, A, B>): Kind<S, A, B>
}

/** Names of the operations in `SemigroupDict`. */
export type SemigroupKeys = keyof SemigroupDict<Shape> & string

/** Native generic types accepted by the `Semigroup` constraint. */
export interface SemigroupShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `StrMap` values. */
  readonly StrMap: StrMapShape
}

/** Additional scalar types supported by combining values with `concat`. */
export interface SemigroupPrimitives {
  /** The shape used for `String` values. */
  readonly String: StrShape
}

/** A constraint for values that support combining values with `concat`. */
export type Semigroup<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | SemigroupMethods<S, A, B>
  | MatchableIn<SemigroupShapes, A, B>

type SemigroupNatives = SemigroupShapes & SemigroupPrimitives
type SemigroupDicts = <S extends Shape>(s: S) => SemigroupDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const semigroupNatives: Instances<
  SemigroupDicts,
  SemigroupNatives
> = lazily<SemigroupDicts, SemigroupNatives>({
  Array: () => Arr,
  StrMap: () => StrMap,
  String: () => Str,
})

/**
 * Combines two values of the same type, in argument order.
 * Joins arrays and strings. For records, the first argument wins on duplicate
 * keys.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.concat([1, 2])([3]) // => [1, 2, 3]
 * P.concat('ab')('cd') // => 'abcd'
 * P.concat({ a: 1 })({ a: 2, b: 2 }) // => { a: 1, b: 2 }
 * P.concat(P.right('a'))(P.right('b')) // => Right ('ab')
 * ```
 */
export function concat<A>(a: readonly A[]): (b: readonly A[]) => A[]
/** Combines two values of the same type, in argument order. */
export function concat<A>(
  a: Record<string, A>,
): (b: Record<string, A>) => Record<string, A>
/** Combines two values of the same type, in argument order. */
export function concat<S extends Semigroup<S>>(a: S): (b: S) => S
// deno-lint-ignore no-explicit-any
export function concat(a: any): (b: any) => any {
  return (b: unknown): unknown =>
    dispatch('concat', 'Semigroup', semigroupNatives, a, b)
}
