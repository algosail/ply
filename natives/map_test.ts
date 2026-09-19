import { equals } from '../classes/setoid.ts'
import { assertEquals, assertThrows } from '@std/assert'
import {
  mapDifference,
  mapFromPairs,
  mapKeys,
  mapLookup,
  mapPairs,
  Maps,
  mapValues,
} from './map.ts'
import { just, nothing } from '../data/maybe.ts'
import { pair } from '../data/pair.ts'
import { concat } from '../classes/semigroup.ts'
import { empty } from '../classes/monoid.ts'
import { alt } from '../classes/alt.ts'
import { of } from '../classes/applicative.ts'
import { ap } from '../classes/apply.ts'
import { chain } from '../classes/chain.ts'
import { filter, partition, reject } from '../classes/filterable.ts'
import { foldMap, reduce, size, toArray } from '../classes/foldable.ts'
import { map } from '../classes/functor.ts'
import { lte } from '../classes/ord.ts'
import { Concat } from '../data/monoid.ts'

// Examples

Deno.test('mapFromPairs: creates a Map from ply pairs. Later entries replace earlier values for a key', () => {
  assertEquals(entries(mapFromPairs([pair('a', 1)])), [['a', 1]])
  assertEquals(entries(mapFromPairs<string, number>([])), [])
  assertEquals(
    entries(mapFromPairs([pair('a', 1), pair('b', 2)])),
    [['a', 1], ['b', 2]],
  )
})

Deno.test('mapFromPairs: on a repeated key the last pair wins', () => {
  assertEquals(entries(mapFromPairs([pair('a', 1), pair('a', 2)])), [['a', 2]])
})

Deno.test('mapLookup: the key is looked up by JS identity, not structurally', () => {
  const key = [1]

  assertEquals(mapLookup(key)(new Map([[key, 'x']])), just('x'))
  assertEquals(mapLookup([1])(new Map([[[1], 'x']])), nothing<string>())
})

Deno.test('Maps: recognizes values and provides the declared operations', () => {
  assertEquals(Maps['@@type'], 'Map')
  assertEquals(Maps.is(new Map()), true)
  assertEquals(Maps.is(new Map([['a', 1]])), true)
  assertEquals(Maps.is(new WeakMap()), false)
  assertEquals(Maps.is(new Set()), false)
  assertEquals(Maps.is({}), false)
  assertEquals(Maps.is(null), false)
})

Deno.test('Maps.show: formats values as readable strings', () => {
  assertEquals(Maps.show(new Map()), 'Map ([])')
  assertEquals(
    Maps.show(new Map([['b', 1], ['a', 2]])),
    'Map ([["b", 1], ["a", 2]])',
  )
  assertEquals(
    Maps.show(new Map([['a', new Set([1])]])),
    'Map ([["a", Set ([1])]])',
  )
})

Deno.test('Maps.map: transforms values', () => {
  assertEquals(entries(Maps.map(new Map([['a', 1], ['b', 2]]), increment)), [
    ['a', 2],
    ['b', 3],
  ])
  assertEquals(entries(Maps.map(new Map<string, number>(), increment)), [])
  assertEquals(mapKeys(Maps.map(new Map([['b', 1], ['a', 2]]), increment)), [
    'b',
    'a',
  ])
})

Deno.test('Maps.filter: keeps values that pass the predicate', () => {
  const m = new Map([['a', 1], ['b', 2], ['c', 3]])

  assertEquals(entries(Maps.filter(m, even)), [['b', 2]])
  assertEquals(entries(filter(even)(m) as Map<string, number>), [
    ['b', 2],
  ])
  assertEquals(entries(reject(even)(m) as Map<string, number>), [
    ['a', 1],
    ['c', 3],
  ])
  const [yes, no] = partition(even)(m) as [
    Map<string, number>,
    Map<string, number>,
  ]

  assertEquals(entries(yes), [['b', 2]])
  assertEquals(entries(no), [['a', 1], ['c', 3]])
})

Deno.test('Maps.filter: the predicate looks at the value, not at the key', () => {
  const seen: unknown[] = []

  function recordAndKeepValue(v: number) {
    seen.push(v)
    return true
  }

  Maps.filter(new Map([['a', 1]]), recordAndKeepValue)

  assertEquals(seen, [1])
})

