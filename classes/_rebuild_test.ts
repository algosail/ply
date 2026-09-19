import { assertEquals, assertThrows } from '@std/assert'
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
} from './_rebuild.ts'
import { toArray } from './foldable.ts'
import type { Maybe } from '../data/maybe.ts'
import { just, nothing } from '../data/maybe.ts'
import { pair } from '../data/pair.ts'

// Shared fixtures

function fromJust<A>(value: Maybe<A>): A {
  if (value.tag === 'nothing') throw new Error('expected a Just, got Nothing')
  return value.value
}

// Examples

Deno.test('sort: compares by Ord, not lexicographically', () => {
  assertEquals(sort([10, 2, 1]), [1, 2, 10])
})

Deno.test('take: returns the first n values wrapped in Just', () => {
  assertEquals(take(0)([1, 2, 3]), just([]))
  assertEquals(take(2)([1, 2, 3]), just([1, 2]))
  assertEquals(take(3)([1, 2, 3]), just([1, 2, 3]))
  assertEquals(take(4)([1, 2, 3]), nothing())
  assertEquals(take(-1)([1, 2, 3]), nothing())
  assertEquals(take(0)([] as number[]), just([]))
  assertEquals(take(1)([] as number[]), nothing())
})

Deno.test('drop: returns the collection without its first n values, wrapped in Just', () => {
  assertEquals(drop(0)([1, 2, 3]), just([1, 2, 3]))
  assertEquals(drop(2)([1, 2, 3]), just([3]))
  assertEquals(drop(3)([1, 2, 3]), just([]))
  assertEquals(drop(4)([1, 2, 3]), nothing())
  assertEquals(drop(-1)([1, 2, 3]), nothing())
  assertEquals(drop(0)([] as number[]), just([]))
  assertEquals(drop(1)([] as number[]), nothing())
})

Deno.test('takeLast: returns the last n values wrapped in Just', () => {
  assertEquals(takeLast(0)(['foo', 'bar']), just([]))
  assertEquals(takeLast(1)(['foo', 'bar']), just(['bar']))
  assertEquals(takeLast(2)(['foo', 'bar']), just(['foo', 'bar']))
  assertEquals(takeLast(3)(['foo', 'bar']), nothing())
  assertEquals(takeLast(-1)(['foo', 'bar']), nothing())
})

Deno.test('dropLast: returns the collection without its last n values, wrapped in Just', () => {
  assertEquals(dropLast(0)(['foo', 'bar']), just(['foo', 'bar']))
  assertEquals(dropLast(1)(['foo', 'bar']), just(['foo']))
  assertEquals(dropLast(2)(['foo', 'bar']), just([]))
  assertEquals(dropLast(3)(['foo', 'bar']), nothing())
  assertEquals(dropLast(-1)(['foo', 'bar']), nothing())
})

Deno.test('tail: returns all values except the first, wrapped in Just', () => {
  assertEquals(tail([1, 2, 3]), just([2, 3]))
  assertEquals(tail([1]), just([]))
  assertEquals(tail([] as number[]), nothing())
})

Deno.test('init: returns all values except the last, wrapped in Just', () => {
  assertEquals(init([1, 2, 3]), just([1, 2]))
  assertEquals(init([1]), just([]))
  assertEquals(init([] as number[]), nothing())
})

Deno.test('takeLast: mirrors take on a reversed value', () => {
  const xs = [1, 2, 3, 4]
  for (let n = 0; n <= xs.length; n++) {
    assertEquals(
      fromJust(takeLast(n)(xs)),
      reverse(fromJust(take(n)(reverse(xs)))),
    )
    assertEquals(
      fromJust(dropLast(n)(xs)),
      reverse(fromJust(drop(n)(reverse(xs)))),
    )
  }
})

// Laws

Deno.test('reverse: twice over is the identity across supported types', () => {
  assertEquals(reverse(reverse([3, 1, 2])), [3, 1, 2], 'Array')
})

Deno.test('sortBy: with the identity key it coincides with sort', () => {
  const id = (n: number) => n

  assertEquals(sortBy(id)([3, 1, 2]), sort([3, 1, 2]), 'Array')
})

Deno.test('take: the slice is complementary to drop', () => {
  const xs = [1, 2, 3, 4]
  for (let n = 0; n <= xs.length; n++) {
    assertEquals(
      [...fromJust(take(n)(xs)), ...fromJust(drop(n)(xs))],
      xs,
      `n = ${n}`,
    )
  }
})

