import { assertEquals } from '@std/assert'
import * as shape from './shape.ts'
import type {
  AnyKind,
  Fail,
  Kind,
  Matchable,
  Nullary,
  Shape,
  Shaped,
  Slotted,
  Widened,
} from './shape.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { BigShape } from '../natives/bigint.ts'
import type { BoolShape } from '../natives/boolean.ts'
import type { DateShape } from '../natives/date.ts'
import type { FnShape } from '../natives/function.ts'
import type { MapShape } from '../natives/map.ts'
import type { NumShape } from '../natives/number.ts'
import type { ReShape } from '../natives/regexp.ts'
import type { SetShape } from '../natives/set.ts'
import type { StrShape } from '../natives/string.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import { Arr } from '../natives/array.ts'
import { Big } from '../natives/bigint.ts'
import { Bool } from '../natives/boolean.ts'
import { Dates } from '../natives/date.ts'
import { Fn } from '../natives/function.ts'
import { Maps } from '../natives/map.ts'
import { Num } from '../natives/number.ts'
import { Re } from '../natives/regexp.ts'
import { Sets } from '../natives/set.ts'
import { Str } from '../natives/string.ts'
import { StrMap } from '../natives/strmap.ts'

// Examples

Deno.test('shape: exports types without runtime values', () => {
  assertEquals(Object.keys(shape), [])
})

Deno.test('a type representative carries the shape its name declares', () => {
  const array: Kind<ArrayShape, number, never> = [1, 2, 3]
  const set: Kind<SetShape, number, never> = new Set([1])
  const map: Kind<MapShape, number, string> = new Map([['a', 1]])
  const record: Kind<StrMapShape, number, never> = { a: 1 }
  const str: Kind<StrShape, never, never> = 's'
  const num: Kind<NumShape, never, never> = 1
  const flag: Kind<BoolShape, never, never> = true
  const big: Kind<BigShape, never, never> = 1n
  const date: Kind<DateShape, never, never> = new Date(0)
  const pattern: Kind<ReShape, never, never> = /a/

  assertEquals(Arr.is(array), true)
  assertEquals(Sets.is(set), true)
  assertEquals(Maps.is(map), true)
  assertEquals(StrMap.is(record), true)
  assertEquals(Str.is(str), true)
  assertEquals(Num.is(num), true)
  assertEquals(Bool.is(flag), true)
  assertEquals(Big.is(big), true)
  assertEquals(Dates.is(date), true)
  assertEquals(Re.is(pattern), true)
  assertEquals(StrMap.is(array), false)
  assertEquals(Arr.is(record), false)
})

// Laws

Deno.test('the name of a shape coincides with the name of its representative', () => {
  const pairs: ReadonlyArray<readonly [string, string]> = [
    [Arr['@@type'], 'Array'],
    [Sets['@@type'], 'Set'],
    [Maps['@@type'], 'Map'],
    [StrMap['@@type'], 'StrMap'],
    [Fn['@@type'], 'Fn'],
    [Str['@@type'], 'String'],
    [Num['@@type'], 'Number'],
    [Bool['@@type'], 'Boolean'],
    [Big['@@type'], 'BigInt'],
    [Dates['@@type'], 'Date'],
    [Re['@@type'], 'RegExp'],
  ]
  for (const [name, expected] of pairs) assertEquals(name, expected)
})

// Fixtures and compile-time assertions

type Exact<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false

// Each Assert<Exact<Actual, Expected>> checks a type at compile time.
// A changed inference makes this file fail deno check.
type Assert<T extends true> = T

export type _Kind = [
  Assert<Exact<Kind<ArrayShape, number, never>, number[]>>,
  Assert<Exact<Kind<SetShape, number, never>, Set<number>>>,
  Assert<Exact<Kind<StrMapShape, number, never>, Record<string, number>>>,
  Assert<Exact<Kind<MapShape, number, string>, Map<string, number>>>,
  Assert<Exact<Kind<FnShape, number, string>, (i: string) => number>>,
]

