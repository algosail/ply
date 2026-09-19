import { assertEquals, assertThrows } from '@std/assert'
import { altAll, plusNatives, zero } from './plus.ts'
import { alt } from './alt.ts'
import { map } from './functor.ts'
import { Arr } from '../natives/array.ts'
import { Sets } from '../natives/set.ts'
import { StrMap } from '../natives/strmap.ts'
import { Maps } from '../natives/map.ts'
import { just, Maybe, nothing } from '../data/maybe.ts'
import { Either, right } from '../data/either.ts'
import { Identity, identity } from '../data/identity.ts'
import { Pair } from '../data/pair.ts'

// Examples

Deno.test('altAll: an empty list gives zero across supported types', () => {
  for (const [name, T] of samplesByType) {
    assertEquals(chooseAll(T)([]), zeroOf(T), name)
  }
  noZero(() => chooseAll(Sets)([]))
})

Deno.test('altAll: a list of one gives that very one', () => {
  for (const [name, T, , x] of samplesByType) {
    assertEquals(chooseAll(T)([x]), x, name)
  }
  noZero(() => chooseAll(Sets)([new Set([1, 2])]))
})

Deno.test('altAll: folds left to right', () => {
  assertEquals(chooseAll(Arr)([[1, 2], [3]]), [1, 2, 3])
  assertEquals(chooseAll(Maybe)([just(1), just(2)]), just(1))
})

// Laws

Deno.test('zero: the neutrality law across supported types', () => {
  for (const [name, T, , x] of samplesByType) {
    assertEquals(choose(zeroOf(T), x), x, `${name} on the left`)
    assertEquals(choose(x, zeroOf(T)), x, `${name} on the right`)
  }
})

Deno.test('zero: the map annihilation law across supported types', () => {
  for (const [name, T] of samplesByType) {
    assertEquals(map(increment)(zeroOf(T) as never) as unknown, zeroOf(T), name)
  }
})

// Edge cases

Deno.test('altAll: a type without a neutral element throws immediately', () => {
  assertThrows(
    () => chooseAll(Either)([right(1)]),
    TypeError,
    'zero: Either has no Plus',
  )
  assertThrows(
    () => chooseAll(Identity)([identity(1)]),
    TypeError,
    'zero: Identity has no Plus',
  )
})

// Type checking

Deno.test('zero: returns the empty alternative for the chosen type', () => {
  for (const [name, T, empty] of samplesByType) {
    assertEquals(zeroOf(T), empty, name)
  }
  // @ts-expect-error the Set type representative no longer has zero
  const _setCase = () => zero(Sets)
  void _setCase
  noZero(() => zeroOf(Sets))
})

Deno.test('zero: rejects the Set representative', () => {
  const x = new Set([1, 2])
  const e = new Set<number>()
  // @ts-expect-error the Set type representative no longer has zero
  const _zero = () => zero(Sets)
  // @ts-expect-error alt has no overload for Set
  const _left = () => alt(x)(e)
  // @ts-expect-error alt has no overload for Set
  const _right = () => alt(e)(x)
  void _zero, _left, _right

  noZero(() => zeroOf(Sets))
  const message = 'alt: Set has no Alt'
  assertThrows(() => choose(e, x), TypeError, message, 'Set on the left')
  assertThrows(() => choose(x, e), TypeError, message, 'Set on the right')
})

Deno.test('zero: cannot supply a Set value to map', () => {
  // @ts-expect-error the Set type representative no longer has zero
  const _zero = () => zero(Sets)
  void _zero
  noZero(() => zeroOf(Sets))
  assertEquals(
    map(increment)(new Set<number>() as never) as unknown,
    new Set<number>(),
  )
})

Deno.test('zero: a type without a neutral element throws a descriptive TypeError', () => {
  const foreign: [string, unknown][] = [
    ['Either', Either],
    ['Identity', Identity],
    ['Pair', Pair],
    ['Map', Maps],
    ['Set', Sets],
  ]
  for (const [name, T] of foreign) {
    assertThrows(() => zeroOf(T), TypeError, `${name} has no Plus`, name)
  }
  // @ts-expect-error the Set type representative no longer has zero
  const _setCase = () => zero(Sets)
  // @ts-expect-error the Map type representative has no zero
  const _mapCase = () => zero(Maps)
  void _setCase, _mapCase
})

Deno.test('altAll: combines an array of alternatives in order', () => {
  assertEquals(chooseAll(Arr)([[1, 2], [3], [4]]), [1, 2, 3, 4])
  // @ts-expect-error the Set type representative no longer has zero
  const _setCase = () => altAll(Sets)
  void _setCase
  noZero(() => chooseAll(Sets)([new Set([1]), new Set([2, 1])]))
  assertEquals(chooseAll(Maybe)([nothing(), just(2), just(3)]), just(2))
  assertEquals(chooseAll(Maybe)([nothing(), nothing()]), nothing())
  assertEquals(chooseAll(StrMap)([{ a: 1 }, { a: 2, b: 3 }]), { a: 1, b: 3 })
})

// Native operation tables

Deno.test('plusNatives: lists native zero implementations', () => {
  assertEquals(Object.keys(plusNatives).sort(), ['Array', 'StrMap'])
  for (const [name, dict] of Object.entries(plusNatives)) {
    assertEquals(typeof dict.zero, 'function', name)
    assertEquals(typeof dict.alt, 'function', name)
  }
  // @ts-expect-error plusNatives has no Set cell
  const _cell = () => plusNatives.Set
  void _cell
  assertEquals('Set' in plusNatives, false)
})

// Shared fixtures

const increment = (n: number) => n + 1

const zeroOf = (T: unknown): unknown => zero(T as never) as unknown

const choose = (wrappedValue: unknown, otherWrappedValue: unknown): unknown =>
  alt(otherWrappedValue as never)(wrappedValue as never) as unknown

const chooseAll = (T: unknown) => (values: readonly unknown[]): unknown =>
  (altAll as (t: never) => (otherValues: readonly never[]) => unknown)(
    T as never,
  )(
    values as readonly never[],
  )

const samplesByType: [string, unknown, unknown, unknown][] = [
  ['Array', Arr, [], [1, 2]],
  ['StrMap', StrMap, {}, { a: 1 }],
  ['Maybe', Maybe, nothing(), just(1)],
]

const noZero = (f: () => unknown) =>
  assertThrows(f, TypeError, 'zero: Set has no Plus')
