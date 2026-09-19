import { assertEquals, assertThrows } from '@std/assert'
import {
  filter,
  filterableNatives,
  filterMap,
  partition,
  partitionMap,
  reject,
} from './filterable.ts'
import { toArray } from './foldable.ts'
import { just, nothing } from '../data/maybe.ts'
import { left, right } from '../data/either.ts'
import { identity } from '../data/identity.ts'
import { pair } from '../data/pair.ts'

// Examples

Deno.test('filter: keeps values that pass the predicate, preserving the collection type', () => {
  for (const [name, wrappedValue, , kept] of samplesByType) {
    assertEquals(filterBy(isEven)(wrappedValue), kept, name)
  }
})

Deno.test('filterMap: transforms values with a function returning Maybe', () => {
  function doubleAboveOne(n: number) {
    return n > 1 ? just(n * 2) : nothing<number>()
  }

  function stringifyAboveOne(n: number) {
    return n > 1 ? just(`${n}`) : nothing<string>()
  }

  function keepAboveOne(n: number) {
    return n > 1 ? just(n) : nothing<number>()
  }

  assertEquals(
    filterMap(doubleAboveOne)([1, 2, 3]),
    [4, 6],
  )
  assertEquals(
    filterMap(stringifyAboveOne)(new Map([['a', 1], ['b', 2]])),
    new Map([['b', '2']]),
  )
  assertEquals(
    filterMap(keepAboveOne)({ a: 1, b: 2 }),
    { b: 2 },
  )
  assertEquals(
    filterMap(keepAboveOne)(just(1)),
    nothing(),
  )
  assertEquals(
    filterMap(keepAboveOne)(just(2)),
    just(2),
  )
})

Deno.test('partition: splits values into two collections: matches first, non-matches second', () => {
  for (const [name, wrappedValue, , kept, dropped] of samplesByType) {
    assertEquals(
      partition(isEven)(wrappedValue as never) as unknown,
      [kept, dropped],
      name,
    )
  }
})

Deno.test('partitionMap: transforms and splits values into unwrapped Left and Right collections', () => {
  function classifyAboveOne(n: number) {
    return n > 1 ? right<string, number>(n) : left<string, number>('lo')
  }

  function classifyEvenOrLabelOdd(n: number) {
    return isEven(n) ? right<string, number>(n) : left<string, number>(`n${n}`)
  }

  assertEquals(
    partitionMap(classifyAboveOne)([1, 2]) as unknown,
    [['lo'], [2]],
  )
  assertEquals(
    partitionMap(classifyEvenOrLabelOdd)({ a: 1, b: 2 }) as unknown,
    [{ a: 'n1' }, { b: 2 }],
  )
  assertEquals(
    partitionMap(classifyEvenOrLabelOdd)(just(1)) as unknown,
    [just('n1'), nothing()],
  )
})

// Laws

Deno.test('filter: identity law across supported types', () => {
  for (const [name, wrappedValue] of samplesByType) {
    assertEquals(filterBy(() => true)(wrappedValue), wrappedValue, name)
  }
})

Deno.test('filter: the annihilation law across supported types', () => {
  for (const [name, wrappedValue, empty] of samplesByType) {
    assertEquals(filterBy(() => false)(wrappedValue), empty, name)
  }
})

Deno.test('filter: distributivity law across supported types', () => {
  function isEvenAndOverTwo(n: number) {
    return isEven(n) && overTwo(n)
  }

  for (const [name, wrappedValue] of samplesByType) {
    assertEquals(
      filterBy(isEvenAndOverTwo)(wrappedValue),
      filterBy(overTwo)(filterBy(isEven)(wrappedValue)),
      name,
    )
  }
})

