import { assertEquals, assertThrows } from '@std/assert'
import { chain, chainNatives, join } from './chain.ts'
import { ap } from './apply.ts'
import { of } from './applicative.ts'
import { map } from './functor.ts'
import { Identity, identity } from '../data/identity.ts'
import { just, Maybe, nothing } from '../data/maybe.ts'
import { Either, left, right } from '../data/either.ts'
import { type Pair, pair } from '../data/pair.ts'
import { Arr } from '../natives/array.ts'
import { Fn } from '../natives/function.ts'
import { Sets } from '../natives/set.ts'

// Examples

Deno.test('chain: sequences computations that return the same wrapper', () => {
  function repeatNumber(n: number) {
    return [n, n]
  }

  function includeTenfold(n: number) {
    return new Set([n, n * 10])
  }

  function incrementMaybe(n: number) {
    return just(n + 1)
  }

  function incrementEither(n: number) {
    return right<string, number>(n + 1)
  }

  function incrementIdentity(n: number) {
    return identity(n + 1)
  }

  function doubleWithLog(n: number) {
    return pair('b', n * 2)
  }

  assertEquals(chain(repeatNumber)([1, 2]), [1, 1, 2, 2])
  assertEquals(
    chain(includeTenfold)(new Set([1, 2])),
    new Set([1, 10, 2, 20]),
  )
  assertEquals(chain(incrementMaybe)(just(1)), just(2))
  assertEquals(
    chain(incrementMaybe)(nothing<number>()),
    nothing<number>(),
  )
  assertEquals(
    chain(incrementEither)(right<string, number>(1)),
    right<string, number>(2),
  )
  assertEquals(
    chain(incrementEither)(left<string, number>('e')),
    left<string, number>('e'),
  )
  assertEquals(
    chain(incrementIdentity)(identity(1)),
    identity(2),
  )
  // from the @example in data/pair.ts
  assertEquals(
    chain(doubleWithLog)(pair('a', 1)),
    pair('ab', 2),
  )
})

Deno.test('chain: passes the same input to the first function and its continuation', () => {
  const g = (i: number) => i * 2
  const f = (a: number) => (i: number) => a + i

  assertEquals((chain(f)(g) as (i: number) => number)(3), 9)
})

Deno.test('chain: the monad left identity across supported types with of', () => {
  for (const [name, { f, T }] of Object.entries(samplesByType)) {
    if (T === undefined) continue

    assertEquals(chain(f)(of(T as never)(1) as never), f(1), name)
  }
})

Deno.test('chain: the monad right identity across supported types with of', () => {
  for (const [name, { m, T }] of Object.entries(samplesByType)) {
    if (T === undefined) continue

    assertEquals(chain((a: number) => of(T as never)(a))(m as never), m, name)
  }
})

Deno.test('chain: both monad identities on functions', () => {
  const probes = [0, 1, 7]
  const g = (i: number) => i * 2
  const f = (a: number) => (i: number) => a + i
  const leftUnit = chain(f)(of(Fn)(1)) as (i: number) => number
  for (const i of probes) assertEquals(leftUnit(i), f(1)(i), `left at i=${i}`)
  const rightUnit = chain((a: number) => of(Fn)(a))(g) as (
    i: number,
  ) => number
  for (const i of probes) assertEquals(rightUnit(i), g(i), `right at i=${i}`)
})

Deno.test('join: removes one level of nesting from arrays or wrapped values of the same type', () => {
  assertEquals(join([[1], [2]]), [1, 2])
  assertEquals(join(just(just(1))), just(1))
  assertEquals(join(just(nothing<number>())), nothing<number>())
  assertEquals(join(identity(identity(1))), identity(1))
  assertEquals(join(pair('A', pair('B', 7))), pair('AB', 7))
})

Deno.test('join: this is chain with identity', () => {
  for (const [name, { m, f }] of Object.entries(samplesByType)) {
    assertEquals(join(map(f)(m as never) as never), chain(f)(m as never), name)
  }
})

// Laws

Deno.test('chain: associativity law across supported types', () => {
  for (const [name, { m, f, g }] of Object.entries(samplesByType)) {
    assertEquals(
      chain(g)(chain(f)(m as never) as never),
      chain((x: number) => chain(g)(f(x) as never))(m as never),
      name,
    )
  }
})

Deno.test('chain: associativity preserves the order of accumulated logs', () => {
  const f = (n: number) => [n, n + 1]
  const g = (n: number) => [n * 10, -n]

  assertEquals(chain(g)(chain(f)([1])), [10, -1, 20, -2])
  assertEquals(chain(f)(chain(g)([1])), [10, 11, -1, 0])
})

Deno.test('chain: agrees with ap', () => {
  const fns: Record<
    string,
    { readonly wrappedFunctions: unknown; readonly wrappedValue: unknown }
  > = {
    'Array': {
      wrappedFunctions: [increment, (n: number) => n * 10],
      wrappedValue: [1, 2],
    },
    'Set': {
      wrappedFunctions: new Set([increment]),
      wrappedValue: new Set([1, 2]),
    },
    'Maybe': { wrappedFunctions: just(increment), wrappedValue: just(1) },
    'Either': {
      wrappedFunctions: right<string, (a: number) => number>(increment),
      wrappedValue: right<string, number>(1),
    },
    'Identity': {
      wrappedFunctions: identity(increment),
      wrappedValue: identity(1),
    },
    'Pair': {
      wrappedFunctions: pair('f', increment),
      wrappedValue: pair('a', 1),
    },
  }
  for (
    const [name, { wrappedFunctions, wrappedValue }] of Object.entries(fns)
  ) {
    assertEquals(
      ap(wrappedFunctions as never)(wrappedValue as never),
      chain((k: (a: number) => number) => map(k)(wrappedValue as never))(
        wrappedFunctions as never,
      ),
      name,
    )
  }
})

