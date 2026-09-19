/**
 * Combine boolean values and choose transformations with predicates.
 *
 * @module
 */

import type { Shape } from '../core/shape.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { OrdDict } from '../classes/ord.ts'
import type { SetoidDict } from '../classes/setoid.ts'
import type { ShowDict } from '../classes/show.ts'

/**
 * The shape for booleans. Use it with `Kind` when declaring generic helpers.
 */
export interface BoolShape extends Shape<'Boolean'> {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: boolean
}

/**
 * The type of the `Bool` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type BoolDict =
  & NativeTypeRep<BoolShape>
  & OrdDict<BoolShape>
  & SetoidDict<BoolShape>
  & ShowDict<BoolShape>

/**
 * The boolean representative. Its ordering places `false` before `true`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.Bool.is(false) // => true
 * P.Bool.lte(false, true) // => true
 * ```
 */
export const Bool: BoolDict = {
  '@@type': 'Boolean' as const,
  _shape: undefined as unknown as BoolShape,
  is(x: unknown): x is boolean {
    return typeof x === 'boolean'
  },
  lte(a: boolean, b: boolean): boolean {
    return a <= b
  },
  equals(a: boolean, b: boolean): boolean {
    return a === b
  },
  show(b: boolean): string {
    return String(b)
  },
}

/**
 * Returns `true` when both supplied booleans are `true`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.and(true)(false) // => false
 * P.and(true)(true) // => true
 * ```
 */
export function and(x: boolean): (y: boolean) => boolean {
  return (y) => x && y
}

/**
 * Returns `true` when at least one supplied boolean is `true`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.or(true)(false) // => true
 * P.or(false)(false) // => false
 * ```
 */
export function or(x: boolean): (y: boolean) => boolean {
  return (y) => x || y
}

/**
 * Negates a boolean.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.not(true) // => false
 * P.not(false) // => true
 * ```
 */
export function not(x: boolean): boolean {
  return !x
}

/**
 * Creates a predicate that returns the opposite of the supplied predicate.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.complement(P.even)(3) // => true
 * P.map(P.complement(P.even))([1, 2, 3]) // => [true, false, true]
 * ```
 */
export function complement<A>(pred: (a: A) => boolean): (x: A) => boolean {
  return (x) => !pred(x)
}

/**
 * Chooses between two values: supply the false case first, then the true case.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.boolean('no')('yes')(true) // => 'yes'
 * P.boolean('no')('yes')(false) // => 'no'
 * ```
 */
export function boolean<A>(onFalse: A): (onTrue: A) => (b: boolean) => A {
  return (onTrue) => (b) => b ? onTrue : onFalse
}

/**
 * Applies one of two functions to the input depending on a predicate.
 * Supply the true branch first, then the false branch. Only one branch is
 * called.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.ifElse(P.even)(P.div(2))(P.mult(3))(4) // => 2
 * P.ifElse(P.even)(P.div(2))(P.mult(3))(3) // => 9
 * ```
 */
export function ifElse<A>(
  pred: (a: A) => boolean,
): <B>(onTrue: (a: A) => B) => (onFalse: (a: A) => B) => (x: A) => B {
  return (onTrue) => (onFalse) => (x) => pred(x) ? onTrue(x) : onFalse(x)
}

/**
 * Transforms the input when the predicate passes; otherwise returns it
 * unchanged.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.when(P.even)(P.div(2))(4) // => 2
 * P.when(P.even)(P.div(2))(3) // => 3
 * ```
 */
export function when<A>(
  pred: (a: A) => boolean,
): (f: (a: A) => A) => (x: A) => A {
  return (f) => (x) => pred(x) ? f(x) : x
}

/**
 * Transforms the input when the predicate fails; otherwise returns it
 * unchanged.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.unless(P.even)(P.add(1))(3) // => 4
 * P.unless(P.even)(P.add(1))(4) // => 4
 * ```
 */
export function unless<A>(
  pred: (a: A) => boolean,
): (f: (a: A) => A) => (x: A) => A {
  return (f) => (x) => pred(x) ? x : f(x)
}
