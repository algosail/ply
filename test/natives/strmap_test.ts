import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alt } from '../../src/classes/alt.ts'
import { of } from '../../src/classes/applicative.ts'
import { ap } from '../../src/classes/apply.ts'
import { chain } from '../../src/classes/chain.ts'
import { filter, reject } from '../../src/classes/filterable.ts'
import { foldMap, size, toArray } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { empty } from '../../src/classes/monoid.ts'
import { zero } from '../../src/classes/plus.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { equals } from '../../src/classes/setoid.ts'
import { show } from '../../src/classes/show.ts'
import { traverse } from '../../src/classes/traversable.ts'
import { identity } from '../../src/data/identity.ts'
import { just, Maybe, nothing } from '../../src/data/maybe.ts'
import { Concat } from '../../src/data/monoid.ts'
import { pair } from '../../src/data/pair.ts'
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
} from '../../src/natives/strmap.ts'

test ("keys: returns the record's own enumerable string keys in JavaScript key order", () => {
  assert.deepStrictEqual (keys ({ b: 1, a: 2 }), ['b', 'a'])
  assert.deepStrictEqual (keys ({}), [])
})

test ("values: returns the record's values in the order given by keys", () => {
  assert.deepStrictEqual (values ({ b: 1, a: 2 }), [1, 2])
  assert.deepStrictEqual (values ({}), [])
})

test ("pairs: returns the record's entries as ply pairs in the order given by keys", () => {
  assert.deepStrictEqual (pairs ({ b: 1, a: 2 }), [pair ('b', 1), pair ('a', 2)])
  assert.deepStrictEqual (pairs ({ b: 1, a: 2 })[0].fst, 'b')
  assert.deepStrictEqual (pairs ({}), [])
})

test ("sortedKeys: returns the record's own enumerable string keys in ascending string order", () => {
  assert.deepStrictEqual (sortedKeys ({ b: 1, a: 2 }), ['a', 'b'])
  assert.deepStrictEqual (sortedKeys ({}), [])
})

test ("sortedValues: returns the record's values in ascending key order", () => {
  assert.deepStrictEqual (sortedValues ({ b: 1, a: 2 }), [2, 1])
})

test ("sortedPairs: returns the record's entries as ply pairs in ascending key order", () => {
  assert.deepStrictEqual (sortedPairs ({ b: 1, a: 2 }), [pair ('a', 2), pair ('b', 1)])
})

test ('keys: the object reorders numeric keys on its own', () => {
  assert.deepStrictEqual (keys ({ 10: 'x', 2: 'y' }), ['2', '10'])
  assert.deepStrictEqual (sortedKeys ({ 10: 'x', 2: 'y' }), ['10', '2'])
})

test ('has: checks whether a record has the specified own property', () => {
  assert.deepStrictEqual (has ('a') ({ a: 1 }), true)
  assert.deepStrictEqual (has ('b') ({ a: 1 }), false)
  assert.deepStrictEqual (has ('a') ({ a: undefined }), true)
  assert.deepStrictEqual (has ('toString') ({}), false)
})

test ('getPath: reads a nested own property as Just, or returns Nothing if the path is missing', () => {
  assert.deepStrictEqual (getPath (['a', 'b']) ({ a: { b: 7 } }), just (7))
  assert.deepStrictEqual (getPath (['a']) ({ a: 1 }), just (1))
  assert.deepStrictEqual (getPath ([]) ({ a: 1 }), just ({ a: 1 }))
  assert.deepStrictEqual (getPath (['x']) ({ a: 1 }), nothing ())
  assert.deepStrictEqual (getPath (['a', 'x']) ({ a: { b: 7 } }), nothing ())
})

test ('getPath: the path breaks on anything that is not an object', () => {
  assert.deepStrictEqual (getPath (['a', 'b']) ({ a: null }), nothing ())
  assert.deepStrictEqual (getPath (['a', 'b']) ({ a: undefined }), nothing ())
  assert.deepStrictEqual (getPath (['a', '0']) ({ a: 'xy' }), nothing ())
  assert.deepStrictEqual (getPath (['a', '0']) ({ a: [7] }), just (7))
})

test ('getPath: the path goes through own keys only', () => {
  assert.deepStrictEqual (getPath (['toString']) ({}), nothing ())
})

test ('hasPath: checks whether every step of an own-property path exists', () => {
  assert.deepStrictEqual (hasPath (['a', 'b']) ({ a: { b: 7 } }), true)
  assert.deepStrictEqual (hasPath (['a', 'x']) ({ a: { b: 7 } }), false)
  assert.deepStrictEqual (hasPath ([]) ({ a: 1 }), true)
  assert.deepStrictEqual (hasPath (['a']) ({ a: undefined }), true)
})