Deno.test('Maps.map: passes only values to Number.parseInt', () => {
  assertEquals(
    entries(Maps.map(new Map([['a', '1'], ['b', '2']]), Number.parseInt)),
    [['a', 1], ['b', 2]],
  )
})

Deno.test('map through the class does not confuse Map with a plain object', () => {
  assertEquals(
    entries(map(increment)(new Map([['a', 1]])) as Map<string, number>),
    [['a', 2]],
  )
  assertEquals(map(increment)({ a: 1 }), { a: 2 })
})

Deno.test('map and filter: preserve the tested object-identity relationship', () => {
  const k1 = [1]
  const k2 = [1]
  const a = new Map([[k1, 1], [[2], 2]])
  const b = new Map([[k2, 1], [[2], 2]])

  assertPreservesEquality('map', a, b, (m) => Maps.map(m, increment))
  assertPreservesEquality('filter', a, b, (m) => Maps.filter(m, even))
})

// Laws

Deno.test('mapPairs and mapFromPairs are inverses of each other', () => {
  const m = new Map([['a', 1], ['b', 2]])

  assertEquals(entries(mapFromPairs(mapPairs(m))), entries(m))
})

Deno.test('Maps: recognizes values and provides the declared operations holds exactly what is lawful', () => {
  assertEquals(opsOf(Maps), ['filter', 'is', 'map', 'show'])

  for (const name of ['concat', 'empty', 'reduce']) {
    assertEquals(name in Maps, false, name)
  }
})

Deno.test('Maps.map: Functor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment(doubleNumber(n))
  }

  const m = new Map([['a', 1], ['b', 2]])

  assertEquals(entries(Maps.map(m, (v: number) => v)), entries(m))
  assertEquals(
    entries(Maps.map(m, doubleThenIncrement)),
    entries(Maps.map(Maps.map(m, doubleNumber), increment)),
  )
})

Deno.test('Maps.filter: Filterable laws', () => {
  const m = new Map([['a', 1], ['b', 2], ['c', 3], ['d', 4]])
  const p = even
  const q = (n: number) => n > 2

  assertEquals(
    entries(Maps.filter(Maps.filter(m, q), p)),
    entries(Maps.filter(m, (n: number) => p(n) && q(n))),
  )
  assertEquals(entries(Maps.filter(m, () => true)), entries(m))
  assertEquals(entries(Maps.filter(m, () => false)), [])
})

// Edge cases

Deno.test('mapLookup: looks up a key as Just, or returns Nothing if the key is absent', () => {
  assertEquals(mapLookup('a')(new Map([['a', 1]])), just(1))
  assertEquals(mapLookup('b')(new Map([['a', 1]])), nothing<number>())
  assertEquals(mapLookup('a')(new Map<string, number>()), nothing<number>())
})

Deno.test('mapLookup: a stored undefined is a Just', () => {
  const m = new Map<string, number | undefined>([['a', undefined]])

  assertEquals(mapLookup('a')(m), just(undefined))
})

Deno.test("mapKeys: returns the map's keys in insertion order", () => {
  assertEquals(mapKeys(new Map([['a', 1]])), ['a'])
  assertEquals(mapKeys(new Map([['b', 1], ['a', 2]])), ['b', 'a'])
  assertEquals(mapKeys(new Map()), [])
})

Deno.test("mapValues: returns the map's values in insertion order", () => {
  assertEquals(mapValues(new Map([['b', 1], ['a', 2]])), [1, 2])
  assertEquals(mapValues(new Map()), [])
})

Deno.test("mapPairs: returns the map's entries as ply pairs in insertion order", () => {
  const ps = mapPairs(new Map([['a', 1], ['b', 2]]))

  assertEquals(ps, [pair('a', 1), pair('b', 2)])
  assertEquals(ps[0].fst, 'a')
  assertEquals(ps[0].snd, 1)
})

Deno.test('mapDifference: copies entries from the first map whose keys are absent from the second', () => {
  assertEquals(
    entries(mapDifference(
      new Map([['a', 1], ['b', 2]]),
      new Map([['a', 0]]),
    )),
    [['b', 2]],
  )
  assertEquals(
    entries(mapDifference(
      new Map([['a', 1]]),
      new Map([['a', 999], ['z', 0]]),
    )),
    [],
  )
})

