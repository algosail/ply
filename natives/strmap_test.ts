import { assertEquals, assertThrows } from '@std/assert'
import {
  fromPairs,
  getPath,
  has,
  hasPath,
  insert,
  keys,
  lookup,
  pairs,
  singleton,
  sortedKeys,
  sortedPairs,
  sortedValues,
  StrMap,
  values,
} from './strmap.ts'
import { just, Maybe, nothing } from '../data/maybe.ts'
import { pair } from '../data/pair.ts'
import { identity } from '../data/identity.ts'
import { concat } from '../classes/semigroup.ts'
import { empty } from '../classes/monoid.ts'
import { alt } from '../classes/alt.ts'
import { zero } from '../classes/plus.ts'
import { of } from '../classes/applicative.ts'
import { ap } from '../classes/apply.ts'
import { chain } from '../classes/chain.ts'
import { filter, reject } from '../classes/filterable.ts'
import { foldMap, size, toArray } from '../classes/foldable.ts'
import { map } from '../classes/functor.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'
import { traverse } from '../classes/traversable.ts'
import { Concat } from '../data/monoid.ts'

// Examples

Deno.test("keys: returns the record's own enumerable string keys in JavaScript key order", () => {
  assertEquals(keys({ b: 1, a: 2 }), ['b', 'a'])
  assertEquals(keys({}), [])
})

Deno.test("values: returns the record's values in the order given by keys", () => {
  assertEquals(values({ b: 1, a: 2 }), [1, 2])
  assertEquals(values({}), [])
})

Deno.test("pairs: returns the record's entries as ply pairs in the order given by keys", () => {
  assertEquals(pairs({ b: 1, a: 2 }), [pair('b', 1), pair('a', 2)])
  assertEquals(pairs({ b: 1, a: 2 })[0].fst, 'b')
  assertEquals(pairs({}), [])
})

Deno.test("sortedKeys: returns the record's own enumerable string keys in ascending string order", () => {
  assertEquals(sortedKeys({ b: 1, a: 2 }), ['a', 'b'])
  assertEquals(sortedKeys({}), [])
})

Deno.test("sortedValues: returns the record's values in ascending key order", () => {
  assertEquals(sortedValues({ b: 1, a: 2 }), [2, 1])
})

Deno.test("sortedPairs: returns the record's entries as ply pairs in ascending key order", () => {
  assertEquals(sortedPairs({ b: 1, a: 2 }), [pair('a', 2), pair('b', 1)])
})

Deno.test('keys: the object reorders numeric keys on its own', () => {
  assertEquals(keys({ 10: 'x', 2: 'y' }), ['2', '10'])
  assertEquals(sortedKeys({ 10: 'x', 2: 'y' }), ['10', '2'])
})

Deno.test('has: checks whether a record has the specified own property', () => {
  assertEquals(has('a')({ a: 1 }), true)
  assertEquals(has('b')({ a: 1 }), false)
  assertEquals(has('a')({ a: undefined }), true)
  assertEquals(has('toString')({}), false)
})

Deno.test('getPath: reads a nested own property as Just, or returns Nothing if the path is missing', () => {
  assertEquals(getPath(['a', 'b'])({ a: { b: 7 } }), just(7))
  assertEquals(getPath(['a'])({ a: 1 }), just(1))
  assertEquals(getPath([])({ a: 1 }), just({ a: 1 }))
  assertEquals(getPath(['x'])({ a: 1 }), nothing())
  assertEquals(getPath(['a', 'x'])({ a: { b: 7 } }), nothing())
})

Deno.test('getPath: the path breaks on anything that is not an object', () => {
  assertEquals(getPath(['a', 'b'])({ a: null }), nothing())
  assertEquals(getPath(['a', 'b'])({ a: undefined }), nothing())
  assertEquals(getPath(['a', '0'])({ a: 'xy' }), nothing())
  assertEquals(getPath(['a', '0'])({ a: [7] }), just(7))
})

Deno.test('getPath: the path goes through own keys only', () => {
  assertEquals(getPath(['toString'])({}), nothing())
})

Deno.test('hasPath: checks whether every step of an own-property path exists', () => {
  assertEquals(hasPath(['a', 'b'])({ a: { b: 7 } }), true)
  assertEquals(hasPath(['a', 'x'])({ a: { b: 7 } }), false)
  assertEquals(hasPath([])({ a: 1 }), true)
  assertEquals(hasPath(['a'])({ a: undefined }), true)
})

