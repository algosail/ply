/**
 * Operations and types for ordering values.
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
import type { BigShape } from '../natives/bigint.ts'
import type { BoolShape } from '../natives/boolean.ts'
import type { DateShape } from '../natives/date.ts'
import type { NumShape } from '../natives/number.ts'
import type { StrShape } from '../natives/string.ts'
import type { SetoidDict, SetoidMethods, SetoidShapes } from './setoid.ts'
import { lazily, nameOf, opIn } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { Str } from '../natives/string.ts'
import { Num } from '../natives/number.ts'
import { Bool } from '../natives/boolean.ts'
import { Big } from '../natives/bigint.ts'
import { Dates } from '../natives/date.ts'

/** Implement these methods on a custom value to support ordering values. */
export interface OrdMethods<S, A, B = never> extends SetoidMethods<S, A, B> {
  /** Checks whether this value is less than or equal to `that`. */
  lte(that: S): boolean
}

/**
 * Operations for ordering values on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface OrdDict<S extends Shape> extends SetoidDict<S> {
  /** Checks whether the first value is less than or equal to the second. */
  lte<A, B>(a: Kind<S, A, B>, b: Kind<S, A, B>): boolean
}

/** Names of the operations in `OrdDict`. */
export type OrdKeys = keyof OrdDict<Shape> & string

/** Native generic types accepted by the `Ord` constraint. */
export interface OrdShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
}

/** Additional scalar types supported by ordering values. */
export interface OrdPrimitives {
  /** The shape used for `String` values. */
  readonly String: StrShape
  /** The shape used for `Number` values. */
  readonly Number: NumShape
  /** The shape used for `Boolean` values. */
  readonly Boolean: BoolShape
  /** The shape used for `BigInt` values. */
  readonly BigInt: BigShape
  /** The shape used for `Date` values. */
  readonly Date: DateShape
}

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _OrdUnderSetoid = Assert<SubclassOf<OrdShapes, SetoidShapes>>

/** A constraint for values that support ordering values. */
export type Ord<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | OrdMethods<S, A, B>
  | MatchableIn<OrdShapes, A, B>

type OrdNatives = OrdShapes & OrdPrimitives
type OrdDicts = <S extends Shape>(s: S) => OrdDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const ordNatives: Instances<
  OrdDicts,
  OrdNatives
> = lazily<OrdDicts, OrdNatives>({
  Array: () => Arr,
  String: () => Str,
  Number: () => Num,
  Boolean: () => Bool,
  BigInt: () => Big,
  Date: () => Dates,
})

/**
 * Built-in scalar and array types accepted by the generic ordering overload.
 */
export type BuiltinOrd =
  | number
  | string
  | boolean
  | bigint
  | Date
  | readonly BuiltinOrd[]

type WidenOrd<S> = S extends number ? number
  : S extends string ? string
  : S extends boolean ? boolean
  : S extends bigint ? bigint
  : S

/**
 * Checks whether the second argument is less than or equal to the first.
 * For example, `lte(10)(7)` is `true`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.lte(3)(2) // => true
 * P.lte(3)(4) // => false
 * P.lte('b')('a') // => true
 * P.lte([1, 3])([1, 2]) // => true
 * ```
 */
export function lte<S extends BuiltinOrd>(b: S): (a: WidenOrd<S>) => boolean
/** Checks whether the second argument is less than or equal to the first. */
export function lte<S extends Ord<S>>(b: S): (a: S) => boolean
/** Checks whether the second argument is less than or equal to the first. */
export function lte<A>(b: readonly A[]): (a: readonly A[]) => boolean
// deno-lint-ignore no-explicit-any
export function lte(b: any): (a: any) => boolean {
  return (a: unknown): boolean => {
    const f = opIn(ordNatives, a, 'lte')
    if (f !== undefined) return f(a as never, b as never) === true
    throw new TypeError(
      `lte: ${nameOf(a)} has no Ord`,
    )
  }
}

/**
 * Limits a value to the inclusive bounds supplied as `(lower, upper)`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.clamp(0, 10)(42) // => 10
 * P.clamp(0, 10)(-1) // => 0
 * P.clamp(0, 10)(7) // => 7
 * ```
 */
export function clamp<A>(lo: A, hi: A): (x: A) => A {
  return (x: A): A => lt(lo)(x) ? lo : gt(hi)(x) ? hi : x
}

/**
 * Checks whether the second argument is less than the first.
 * For example, `lt(10)(7)` is `true`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.lt(3)(2) // => true
 * P.lt(2)(2) // => false
 * ```
 */
export function lt<A>(b: A): (a: A) => boolean {
  return (a: A): boolean => !lte(a as never)(b as never)
}

/**
 * Checks whether the second argument is greater than or equal to the first.
 * For example, `gte(10)(12)` is `true`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.gte(2)(2) // => true
 * P.gte(3)(2) // => false
 * ```
 */
export function gte<A>(b: A): (a: A) => boolean {
  return (a: A): boolean => lte(a as never)(b as never)
}

/**
 * Checks whether the second argument is greater than the first.
 * For example, `gt(10)(12)` is `true`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.gt(1)(2) // => true
 * P.gt(2)(2) // => false
 * ```
 */
export function gt<A>(b: A): (a: A) => boolean {
  return (a: A): boolean => !lte(b as never)(a as never)
}

/**
 * Returns the smaller of two values according to ply's ordering.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.min(2)(5) // => 2
 * P.min('pear')('fig') // => 'fig'
 * ```
 */
export function min<A>(a: A): (b: A) => A {
  return (b: A): A => lte(b as never)(a as never) ? a : b
}

/**
 * Returns the larger of two values according to ply's ordering.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.max(2)(5) // => 5
 * P.max(5)(2) // => 5
 * ```
 */
export function max<A>(a: A): (b: A) => A {
  return (b: A): A => lte(b as never)(a as never) ? b : a
}