export type _Nullary = [
  Assert<Exact<Kind<StrShape, number, boolean>, string>>,
  Assert<Exact<Kind<NumShape, unknown, unknown>, number>>,
  Assert<Exact<Kind<BoolShape, unknown, unknown>, boolean>>,
  Assert<Exact<Kind<BigShape, unknown, unknown>, bigint>>,
  Assert<Exact<Kind<DateShape, unknown, unknown>, Date>>,
  Assert<Exact<Kind<ReShape, unknown, unknown>, RegExp>>,
  Assert<Exact<Kind<Nullary<bigint>, string, number>, bigint>>,
]

export type _Name = [
  Assert<Exact<Shaped<ArrayShape>['@@type'], 'Array'>>,
  Assert<Exact<Shaped<FnShape>['@@type'], 'Fn'>>,
  Assert<Exact<Shaped<MapShape>['@@type'], 'Map'>>,
  Assert<Exact<Shaped<StrShape>['@@type'], 'String'>>,
  Assert<Exact<Shaped<Shape>['@@type'], string>>,
]

interface Nameless extends Shape {
  readonly out: number
}

export type _Nameless = [
  Assert<Exact<Shaped<Nameless>['@@type'], Fail<'Shape must name the type'>>>,
]

export const _namelessType: Shaped<Nameless> = {
  _shape: { name: 'something', slotA: 0, slotB: 0, out: 0 },
  // @ts-expect-error a string does not fit Fail<'Shape must name the type'>
  '@@type': 'something',
}

export type _Reading = [
  Assert<Exact<(ArrayShape & { readonly val: number[] })['readA'], number>>,
  Assert<Exact<(ArrayShape & { readonly val: number[] })['readB'], never>>,
  Assert<Exact<(SetShape & { readonly val: Set<number> })['readA'], number>>,
  Assert<Exact<(SetShape & { readonly val: Set<number> })['readB'], never>>,
  Assert<
    Exact<(MapShape & { readonly val: Map<string, number> })['readA'], number>
  >,
  Assert<
    Exact<(MapShape & { readonly val: Map<string, number> })['readB'], string>
  >,
  Assert<
    Exact<(FnShape & { readonly val: (i: string) => number })['readA'], number>
  >,
  Assert<
    Exact<(FnShape & { readonly val: (i: string) => number })['readB'], string>
  >,
  Assert<
    Exact<
      (StrMapShape & { readonly val: Record<string, number> })['readA'],
      number
    >
  >,
  Assert<
    Exact<
      (StrMapShape & { readonly val: { a: number; b: string } })['readA'],
      number | string
    >
  >,
]

export type _Like = [
  Assert<
    Exact<(ArrayShape & { readonly slotA: number })['like'], readonly number[]>
  >,
  Assert<Exact<(SetShape & { readonly slotA: number })['like'], Set<number>>>,
  Assert<
    Exact<
      (MapShape & { readonly slotA: number; readonly slotB: string })['like'],
      Map<unknown, number>
    >
  >,
  Assert<
    Exact<(FnShape & { readonly slotA: number })['like'], (i: never) => number>
  >,
]

export type _Variance = [
  Assert<Exact<FnShape['slotBVariance'], 'in'>>,
  Assert<Exact<MapShape['slotBVariance'], 'in' | 'out' | 'same' | undefined>>,
  Assert<Exact<ArrayShape['slotBVariance'], 'in' | 'out' | 'same' | undefined>>,
]

export type _Slotted = [
  Assert<
    Exact<Slotted<number, string>['_A'], ((_: never) => number) | undefined>
  >,
  Assert<
    Exact<Slotted<number, string>['_B'], ((_: string) => void) | undefined>
  >,
  Assert<Exact<Slotted<number>['_B'], ((_: never) => void) | undefined>>,
  Assert<
    Exact<AnyKind<number, string>, Shaped<Shape> & Slotted<number, string>>
  >,
]

export type _Matchable = [
  Assert<Exact<keyof Matchable, 'val' | 'like' | 'readA' | 'readB'>>,
]

export type _Widened = [
  Assert<Exact<keyof Widened, 'like'>>,
  Assert<Exact<Matchable extends Widened ? true : false, true>>,
  Assert<Exact<Widened extends Matchable ? true : false, false>>,
]

// @ts-expect-error an array is not a Set
export const _foreign: Kind<SetShape, number, never> = [1, 2, 3]

// @ts-expect-error for Map the key is in slotB, not in slotA
export const _swapped: Kind<MapShape, string, number> = new Map([['a', 1]])
