import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alt } from '../../src/classes/alt.ts'
import { of } from '../../src/classes/applicative.ts'
import { ap } from '../../src/classes/apply.ts'
import { chain } from '../../src/classes/chain.ts'
import { filter, partition, reject } from '../../src/classes/filterable.ts'
import { foldMap, reduce, size, toArray } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { empty } from '../../src/classes/monoid.ts'
import { lte } from '../../src/classes/ord.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { equals } from '../../src/classes/setoid.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { Concat } from '../../src/data/monoid.ts'
import { pair } from '../../src/data/pair.ts'
import {
  mapDifference,
  mapFromPairs,
  mapKeys,
  mapLookup,
  mapPairs,
  Maps,
  mapValues,
} from '../../src/natives/map.ts'

test ('mapFromPairs: creates a Map from ply pairs. Later entries replace earlier values for a key', () => {
  assert.deepStrictEqual (entries (mapFromPairs ([pair ('a', 1)])), [['a', 1]])
  assert.deepStrictEqual (entries (mapFromPairs<string, number> ([])), [])
  assert.deepStrictEqual (
    entries (mapFromPairs ([pair ('a', 1), pair ('b', 2)])),
    [['a', 1], ['b', 2]],
  )
})

test ('mapFromPairs: on a repeated key the last pair wins', () => {
  assert.deepStrictEqual (entries (mapFromPairs ([pair ('a', 1), pair ('a', 2)])), [['a', 2]])
})

test ('mapLookup: the key is looked up by JS identity, not structurally', () => {
  const key = [1]

  assert.deepStrictEqual (mapLookup (key) (new Map ([[key, 'x']])), just ('x'))
  assert.deepStrictEqual (mapLookup ([1]) (new Map ([[[1], 'x']])), nothing<string> ())
})

test ('Maps: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (Maps['@@type'], 'Map')
  assert.deepStrictEqual (Maps.is (new Map ()), true)
  assert.deepStrictEqual (Maps.is (new Map ([['a', 1]])), true)
  assert.deepStrictEqual (Maps.is (new WeakMap ()), false)
  assert.deepStrictEqual (Maps.is (new Set ()), false)
  assert.deepStrictEqual (Maps.is ({}), false)
  assert.deepStrictEqual (Maps.is (null), false)
})

test ('Maps.show: formats values as readable strings', () => {
  assert.deepStrictEqual (Maps.show (new Map ()), 'Map ([])')
  assert.deepStrictEqual (
    Maps.show (new Map ([['b', 1], ['a', 2]])),
    'Map ([["b", 1], ["a", 2]])',
  )
  assert.deepStrictEqual (
    Maps.show (new Map ([['a', new Set ([1])]])),
    'Map ([["a", Set ([1])]])',
  )
})

test ('Maps.map: transforms values', () => {
  assert.deepStrictEqual (entries (Maps.map (new Map ([['a', 1], ['b', 2]]), increment)), [
    ['a', 2],
    ['b', 3],
  ])
  assert.deepStrictEqual (entries (Maps.map (new Map<string, number> (), increment)), [])
  assert.deepStrictEqual (mapKeys (Maps.map (new Map ([['b', 1], ['a', 2]]), increment)), [
    'b',
    'a',
  ])
})

test ('Maps.filter: keeps values that pass the predicate', () => {
  const m = new Map ([['a', 1], ['b', 2], ['c', 3]])

  assert.deepStrictEqual (entries (Maps.filter (m, even)), [['b', 2]])
  assert.deepStrictEqual (entries (filter (even) (m) as Map<string, number>), [
    ['b', 2],
  ])
  assert.deepStrictEqual (entries (reject (even) (m) as Map<string, number>), [
    ['a', 1],
    ['c', 3],
  ])
  const [yes, no] = partition (even) (m) as [
    Map<string, number>,
    Map<string, number>,
  ]

  assert.deepStrictEqual (entries (yes), [['b', 2]])
  assert.deepStrictEqual (entries (no), [['a', 1], ['c', 3]])
})

test ('Maps.filter: the predicate looks at the value, not at the key', () => {
  const seen: unknown[] = []

  function recordAndKeepValue(v: number) {
    seen.push (v)
    return true
  }

  Maps.filter (new Map ([['a', 1]]), recordAndKeepValue)

  assert.deepStrictEqual (seen, [1])
})

