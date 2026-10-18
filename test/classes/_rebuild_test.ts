import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Maybe } from '../../src/data/maybe.ts'
import {
  drop,
  dropLast,
  init,
  reverse,
  sort,
  sortBy,
  tail,
  take,
  takeLast,
} from '../../src/classes/_rebuild.ts'
import { toArray } from '../../src/classes/foldable.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'

function fromJust<A>(value: Maybe<A>): A {
  if (value.tag === 'nothing') throw new Error ('expected a Just, got Nothing')
  return value.value
}

test ('sort: compares by Ord, not lexicographically', () => {
  assert.deepStrictEqual (sort ([10, 2, 1]), [1, 2, 10])
})

test ('take: returns the first n values wrapped in Just', () => {
  assert.deepStrictEqual (take (0) ([1, 2, 3]), just ([]))
  assert.deepStrictEqual (take (2) ([1, 2, 3]), just ([1, 2]))
  assert.deepStrictEqual (take (3) ([1, 2, 3]), just ([1, 2, 3]))
  assert.deepStrictEqual (take (4) ([1, 2, 3]), nothing ())
  assert.deepStrictEqual (take (-1) ([1, 2, 3]), nothing ())
  assert.deepStrictEqual (take (0) ([] as number[]), just ([]))
  assert.deepStrictEqual (take (1) ([] as number[]), nothing ())
})

test ('drop: returns the collection without its first n values, wrapped in Just', () => {
  assert.deepStrictEqual (drop (0) ([1, 2, 3]), just ([1, 2, 3]))
  assert.deepStrictEqual (drop (2) ([1, 2, 3]), just ([3]))
  assert.deepStrictEqual (drop (3) ([1, 2, 3]), just ([]))
  assert.deepStrictEqual (drop (4) ([1, 2, 3]), nothing ())
  assert.deepStrictEqual (drop (-1) ([1, 2, 3]), nothing ())
  assert.deepStrictEqual (drop (0) ([] as number[]), just ([]))
  assert.deepStrictEqual (drop (1) ([] as number[]), nothing ())
})

test ('takeLast: returns the last n values wrapped in Just', () => {
  assert.deepStrictEqual (takeLast (0) (['foo', 'bar']), just ([]))
  assert.deepStrictEqual (takeLast (1) (['foo', 'bar']), just (['bar']))
  assert.deepStrictEqual (takeLast (2) (['foo', 'bar']), just (['foo', 'bar']))
  assert.deepStrictEqual (takeLast (3) (['foo', 'bar']), nothing ())
  assert.deepStrictEqual (takeLast (-1) (['foo', 'bar']), nothing ())
})

test ('dropLast: returns the collection without its last n values, wrapped in Just', () => {
  assert.deepStrictEqual (dropLast (0) (['foo', 'bar']), just (['foo', 'bar']))
  assert.deepStrictEqual (dropLast (1) (['foo', 'bar']), just (['foo']))
  assert.deepStrictEqual (dropLast (2) (['foo', 'bar']), just ([]))
  assert.deepStrictEqual (dropLast (3) (['foo', 'bar']), nothing ())
  assert.deepStrictEqual (dropLast (-1) (['foo', 'bar']), nothing ())
})

test ('tail: returns all values except the first, wrapped in Just', () => {
  assert.deepStrictEqual (tail ([1, 2, 3]), just ([2, 3]))
  assert.deepStrictEqual (tail ([1]), just ([]))
  assert.deepStrictEqual (tail ([] as number[]), nothing ())
})

test ('init: returns all values except the last, wrapped in Just', () => {
  assert.deepStrictEqual (init ([1, 2, 3]), just ([1, 2]))
  assert.deepStrictEqual (init ([1]), just ([]))
  assert.deepStrictEqual (init ([] as number[]), nothing ())
})

test ('takeLast: mirrors take on a reversed value', () => {
  const xs = [1, 2, 3, 4]
  for (let n = 0; n <= xs.length; n++) {
    assert.deepStrictEqual (
      fromJust (takeLast (n) (xs)),
      reverse (fromJust (take (n) (reverse (xs)))),
    )
    assert.deepStrictEqual (
      fromJust (dropLast (n) (xs)),
      reverse (fromJust (drop (n) (reverse (xs)))),
    )
  }
})

