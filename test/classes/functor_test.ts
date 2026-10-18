import assert from 'node:assert/strict'
import { test } from 'node:test'
import { flip, map, voided, voidRight } from '../../src/classes/functor.ts'
import { left, right } from '../../src/data/either.ts'
import { identity } from '../../src/data/identity.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'

test ('map: doubles each array element', () => {
  const double = (number: number) => number * 2

  assert.deepStrictEqual (map (double) ([1, 2, 3]), [2, 4, 6])
})

test ('map: transforms Just and preserves Nothing', () => {
  const double = (number: number) => number * 2

  assert.deepStrictEqual (map (double) (just (3)), just (6))
  assert.deepStrictEqual (map (double) (nothing<number> ()), nothing<number> ())
})

test ('map: maps over the last parameter', () => {
  assert.deepStrictEqual (map (increment) (pair ('log', 1)), pair ('log', 2))
  assert.deepStrictEqual (
    map (increment) (right<string, number> (1)),
    right<string, number> (2),
  )
  assert.deepStrictEqual (
    map (increment) (left<string, number> ('error')),
    left<string, number> ('error'),
  )
  assert.deepStrictEqual (map (increment) (new Map ([['a', 1]])), new Map ([['a', 2]]))
})

test ('voidRight: replaces each contained value with the supplied value', () => {
  assert.deepStrictEqual (voidRight ('x') ([1, 2, 3]), ['x', 'x', 'x'])
  assert.deepStrictEqual (voidRight ('x') (just (1)), just ('x'))
  assert.deepStrictEqual (voidRight ('x') (nothing<number> ()), nothing<string> ())
})

test ('flip: applies each function in a collection or wrapped value to the same argument', () => {
  assert.deepStrictEqual (flip ([Math.floor, Math.ceil]) (1.5), [1, 2])
  assert.deepStrictEqual (flip ({ floor: Math.floor, ceil: Math.ceil }) (1.5), {
    floor: 1,
    ceil: 2,
  })
})

test ('voided: replaces each contained value with undefined', () => {
  assert.deepStrictEqual (voided ([1, 2]), [undefined, undefined])
  assert.deepStrictEqual (voided (just (1)), just (undefined))
})

test ('map: identity law across supported types', () => {
  for (const [name, wrappedValue] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (map (id) (wrappedValue), wrappedValue, name)
  }
})

test ('map: composition law across supported types', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  for (const [name, wrappedValue] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (
      map (doubleThenIncrement) (wrappedValue),
      map (increment) (map (doubleNumber) (wrappedValue)),
      name,
    )
  }
})

test ('map: both laws on functions', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  const f = (s: string) => s.length
  const probes = ['', 'a', 'abcd']
  const mapped = map (id) (f) as (s: string) => number
  for (const s of probes) assert.deepStrictEqual (mapped (s), f (s))

  const composed = map (doubleThenIncrement) (f) as (
    s: string,
  ) => number
  const twice = map (increment) (map (doubleNumber) (f)) as (s: string) => number
  for (const s of probes) assert.deepStrictEqual (composed (s), twice (s))
})

test ('map: rejects values without Functor', () => {
  assert.throws (
    () => map (increment) ('string' as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Functor'),
  )
})

test ('map: parseInt receives no array index as its radix', () => {
  assert.deepStrictEqual (map (Number.parseInt) (['1', '2', '3']), [1, 2, 3])
})

test ('map: Array passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  map (recordArguments) ([1, 2, 3])

  assert.deepStrictEqual (calls, [[1], [2], [3]])
})

test ('map: Set passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  map (recordArguments) (new Set ([1, 2, 3]))

  assert.deepStrictEqual (calls, [[1], [2], [3]])
})

test ('map: Map passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  map (recordArguments) (new Map ([['a', 1], ['b', 2]]))

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('map: StrMap passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  map (recordArguments) ({ a: 1, b: 2 })

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('map: Just passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  map (recordArguments) (just (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('map: Nothing passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  map (recordArguments) (nothing<number> ())

  assert.deepStrictEqual (calls, [])
})

test ('map: Right passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  map (recordArguments) (right<string, number> (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('map: Left passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  map (recordArguments) (left<string, number> ('error'))

  assert.deepStrictEqual (calls, [])
})

test ('map: Identity passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  map (recordArguments) (identity (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('map: Pair passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  map (recordArguments) (pair ('log', 1))

  assert.deepStrictEqual (calls, [[1]])
})

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a

const samplesByType = {
  Array: [1, 2, 3] as number[],
  Set: new Set ([1, 2, 3]),
  Map: new Map ([['a', 1], ['b', 2]]),
  StrMap: { a: 1, b: 2 },
  'Maybe.Just': just (1),
  'Maybe.Nothing': nothing<number> (),
  'Either.Right': right<string, number> (1),
  'Either.Left': left<string, number> ('error'),
  Identity: identity (1),
  Pair: pair ('log', 1),
}