test ('Maps.map: passes only values to Number.parseInt', () => {
  assert.deepStrictEqual (
    entries (Maps.map (new Map ([['a', '1'], ['b', '2']]), Number.parseInt)),
    [['a', 1], ['b', 2]],
  )
})

test ('map through the class does not confuse Map with a plain object', () => {
  assert.deepStrictEqual (
    entries (map (increment) (new Map ([['a', 1]])) as Map<string, number>),
    [['a', 2]],
  )
  assert.deepStrictEqual (map (increment) ({ a: 1 }), { a: 2 })
})

test ('map and filter: preserve the tested object-identity relationship', () => {
  const k1 = [1]
  const k2 = [1]
  const a = new Map ([[k1, 1], [[2], 2]])
  const b = new Map ([[k2, 1], [[2], 2]])

  assertPreservesEquality ('map', a, b, (m) => Maps.map (m, increment))
  assertPreservesEquality ('filter', a, b, (m) => Maps.filter (m, even))
})

test ('mapPairs and mapFromPairs are inverses of each other', () => {
  const m = new Map ([['a', 1], ['b', 2]])

  assert.deepStrictEqual (entries (mapFromPairs (mapPairs (m))), entries (m))
})

test ('Maps: recognizes values and provides the declared operations holds exactly what is lawful', () => {
  assert.deepStrictEqual (opsOf (Maps), ['filter', 'is', 'map', 'show'])

  for (const name of ['concat', 'empty', 'reduce']) {
    assert.deepStrictEqual (name in Maps, false, name)
  }
})

test ('Maps.map: Functor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  const m = new Map ([['a', 1], ['b', 2]])

  assert.deepStrictEqual (entries (Maps.map (m, (v: number) => v)), entries (m))
  assert.deepStrictEqual (
    entries (Maps.map (m, doubleThenIncrement)),
    entries (Maps.map (Maps.map (m, doubleNumber), increment)),
  )
})

test ('Maps.filter: Filterable laws', () => {
  const m = new Map ([['a', 1], ['b', 2], ['c', 3], ['d', 4]])
  const p = even
  const q = (n: number) => n > 2

  assert.deepStrictEqual (
    entries (Maps.filter (Maps.filter (m, q), p)),
    entries (Maps.filter (m, (n: number) => p (n) && q (n))),
  )
  assert.deepStrictEqual (entries (Maps.filter (m, () => true)), entries (m))
  assert.deepStrictEqual (entries (Maps.filter (m, () => false)), [])
})

test ('mapLookup: looks up a key as Just, or returns Nothing if the key is absent', () => {
  assert.deepStrictEqual (mapLookup ('a') (new Map ([['a', 1]])), just (1))
  assert.deepStrictEqual (mapLookup ('b') (new Map ([['a', 1]])), nothing<number> ())
  assert.deepStrictEqual (mapLookup ('a') (new Map<string, number> ()), nothing<number> ())
})

test ('mapLookup: a stored undefined is a Just', () => {
  const m = new Map<string, number | undefined> ([['a', undefined]])

  assert.deepStrictEqual (mapLookup ('a') (m), just (undefined))
})

test ("mapKeys: returns the map's keys in insertion order", () => {
  assert.deepStrictEqual (mapKeys (new Map ([['a', 1]])), ['a'])
  assert.deepStrictEqual (mapKeys (new Map ([['b', 1], ['a', 2]])), ['b', 'a'])
  assert.deepStrictEqual (mapKeys (new Map ()), [])
})

test ("mapValues: returns the map's values in insertion order", () => {
  assert.deepStrictEqual (mapValues (new Map ([['b', 1], ['a', 2]])), [1, 2])
  assert.deepStrictEqual (mapValues (new Map ()), [])
})

test ("mapPairs: returns the map's entries as ply pairs in insertion order", () => {
  const ps = mapPairs (new Map ([['a', 1], ['b', 2]]))

  assert.deepStrictEqual (ps, [pair ('a', 1), pair ('b', 2)])
  assert.deepStrictEqual (ps[0].fst, 'a')
  assert.deepStrictEqual (ps[0].snd, 1)
})

