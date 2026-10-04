import { assertEquals, assertThrows } from '@std/assert'
import * as P from '@algosail/ply'

import type { Checkable } from '../typeclasses.ts'
import type { ArrayShape, Shape, StrShape } from '../shapes.ts'
import type { MemberOf } from '../core/kind.ts'
import type {
  CheckableDict,
  CheckableKeys,
  CheckableTypeRep,
  IsSig,
} from './checkable.ts'

// Shared fixtures

const StringType: CheckableTypeRep<StrShape> = {
  '@@type': 'String',
  _shape: P.Str._shape,
}

const ArrayType: CheckableTypeRep<ArrayShape> = {
  '@@type': 'Array',
  _shape: P.Arr._shape,
}

function filterChecked<S extends Shape>(
  T: CheckableTypeRep<S>,
  values: readonly unknown[],
): MemberOf<S>[] {
  return values.filter(P.is(T))
}

// Examples

Deno.test('is: checks native values with their representatives', () => {
  assertEquals(P.is(P.Str)('hello'), true)
  assertEquals(P.is(P.Str)(42), false)
  assertEquals(P.is(P.Num)(NaN), true)
  assertEquals(P.is(P.Bool)(false), true)
  assertEquals(P.is(P.Arr)([1, 'two']), true)
  assertEquals(P.is(P.Arr)({ length: 2 }), false)
  assertEquals(P.is(P.Str)(null), false)
  assertEquals(P.is(P.Str)(undefined), false)
})

Deno.test('is: recognizes dates, regular expressions, and bigints', () => {
  assertEquals(P.is(P.Dates)(new Date(NaN)), true)
  assertEquals(P.is(P.Dates)(0), false)
  assertEquals(P.is(P.Re)(/hello/), true)
  assertEquals(P.is(P.Re)('hello'), false)
  assertEquals(P.is(P.Big)(1n), true)
  assertEquals(P.is(P.Big)(1), false)
})

Deno.test('is: recognizes functions and native collections', () => {
  assertEquals(P.is(P.Fn)(P.I), true)
  assertEquals(P.is(P.Fn)({}), false)
  assertEquals(P.is(P.Maps)(new Map([['key', 1]])), true)
  assertEquals(P.is(P.Maps)({ key: 1 }), false)
  assertEquals(P.is(P.Sets)(new Set([1])), true)
  assertEquals(P.is(P.Sets)([1]), false)
  assertEquals(P.is(P.StrMap)({ key: 1 }), true)
  assertEquals(P.is(P.StrMap)(Object.create(null)), true)
  assertEquals(P.is(P.StrMap)(new P.Identity(1)), false)
})

Deno.test('is: finds native checks by the representative name and shape', () => {
  assertEquals(P.is(StringType)('hello'), true)
  assertEquals(P.is(StringType)(42), false)
  assertEquals(P.is(ArrayType)([1, 'two']), true)
  assertEquals(P.is(ArrayType)({ length: 2 }), false)
})

Deno.test('is: narrows unknown values when filtering', () => {
  const values: unknown[] = [1, 'hello', false, 'world']
  const words = values.filter(P.is(P.Str))
  assertEquals(words.map((word) => word.toUpperCase()), ['HELLO', 'WORLD'])
})

Deno.test('is: shaped representatives work in generic helpers', () => {
  const values: unknown[] = ['hello', [1], P.just(2), P.nothing(), 42]

  assertEquals(filterChecked(StringType, values), ['hello'])
  assertEquals(filterChecked(ArrayType, values), [[1]])
  assertEquals(filterChecked(P.Maybe, values), [P.just(2), P.nothing()])
})

Deno.test('is: recognizes both branches without checking their contents', () => {
  assertEquals(P.is(P.Maybe)(P.just(1)), true)
  assertEquals(P.is(P.Maybe)(P.just('hello')), true)
  assertEquals(P.is(P.Maybe)(P.nothing()), true)
  assertEquals(P.is(P.Either)(P.left('error')), true)
  assertEquals(P.is(P.Either)(P.right(1)), true)
  assertEquals(P.is(P.Maybe)(P.right(1)), false)
  assertEquals(P.is(P.Either)(P.just(1)), false)
})

Deno.test('is: recognizes identity, pair, and callable data types', () => {
  assertEquals(P.is(P.Identity)(P.identity(1)), true)
  assertEquals(P.is(P.Pair)(P.pair('key', 1)), true)
  assertEquals(P.is(P.Predicate)(P.predicate(Number.isFinite)), true)
  assertEquals(P.is(P.Equivalence)(P.equivalence(Object.is)), true)
  assertEquals(P.is(P.Identity)(P.just(1)), false)
  assertEquals(P.is(P.Pair)(['key', 1]), false)
  assertEquals(P.is(P.Predicate)(Number.isFinite), false)
  assertEquals(P.is(P.Equivalence)(Object.is), false)
})

Deno.test('is: a copied tag does not make a value a ply data type', () => {
  assertEquals(
    P.is(P.Maybe)({ '@@type': 'Maybe', tag: 'just', value: 1 }),
    false,
  )
  assertEquals(P.is(P.Identity)({ '@@type': 'Identity', value: 1 }), false)
})

Deno.test('is: custom representatives can check a narrower domain', () => {
  const Positive: Checkable<number> = {
    is(value: unknown): value is number {
      return typeof value === 'number' && value > 0
    },
  }

  assertEquals([null, -1, 0, 2, '3'].filter(P.is(Positive)), [2])
})

