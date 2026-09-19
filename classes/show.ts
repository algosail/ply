/**
 * Operations and types for formatting values as strings.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type { MatchableIn, SlotAOf, SlotBOf } from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { SetShape } from '../natives/set.ts'
import type { MapShape } from '../natives/map.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import type { StrShape } from '../natives/string.ts'
import type { NumShape } from '../natives/number.ts'
import type { BoolShape } from '../natives/boolean.ts'
import type { BigShape } from '../natives/bigint.ts'
import type { DateShape } from '../natives/date.ts'
import type { ReShape } from '../natives/regexp.ts'
import type { FnShape } from '../natives/function.ts'
import { lazily, opIn } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { Sets } from '../natives/set.ts'
import { Maps } from '../natives/map.ts'
import { StrMap } from '../natives/strmap.ts'
import { Str } from '../natives/string.ts'
import { Num } from '../natives/number.ts'
import { Bool } from '../natives/boolean.ts'
import { Big } from '../natives/bigint.ts'
import { Dates } from '../natives/date.ts'
import { Re } from '../natives/regexp.ts'
import { Fn } from '../natives/function.ts'

/**
 * Implement these methods on a custom value to support formatting values as
 * strings.
 */
export interface ShowMethods<S, A, B = never> {
  /** Returns a readable string representation. */
  show(): string
}

/**
 * Operations for formatting values as strings on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface ShowDict<S extends Shape> {
  /** Returns a readable string representation. */
  show<A, B>(a: Kind<S, A, B>): string
}

/** Names of the operations in `ShowDict`. */
export type ShowKeys = keyof ShowDict<Shape> & string

/** Native generic types accepted by the `Show` constraint. */
export interface ShowShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `Set` values. */
  readonly Set: SetShape
  /** The shape used for `Map` values. */
  readonly Map: MapShape
  /** The shape used for `StrMap` values. */
  readonly StrMap: StrMapShape
}

/** Additional scalar types supported by formatting values as strings. */
export interface ShowPrimitives {
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
  /** The shape used for `Fn` values. */
  readonly Fn: FnShape
}

/** A constraint for values that support formatting values as strings. */
export type Show<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | ShowMethods<S, A, B>
  | MatchableIn<ShowShapes, A, B>

type ShowNatives = ShowShapes & ShowPrimitives
type ShowDicts = <S extends Shape>(s: S) => ShowDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const showNatives: Instances<
  ShowDicts,
  ShowNatives
> = lazily<ShowDicts, ShowNatives>({
  Array: () => Arr,
  Set: () => Sets,
  Map: () => Maps,
  StrMap: () => StrMap,
  String: () => Str,
  Number: () => Num,
  Boolean: () => Bool,
  BigInt: () => Big,
  Date: () => Dates,
  RegExp: () => Re,
  Fn: () => Fn,
})

/**
 * Formats a value as a readable string, including ply's wrapped values.
 * Circular references are displayed as `<Circular>`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.show([1, 'a']) // => '[1, "a"]'
 * P.show({ b: 2, a: 1 }) // => '{"a": 1, "b": 2}'
 * P.show(new Set([1, 2])) // => 'Set ([1, 2])'
 * P.show(P.just(1)) // => 'Just (1)'
 * ```
 */
export function show(x: unknown): string {
  const isOutermost = seen === null
  if (isOutermost) seen = new Set()
  try {
    return render(x)
  } finally {
    if (isOutermost) seen = null
  }
}

let seen: Set<unknown> | null = null

function render(x: unknown): string {
  if (x === null) return 'null'
  if (x === undefined) return 'undefined'
  if (typeof x === 'symbol') return String(x)

  const tracked = typeof x === 'object' || typeof x === 'function'
  if (tracked && seen !== null) {
    if (seen.has(x)) return '<Circular>'
    seen.add(x)
  }
  try {
    const f = opIn(showNatives, x, 'show')
    return f === undefined ? asPlainObject(x) : String(f(x as never))
  } finally {
    if (tracked && seen !== null) seen.delete(x)
  }
}

function asPlainObject(x: unknown): string {
  const o = x as Record<string, unknown>
  const body = Object.keys(o).sort()
    .map((k) => `${JSON.stringify(k)}: ${show(o[k])}`)
    .join(', ')
  return `{${body}}`
}