Deno.test('tail: coincides with drop(1), and init with dropLast(1)', () => {
  for (const xs of [[] as number[], [1], [1, 2, 3]]) {
    assertEquals(tail(xs), drop(1)(xs), JSON.stringify(xs))
    assertEquals(init(xs), dropLast(1)(xs), JSON.stringify(xs))
  }
})

// Edge cases

Deno.test('reverse: returns a collection with its values in reverse order, without changing the input', () => {
  // Bypass the type checker to verify the runtime error.
  assertEquals(reverse([1, 2, 3]), [3, 2, 1])
  assertEquals(reverse([] as number[]), [])
  assertEquals(reverse([1]), [1])
  assertThrows(
    () => reverse(new Set([1, 2, 3]) as never),
    TypeError,
    'reduce: Set has no Foldable',
  )
})

Deno.test('reverse: the original value does not change', () => {
  const xs = [1, 2, 3]

  assertEquals(reverse(xs), [3, 2, 1])
  assertEquals(xs, [1, 2, 3])
})

Deno.test("sort: returns values in ascending order using ply's ordering, without changing the input", () => {
  // Bypass the type checker to verify the runtime error.
  assertEquals(sort([3, 1, 2]), [1, 2, 3])
  assertEquals(sort(['b', 'a', 'c']), ['a', 'b', 'c'])
  assertEquals(sort([] as number[]), [])
  assertThrows(
    () => sort(new Set([3, 1, 2]) as never),
    TypeError,
    'reduce: Set has no Foldable',
  )
})

Deno.test('sort: is idempotent and does not change the original value', () => {
  const xs = [3, 1, 2]

  assertEquals(sort(sort(xs)), sort(xs))
  assertEquals(xs, [3, 1, 2])
})

Deno.test('sort: rejects values without Ord', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => sort([{ a: 1 }, { a: 2 }] as never),
    TypeError,
    'has no Ord',
  )
})

Deno.test('sortBy: sorts values by a derived key in ascending order, without changing the input', () => {
  // Bypass the type checker to verify the runtime error.
  assertEquals(sortBy((s: string) => s.length)(['ccc', 'a', 'bb']), [
    'a',
    'bb',
    'ccc',
  ])
  assertThrows(
    () => sortBy((n: number) => -n)(new Set([1, 2, 3]) as never),
    TypeError,
    'reduce: Set has no Foldable',
  )
})

Deno.test('sortBy: is stable', () => {
  const rows = [
    { k: 1, v: 'a' },
    { k: 0, v: 'b' },
    { k: 1, v: 'c' },
    { k: 0, v: 'd' },
  ]

  assertEquals(
    sortBy((p: { k: number; v: string }) => p.k)(rows).map((p) => p.v),
    ['b', 'd', 'a', 'c'],
  )
})

Deno.test('sortBy: the key function receives only a value from the collection', () => {
  const calls: unknown[][] = []

  function key(...args: [number]) {
    calls.push(args)
    return args[0]
  }

  sortBy(key)([3, 1, 2])

  assertEquals(calls.length > 0, true)
  for (const args of calls) {
    assertEquals(args.length, 1)
    assertEquals([3, 1, 2].includes(args[0] as number), true)
  }
})

Deno.test('counterexample: slicing equal sets would expose insertion order', () => {
  // Bypass the type checker to verify the runtime error.
  const a = new Set([3, 1, 2])
  const b = new Set([1, 2, 3])

  assertEquals(a, b)
  assertEquals([...a], [3, 1, 2])
  assertEquals([...b], [1, 2, 3])
  assertEquals(new Set([...a].slice(0, 2)), new Set([3, 1]))
  assertEquals(new Set([...b].slice(0, 2)), new Set([1, 2]))
  assertEquals(new Set([3, 1]).has(2), false)
  for (const s of [a, b]) {
    assertThrows(
      () => toArray(s as never),
      TypeError,
      'reduce: Set has no Foldable',
    )
    assertThrows(
      () => take(2)(s as never),
      TypeError,
      'reduce: Set has no Foldable',
    )
  }
})