test ('singleton: creates a record containing one key and value', () => {
  assert.deepStrictEqual (singleton ('a', 1), { a: 1 })
  assert.deepStrictEqual (keys (singleton ('a', 1)), ['a'])
})

test ('fromPairs: creates a record from ply pairs. The last value for each key wins', () => {
  assert.deepStrictEqual (fromPairs ([pair ('a', 1)]), { a: 1 })
  assert.deepStrictEqual (fromPairs ([]), {})
  assert.deepStrictEqual (fromPairs ([pair ('a', 1), pair ('b', 2)]), { a: 1, b: 2 })
})

test ('fromPairs: on a repeated key the last pair wins', () => {
  assert.deepStrictEqual (fromPairs ([pair ('a', 1), pair ('a', 2)]), { a: 2 })
})

test ('insert: copies a record with a key added or replaced', () => {
  assert.deepStrictEqual (insert ('b') (2) ({ a: 1 }), { a: 1, b: 2 })
  assert.deepStrictEqual (insert ('a') (2) ({ a: 1 }), { a: 2 })
})

test ('StrMap: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (StrMap['@@type'], 'StrMap')
  assert.deepStrictEqual (StrMap.is ({}), true)
  assert.deepStrictEqual (StrMap.is ({ a: 1 }), true)
  assert.deepStrictEqual (StrMap.is (Object.create (null)), true)
  assert.deepStrictEqual (StrMap.is ([]), false)
  assert.deepStrictEqual (StrMap.is (new Map ()), false)
  assert.deepStrictEqual (StrMap.is (new Date ()), false)
  assert.deepStrictEqual (StrMap.is (null), false)
  assert.deepStrictEqual (StrMap.is ('a string'), false)
})

test ('StrMap.is: ply values do not count as a dictionary', () => {
  assert.deepStrictEqual (StrMap.is (just (1)), false)
  assert.deepStrictEqual (StrMap.is (nothing ()), false)
  assert.deepStrictEqual (StrMap.is (identity (1)), false)
  assert.deepStrictEqual (StrMap.is (pair ('a', 1)), false)
})

test ('StrMap.empty and StrMap.zero', () => {
  assert.deepStrictEqual (StrMap.empty<number> (), {})
  assert.deepStrictEqual (StrMap.zero<number> (), {})
  assert.deepStrictEqual (empty (StrMap) as Record<string, number>, {})
  assert.deepStrictEqual (zero (StrMap) as Record<string, number>, {})
})

test ('StrMap.concat: on a key conflict the left one wins', () => {
  assert.deepStrictEqual (StrMap.concat ({ a: 1, b: 2 }, { a: 9, c: 3 }), {
    a: 1,
    b: 2,
    c: 3,
  })
  assert.deepStrictEqual (concat ({ a: 1 } as Record<string, number>) ({ a: 9, b: 2 }), {
    a: 1,
    b: 2,
  })
})

test ('StrMap.alt: the same bias as concat', () => {
  assert.deepStrictEqual (StrMap.alt ({ a: 1, b: 2 }, { a: 9, c: 3 }), {
    a: 1,
    b: 2,
    c: 3,
  })
  assert.deepStrictEqual (
    alt ({ a: 9, c: 3 } as Record<string, number>) ({ a: 1, b: 2 }),
    { a: 1, b: 2, c: 3 },
  )
})

test ('StrMap.equals: compares values by content', () => {
  assert.deepStrictEqual (StrMap.equals ({ a: 1 }, { a: 1 }), true)
  assert.deepStrictEqual (StrMap.equals ({ a: 1 }, { a: 2 }), false)
  assert.deepStrictEqual (StrMap.equals ({ a: 1 }, { b: 1 }), false)
  assert.deepStrictEqual (StrMap.equals ({ a: 1 }, { a: 1, b: 2 }), false)
  assert.deepStrictEqual (StrMap.equals ({}, {}), true)
})

test ('StrMap.equals: the values are compared structurally', () => {
  assert.deepStrictEqual (StrMap.equals ({ a: [1, 2] }, { a: [1, 2] }), true)
  assert.deepStrictEqual (StrMap.equals ({ a: just (1) }, { a: just (1) }), true)
  assert.deepStrictEqual (StrMap.equals ({ a: just (1) }, { a: nothing () }), false)
  assert.deepStrictEqual (StrMap.equals ({ a: { b: 1 } }, { a: { b: 1 } }), true)
})