test ('mapDifference: copies entries from the first map whose keys are absent from the second', () => {
  assert.deepStrictEqual (
    entries (mapDifference (
      new Map ([['a', 1], ['b', 2]]),
      new Map ([['a', 0]]),
    )),
    [['b', 2]],
  )
  assert.deepStrictEqual (
    entries (mapDifference (
      new Map ([['a', 1]]),
      new Map ([['a', 999], ['z', 0]]),
    )),
    [],
  )
})

test ('mapDifference: does not touch the operands', () => {
  const a = new Map ([['a', 1], ['b', 2]])
  const b = new Map ([['a', 0]])
  mapDifference (a, b)

  assert.deepStrictEqual (entries (a), [['a', 1], ['b', 2]])
  assert.deepStrictEqual (entries (b), [['a', 0]])
})

test ('Map does not support Monoid: there is no neutral element', () => {
  assert.deepStrictEqual ('empty' in Maps, false)
  assert.throws (
    () => empty (Maps as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('empty: Map has no Monoid'),
  )
})

test ('Map does not support Foldable: there is no fold', () => {
  const m = new Map ([['b', 1], ['a', 2]])

  assert.throws (
    () =>
      reduce ((accumulator: number, v: number) => accumulator + v) (0) (
        m as never,
      ),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Map has no '),
  )
  assert.throws (
    () =>
      reduce ((accumulator: string, v: number) => accumulator + v) ('') (
        m as never,
      ),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Map has no '),
  )
  assert.throws (
    () =>
      reduce ((accumulator: number) => accumulator) (7) (
        new Map<string, number> () as never,
      ),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Map has no '),
  )
})

test ('Map does not support Foldable: the derived operations refuse too', () => {
  const m = new Map ([['b', 1], ['a', 2]])

  assert.throws (
    () => toArray (m as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Map has no '),
  )
  assert.throws (
    () => size (m as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Map has no '),
  )
  assert.throws (
    () => foldMap (Concat) ((n: number) => `${n}`) (m as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Map has no '),
  )
})

test ('Map does not support Apply, Chain, Applicative, Alt and Ord', () => {
  assert.throws (
    () => ap ([increment] as never) (new Map ([['a', 1]]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('ap: Map has no Apply'),
  )
  assert.throws (
    () => chain ((n: number) => [n]) (new Map ([['a', 1]]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('chain: Map has no Chain'),
  )
  assert.throws (
    () => of (Maps as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('of: Map has no Applicative'),
  )
  assert.throws (
    () => alt (new Map () as never) (new Map () as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('alt: Map has no Alt'),
  )
  assert.throws (
    () => lte (new Map () as never) (new Map () as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Ord'),
  )
})

test ('Maps.map: does not touch the input', () => {
  const m = new Map ([['a', 1]])
  Maps.map (m, increment)

  assert.deepStrictEqual (entries (m), [['a', 1]])
})

test ('Maps.map: passes only the entry value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Maps.map (new Map ([['a', 1], ['b', 2]]), recordArguments)

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('Maps.filter: passes only the entry value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  Maps.filter (new Map ([['a', 1], ['b', 2]]), recordArguments)

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('reduce: rejects Map before calling the callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  assert.throws (
    () => reduce (recordArguments) (0) (new Map ([['a', 1], ['b', 2]]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Map has no Foldable'),
  )
  assert.deepStrictEqual (calls, [])
})

test ('counterexample: merging structurally equal maps can expose key identity', () => {
  const k1 = [1]
  const k2 = [1]
  const a = new Map ([[k1, 'x']])
  const b = new Map ([[k2, 'x']])

  assert.deepStrictEqual (sameMap (a, b), true)
  const c = new Map ([[k1, 'y']])
  const union = (x: ReadonlyMap<number[], string>, y: typeof x) =>
    new Map ([...x, ...y])

  assert.deepStrictEqual (union (a, c).size, 1)
  assert.deepStrictEqual (union (b, c).size, 2)
  assert.deepStrictEqual (sameMap (union (a, c), union (b, c)), false)
})

test ('counterexample: folding structurally equal maps can expose insertion order', () => {
  const a = new Map ([['a', 1], ['b', 2]])
  const b = new Map ([['b', 2], ['a', 1]])

  assert.deepStrictEqual (sameMap (a, b), true)
  assert.deepStrictEqual (mapValues (a), [1, 2])
  assert.deepStrictEqual (mapValues (b), [2, 1])
  const fold = (m: ReadonlyMap<string, number>) =>
    mapValues (m).reduce ((accumulator: string, v: number) => accumulator + v, '')

  assert.deepStrictEqual (fold (a), '12')
  assert.deepStrictEqual (fold (b), '21')
  assert.deepStrictEqual (fold (a) === fold (b), false)
})

test ('map and filter: preserve the tested insertion-order relationship', () => {
  const a = new Map ([['a', 1], ['b', 2]])
  const b = new Map ([['b', 2], ['a', 1]])

  assertPreservesEquality ('map', a, b, (m) => Maps.map (m, increment))
  assertPreservesEquality ('filter', a, b, (m) => Maps.filter (m, even))
  assertPreservesEquality (
    'map+filter',
    a,
    b,
    (m) => Maps.filter (Maps.map (m, doubleNumber), even),
  )
})

test ('Map: exposes no concat or empty operations', () => {
  const a = new Map ([['a', 1], ['b', 2]])
  const b = new Map ([['b', 20], ['c', 3]])
  const c = new Map ([['c', 30], ['d', 4]])
  const e = new Map<string, number> ()
  // @ts-expect-error associativity: concat has no overload for Map
  const _associativity = () => concat (concat (a) (b)) (c)
  // @ts-expect-error left identity: concat has no overload for Map
  const _leftIdentity = () => concat (e) (a)
  // @ts-expect-error right identity: concat has no overload for Map
  const _rightIdentity = () => concat (a) (e)
  void _associativity, _leftIdentity, _rightIdentity

  assert.throws (
    () => cat (cat (a, b), c),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Map has no '),
  )
  assert.throws (
    () => cat (e, a),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Map has no '),
  )
  assert.throws (
    () => cat (a, e),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Map has no '),
  )
})

test ('Map does not support Semigroup: there is no merge', () => {
  const a = new Map ([['a', 1], ['b', 2]])
  const b = new Map ([['a', 9], ['c', 3]])
  const c = new Map ([['a', 1]])
  const d = new Map ([['a', 9], ['b', 2]])
  // @ts-expect-error concat has no overload for Map
  const _1 = () => concat (a) (b)
  // @ts-expect-error concat has no overload for Map
  const _2 = () => concat (c) (d)
  void _1, _2

  assert.throws (
    () => cat (a, b),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Map has no '),
  )
  assert.throws (
    () => cat (c, d),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Map has no '),
  )
})

test ('concat over maps rejects without touching the operands', () => {
  const a = new Map ([['a', 1]])
  const b = new Map ([['a', 9], ['b', 2]])
  // @ts-expect-error concat has no overload for Map
  const _call = () => concat (a) (b)
  void _call

  assert.throws (
    () => cat (a, b),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Map has no '),
  )
  assert.deepStrictEqual (entries (a), [['a', 1]])
  assert.deepStrictEqual (entries (b), [['a', 9], ['b', 2]])
})

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const even = (n: number) => n % 2 === 0

const entries = <K, V>(m: ReadonlyMap<K, V>): [K, V][] => [...m]

const opsOf = (dict: object): string[] =>
  Object.keys (dict).filter ((k) => k !== '@@type' && k !== '_shape').sort ()

const cat = (a: unknown, b: unknown): unknown => concat (a as never) (b as never)

const sameMap = <K, V>(a: ReadonlyMap<K, V>, b: ReadonlyMap<K, V>): boolean => {
  if (a.size !== b.size) return false
  const rest = [...b]
  for (const [k1, v1] of a) {
    const i = rest.findIndex (([k2, v2]) =>
      equals (k2 as never) (k1 as never) && equals (v2 as never) (v1 as never),
    )
    if (i < 0) return false
    rest.splice (i, 1)
  }
  return true
}

const assertPreservesEquality = <K, V, B>(
  name: string,
  a: Map<K, V>,
  b: Map<K, V>,
  f: (m: Map<K, V>) => Map<K, B>,
) => {
  assert.deepStrictEqual (
    sameMap (a, b),
    true,
    `${name}: the input collections must be equal`,
  )
  assert.deepStrictEqual (sameMap (f (a), f (b)), true, name)
}
