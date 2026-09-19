/**
 * Operations and types for combining alternatives with `alt`.
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
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import type { FunctorDict, FunctorMethods, FunctorShapes } from './functor.ts'
import { dispatch, lazily } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { StrMap } from '../natives/strmap.ts'

/**
 * Implement these methods on a custom value to support combining alternatives
 * with `alt`.
 */
export interface AltMethods<S, A, B = never> extends FunctorMethods<S, A, B> {
  /** Combines this value with an alternative of the same type. */
  alt(that: S): S
}

/**
 * Operations for combining alternatives with `alt` on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface AltDict<S extends Shape> extends FunctorDict<S> {
  /** Combines this value with an alternative of the same type. */
  alt<A, B>(a: Kind<S, A, B>, b: Kind<S, A, B>): Kind<S, A, B>
}

/** Names of the operations in `AltDict`. */
export type AltKeys = keyof AltDict<Shape> & string

/** Native generic types accepted by the `Alt` constraint. */
export interface AltShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `StrMap` values. */
  readonly StrMap: StrMapShape
}

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _AltUnderFunctor = Assert<SubclassOf<AltShapes, FunctorShapes>>

/** A constraint for values that support combining alternatives with `alt`. */
export type Alt<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | AltMethods<S, A, B>
  | MatchableIn<AltShapes, A, B>

type AltDicts = <S extends Shape>(s: S) => AltDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const altNatives: Instances<
  AltDicts,
  AltShapes
> = lazily<AltDicts, AltShapes>({
  Array: () => Arr,
  StrMap: () => StrMap,
})

/**
 * Combines arrays or records, or uses a fallback for `Nothing` and `Left`.
 * Supply the fallback first. For records, existing keys in the second argument
 * win.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.alt([3, 4])([1, 2]) // => [1, 2, 3, 4]
 * P.alt({ b: 2 })({ a: 1 }) // => { a: 1, b: 2 }
 * P.alt({ a: 9 })({ a: 1 }) // => { a: 1 }
 * P.alt(P.just(2))(P.nothing<number>()) // => Just (2)
 * P.alt(P.just(2))(P.just(1)) // => Just (1)
 * P.alt(P.right<string, number>(2))(P.left('e')) // => Right (2)
 * ```
 */
export function alt<A>(fb: readonly A[]): (fa: readonly A[]) => A[]
/** Combines arrays or records, or uses a fallback for `Nothing` and `Left`. */
export function alt<A>(
  fb: Record<string, A>,
): (fa: Record<string, A>) => Record<string, A>
/** Combines arrays or records, or uses a fallback for `Nothing` and `Left`. */
export function alt<F extends Alt<F>>(fb: F): (fa: F) => F
// deno-lint-ignore no-explicit-any
export function alt(fb: any): (fa: any) => any {
  return (fa: unknown): unknown => dispatch('alt', 'Alt', altNatives, fa, fb)
}