Deno.test('singleton: creates a record containing one key and value', () => {
  assertEquals(singleton('a', 1), { a: 1 })
  assertEquals(keys(singleton('a', 1)), ['a'])
})

Deno.test('fromPairs: creates a record from ply pairs. The last value for each key wins', () => {
  assertEquals(fromPairs([pair('a', 1)]), { a: 1 })
  assertEquals(fromPairs([]), {})
  assertEquals(fromPairs([pair('a', 1), pair('b', 2)]), { a: 1, b: 2 })
})

Deno.test('fromPairs: on a repeated key the last pair wins', () => {
  assertEquals(fromPairs([pair('a', 1), pair('a', 2)]), { a: 2 })
})

Deno.test('insert: copies a record with a key added or replaced', () => {
  assertEquals(insert('b')(2)({ a: 1 }), { a: 1, b: 2 })
  assertEquals(insert('a')(2)({ a: 1 }), { a: 2 })
})

Deno.test('StrMap: recognizes values and provides the declared operations', () => {
  assertEquals(StrMap['@@type'], 'StrMap')
  assertEquals(StrMap.is({}), true)
  assertEquals(StrMap.is({ a: 1 }), true)
  assertEquals(StrMap.is(Object.create(null)), true)
  assertEquals(StrMap.is([]), false)
  assertEquals(StrMap.is(new Map()), false)
  assertEquals(StrMap.is(new Date()), false)
  assertEquals(StrMap.is(null), false)
  assertEquals(StrMap.is('a string'), false)
})

Deno.test('StrMap.is: ply values do not count as a dictionary', () => {
  assertEquals(StrMap.is(just(1)), false)
  assertEquals(StrMap.is(nothing()), false)
  assertEquals(StrMap.is(identity(1)), false)
  assertEquals(StrMap.is(pair('a', 1)), false)
})

Deno.test('StrMap.empty and StrMap.zero', () => {
  assertEquals(StrMap.empty<number>(), {})
  assertEquals(StrMap.zero<number>(), {})
  assertEquals(empty(StrMap) as Record<string, number>, {})
  assertEquals(zero(StrMap) as Record<string, number>, {})
})

Deno.test('StrMap.concat: on a key conflict the left one wins', () => {
  assertEquals(StrMap.concat({ a: 1, b: 2 }, { a: 9, c: 3 }), {
    a: 1,
    b: 2,
    c: 3,
  })
  assertEquals(concat({ a: 1 } as Record<string, number>)({ a: 9, b: 2 }), {
    a: 1,
    b: 2,
  })
})

Deno.test('StrMap.alt: the same bias as concat', () => {
  assertEquals(StrMap.alt({ a: 1, b: 2 }, { a: 9, c: 3 }), {
    a: 1,
    b: 2,
    c: 3,
  })
  assertEquals(
    alt({ a: 9, c: 3 } as Record<string, number>)({ a: 1, b: 2 }),
    { a: 1, b: 2, c: 3 },
  )
})

Deno.test('StrMap.equals: compares values by content', () => {
  assertEquals(StrMap.equals({ a: 1 }, { a: 1 }), true)
  assertEquals(StrMap.equals({ a: 1 }, { a: 2 }), false)
  assertEquals(StrMap.equals({ a: 1 }, { b: 1 }), false)
  assertEquals(StrMap.equals({ a: 1 }, { a: 1, b: 2 }), false)
  assertEquals(StrMap.equals({}, {}), true)
})

Deno.test('StrMap.equals: the values are compared structurally', () => {
  assertEquals(StrMap.equals({ a: [1, 2] }, { a: [1, 2] }), true)
  assertEquals(StrMap.equals({ a: just(1) }, { a: just(1) }), true)
  assertEquals(StrMap.equals({ a: just(1) }, { a: nothing() }), false)
  assertEquals(StrMap.equals({ a: { b: 1 } }, { a: { b: 1 } }), true)
})

Deno.test('StrMap.show: formats values as readable strings', () => {
  assertEquals(StrMap.show({}), '{}')
  assertEquals(StrMap.show({ b: 2, a: 1 }), '{"a": 1, "b": 2}')
  assertEquals(StrMap.show({ a: 1, b: 2 }), StrMap.show({ b: 2, a: 1 }))
  assertEquals(StrMap.show({ 'b c': 1 }), '{"b c": 1}')
  assertEquals(StrMap.show({ a: 'x' }), '{"a": "x"}')
  assertEquals(StrMap.show({ a: just(1) }), '{"a": Just (1)}')
})

