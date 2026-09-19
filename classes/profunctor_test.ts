import { assertEquals, assertThrows } from '@std/assert'
import { profunctorNatives, promap } from './profunctor.ts'
import { contramap } from './contravariant.ts'
import { map } from './functor.ts'
import { just } from '../data/maybe.ts'
import { right } from '../data/either.ts'
import { pair } from '../data/pair.ts'

// Examples

Deno.test('promap: adapts both the input and output of a function', () => {
  const f = promap(len)(hash)(doubleNumber)

  assertEquals(f('ab'), '#4')
  assertEquals(f(''), '#0')
})

// Laws

Deno.test('promap: identity law', () => {
  const p = (n: number) => n * 3
  const same = promap(idf<number>)(idf<number>)(p)
  for (const n of [0, 1, -4, 9]) assertEquals(same(n), p(n))
})

Deno.test('promap: composition law', () => {
  const p = (n: number) => n + 100
  const twice = promap(increment)(hash)(promap(doubleNumber)(increment)(p))
  const once = promap((n: number) => doubleNumber(increment(n)))((n: number) =>
    hash(increment(n))
  )(p)
  for (const n of [0, 1, 5]) assertEquals(twice(n), once(n))
})

Deno.test('promap: agrees with map and contramap', () => {
  const p = (n: number) => n * 3
  const asMap = promap(idf<number>)(hash)(p)
  const viaMap = map(hash)(p)
  const asContramap = promap(len)(idf<number>)(p)
  const viaContramap = contramap(len)(p)
  for (const n of [0, 2, 7]) assertEquals(asMap(n), viaMap(n))
  for (const s of ['', 'ab', 'abcd']) {
    assertEquals(asContramap(s), viaContramap(s))
  }
})

// Edge cases

Deno.test('promap: each adapter receives only the value it transforms', () => {
  const inputCalls: unknown[][] = []
  const outputCalls: unknown[][] = []

  function adaptInput(...args: unknown[]) {
    inputCalls.push(args)
    return 1
  }

  function adaptOutput(...args: unknown[]) {
    outputCalls.push(args)
    return 'x'
  }

  promap(adaptInput)(adaptOutput)(doubleNumber)('abc')

  assertEquals(inputCalls, [['abc']])
  assertEquals(outputCalls, [[2]])
})

Deno.test('promap: rejects values without Profunctor', () => {
  // Bypass the type checker to verify the runtime error.
  for (
    const [name, wrappedValue] of [
      ['Array', [1, 2, 3]],
      ['Maybe', just(1)],
      ['Either', right<string, number>(1)],
      ['Pair', pair('l', 1)],
    ] as const
  ) {
    assertThrows(
      () => promap(len)(hash)(wrappedValue as never),
      TypeError,
      `promap: ${name} has no Profunctor`,
    )
  }
})

// Native operation tables

Deno.test('profunctorNatives: provides only Fn operations', () => {
  assertEquals(Object.keys(profunctorNatives), ['Fn'])
  assertEquals(typeof profunctorNatives.Fn.promap, 'function')
})

// Shared fixtures

const len = (s: string) => s.length

const doubleNumber = (n: number) => n * 2

const increment = (n: number) => n + 1

const hash = (n: number) => `#${n}`

const idf = <A>(a: A): A => a
