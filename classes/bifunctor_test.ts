import { assertEquals, assertThrows } from '@std/assert'
import { bifunctorNatives, bimap, mapLeft } from './bifunctor.ts'
import { map } from './functor.ts'
import { left, right } from '../data/either.ts'
import { pair } from '../data/pair.ts'
import { just, nothing } from '../data/maybe.ts'
import { identity } from '../data/identity.ts'

// Examples

Deno.test('bimap: transforms both sides of a Pair, or the active branch of an Either', () => {
  assertEquals(
    bimap(bang)(doubleNumber)(left<string, number>('oops')),
    left('oops!'),
  )
  assertEquals(bimap(bang)(doubleNumber)(right<string, number>(2)), right(4))
  assertEquals(bimap(bang)(doubleNumber)(pair('log', 2)), pair('log!', 4))
})

Deno.test('mapLeft: transforms a Left value or the first value of a Pair', () => {
  assertEquals(mapLeft(bang)(left<string, number>('oops')), left('oops!'))
  assertEquals(mapLeft(bang)(right<string, number>(1)), right(1))
  assertEquals(mapLeft(bang)(pair('log', 1)), pair('log!', 1))
})

Deno.test('mapLeft: the same as bimap with an identity on the right', () => {
  for (const [name, wrappedValue] of Object.entries(samplesByType)) {
    assertEquals(
      mapLeft(bang)(wrappedValue),
      bimap(bang)(idf)(wrappedValue),
      name,
    )
  }
})

// Laws

Deno.test('bimap: identity law across supported types', () => {
  for (const [name, wrappedValue] of Object.entries(samplesByType)) {
    assertEquals(bimap(idf)(idf)(wrappedValue), wrappedValue, name)
  }
})

Deno.test('bimap: composition law across supported types', () => {
  function doubleThenIncrement(n: number) {
    return increment(doubleNumber(n))
  }

  function lengthAfterBang(s: string) {
    return size(bang(s))
  }

  for (const [name, wrappedValue] of Object.entries(samplesByType)) {
    assertEquals(
      bimap(lengthAfterBang)(doubleThenIncrement)(wrappedValue),
      bimap(size)(increment)(bimap(bang)(doubleNumber)(wrappedValue)),
      name,
    )
  }
})

Deno.test('bimap: agrees with map on the value channel', () => {
  for (const [name, wrappedValue] of Object.entries(samplesByType)) {
    assertEquals(
      bimap(idf)(doubleNumber)(wrappedValue),
      map(doubleNumber)(wrappedValue),
      name,
    )
  }
})

// Edge cases

Deno.test('bimap: Either.Left calls only its active branch', () => {
  let leftCalls = 0
  let rightCalls = 0

  function transformLeft(error: string) {
    leftCalls++
    return error
  }

  function transformRight(value: number) {
    rightCalls++
    return value
  }

  bimap(transformLeft)(transformRight)(left<string, number>('oops'))

  assertEquals(leftCalls, 1)
  assertEquals(rightCalls, 0)
})

Deno.test('bimap: Either.Right calls only its active branch', () => {
  let leftCalls = 0
  let rightCalls = 0

  function transformLeft(error: string) {
    leftCalls++
    return error
  }

  function transformRight(value: number) {
    rightCalls++
    return value
  }

  bimap(transformLeft)(transformRight)(right<string, number>(2))

  assertEquals(leftCalls, 0)
  assertEquals(rightCalls, 1)
})

Deno.test('bimap: Pair calls both transformations', () => {
  let leftCalls = 0
  let rightCalls = 0

  function transformLeft(error: string) {
    leftCalls++
    return error
  }

  function transformRight(value: number) {
    rightCalls++
    return value
  }

  bimap(transformLeft)(transformRight)(pair('log', 1))

  assertEquals(leftCalls, 1)
  assertEquals(rightCalls, 1)
})

Deno.test('bimap: Either.Left passes only the left value to its first callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  bimap(recordArguments)(idf)(left<string, number>('oops'))

  assertEquals(calls, [['oops']])
})

Deno.test('bimap: Either.Left passes only the right value to its second callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  bimap(idf)(recordArguments)(left<string, number>('oops'))

  assertEquals(calls, [])
})

Deno.test('mapLeft: Either.Left passes only the left value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  mapLeft(recordArguments)(left<string, number>('oops'))

  assertEquals(calls, [['oops']])
})

Deno.test('bimap: Either.Right passes only the left value to its first callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  bimap(recordArguments)(idf)(right<string, number>(1))

  assertEquals(calls, [])
})

Deno.test('bimap: Either.Right passes only the right value to its second callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  bimap(idf)(recordArguments)(right<string, number>(1))

  assertEquals(calls, [[1]])
})

Deno.test('mapLeft: Either.Right passes only the left value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  mapLeft(recordArguments)(right<string, number>(1))

  assertEquals(calls, [])
})

Deno.test('bimap: Pair passes only the left value to its first callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  bimap(recordArguments)(idf)(pair('log', 1))

  assertEquals(calls, [['log']])
})

Deno.test('bimap: Pair passes only the right value to its second callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  bimap(idf)(recordArguments)(pair('log', 1))

  assertEquals(calls, [[1]])
})

Deno.test('mapLeft: Pair passes only the left value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  mapLeft(recordArguments)(pair('log', 1))

  assertEquals(calls, [['log']])
})

Deno.test('bimap: rejects values without Bifunctor', () => {
  // Bypass the type checker to verify the runtime error.
  for (
    const [name, wrappedValue] of [
      ['Array', [1, 2, 3]],
      ['StrMap', { a: 1 }],
      ['Maybe', just(1)],
      ['Maybe', nothing<number>()],
      ['Identity', identity(1)],
    ] as const
  ) {
    assertThrows(
      () => bimap(bang)(doubleNumber)(wrappedValue as never),
      TypeError,
      `bimap: ${name} has no Bifunctor`,
    )
    assertThrows(
      () => mapLeft(bang)(wrappedValue as never),
      TypeError,
      `bimap: ${name} has no Bifunctor`,
    )
  }
})

// Native operation tables

Deno.test('bifunctorNatives: has no native implementations', () => {
  assertEquals(Object.keys(bifunctorNatives), [])
})

// Shared fixtures

const bang = (s: string) => s + '!'

const size = (s: string) => s.length

const doubleNumber = (n: number) => n * 2

const increment = (n: number) => n + 1

const idf = <A>(a: A): A => a

const samplesByType = {
  'Either.Left': left<string, number>('oops'),
  'Either.Right': right<string, number>(1),
  'Pair': pair('log', 1),
}