Deno.test('mapDifference: does not touch the operands', () => {
  const a = new Map([['a', 1], ['b', 2]])
  const b = new Map([['a', 0]])
  mapDifference(a, b)

  assertEquals(entries(a), [['a', 1], ['b', 2]])
  assertEquals(entries(b), [['a', 0]])
})

Deno.test('Map does not support Monoid: there is no neutral element', () => {
  // Bypass the type checker to verify the runtime error.
  assertEquals('empty' in Maps, false)
  assertThrows(
    () => empty(Maps as never),
    TypeError,
    'empty: Map has no Monoid',
  )
})

Deno.test('Map does not support Foldable: there is no fold', () => {
  const m = new Map([['b', 1], ['a', 2]])

  assertThrows(
    () =>
      reduce((accumulator: number, v: number) => accumulator + v)(0)(
        m as never,
      ),
    TypeError,
    'reduce: Map has no ',
  )
  assertThrows(
    () =>
      reduce((accumulator: string, v: number) => accumulator + v)('')(
        m as never,
      ),
    TypeError,
    'reduce: Map has no ',
  )
  assertThrows(
    () =>
      reduce((accumulator: number) => accumulator)(7)(
        new Map<string, number>() as never,
      ),
    TypeError,
    'reduce: Map has no ',
  )
})

Deno.test('Map does not support Foldable: the derived operations refuse too', () => {
  const m = new Map([['b', 1], ['a', 2]])

  assertThrows(() => toArray(m as never), TypeError, 'reduce: Map has no ')
  assertThrows(() => size(m as never), TypeError, 'reduce: Map has no ')
  assertThrows(
    () => foldMap(Concat)((n: number) => `${n}`)(m as never),
    TypeError,
    'reduce: Map has no ',
  )
})

Deno.test('Map does not support Apply, Chain, Applicative, Alt and Ord', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => ap([increment] as never)(new Map([['a', 1]]) as never),
    TypeError,
    'ap: Map has no Apply',
  )
  assertThrows(
    () => chain((n: number) => [n])(new Map([['a', 1]]) as never),
    TypeError,
    'chain: Map has no Chain',
  )
  assertThrows(
    () => of(Maps as never)(1),
    TypeError,
    'of: Map has no Applicative',
  )
  assertThrows(
    () => alt(new Map() as never)(new Map() as never),
    TypeError,
    'alt: Map has no Alt',
  )
  assertThrows(
    () => lte(new Map() as never)(new Map() as never),
    TypeError,
    'has no Ord',
  )
})

Deno.test('Maps.map: does not touch the input', () => {
  const m = new Map([['a', 1]])
  Maps.map(m, increment)

  assertEquals(entries(m), [['a', 1]])
})

Deno.test('Maps.map: passes only the entry value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  Maps.map(new Map([['a', 1], ['b', 2]]), recordArguments)

  assertEquals(calls, [[1], [2]])
})

Deno.test('Maps.filter: passes only the entry value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  Maps.filter(new Map([['a', 1], ['b', 2]]), recordArguments)

  assertEquals(calls, [[1], [2]])
})

Deno.test('reduce: rejects Map before calling the callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  assertThrows(
    () => reduce(recordArguments)(0)(new Map([['a', 1], ['b', 2]]) as never),
    TypeError,
    'reduce: Map has no Foldable',
  )
  assertEquals(calls, [])
})

Deno.test('counterexample: merging structurally equal maps can expose key identity', () => {
  const k1 = [1]
  const k2 = [1]
  const a = new Map([[k1, 'x']])
  const b = new Map([[k2, 'x']])

  assertEquals(sameMap(a, b), true)
  const c = new Map([[k1, 'y']])
  const union = (x: ReadonlyMap<number[], string>, y: typeof x) =>
    new Map([...x, ...y])

  assertEquals(union(a, c).size, 1)
  assertEquals(union(b, c).size, 2)
  assertEquals(sameMap(union(a, c), union(b, c)), false)
})