Deno.test('StrMap.map: transforms values', () => {
  assertEquals(StrMap.map({ a: 1, b: 2 }, increment), { a: 2, b: 3 })
  assertEquals(StrMap.map({}, increment), {})
  assertEquals(keys(StrMap.map({ b: 1, a: 2 }, increment)), ['b', 'a'])
})

Deno.test('StrMap.filter: keeps values that pass the predicate', () => {
  const m = { a: 1, b: 2, c: 3, d: 4 }

  assertEquals(StrMap.filter(m, even), { b: 2, d: 4 })
  assertEquals(filter(even)(m), { b: 2, d: 4 })
  assertEquals(reject(even)(m), { a: 1, c: 3 })
  assertEquals(StrMap.filter(m, () => true), m)
  assertEquals(StrMap.filter(m, () => false), {})
})

Deno.test('StrMap.reduce: the fold goes over the sorted keys', () => {
  assertEquals(
    StrMap.reduce(
      { b: 1, a: 2 },
      (accumulator: string, a: number) => accumulator + a,
      '',
    ),
    '21',
  )
  assertEquals(
    StrMap.reduce(
      { a: 2, b: 1 },
      (accumulator: string, a: number) => accumulator + a,
      '',
    ),
    '21',
  )
  assertEquals(StrMap.reduce({}, (accumulator: number) => accumulator, 7), 7)
})

Deno.test('StrMap as a Foldable', () => {
  assertEquals(toArray({ b: 1, a: 2 }), sortedValues({ b: 1, a: 2 }))
  assertEquals(toArray({ b: 1, a: 2 }), [2, 1])
  assertEquals(size({ b: 1, a: 2 }), 2)
  assertEquals(
    foldMap(Concat)((n: number) => `${n}`)({ b: 1, a: 2 }),
    foldMap(Concat)((n: number) => `${n}`)({ a: 2, b: 1 }),
  )
})

Deno.test('StrMap.map: passes only values to Number.parseInt', () => {
  assertEquals(StrMap.map({ a: '1', b: '2' }, Number.parseInt), { a: 1, b: 2 })
})

Deno.test('map through the class does not confuse a dictionary with an array', () => {
  assertEquals(map(increment)({ a: 1 }), { a: 2 })
  assertEquals(map(increment)([1]), [2])
})

// Laws

Deno.test('fromPairs and pairs are inverse to each other', () => {
  const m = { a: 1, b: 2 }

  assertEquals(fromPairs(pairs(m)), m)
})

Deno.test('StrMap.concat: the Semigroup and Monoid laws', () => {
  const a = { a: 1, b: 2 }
  const b = { b: 20, c: 3 }
  const c = { c: 30, d: 4 }

  assertEquals(
    StrMap.concat(StrMap.concat(a, b), c),
    StrMap.concat(a, StrMap.concat(b, c)),
  )
  const e = StrMap.empty<number>()

  assertEquals(StrMap.concat(e, a), a)
  assertEquals(StrMap.concat(a, e), a)
})

Deno.test('StrMap.alt: the Alt and Plus laws', () => {
  const a = { a: 1, b: 2 }
  const b = { b: 20, c: 3 }
  const c = { c: 30, d: 4 }

  assertEquals(
    StrMap.alt(StrMap.alt(a, b), c),
    StrMap.alt(a, StrMap.alt(b, c)),
  )
  assertEquals(
    StrMap.map(StrMap.alt(a, b), doubleNumber),
    StrMap.alt(StrMap.map(a, doubleNumber), StrMap.map(b, doubleNumber)),
  )
  const z = StrMap.zero<number>()

  assertEquals(StrMap.alt(z, a), a)
  assertEquals(StrMap.alt(a, z), a)
  assertEquals(StrMap.map(z, increment), {})
})

Deno.test('StrMap.equals: the Setoid laws', () => {
  const samples: Record<string, number>[] = [
    {},
    { a: 1 },
    { a: 1, b: 2 },
    { b: 2, a: 1 },
  ]
  for (const a of samples) assertEquals(StrMap.equals(a, a), true)
  for (const a of samples) {
    for (const b of samples) {
      assertEquals(StrMap.equals(a, b), StrMap.equals(b, a))
      for (const c of samples) {
        if (StrMap.equals(a, b) && StrMap.equals(b, c)) {
          assertEquals(StrMap.equals(a, c), true)
        }
      }
    }
  }
})