test ('StrMap.show: formats values as readable strings', () => {
  assert.deepStrictEqual (StrMap.show ({}), '{}')
  assert.deepStrictEqual (StrMap.show ({ b: 2, a: 1 }), '{"a": 1, "b": 2}')
  assert.deepStrictEqual (StrMap.show ({ a: 1, b: 2 }), StrMap.show ({ b: 2, a: 1 }))
  assert.deepStrictEqual (StrMap.show ({ 'b c': 1 }), '{"b c": 1}')
  assert.deepStrictEqual (StrMap.show ({ a: 'x' }), '{"a": "x"}')
  assert.deepStrictEqual (StrMap.show ({ a: just (1) }), '{"a": Just (1)}')
})

test ('StrMap.map: transforms values', () => {
  assert.deepStrictEqual (StrMap.map ({ a: 1, b: 2 }, increment), { a: 2, b: 3 })
  assert.deepStrictEqual (StrMap.map ({}, increment), {})
  assert.deepStrictEqual (keys (StrMap.map ({ b: 1, a: 2 }, increment)), ['b', 'a'])
})

test ('StrMap.filter: keeps values that pass the predicate', () => {
  const m = { a: 1, b: 2, c: 3, d: 4 }

  assert.deepStrictEqual (StrMap.filter (m, even), { b: 2, d: 4 })
  assert.deepStrictEqual (filter (even) (m), { b: 2, d: 4 })
  assert.deepStrictEqual (reject (even) (m), { a: 1, c: 3 })
  assert.deepStrictEqual (StrMap.filter (m, () => true), m)
  assert.deepStrictEqual (StrMap.filter (m, () => false), {})
})

test ('StrMap.reduce: the fold goes over the sorted keys', () => {
  assert.deepStrictEqual (
    StrMap.reduce (
      { b: 1, a: 2 },
      (accumulator: string, a: number) => accumulator + a,
      '',
    ),
    '21',
  )
  assert.deepStrictEqual (
    StrMap.reduce (
      { a: 2, b: 1 },
      (accumulator: string, a: number) => accumulator + a,
      '',
    ),
    '21',
  )
  assert.deepStrictEqual (StrMap.reduce ({}, (accumulator: number) => accumulator, 7), 7)
})

test ('StrMap as a Foldable', () => {
  assert.deepStrictEqual (toArray ({ b: 1, a: 2 }), sortedValues ({ b: 1, a: 2 }))
  assert.deepStrictEqual (toArray ({ b: 1, a: 2 }), [2, 1])
  assert.deepStrictEqual (size ({ b: 1, a: 2 }), 2)
  assert.deepStrictEqual (
    foldMap (Concat) ((n: number) => `${n}`) ({ b: 1, a: 2 }),
    foldMap (Concat) ((n: number) => `${n}`) ({ a: 2, b: 1 }),
  )
})

test ('StrMap.map: passes only values to Number.parseInt', () => {
  assert.deepStrictEqual (StrMap.map ({ a: '1', b: '2' }, Number.parseInt), { a: 1, b: 2 })
})

test ('map through the class does not confuse a dictionary with an array', () => {
  assert.deepStrictEqual (map (increment) ({ a: 1 }), { a: 2 })
  assert.deepStrictEqual (map (increment) ([1]), [2])
})

test ('fromPairs and pairs are inverse to each other', () => {
  const m = { a: 1, b: 2 }

  assert.deepStrictEqual (fromPairs (pairs (m)), m)
})

test ('StrMap.concat: the Semigroup and Monoid laws', () => {
  const a = { a: 1, b: 2 }
  const b = { b: 20, c: 3 }
  const c = { c: 30, d: 4 }

  assert.deepStrictEqual (
    StrMap.concat (StrMap.concat (a, b), c),
    StrMap.concat (a, StrMap.concat (b, c)),
  )
  const e = StrMap.empty<number> ()

  assert.deepStrictEqual (StrMap.concat (e, a), a)
  assert.deepStrictEqual (StrMap.concat (a, e), a)
})

test ('StrMap.alt: the Alt and Plus laws', () => {
  const a = { a: 1, b: 2 }
  const b = { b: 20, c: 3 }
  const c = { c: 30, d: 4 }

  assert.deepStrictEqual (
    StrMap.alt (StrMap.alt (a, b), c),
    StrMap.alt (a, StrMap.alt (b, c)),
  )
  assert.deepStrictEqual (
    StrMap.map (StrMap.alt (a, b), doubleNumber),
    StrMap.alt (StrMap.map (a, doubleNumber), StrMap.map (b, doubleNumber)),
  )
  const z = StrMap.zero<number> ()

  assert.deepStrictEqual (StrMap.alt (z, a), a)
  assert.deepStrictEqual (StrMap.alt (a, z), a)
  assert.deepStrictEqual (StrMap.map (z, increment), {})
})