Deno.test('sort: rejects values without of', () => {
  // Bypass the type checker to verify the runtime error.
  const withoutOf = {
    'StrMap': { a: 3, b: 1 },
    'Pair': pair('log', 1),
  }
  for (const [name, wrappedValue] of Object.entries(withoutOf)) {
    assertThrows(
      () => sort(wrappedValue as never),
      TypeError,
      'has no Applicative',
      name,
    )
    assertThrows(
      () => take(1)(wrappedValue as never),
      TypeError,
      'has no Applicative',
      name,
    )
  }
})

Deno.test('sort: rejects values without Foldable', () => {
  // Bypass the type checker to verify the runtime error.
  const withoutFoldable = {
    'String': 'cba',
    'Set': new Set([3, 1, 2]),
    'Map': new Map([['a', 3], ['b', 1]]),
  }
  for (const [name, wrappedValue] of Object.entries(withoutFoldable)) {
    assertThrows(
      () => sort(wrappedValue as never),
      TypeError,
      'has no Foldable',
      name,
    )
    assertThrows(
      () => take(1)(wrappedValue as never),
      TypeError,
      'has no Foldable',
      name,
    )
  }
})

Deno.test('sortBy is stable: equal keys keep the original order', () => {
  type Row = { readonly k: number; readonly tag: string }
  const rows: Row[] = [
    { k: 1, tag: 'a' },
    { k: 0, tag: 'b' },
    { k: 1, tag: 'c' },
    { k: 0, tag: 'd' },
    { k: 1, tag: 'e' },
  ]
  const tags = (sortBy((r: Row) => r.k)(rows) as Row[])
    .map((r) => r.tag)

  assertEquals(tags.join(''), 'bdace')
})

Deno.test('sort is stable on equal values', () => {
  const d = (ms: number, tag: string) => ({ ms, tag })
  const xs = [d(1, 'a'), d(0, 'b'), d(1, 'c'), d(0, 'd')]
  const tags = (sortBy((x: { ms: number }) => x.ms)(xs) as typeof xs)
    .map((x) => x.tag)

  assertEquals(tags.join(''), 'bdac')
})

// Type checking

Deno.test('Set is rejected by all nine rebuilding functions', () => {
  const s = new Set([3, 1, 2])
  // @ts-expect-error Set is no longer Foldable
  const _1 = () => sortBy((n: number) => n)(s)
  // @ts-expect-error Set is no longer Foldable
  const _2 = () => take(2)(s)
  // @ts-expect-error Set is no longer Foldable
  const _3 = () => drop(1)(s)
  // @ts-expect-error Set is no longer Foldable
  const _4 = () => takeLast(1)(s)
  // @ts-expect-error Set is no longer Foldable
  const _5 = () => dropLast(1)(s)
  // @ts-expect-error Set is no longer Foldable
  const _6 = () => tail(s)
  // @ts-expect-error Set is no longer Foldable
  const _7 = () => init(s)
  // @ts-expect-error Set is no longer Foldable
  const _8 = () => sort(s)
  // @ts-expect-error Set is no longer Foldable
  const _9 = () => reverse(s)
  void _1, _2, _3, _4, _5, _6, _7, _8, _9

  assertThrows(
    () => sort(s as never),
    TypeError,
    'reduce: Set has no Foldable',
    'sort',
  )
  assertThrows(
    () => sortBy((n: number) => n)(s as never),
    TypeError,
    'reduce: Set has no Foldable',
    'sortBy',
  )
  assertThrows(
    () => reverse(s as never),
    TypeError,
    'reduce: Set has no Foldable',
    'reverse',
  )
  assertThrows(
    () => take(2)(s as never),
    TypeError,
    'reduce: Set has no Foldable',
    'take',
  )
  assertThrows(
    () => drop(1)(s as never),
    TypeError,
    'reduce: Set has no Foldable',
    'drop',
  )
  assertThrows(
    () => takeLast(1)(s as never),
    TypeError,
    'reduce: Set has no Foldable',
    'takeLast',
  )
  assertThrows(
    () => dropLast(1)(s as never),
    TypeError,
    'reduce: Set has no Foldable',
    'dropLast',
  )
  assertThrows(
    () => tail(s as never),
    TypeError,
    'reduce: Set has no Foldable',
    'tail',
  )
  assertThrows(
    () => init(s as never),
    TypeError,
    'reduce: Set has no Foldable',
    'init',
  )
})
