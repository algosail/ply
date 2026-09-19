import { assertEquals, assertThrows } from '@std/assert'
import { flip, map, voided, voidRight } from './functor.ts'
import { identity } from '../data/identity.ts'
import { just, nothing } from '../data/maybe.ts'
import { left, right } from '../data/either.ts'
import { pair } from '../data/pair.ts'

// Examples

Deno.test('map: doubles each array element', () => {
  const double = (number: number) => number * 2

  assertEquals(map(double)([1, 2, 3]), [2, 4, 6])
})

Deno.test('map: transforms Just and preserves Nothing', () => {
  const double = (number: number) => number * 2

  assertEquals(map(double)(just(3)), just(6))
  assertEquals(map(double)(nothing<number>()), nothing<number>())
})

Deno.test('map: maps over the last parameter', () => {
  assertEquals(map(increment)(pair('log', 1)), pair('log', 2))
  assertEquals(
    map(increment)(right<string, number>(1)),
    right<string, number>(2),
  )
  assertEquals(
    map(increment)(left<string, number>('error')),
    left<string, number>('error'),
  )
  assertEquals(map(increment)(new Map([['a', 1]])), new Map([['a', 2]]))
})

Deno.test('voidRight: replaces each contained value with the supplied value', () => {
  assertEquals(voidRight('x')([1, 2, 3]), ['x', 'x', 'x'])
  assertEquals(voidRight('x')(just(1)), just('x'))
  assertEquals(voidRight('x')(nothing<number>()), nothing<string>())
})

Deno.test('flip: applies each function in a collection or wrapped value to the same argument', () => {
  assertEquals(flip([Math.floor, Math.ceil])(1.5), [1, 2])
  assertEquals(flip({ floor: Math.floor, ceil: Math.ceil })(1.5), {
    floor: 1,
    ceil: 2,
  })
})

Deno.test('voided: replaces each contained value with undefined', () => {
  assertEquals(voided([1, 2]), [undefined, undefined])
  assertEquals(voided(just(1)), just(undefined))
})

// Laws

Deno.test('map: identity law across supported types', () => {
  for (const [name, wrappedValue] of Object.entries(samplesByType)) {
    assertEquals(map(id)(wrappedValue), wrappedValue, name)
  }
})

Deno.test('map: composition law across supported types', () => {
  function doubleThenIncrement(n: number) {
    return increment(doubleNumber(n))
  }

  for (const [name, wrappedValue] of Object.entries(samplesByType)) {
    assertEquals(
      map(doubleThenIncrement)(wrappedValue),
      map(increment)(map(doubleNumber)(wrappedValue)),
      name,
    )
  }
})

Deno.test('map: both laws on functions', () => {
  function doubleThenIncrement(n: number) {
    return increment(doubleNumber(n))
  }

  const f = (s: string) => s.length
  const probes = ['', 'a', 'abcd']
  const mapped = map(id)(f) as (s: string) => number
  for (const s of probes) assertEquals(mapped(s), f(s))

  const composed = map(doubleThenIncrement)(f) as (
    s: string,
  ) => number
  const twice = map(increment)(map(doubleNumber)(f)) as (s: string) => number
  for (const s of probes) assertEquals(composed(s), twice(s))
})

// Edge cases

Deno.test('map: rejects values without Functor', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => map(increment)('string' as never),
    TypeError,
    'has no Functor',
  )
})

Deno.test('map: parseInt receives no array index as its radix', () => {
  assertEquals(map(Number.parseInt)(['1', '2', '3']), [1, 2, 3])
})

Deno.test('map: Array passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  map(recordArguments)([1, 2, 3])

  assertEquals(calls, [[1], [2], [3]])
})

Deno.test('map: Set passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  map(recordArguments)(new Set([1, 2, 3]))

  assertEquals(calls, [[1], [2], [3]])
})

Deno.test('map: Map passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  map(recordArguments)(new Map([['a', 1], ['b', 2]]))

  assertEquals(calls, [[1], [2]])
})

Deno.test('map: StrMap passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  map(recordArguments)({ a: 1, b: 2 })

  assertEquals(calls, [[1], [2]])
})

Deno.test('map: Just passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  map(recordArguments)(just(1))

  assertEquals(calls, [[1]])
})

Deno.test('map: Nothing passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  map(recordArguments)(nothing<number>())

  assertEquals(calls, [])
})

Deno.test('map: Right passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  map(recordArguments)(right<string, number>(1))

  assertEquals(calls, [[1]])
})

Deno.test('map: Left passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  map(recordArguments)(left<string, number>('error'))

  assertEquals(calls, [])
})

Deno.test('map: Identity passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  map(recordArguments)(identity(1))

  assertEquals(calls, [[1]])
})

Deno.test('map: Pair passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  map(recordArguments)(pair('log', 1))

  assertEquals(calls, [[1]])
})

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a

const samplesByType = {
  'Array': [1, 2, 3] as number[],
  'Set': new Set([1, 2, 3]),
  'Map': new Map([['a', 1], ['b', 2]]),
  'StrMap': { a: 1, b: 2 },
  'Maybe.Just': just(1),
  'Maybe.Nothing': nothing<number>(),
  'Either.Right': right<string, number>(1),
  'Either.Left': left<string, number>('error'),
  'Identity': identity(1),
  'Pair': pair('log', 1),
}