Deno.test('counterexample: folding structurally equal maps can expose insertion order', () => {
  const a = new Map([['a', 1], ['b', 2]])
  const b = new Map([['b', 2], ['a', 1]])

  assertEquals(sameMap(a, b), true)
  assertEquals(mapValues(a), [1, 2])
  assertEquals(mapValues(b), [2, 1])
  const fold = (m: ReadonlyMap<string, number>) =>
    mapValues(m).reduce((accumulator: string, v: number) => accumulator + v, '')

  assertEquals(fold(a), '12')
  assertEquals(fold(b), '21')
  assertEquals(fold(a) === fold(b), false)
})

Deno.test('map and filter: preserve the tested insertion-order relationship', () => {
  const a = new Map([['a', 1], ['b', 2]])
  const b = new Map([['b', 2], ['a', 1]])

  assertPreservesEquality('map', a, b, (m) => Maps.map(m, increment))
  assertPreservesEquality('filter', a, b, (m) => Maps.filter(m, even))
  assertPreservesEquality(
    'map+filter',
    a,
    b,
    (m) => Maps.filter(Maps.map(m, doubleNumber), even),
  )
})

Deno.test('Map: exposes no concat or empty operations', () => {
  const a = new Map([['a', 1], ['b', 2]])
  const b = new Map([['b', 20], ['c', 3]])
  const c = new Map([['c', 30], ['d', 4]])
  const e = new Map<string, number>()
  // @ts-expect-error associativity: concat has no overload for Map
  const _associativity = () => concat(concat(a)(b))(c)
  // @ts-expect-error left identity: concat has no overload for Map
  const _leftIdentity = () => concat(e)(a)
  // @ts-expect-error right identity: concat has no overload for Map
  const _rightIdentity = () => concat(a)(e)
  void _associativity, _leftIdentity, _rightIdentity

  assertThrows(() => cat(cat(a, b), c), TypeError, 'concat: Map has no ')
  assertThrows(() => cat(e, a), TypeError, 'concat: Map has no ')
  assertThrows(() => cat(a, e), TypeError, 'concat: Map has no ')
})

// Type checking

Deno.test('Map does not support Semigroup: there is no merge', () => {
  const a = new Map([['a', 1], ['b', 2]])
  const b = new Map([['a', 9], ['c', 3]])
  const c = new Map([['a', 1]])
  const d = new Map([['a', 9], ['b', 2]])
  // @ts-expect-error concat has no overload for Map
  const _1 = () => concat(a)(b)
  // @ts-expect-error concat has no overload for Map
  const _2 = () => concat(c)(d)
  void _1, _2

  assertThrows(() => cat(a, b), TypeError, 'concat: Map has no ')
  assertThrows(() => cat(c, d), TypeError, 'concat: Map has no ')
})

Deno.test('concat over maps rejects without touching the operands', () => {
  const a = new Map([['a', 1]])
  const b = new Map([['a', 9], ['b', 2]])
  // @ts-expect-error concat has no overload for Map
  const _call = () => concat(a)(b)
  void _call

  assertThrows(() => cat(a, b), TypeError, 'concat: Map has no ')
  assertEquals(entries(a), [['a', 1]])
  assertEquals(entries(b), [['a', 9], ['b', 2]])
})

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const even = (n: number) => n % 2 === 0

const entries = <K, V>(m: ReadonlyMap<K, V>): [K, V][] => [...m]

const opsOf = (dict: object): string[] =>
  Object.keys(dict).filter((k) => k !== '@@type' && k !== '_shape').sort()

const cat = (a: unknown, b: unknown): unknown => concat(a as never)(b as never)

const sameMap = <K, V>(a: ReadonlyMap<K, V>, b: ReadonlyMap<K, V>): boolean => {
  if (a.size !== b.size) return false
  const rest = [...b]
  for (const [k1, v1] of a) {
    const i = rest.findIndex(([k2, v2]) =>
      equals(k2 as never)(k1 as never) && equals(v2 as never)(v1 as never)
    )
    if (i < 0) return false
    rest.splice(i, 1)
  }
  return true
}

const assertPreservesEquality = <K, V, B>(
  name: string,
  a: Map<K, V>,
  b: Map<K, V>,
  f: (m: Map<K, V>) => Map<K, B>,
) => {
  assertEquals(
    sameMap(a, b),
    true,
    `${name}: the input collections must be equal`,
  )
  assertEquals(sameMap(f(a), f(b)), true, name)
}