Deno.test('StrMap.map: the Functor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment(doubleNumber(n))
  }

  const m = { a: 1, b: 2 }

  assertEquals(StrMap.map(m, (n: number) => n), m)
  assertEquals(
    StrMap.map(m, doubleThenIncrement),
    StrMap.map(StrMap.map(m, doubleNumber), increment),
  )
})

Deno.test('StrMap.filter: the Filterable laws', () => {
  const m = { a: 1, b: 2, c: 3, d: 4 }
  const p = even
  const q = (n: number) => n > 2

  assertEquals(
    StrMap.filter(StrMap.filter(m, q), p),
    StrMap.filter(m, (n: number) => p(n) && q(n)),
  )
})

// Edge cases

Deno.test('sorted* does not depend on the insertion order', () => {
  assertEquals(sortedKeys({ b: 1, a: 2 }), sortedKeys({ a: 2, b: 1 }))
  assertEquals(sortedValues({ b: 1, a: 2 }), sortedValues({ a: 2, b: 1 }))
  assertEquals(sortedPairs({ b: 1, a: 2 }), sortedPairs({ a: 2, b: 1 }))
})

Deno.test('lookup: reads an own property as Just, or returns Nothing if it is absent', () => {
  assertEquals(lookup('a')({ a: 1 }), just(1))
  assertEquals(lookup('b')({ a: 1 }), nothing<number>())
  assertEquals(lookup('a')({} as Record<string, number>), nothing<number>())
})

Deno.test('lookup: own keys only, but undefined among them', () => {
  assertEquals(lookup('toString')({} as Record<string, number>), nothing())
  assertEquals(lookup('a')({ a: undefined }), just(undefined))
})

Deno.test('insert: does not touch its input', () => {
  const m = { a: 1 }
  insert('b')(2)(m)

  assertEquals(m, { a: 1 })
})

Deno.test('StrMap.is: a record with an @@type key stops being a dictionary', () => {
  // Bypass the type checker to verify the runtime error.
  const rec = { '@@type': 'Ivan', age: 30 }

  assertEquals(StrMap.is(rec), false)
  assertThrows(
    () => equals(rec)({ '@@type': 'Ivan', age: 30 }),
    TypeError,
    'Ivan has no Setoid',
  )
  assertThrows(
    () => map((x: unknown) => x)(rec as never),
    TypeError,
    'map: Ivan has no Functor',
  )
  assertEquals(show(rec), '{"@@type": "Ivan", "age": 30}')
})

Deno.test('StrMap.concat: does not touch the operands', () => {
  const a = { a: 1 }
  const b = { a: 9, b: 2 }
  StrMap.concat(a, b)

  assertEquals(a, { a: 1 })
  assertEquals(b, { a: 9, b: 2 })
})

Deno.test('StrMap.equals: the insertion order has no effect', () => {
  assertEquals(StrMap.equals({ b: 2, a: 1 }, { a: 1, b: 2 }), true)
})

Deno.test('StrMap.map: does not touch its input', () => {
  const m = { a: 1 }
  StrMap.map(m, increment)

  assertEquals(m, { a: 1 })
})

Deno.test('StrMap.map: passes only the field value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  StrMap.map({ a: 1, b: 2 }, recordArguments)

  assertEquals(calls, [[1], [2]])
})

Deno.test('StrMap.filter: passes only the field value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  StrMap.filter({ a: 1, b: 2 }, recordArguments)

  assertEquals(calls, [[1], [2]])
})

Deno.test('StrMap.reduce: passes only accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  StrMap.reduce({ a: 1, b: 2 }, recordArguments, 0)

  assertEquals(calls, [[0, 1], [0, 2]])
})

Deno.test('StrMap inhabits neither Apply, Chain, Applicative nor Traversable', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => ap([increment] as never)({ a: 1 } as never),
    TypeError,
    'ap: StrMap has no Apply',
  )
  assertThrows(
    () => chain((n: number) => [n])({ a: 1 } as never),
    TypeError,
    'chain: StrMap has no Chain',
  )
  assertThrows(
    () => of(StrMap as never)(1),
    TypeError,
    'of: StrMap has no Applicative',
  )
  assertThrows(
    () => traverse(Maybe as never)((n: number) => just(n))({ a: 1 } as never),
    TypeError,
    'traverse: StrMap has no Traversable',
  )
})

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const even = (n: number) => n % 2 === 0