// Edge cases

Deno.test('chain: rejects values without Chain', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => chain((n: number) => [n])(new Map([['a', 1]]) as never),
    TypeError,
    'chain: Map has no Chain',
  )
  assertThrows(
    () => chain((n: number) => [n])({ a: 1 } as never),
    TypeError,
    'chain: StrMap has no Chain',
  )
  assertThrows(
    () => chain((s: string) => [s])('string' as never),
    TypeError,
    'chain: String has no Chain',
  )
})

Deno.test('chain: Array passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return [1]
  }

  chain(recordArguments)([1, 2])

  assertEquals(calls, [[1], [2]])
})

Deno.test('chain: Set passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return new Set([1])
  }

  chain(recordArguments)(new Set([1, 2]))

  assertEquals(calls, [[1], [2]])
})

Deno.test('chain: Maybe passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return just(1)
  }

  chain(recordArguments)(just(1))

  assertEquals(calls, [[1]])
})

Deno.test('chain: Either passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return right<string, number>(1)
  }

  chain(recordArguments)(right<string, number>(1))

  assertEquals(calls, [[1]])
})

Deno.test('chain: Identity passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return identity(1)
  }

  chain(recordArguments)(identity(1))

  assertEquals(calls, [[1]])
})

Deno.test('chain: Pair passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return pair('r', 1)
  }

  chain(recordArguments)(pair('l', 1))

  assertEquals(calls, [[1]])
})

Deno.test('chain: Function passes only the first function’s result', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return returnInput
  }

  function returnInput(value: number) {
    return value
  }

  const chained = chain(recordArguments)(returnInput)
  chained(1)

  assertEquals(calls, [[1]])
})

// Type checking

Deno.test('chain types: reject callbacks that return a different wrapper', () => {
  function repeatNumber(n: number) {
    return [n, n]
  }

  const arr = [1, 2]
  const toPair = (n: number) => pair<string, number>('L', n)
  const toArr = repeatNumber
  const writer = pair<string, number>('a', 1)

  // @ts-expect-error the arrow lands in Pair, the value is an Array
  const _chainMixed = () => chain(toPair)(arr)
  // @ts-expect-error and the other way round
  const _chainMixedBack = () => chain(toArr)(writer)
  const toOtherAcc = (n: number) => pair<number[], number>([9], n)
  // @ts-expect-error same type, but the accumulators do not agree
  const _chainAcc = () => chain(toOtherAcc)(writer)

  assertEquals(
    chain((n: number) => pair<string, number>('b', n * 2))(writer),
    pair('ab', 2),
  )
})

Deno.test('join types: require matching inner and outer wrappers', () => {
  const nested = pair<string, Pair<number[], number>>('outer', pair([1, 2], 42))
  // @ts-expect-error the inner accumulator is an array, the outer a string
  const _joinMixed = () => join(nested)

  assertEquals(
    join(pair<string, Pair<string, number>>('outer', pair('in', 42))),
    pair('outerin', 42),
  )
  assertEquals(join([[1], [2]]), [1, 2])
  assertEquals(join(just(just(1))), just(1))
})

// Native operation tables

Deno.test('chainNatives: lists the supported native implementations', () => {
  function repeatNumber(n: number) {
    return [n, n]
  }

  assertEquals(
    new Set(Object.keys(chainNatives)),
    new Set(['Array', 'Fn', 'Set']),
  )
  assertEquals(chainNatives.Array.chain([1, 2], repeatNumber), [
    1,
    1,
    2,
    2,
  ])
  assertEquals(
    chainNatives.Set.chain(new Set([1, 2]), (n: number) => new Set([n * 10])),
    new Set([10, 20]),
  )
})

// Shared fixtures

const increment = (n: number) => n + 1

interface Bind {
  readonly m: unknown
  readonly f: (n: number) => unknown
  readonly g: (n: number) => unknown
  readonly T?: unknown
}

const samplesByType: Record<string, Bind> = {
  'Array': {
    m: [1, 2],
    f: (n) => [n, n + 1],
    g: (n) => [n * 10, -n],
    T: Arr,
  },
  'Set': {
    m: new Set([1, 2]),
    f: (n) => new Set([n, n + 1]),
    g: (n) => new Set([n * 10, -n]),
    T: Sets,
  },
  'Maybe.Just': {
    m: just(1),
    f: (n) => just(n + 1),
    g: (n) => just(n * 10),
    T: Maybe,
  },
  'Maybe.Nothing': {
    m: nothing<number>(),
    f: (n) => just(n + 1),
    g: (n) => just(n * 10),
    T: Maybe,
  },
  'Either.Right': {
    m: right<string, number>(1),
    f: (n) => right<string, number>(n + 1),
    g: (n) => right<string, number>(n * 10),
    T: Either,
  },
  'Either.Left': {
    m: left<string, number>('error'),
    f: (n) => right<string, number>(n + 1),
    g: (n) => right<string, number>(n * 10),
    T: Either,
  },
  'Identity': {
    m: identity(1),
    f: (n) => identity(n + 1),
    g: (n) => identity(n * 10),
    T: Identity,
  },
  'Pair': {
    m: pair('m', 1),
    f: (n) => pair('f', n + 1),
    g: (n) => pair('g', n * 10),
  },
}
