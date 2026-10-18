import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alt } from '../../src/classes/alt.ts'
import { map } from '../../src/classes/functor.ts'
import { altAll, plusNatives, zero } from '../../src/classes/plus.ts'
import { Either, right } from '../../src/data/either.ts'
import { Identity, identity } from '../../src/data/identity.ts'
import { just, Maybe, nothing } from '../../src/data/maybe.ts'
import { Pair } from '../../src/data/pair.ts'
import { Arr } from '../../src/natives/array.ts'
import { Maps } from '../../src/natives/map.ts'
import { Sets } from '../../src/natives/set.ts'
import { StrMap } from '../../src/natives/strmap.ts'

test ('altAll: an empty list gives zero across supported types', () => {
  for (const [name, T] of samplesByType) {
    assert.deepStrictEqual (chooseAll (T) ([]), zeroOf (T), name)
  }
  noZero (() => chooseAll (Sets) ([]))
})

test ('altAll: a list of one gives that very one', () => {
  for (const [name, T, , x] of samplesByType) {
    assert.deepStrictEqual (chooseAll (T) ([x]), x, name)
  }
  noZero (() => chooseAll (Sets) ([new Set ([1, 2])]))
})

test ('altAll: folds left to right', () => {
  assert.deepStrictEqual (chooseAll (Arr) ([[1, 2], [3]]), [1, 2, 3])
  assert.deepStrictEqual (chooseAll (Maybe) ([just (1), just (2)]), just (1))
})

test ('zero: the neutrality law across supported types', () => {
  for (const [name, T, , x] of samplesByType) {
    assert.deepStrictEqual (choose (zeroOf (T), x), x, `${name} on the left`)
    assert.deepStrictEqual (choose (x, zeroOf (T)), x, `${name} on the right`)
  }
})

test ('zero: the map annihilation law across supported types', () => {
  for (const [name, T] of samplesByType) {
    assert.deepStrictEqual (map (increment) (zeroOf (T) as never) as unknown, zeroOf (T), name)
  }
})

test ('altAll: a type without a neutral element throws immediately', () => {
  assert.throws (
    () => chooseAll (Either) ([right (1)]),
    (error: unknown) => error instanceof TypeError && error.message.includes ('zero: Either has no Plus'),
  )
  assert.throws (
    () => chooseAll (Identity) ([identity (1)]),
    (error: unknown) => error instanceof TypeError && error.message.includes ('zero: Identity has no Plus'),
  )
})

test ('zero: returns the empty alternative for the chosen type', () => {
  for (const [name, T, empty] of samplesByType) {
    assert.deepStrictEqual (zeroOf (T), empty, name)
  }
  // @ts-expect-error the Set type representative no longer has zero
  const _setCase = () => zero (Sets)
  void _setCase
  noZero (() => zeroOf (Sets))
})

test ('zero: rejects the Set representative', () => {
  const x = new Set ([1, 2])
  const e = new Set<number> ()
  // @ts-expect-error the Set type representative no longer has zero
  const _zero = () => zero (Sets)
  // @ts-expect-error alt has no overload for Set
  const _left = () => alt (x) (e)
  // @ts-expect-error alt has no overload for Set
  const _right = () => alt (e) (x)
  void _zero, _left, _right

  noZero (() => zeroOf (Sets))
  const message = 'alt: Set has no Alt'
  assert.throws (
    () => choose (e, x),
    (error: unknown) => error instanceof TypeError && error.message.includes (message),
    'Set on the left',
  )
  assert.throws (
    () => choose (x, e),
    (error: unknown) => error instanceof TypeError && error.message.includes (message),
    'Set on the right',
  )
})

test ('zero: cannot supply a Set value to map', () => {
  // @ts-expect-error the Set type representative no longer has zero
  const _zero = () => zero (Sets)
  void _zero
  noZero (() => zeroOf (Sets))
  assert.deepStrictEqual (
    map (increment) (new Set<number> () as never) as unknown,
    new Set<number> (),
  )
})

test ('zero: a type without a neutral element throws a descriptive TypeError', () => {
  const foreign: [string, unknown][] = [
    ['Either', Either],
    ['Identity', Identity],
    ['Pair', Pair],
    ['Map', Maps],
    ['Set', Sets],
  ]
  for (const [name, T] of foreign) {
    assert.throws (
      () => zeroOf (T),
      (error: unknown) => error instanceof TypeError && error.message.includes (`${name} has no Plus`),
      name,
    )
  }
  // @ts-expect-error the Set type representative no longer has zero
  const _setCase = () => zero (Sets)
  // @ts-expect-error the Map type representative has no zero
  const _mapCase = () => zero (Maps)
  void _setCase, _mapCase
})

test ('altAll: combines an array of alternatives in order', () => {
  assert.deepStrictEqual (chooseAll (Arr) ([[1, 2], [3], [4]]), [1, 2, 3, 4])
  // @ts-expect-error the Set type representative no longer has zero
  const _setCase = () => altAll (Sets)
  void _setCase
  noZero (() => chooseAll (Sets) ([new Set ([1]), new Set ([2, 1])]))
  assert.deepStrictEqual (chooseAll (Maybe) ([nothing (), just (2), just (3)]), just (2))
  assert.deepStrictEqual (chooseAll (Maybe) ([nothing (), nothing ()]), nothing ())
  assert.deepStrictEqual (chooseAll (StrMap) ([{ a: 1 }, { a: 2, b: 3 }]), { a: 1, b: 3 })
})

test ('plusNatives: lists native zero implementations', () => {
  assert.deepStrictEqual (Object.keys (plusNatives).sort (), ['Array', 'StrMap'])
  for (const [name, dict] of Object.entries (plusNatives)) {
    assert.deepStrictEqual (typeof dict.zero, 'function', name)
    assert.deepStrictEqual (typeof dict.alt, 'function', name)
  }
  // @ts-expect-error plusNatives has no Set cell
  const _cell = () => plusNatives.Set
  void _cell
  assert.deepStrictEqual ('Set' in plusNatives, false)
})

const increment = (n: number) => n + 1

const zeroOf = (T: unknown): unknown => zero (T as never) as unknown

const choose = (wrappedValue: unknown, otherWrappedValue: unknown): unknown =>
  alt (otherWrappedValue as never) (wrappedValue as never) as unknown

const chooseAll = (T: unknown) => (values: readonly unknown[]): unknown =>
  (altAll as (t: never) => (otherValues: readonly never[]) => unknown) (
    T as never,
  ) (
    values as readonly never[],
  )

const samplesByType: [string, unknown, unknown, unknown][] = [
  ['Array', Arr, [], [1, 2]],
  ['StrMap', StrMap, {}, { a: 1 }],
  ['Maybe', Maybe, nothing (), just (1)],
]

const noZero = (f: () => unknown) =>
  assert.throws (
    f,
    (error: unknown) => error instanceof TypeError && error.message.includes ('zero: Set has no Plus'),
  )