Deno.test('filterMap: agrees with filter across supported types', () => {
  function keepEven(n: number) {
    return isEven(n) ? just(n) : nothing<number>()
  }

  for (const [name, wrappedValue, empty, kept] of samplesByType) {
    assertEquals(
      filterMap(keepEven)(wrappedValue as never) as unknown,
      kept,
      name,
    )
    assertEquals(
      filterMap((n: number) => just(n))(wrappedValue as never) as unknown,
      wrappedValue,
      `${name}: filterMap(just) — identity`,
    )
    assertEquals(
      filterMap((_: number) => nothing<number>())(
        wrappedValue as never,
      ) as unknown,
      empty,
      `${name}: filterMap(nothing) — annihilation`,
    )
  }
})

Deno.test('partition: the generic implementation walks the value twice', () => {
  let calls = 0
  const p = (n: number) => {
    calls++
    return isEven(n)
  }
  partition(p)([1, 2, 3, 4])

  assertEquals(calls, 8)
})

Deno.test('partitionMap: agrees with partition across supported types', () => {
  function classifyEvenOnLeft(n: number) {
    return isEven(n) ? left<number, number>(n) : right<number, number>(n)
  }

  for (const [name, wrappedValue] of samplesByType) {
    assertEquals(
      partitionMap(classifyEvenOnLeft)(wrappedValue as never) as unknown,
      partition(isEven)(wrappedValue as never) as unknown,
      name,
    )
  }
})

// Edge cases

Deno.test('reject: removes values that pass the predicate, preserving the collection type', () => {
  for (const [name, wrappedValue, , , dropped] of samplesByType) {
    assertEquals(rejectBy(isEven)(wrappedValue), dropped, name)
  }
})

Deno.test('partition: this is exactly the pair of filter and reject', () => {
  for (const [name, wrappedValue] of samplesByType) {
    assertEquals(
      partition(isEven)(wrappedValue as never) as unknown,
      [filterBy(isEven)(wrappedValue), rejectBy(isEven)(wrappedValue)],
      name,
    )
  }
})

Deno.test('filter: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, , , , elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]) {
        calls.push(args)
        return true
      }

      filter(recordArguments)(wrappedValue as never)
      const expected = elements.map((value) => [value])

      assertEquals(calls, expected)
    })
  }
})

Deno.test('reject: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, , , , elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]) {
        calls.push(args)
        return true
      }

      reject(recordArguments)(wrappedValue as never)
      const expected = elements.map((value) => [value])

      assertEquals(calls, expected)
    })
  }
})

Deno.test('filterMap: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, , , , elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]) {
        calls.push(args)
        return just(1)
      }

      filterMap(recordArguments)(wrappedValue as never)
      const expected = elements.map((value) => [value])

      assertEquals(calls, expected)
    })
  }
})

Deno.test('partition: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, , , , elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]) {
        calls.push(args)
        return true
      }

      partition(recordArguments)(wrappedValue as never)
      // partition tests each value once for each of its two output collections.
      const expected = [
        ...elements.map((value) => [value]),
        ...elements.map((value) => [value]),
      ]

      assertEquals(calls, expected)
    })
  }
})

Deno.test('partitionMap: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, , , , elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]) {
        calls.push(args)
        return right<number, number>(1)
      }

      partitionMap(recordArguments)(wrappedValue as never)
      // partitionMap classifies each value once for each output collection.
      const expected = [...elements, ...elements].map((value) => [value])

      assertEquals(calls, expected)
    })
  }
})

Deno.test('a type without Filterable throws a descriptive TypeError', () => {
  // Bypass the type checker to verify the runtime error.
  const foreign: [string, unknown][] = [
    ['Either', right<string, number>(1)],
    ['Identity', identity(1)],
    ['Pair', pair('l', 1)],
    ['String', 'abc'],
  ]
  for (const [name, wrappedValue] of foreign) {
    assertThrows(
      () => filter(isEven)(wrappedValue as never),
      TypeError,
      'has no Filterable',
      name,
    )
    assertThrows(
      () => reject(isEven)(wrappedValue as never),
      TypeError,
      'has no Filterable',
      name,
    )
    assertThrows(
      () => partition(isEven)(wrappedValue as never),
      TypeError,
      'has no Filterable',
      name,
    )
    assertThrows(
      () => filterMap((n: number) => just(n))(wrappedValue as never),
      TypeError,
      'has no Filterable',
      name,
    )
    assertThrows(
      () =>
        partitionMap((n: number) => right<number, number>(n))(
          wrappedValue as never,
        ),
      TypeError,
      'has no Filterable',
      name,
    )
  }
})