Deno.test('is: custom shaped representatives provide their own check', () => {
  interface PositiveShape extends Shape<'Positive'> {
    readonly out: number
  }

  const Positive: CheckableTypeRep<PositiveShape> = {
    '@@type': 'Positive',
    _shape: undefined as unknown as PositiveShape,
    is(value: unknown): value is number {
      return typeof value === 'number' && value > 0
    },
  }

  assertEquals(filterChecked(Positive, [null, -1, 0, 2, '3']), [2])
})

Deno.test('is: an own check takes precedence over the native implementation', () => {
  const NonEmpty: CheckableTypeRep<StrShape> & IsSig<string> = {
    ...StringType,
    is(value: unknown): value is string {
      return typeof value === 'string' && value.length > 0
    },
  }

  assertEquals(['', 'hello', 42].filter(P.is(NonEmpty)), ['hello'])
})

Deno.test('is: calls the representative method with its receiver and only the value', () => {
  const calls: unknown[][] = []
  const Selected = {
    value: 'selected',
    is(value: unknown): value is string {
      calls.push(Array.from(arguments))
      return value === this.value
    },
  }

  assertEquals(['selected', 'other'].filter(P.is(Selected)), ['selected'])
  assertEquals(calls, [['selected'], ['other']])
})

// Edge cases

Deno.test('is: a non-callable field falls back to the native check', () => {
  const StringWithMissingCheck = { ...StringType, is: null }

  assertEquals(P.is(StringWithMissingCheck)('hello'), true)
  assertEquals(P.is(StringWithMissingCheck)(42), false)
})

Deno.test('is: a missing check throws when selecting the representative', () => {
  const Missing = { '@@type': 'Missing' }
  const Invalid = { '@@type': 'Invalid', is: true }

  assertThrows(
    () => P.is(Missing as never),
    TypeError,
    'is: Missing has no Checkable',
  )
  assertThrows(
    () => P.is(Invalid as never),
    TypeError,
    'is: Invalid has no Checkable',
  )
})

Deno.test('is: null and undefined representatives produce descriptive errors', () => {
  assertThrows(
    () => P.is(null as never),
    TypeError,
    'is: Null has no Checkable',
  )
  assertThrows(
    () => P.is(undefined as never),
    TypeError,
    'is: Undefined has no Checkable',
  )
})

// Compile-time guarantees

type Exact<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false
type Assert<T extends true> = T

const stringGuard = P.is(P.Str)
const arrayGuard = P.is(P.Arr)
const maybeGuard = P.is(P.Maybe)
const predicateGuard = P.is(P.Predicate)
const equivalenceGuard = P.is(P.Equivalence)
const stringGuardByShape = P.is(StringType)
const arrayGuardByShape = P.is(ArrayType)
const stringsByShape = filterChecked(StringType, [])
const predicatesByShape = filterChecked(P.Predicate, [])
const equivalencesByShape = filterChecked(P.Equivalence, [])

export type _CheckableContracts = [
  Assert<Exact<CheckableKeys, 'is'>>,
  Assert<Exact<Checkable<string>, IsSig<string>>>,
  Assert<Exact<CheckableDict<ArrayShape>, IsSig<readonly unknown[]>>>,
]

export type _InferredGuards = [
  Assert<Exact<typeof stringGuard, (value: unknown) => value is string>>,
  Assert<
    Exact<typeof arrayGuard, (value: unknown) => value is readonly unknown[]>
  >,
  Assert<
    Exact<typeof maybeGuard, (value: unknown) => value is P.Maybe<unknown>>
  >,
  Assert<
    Exact<
      typeof predicateGuard,
      (value: unknown) => value is P.Predicate<unknown>
    >
  >,
  Assert<
    Exact<
      typeof equivalenceGuard,
      (value: unknown) => value is P.Equivalence<unknown>
    >
  >,
  Assert<Exact<typeof stringGuardByShape, (value: unknown) => value is string>>,
  Assert<
    Exact<
      typeof arrayGuardByShape,
      (value: unknown) => value is readonly unknown[]
    >
  >,
  Assert<Exact<typeof stringsByShape, string[]>>,
  Assert<Exact<typeof predicatesByShape, P.Predicate<never>[]>>,
  Assert<Exact<typeof equivalencesByShape, P.Equivalence<never>[]>>,
]

function requiresGuard(): void {
  // @ts-expect-error A representative must provide an is method.
  P.is({})
  // @ts-expect-error A boolean result alone cannot narrow the value's type.
  P.is({ is: (_value: unknown): boolean => true })
  // @ts-expect-error Checking the wrapper does not prove its contents are numbers.
  const numbers: (value: unknown) => value is P.Maybe<number> = P.is(P.Maybe)
  void numbers

  interface MissingShape extends Shape<'Missing'> {
    readonly out: number
  }

  // @ts-expect-error Custom shaped representatives must provide a type guard.
  const Missing: CheckableTypeRep<MissingShape> = {
    '@@type': 'Missing',
    _shape: undefined as unknown as MissingShape,
  }
  void Missing

  const predicates = filterChecked(P.Predicate, [])
  // @ts-expect-error Recognizing a predicate does not reveal its input type.
  predicates[0]('unchecked')

  const equivalences = filterChecked(P.Equivalence, [])
  // @ts-expect-error Recognizing an equivalence does not reveal its input type.
  equivalences[0]('unchecked', 'unchecked')
}
void requiresGuard