test ('reverse: twice over is the identity across supported types', () => {
  assert.deepStrictEqual (reverse (reverse ([3, 1, 2])), [3, 1, 2], 'Array')
})

test ('sortBy: with the identity key it coincides with sort', () => {
  const id = (n: number) => n

  assert.deepStrictEqual (sortBy (id) ([3, 1, 2]), sort ([3, 1, 2]), 'Array')
})

test ('take: the slice is complementary to drop', () => {
  const xs = [1, 2, 3, 4]
  for (let n = 0; n <= xs.length; n++) {
    assert.deepStrictEqual (
      [...fromJust (take (n) (xs)), ...fromJust (drop (n) (xs))],
      xs,
      `n = ${n}`,
    )
  }
})

test ('tail: coincides with drop(1), and init with dropLast(1)', () => {
  for (const xs of [[] as number[], [1], [1, 2, 3]]) {
    assert.deepStrictEqual (tail (xs), drop (1) (xs), JSON.stringify (xs))
    assert.deepStrictEqual (init (xs), dropLast (1) (xs), JSON.stringify (xs))
  }
})

test ('reverse: returns a collection with its values in reverse order, without changing the input', () => {
  assert.deepStrictEqual (reverse ([1, 2, 3]), [3, 2, 1])
  assert.deepStrictEqual (reverse ([] as number[]), [])
  assert.deepStrictEqual (reverse ([1]), [1])
  assert.throws (
    () => reverse (new Set ([1, 2, 3]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
})

test ('reverse: the original value does not change', () => {
  const xs = [1, 2, 3]

  assert.deepStrictEqual (reverse (xs), [3, 2, 1])
  assert.deepStrictEqual (xs, [1, 2, 3])
})

test ("sort: returns values in ascending order using ply's ordering, without changing the input", () => {
  assert.deepStrictEqual (sort ([3, 1, 2]), [1, 2, 3])
  assert.deepStrictEqual (sort (['b', 'a', 'c']), ['a', 'b', 'c'])
  assert.deepStrictEqual (sort ([] as number[]), [])
  assert.throws (
    () => sort (new Set ([3, 1, 2]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
})

test ('sort: is idempotent and does not change the original value', () => {
  const xs = [3, 1, 2]

  assert.deepStrictEqual (sort (sort (xs)), sort (xs))
  assert.deepStrictEqual (xs, [3, 1, 2])
})

test ('sort: rejects values without Ord', () => {
  assert.throws (
    () => sort ([{ a: 1 }, { a: 2 }] as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Ord'),
  )
})

test ('sortBy: sorts values by a derived key in ascending order, without changing the input', () => {
  assert.deepStrictEqual (sortBy ((s: string) => s.length) (['ccc', 'a', 'bb']), [
    'a',
    'bb',
    'ccc',
  ])
  assert.throws (
    () => sortBy ((n: number) => -n) (new Set ([1, 2, 3]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
})

test ('sortBy: is stable', () => {
  const rows = [
    { k: 1, v: 'a' },
    { k: 0, v: 'b' },
    { k: 1, v: 'c' },
    { k: 0, v: 'd' },
  ]

  assert.deepStrictEqual (
    sortBy ((p: { k: number; v: string }) => p.k) (rows).map ((p) => p.v),
    ['b', 'd', 'a', 'c'],
  )
})

test ('sortBy: the key function receives only a value from the collection', () => {
  const calls: unknown[][] = []

  function key(...args: [number]) {
    calls.push (args)
    return args[0]
  }

  sortBy (key) ([3, 1, 2])

  assert.deepStrictEqual (calls.length > 0, true)
  for (const args of calls) {
    assert.deepStrictEqual (args.length, 1)
    assert.deepStrictEqual ([3, 1, 2].includes (args[0] as number), true)
  }
})

test ('counterexample: slicing equal sets would expose insertion order', () => {
  const a = new Set ([3, 1, 2])
  const b = new Set ([1, 2, 3])

  assert.deepStrictEqual (a, b)
  assert.deepStrictEqual ([...a], [3, 1, 2])
  assert.deepStrictEqual ([...b], [1, 2, 3])
  assert.deepStrictEqual (new Set ([...a].slice (0, 2)), new Set ([3, 1]))
  assert.deepStrictEqual (new Set ([...b].slice (0, 2)), new Set ([1, 2]))
  assert.deepStrictEqual (new Set ([3, 1]).has (2), false)
  for (const s of [a, b]) {
    assert.throws (
      () => toArray (s as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    )
    assert.throws (
      () => take (2) (s as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    )
  }
})

test ('sort: rejects values without of', () => {
  const withoutOf = {
    StrMap: { a: 3, b: 1 },
    Pair: pair ('log', 1),
  }
  for (const [name, wrappedValue] of Object.entries (withoutOf)) {
    assert.throws (
      () => sort (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Applicative'),
      name,
    )
    assert.throws (
      () => take (1) (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Applicative'),
      name,
    )
  }
})

test ('sort: rejects values without Foldable', () => {
  const withoutFoldable = {
    String: 'cba',
    Set: new Set ([3, 1, 2]),
    Map: new Map ([['a', 3], ['b', 1]]),
  }
  for (const [name, wrappedValue] of Object.entries (withoutFoldable)) {
    assert.throws (
      () => sort (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      name,
    )
    assert.throws (
      () => take (1) (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      name,
    )
  }
})

test ('sortBy is stable: equal keys keep the original order', () => {
  type Row = { readonly k: number; readonly tag: string }
  const rows: Row[] = [
    { k: 1, tag: 'a' },
    { k: 0, tag: 'b' },
    { k: 1, tag: 'c' },
    { k: 0, tag: 'd' },
    { k: 1, tag: 'e' },
  ]
  const tags = (sortBy ((r: Row) => r.k) (rows) as Row[])
    .map ((r) => r.tag)

  assert.deepStrictEqual (tags.join (''), 'bdace')
})

test ('sort is stable on equal values', () => {
  const d = (ms: number, tag: string) => ({ ms, tag })
  const xs = [d (1, 'a'), d (0, 'b'), d (1, 'c'), d (0, 'd')]
  const tags = (sortBy ((x: { ms: number }) => x.ms) (xs) as typeof xs)
    .map ((x) => x.tag)

  assert.deepStrictEqual (tags.join (''), 'bdac')
})

test ('Set is rejected by all nine rebuilding functions', () => {
  const s = new Set ([3, 1, 2])
  // @ts-expect-error Set is no longer Foldable
  const _1 = () => sortBy ((n: number) => n) (s)
  // @ts-expect-error Set is no longer Foldable
  const _2 = () => take (2) (s)
  // @ts-expect-error Set is no longer Foldable
  const _3 = () => drop (1) (s)
  // @ts-expect-error Set is no longer Foldable
  const _4 = () => takeLast (1) (s)
  // @ts-expect-error Set is no longer Foldable
  const _5 = () => dropLast (1) (s)
  // @ts-expect-error Set is no longer Foldable
  const _6 = () => tail (s)
  // @ts-expect-error Set is no longer Foldable
  const _7 = () => init (s)
  // @ts-expect-error Set is no longer Foldable
  const _8 = () => sort (s)
  // @ts-expect-error Set is no longer Foldable
  const _9 = () => reverse (s)
  void _1, _2, _3, _4, _5, _6, _7, _8, _9

  assert.throws (
    () => sort (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    'sort',
  )
  assert.throws (
    () => sortBy ((n: number) => n) (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    'sortBy',
  )
  assert.throws (
    () => reverse (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    'reverse',
  )
  assert.throws (
    () => take (2) (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    'take',
  )
  assert.throws (
    () => drop (1) (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    'drop',
  )
  assert.throws (
    () => takeLast (1) (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    'takeLast',
  )
  assert.throws (
    () => dropLast (1) (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    'dropLast',
  )
  assert.throws (
    () => tail (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    'tail',
  )
  assert.throws (
    () => init (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    'init',
  )
})