// Type checking

Deno.test('reject: complements filter across supported types', () => {
  for (const [name, wrappedValue] of samplesByType) {
    assertEquals(
      rejectBy(isEven)(wrappedValue),
      filterBy((n: number) => !isEven(n))(wrappedValue),
      name,
    )
  }
  const foldables = samplesByType.filter(([n]) => n !== 'Set' && n !== 'Map')
  const countables = samplesByType.filter(([n]) => n === 'Set' || n === 'Map')

  assertEquals(foldables.length + countables.length, samplesByType.length)
  for (const [name, wrappedValue] of foldables) {
    assertEquals(
      [
        ...toArray(filterBy(isEven)(wrappedValue) as never),
        ...toArray(rejectBy(isEven)(wrappedValue) as never),
      ].length,
      toArray(wrappedValue as never).length,
      name,
    )
  }
  const sizeOf = (x: unknown) => (x as { readonly size: number }).size
  for (const [name, wrappedValue] of countables) {
    assertEquals(
      sizeOf(filterBy(isEven)(wrappedValue)) +
        sizeOf(rejectBy(isEven)(wrappedValue)),
      sizeOf(wrappedValue),
      name,
    )
  }
  // @ts-expect-error Set is no longer Foldable: it has no fold
  const _setCase = () => toArray(new Set([1, 2, 3, 4]))
  // @ts-expect-error Map is no longer Foldable: it has no fold
  const _mapCase = () => toArray(new Map([['a', 1]]))
  void _setCase, _mapCase

  for (const [name, wrappedValue] of countables) {
    assertThrows(
      () => toArray(wrappedValue as never),
      TypeError,
      `reduce: ${name} has no Foldable`,
      name,
    )
  }
})

// Native operation tables

Deno.test('filterableNatives: lists native filter implementations', () => {
  assertEquals(Object.keys(filterableNatives).sort(), [
    'Array',
    'Map',
    'Set',
    'StrMap',
  ])
  for (const [name, dict] of Object.entries(filterableNatives)) {
    assertEquals(typeof dict.filter, 'function', name)
  }
})

// Shared fixtures

const isEven = (n: number) => n % 2 === 0

const overTwo = (n: number) => n > 2

const filterBy =
  (p: (n: number) => boolean) => (wrappedValue: unknown): unknown =>
    filter(p)(wrappedValue as never) as unknown

const rejectBy =
  (p: (n: number) => boolean) => (wrappedValue: unknown): unknown =>
    reject(p)(wrappedValue as never) as unknown

const samplesByType: [string, unknown, unknown, unknown, unknown, number[]][] =
  [
    ['Array', [1, 2, 3, 4], [], [2, 4], [1, 3], [1, 2, 3, 4]],
    [
      'Set',
      new Set([1, 2, 3, 4]),
      new Set(),
      new Set([2, 4]),
      new Set([1, 3]),
      [1, 2, 3, 4],
    ],
    [
      'Map',
      new Map([['a', 1], ['b', 2], ['c', 3], ['d', 4]]),
      new Map(),
      new Map([['b', 2], ['d', 4]]),
      new Map([['a', 1], ['c', 3]]),
      [1, 2, 3, 4],
    ],
    ['StrMap', { a: 1, b: 2, c: 3, d: 4 }, {}, { b: 2, d: 4 }, { a: 1, c: 3 }, [
      1,
      2,
      3,
      4,
    ]],
    ['Maybe.Just (passes)', just(2), nothing(), just(2), nothing(), [2]],
    ['Maybe.Just (does not pass)', just(1), nothing(), nothing(), just(1), [1]],
    ['Maybe.Nothing', nothing<number>(), nothing(), nothing(), nothing(), []],
  ]