test ('StrMap.equals: the Setoid laws', () => {
  const samples: Record<string, number>[] = [
    {},
    { a: 1 },
    { a: 1, b: 2 },
    { b: 2, a: 1 },
  ]
  for (const a of samples) assert.deepStrictEqual (StrMap.equals (a, a), true)
  for (const a of samples) {
    for (const b of samples) {
      assert.deepStrictEqual (StrMap.equals (a, b), StrMap.equals (b, a))
      for (const c of samples) {
        if (StrMap.equals (a, b) && StrMap.equals (b, c)) {
          assert.deepStrictEqual (StrMap.equals (a, c), true)
        }
      }
    }
  }
})

test ('StrMap.map: the Functor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  const m = { a: 1, b: 2 }

  assert.deepStrictEqual (StrMap.map (m, (n: number) => n), m)
  assert.deepStrictEqual (
    StrMap.map (m, doubleThenIncrement),
    StrMap.map (StrMap.map (m, doubleNumber), increment),
  )
})

test ('StrMap.filter: the Filterable laws', () => {
  const m = { a: 1, b: 2, c: 3, d: 4 }
  const p = even
  const q = (n: number) => n > 2

  assert.deepStrictEqual (
    StrMap.filter (StrMap.filter (m, q), p),
    StrMap.filter (m, (n: number) => p (n) && q (n)),
  )
})

test ('sorted* does not depend on the insertion order', () => {
  assert.deepStrictEqual (sortedKeys ({ b: 1, a: 2 }), sortedKeys ({ a: 2, b: 1 }))
  assert.deepStrictEqual (sortedValues ({ b: 1, a: 2 }), sortedValues ({ a: 2, b: 1 }))
  assert.deepStrictEqual (sortedPairs ({ b: 1, a: 2 }), sortedPairs ({ a: 2, b: 1 }))
})

test ('lookup: reads an own property as Just, or returns Nothing if it is absent', () => {
  assert.deepStrictEqual (lookup ('a') ({ a: 1 }), just (1))
  assert.deepStrictEqual (lookup ('b') ({ a: 1 }), nothing<number> ())
  assert.deepStrictEqual (lookup ('a') ({} as Record<string, number>), nothing<number> ())
})

test ('lookup: own keys only, but undefined among them', () => {
  assert.deepStrictEqual (lookup ('toString') ({} as Record<string, number>), nothing ())
  assert.deepStrictEqual (lookup ('a') ({ a: undefined }), just (undefined))
})

test ('insert: does not touch its input', () => {
  const m = { a: 1 }
  insert ('b') (2) (m)

  assert.deepStrictEqual (m, { a: 1 })
})

test ('StrMap.is: a record with an @@type key stops being a dictionary', () => {
  const rec = { '@@type': 'Ivan', age: 30 }

  assert.deepStrictEqual (StrMap.is (rec), false)
  assert.throws (
    () => equals (rec) ({ '@@type': 'Ivan', age: 30 }),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Ivan has no Setoid'),
  )
  assert.throws (
    () => map ((x: unknown) => x) (rec as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('map: Ivan has no Functor'),
  )
  assert.deepStrictEqual (show (rec), '{"@@type": "Ivan", "age": 30}')
})

test ('StrMap.concat: does not touch the operands', () => {
  const a = { a: 1 }
  const b = { a: 9, b: 2 }
  StrMap.concat (a, b)

  assert.deepStrictEqual (a, { a: 1 })
  assert.deepStrictEqual (b, { a: 9, b: 2 })
})

test ('StrMap.equals: the insertion order has no effect', () => {
  assert.deepStrictEqual (StrMap.equals ({ b: 2, a: 1 }, { a: 1, b: 2 }), true)
})

test ('StrMap.map: does not touch its input', () => {
  const m = { a: 1 }
  StrMap.map (m, increment)

  assert.deepStrictEqual (m, { a: 1 })
})

test ('StrMap.map: passes only the field value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  StrMap.map ({ a: 1, b: 2 }, recordArguments)

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('StrMap.filter: passes only the field value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  StrMap.filter ({ a: 1, b: 2 }, recordArguments)

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('StrMap.reduce: passes only accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  StrMap.reduce ({ a: 1, b: 2 }, recordArguments, 0)

  assert.deepStrictEqual (calls, [[0, 1], [0, 2]])
})

test ('StrMap inhabits neither Apply, Chain, Applicative nor Traversable', () => {
  assert.throws (
    () => ap ([increment] as never) ({ a: 1 } as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('ap: StrMap has no Apply'),
  )
  assert.throws (
    () => chain ((n: number) => [n]) ({ a: 1 } as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('chain: StrMap has no Chain'),
  )
  assert.throws (
    () => of (StrMap as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('of: StrMap has no Applicative'),
  )
  assert.throws (
    () => traverse (Maybe as never) ((n: number) => just (n)) ({ a: 1 } as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('traverse: StrMap has no Traversable'),
  )
})

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const even = (n: number) => n % 2 === 0
