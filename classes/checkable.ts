/**
 * Operations and types for recognizing unknown values and narrowing their types.
 *
 * @module
 */

import type { Shape } from '../core/shape.ts'
import type { MemberOf, RepIn } from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { FnShape } from '../natives/function.ts'
import type { MapShape } from '../natives/map.ts'
import type { SetShape } from '../natives/set.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import type { BigShape } from '../natives/bigint.ts'
import type { BoolShape } from '../natives/boolean.ts'
import type { DateShape } from '../natives/date.ts'
import type { NumShape } from '../natives/number.ts'
import type { ReShape } from '../natives/regexp.ts'
import type { StrShape } from '../natives/string.ts'
import { lazily, nameOf, typeRepIn } from '../core/instance.ts'
import { Arr } from '../natives/array.ts'
import { Fn } from '../natives/function.ts'
import { Maps } from '../natives/map.ts'
import { Sets } from '../natives/set.ts'
import { StrMap } from '../natives/strmap.ts'
import { Big } from '../natives/bigint.ts'
import { Bool } from '../natives/boolean.ts'
import { Dates } from '../natives/date.ts'
import { Num } from '../natives/number.ts'
import { Re } from '../natives/regexp.ts'
import { Str } from '../natives/string.ts'

/** The static `is` operation required from a custom type representative. */
export interface IsSig<A> {
  /** Checks whether an unknown value belongs to this type. */
  is(value: unknown): value is A
}

/** Operations for recognizing values described by `S`. */
export interface CheckableDict<S extends Shape> extends IsSig<MemberOf<S>> {}

/**
 * A type representative accepted by `is`.
 * Use this to type a helper that accepts the type to recognize.
 */
export type CheckableTypeRep<S extends Shape> = RepIn<
  S,
  never,
  CheckableShapes & CheckablePrimitives,
  IsSig<MemberOf<S>>
>

/** Names of the operations in `CheckableDict`. */
export type CheckableKeys = keyof CheckableDict<Shape> & string

/** Native generic types supported by recognizing unknown values. */
export interface CheckableShapes {
  /** The shape used for `Array` values. */
  readonly Array: ArrayShape
  /** The shape used for `Fn` values. */
  readonly Fn: FnShape
  /** The shape used for `Map` values. */
  readonly Map: MapShape
  /** The shape used for `Set` values. */
  readonly Set: SetShape
  /** The shape used for `StrMap` values. */
  readonly StrMap: StrMapShape
}

/** Additional scalar types supported by recognizing unknown values. */
export interface CheckablePrimitives {
  /** The shape used for `BigInt` values. */
  readonly BigInt: BigShape
  /** The shape used for `Boolean` values. */
  readonly Boolean: BoolShape
  /** The shape used for `Date` values. */
  readonly Date: DateShape
  /** The shape used for `Number` values. */
  readonly Number: NumShape
  /** The shape used for `RegExp` values. */
  readonly RegExp: ReShape
  /** The shape used for `String` values. */
  readonly String: StrShape
}

/** A constraint for representatives that recognize values of type `A`. */
export type Checkable<A> = IsSig<A>

type CheckableNatives = CheckableShapes & CheckablePrimitives
type CheckableDicts = <S extends Shape>(s: S) => CheckableDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const checkableNatives: Instances<
  CheckableDicts,
  CheckableNatives
> = lazily<CheckableDicts, CheckableNatives>({
  Array: () => Arr,
  Fn: () => Fn,
  Map: () => Maps,
  Set: () => Sets,
  StrMap: () => StrMap,
  BigInt: () => Big,
  Boolean: () => Bool,
  Date: () => Dates,
  Number: () => Num,
  RegExp: () => Re,
  String: () => Str,
})

/**
 * Checks a value using the supplied type representative.
 * Collection and wrapper checks do not check the types of their contents.
 *
 * @throws {TypeError} If the representative does not support `is`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const values: unknown[] = [1, 'hello', false, 'world']
 * const words: string[] = values.filter(P.is(P.Str))
 * words // => ['hello', 'world']
 *
 * P.is(P.Maybe)(P.just(1)) // => true
 * P.is(P.Maybe)(1) // => false
 * ```
 */
export function is<A>(T: IsSig<A>): (value: unknown) => value is A
/** Checks a value using the supplied type representative. */
export function is<S extends Shape>(
  T: CheckableTypeRep<S>,
): (value: unknown) => value is MemberOf<S>
export function is(T: unknown): (value: unknown) => boolean {
  const f = typeRepIn(checkableNatives, T, 'is')
  if (f === undefined) {
    throw new TypeError(`is: ${nameOf(T)} has no Checkable`)
  }
  return (value: unknown): boolean => f.call(T, value as never) as boolean
}
