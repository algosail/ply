/**
 * Combine boolean values and choose transformations with predicates.
 */

import type { CheckableDict } from '../classes/checkable.ts'
import type { OrdDict } from '../classes/ord.ts'
import type { SetoidDict } from '../classes/setoid.ts'
import type { ShowDict } from '../classes/show.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { Shape } from '../core/shape.ts'

/** The shape for booleans. */
export interface BoolShape extends Shape<'Boolean'> {
  readonly out: boolean
}

/** The type of the `Bool` representative. */
export type BoolDict =
  & NativeTypeRep<BoolShape>
  & CheckableDict<BoolShape>
  & OrdDict<BoolShape>
  & SetoidDict<BoolShape>
  & ShowDict<BoolShape>

/**
 * The boolean representative.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.Bool.is (false) // => true
 * P.Bool.lte (false, true) // => true
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
    return String (b)
  },
}

/**
 * Returns `true` when both supplied booleans are `true`.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.and (true) (false) // => false
 * P.and (true) (true) // => true
 * ```
 */
export function and(x: boolean) {
  return (y: boolean): boolean => x && y
}

/**
 * Returns `true` when at least one supplied boolean is `true`.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.or (true) (false) // => true
 * P.or (false) (false) // => false
 * ```
 */
export function or(x: boolean) {
  return (y: boolean): boolean => x || y
}

/**
 * Negates a boolean.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.not (true) // => false
 * P.not (false) // => true
 * ```
 */
export function not(x: boolean): boolean {
  return !x
}

/**
 * Creates a predicate that returns the opposite of the supplied predicate.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.complement (P.even) (3) // => true
 * P.map (P.complement (P.even)) ([1, 2, 3]) // => [true, false, true]
 * ```
 */
export function complement<A>(pred: (a: A) => boolean) {
  return (x: A): boolean => !pred (x)
}

/**
 * Chooses between two values: supply the false case first, then the true case.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.boolean ('no') ('yes') (true) // => 'yes'
 * P.boolean ('no') ('yes') (false) // => 'no'
 * ```
 */
export function boolean<A>(onFalse: A) {
  return (onTrue: A) => (b: boolean): A => b ? onTrue : onFalse
}

/**
 * Applies one of two functions to the input depending on a predicate.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.ifElse (P.even) (P.div (2)) (P.mult (3)) (4) // => 2
 * P.ifElse (P.even) (P.div (2)) (P.mult (3)) (3) // => 9
 * ```
 */
export function ifElse<A>(pred: (a: A) => boolean) {
  return <B>(onTrue: (a: A) => B) =>
    (onFalse: (a: A) => B) =>
    (x: A): B => pred (x) ? onTrue (x) : onFalse (x)
}

/**
 * Transforms the input when the predicate passes; otherwise returns it unchanged.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.when (P.even) (P.div (2)) (4) // => 2
 * P.when (P.even) (P.div (2)) (3) // => 3
 * ```
 */
export function when<A>(pred: (a: A) => boolean) {
  return (f: (a: A) => A) => (x: A): A => pred (x) ? f (x) : x
}

/**
 * Transforms the input when the predicate fails; otherwise returns it unchanged.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.unless (P.even) (P.add (1)) (3) // => 4
 * P.unless (P.even) (P.add (1)) (4) // => 4
 * ```
 */
export function unless<A>(pred: (a: A) => boolean) {
  return (f: (a: A) => A) => (x: A): A => pred (x) ? x : f (x)
}

/**
 * Whether a value is `true` itself, rather than merely truthy.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isTrue (true) // => true
 * P.isTrue (1) // => false
 * ```
 */
export function isTrue(x: unknown): x is true {
  return x === true
}

/**
 * Whether a value is `false` itself, rather than merely falsy.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isFalse (false) // => true
 * P.isFalse (0) // => false
 * ```
 */
export function isFalse(x: unknown): x is false {
  return x === false
}

/**
 * Applies the function when the flag is true; otherwise returns the input unchanged.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.onlyIf (true) ((n: number) => n + 1) (1) // => 2
 * P.onlyIf (false) ((n: number) => n + 1) (1) // => 1
 * ```
 */
export function onlyIf(yes: boolean) {
  return <A>(f: (a: A) => A) => (a: A): A => yes ? f (a) : a
}
