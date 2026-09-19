/**
 * Operations and types for comparing values for equality.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type { MatchableIn, SlotAOf, SlotBOf } from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import type { StrShape } from '../natives/string.ts'
import type { NumShape } from '../natives/number.ts'
import type { BoolShape } from '../natives/boolean.ts'
import type { BigShape } from '../natives/bigint.ts'
import type { DateShape } from '../natives/date.ts'
import type { ReShape } from '../natives/regexp.ts'
import { lazily, nameOf, opIn } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { StrMap } from '../natives/strmap.ts'
import { Str } from '../natives/string.ts'
import { Num } from '../natives/number.ts'
import { Bool } from '../natives/boolean.ts'
import { Big } from '../natives/bigint.ts'
import { Dates } from '../natives/date.ts'
import { Re } from '../natives/regexp.ts'

/**
 * Implement these methods on a custom value to support comparing values for
 * equality.
 */
export interface SetoidMethods<S, A, B = never> {
  /** Checks whether this value equals `that`. */
  equals(that: S): boolean
}

/**
 * Operations for comparing values for equality on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface SetoidDict<S extends Shape> {
  /** Checks whether the two values are equal. */
  equals<A, B>(a: Kind<S, A, B>, b: Kind<S, A, B>): boolean
}

/** Names of the operations in `SetoidDict`. */
export type SetoidKeys = keyof SetoidDict<Shape> & string

/** Native generic types accepted by the `Setoid` constraint. */
export interface SetoidShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `StrMap` values. */
  readonly StrMap: StrMapShape
}

/** Additional scalar types supported by comparing values for equality. */
export interface SetoidPrimitives {
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
  /** The shape used for `RegExp` values. */
  readonly RegExp: ReShape
}

/** A constraint for values that support comparing values for equality. */
export type Setoid<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | SetoidMethods<S, A, B>
  | MatchableIn<SetoidShapes, A, B>

/**
 * Built-in scalar and array types accepted by the generic `equals` overload.
 */
export type BuiltinEq =
  | number
  | string
  | boolean
  | bigint
  | Date
  | RegExp
  | null
  | undefined
  | readonly BuiltinEq[]

type SetoidNatives = SetoidShapes & SetoidPrimitives
type SetoidDicts = <S extends Shape>(s: S) => SetoidDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const setoidNatives: Instances<
  SetoidDicts,
  SetoidNatives
> = lazily<SetoidDicts, SetoidNatives>({
  Array: () => Arr,
  StrMap: () => StrMap,
  String: () => Str,
  Number: () => Num,
  Boolean: () => Bool,
  BigInt: () => Big,
  Date: () => Dates,
  RegExp: () => Re,
})

/**
 * Compares values by content, including nested arrays and records.
 * Treats `NaN` as equal to itself. Supports `equals(a)(b)` and `equals(a, b)`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.equals(2)(2) // => true
 * P.equals([1, [2]])([1, [2]]) // => true
 * P.equals({ a: 1 })({ a: 1 }) // => true
 * P.equals(P.just(1))(P.just(1)) // => true
 * P.equals(P.nothing())(P.just(1)) // => false
 * ```
 */
export function equals<S extends BuiltinEq>(b: S): (a: S) => boolean
/** Compares values by content, including nested arrays and records. */
export function equals<A>(b: readonly A[]): (a: readonly A[]) => boolean
/** Compares values by content, including nested arrays and records. */
export function equals<A>(b: Set<A>): (a: Set<A>) => boolean
/** Compares values by content, including nested arrays and records. */
export function equals<K, V>(b: Map<K, V>): (a: Map<K, V>) => boolean
/** Compares values by content, including nested arrays and records. */
export function equals<A>(
  b: Record<string, A>,
): (a: Record<string, A>) => boolean
/** Compares values by content, including nested arrays and records. */
export function equals<S extends Setoid<S>>(b: S): (a: S) => boolean
/** Compares values by content, including nested arrays and records. */
export function equals<A>(a: A, b: A): boolean
// deno-lint-ignore no-explicit-any
export function equals(a: any, b?: any): any {
  return arguments.length >= 2
    ? sameValue(a, b)
    : (x: unknown) => sameValue(x, a)
}

function sameValue(a: unknown, b: unknown): boolean {
  const isOutermost = pairsInProgress === null
  if (isOutermost) pairsInProgress = new Map()
  try {
    return structuralEquals(a, b)
  } finally {
    if (isOutermost) pairsInProgress = null
  }
}

let pairsInProgress: Map<unknown, Set<unknown>> | null = null

function structuralEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || a === undefined || b === undefined) {
    return false
  }
  if (nameOf(a) !== nameOf(b)) return false

  if (
    typeof a === 'object' && typeof b === 'object' && pairsInProgress !== null
  ) {
    const partners = pairsInProgress.get(a)
    if (partners?.has(b)) return true
    if (partners) partners.add(b)
    else pairsInProgress.set(a, new Set([b]))
  }

  const f = opIn(setoidNatives, a, 'equals')
  if (f !== undefined) return f(a as never, b as never) === true

  const name = nameOf(a)
  if (name === 'Unknown' || name === 'Fn') return false
  throw new TypeError(`equals: ${name} has no Setoid`)
}
