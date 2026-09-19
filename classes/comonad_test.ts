import { assertEquals, assertThrows } from '@std/assert'
import { comonadNatives, extract } from './comonad.ts'
import { duplicate, extend } from './extend.ts'
import { map } from './functor.ts'
import { toArray } from './foldable.ts'
import { identity } from '../data/identity.ts'
import { pair } from '../data/pair.ts'
import { just, nothing } from '../data/maybe.ts'
import { right } from '../data/either.ts'

// Examples

Deno.test('extract: unwraps an Identity, or returns the second value of a Pair', () => {
  assertEquals(extract(identity('a')), 'a')
  assertEquals(extract(pair('log', 42)), 42)
})

Deno.test('extract: on two-slot types it takes the right slot', () => {
  assertEquals(extract(pair(1, 2)), 2)
})

// Laws

Deno.test('extract: the left identity law across supported types', () => {
  for (const [name, w] of Object.entries(samplesByType)) {
    assertEquals(extract(extend(whole)(w as never) as never), whole(w), name)
    assertEquals(extract(extend(loud)(w as never) as never), loud(w), name)
  }
})

Deno.test('extract: the right identity law across supported types', () => {
  for (const [name, w] of Object.entries(samplesByType)) {
    assertEquals(extend(extract)(w), w, name)
  }
})

// Edge cases

Deno.test('extract: extract ∘ duplicate is the identity', () => {
  for (const [name, w] of Object.entries(samplesByType)) {
    assertEquals(extract(duplicate(w)), w, name)
  }
})

Deno.test('extract: map(extract) ∘ duplicate is the identity', () => {
  for (const [name, w] of Object.entries(samplesByType)) {
    assertEquals(map(extract as never)(duplicate(w as never) as never), w, name)
  }
})

Deno.test('extract: the coassociativity of duplicate across supported types', () => {
  for (const [name, w] of Object.entries(samplesByType)) {
    assertEquals(
      duplicate(duplicate(w as never) as never),
      map(duplicate as never)(duplicate(w as never) as never),
      name,
    )
  }
})

Deno.test('extract: rejects values without Comonad', () => {
  // Bypass the type checker to verify the runtime error.
  const strangers = {
    'Array': [1, 2, 3],
    'Set': new Set([1, 2, 3]),
    'Map': new Map([['a', 1]]),
    'StrMap': { a: 1 },
    'Maybe.Just': just(1),
    'Maybe.Nothing': nothing<number>(),
    'Either.Right': right<string, number>(1),
    'String': 'string',
  }
  for (const [name, wrappedValue] of Object.entries(strangers)) {
    assertThrows(
      () => extract(wrappedValue as never),
      TypeError,
      'has no Comonad',
      name,
    )
  }
})

Deno.test('extract: rejects both Just and Nothing', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(() => extract(just(1) as never), TypeError, 'Maybe')
})

// Native operation tables

Deno.test('comonadNatives: there are no native representatives', () => {
  assertEquals(Object.keys(comonadNatives), [])
})

// Fixtures and compile-time assertions

const samplesByType = {
  'Identity': identity('a'),
  'Pair': pair('log', 'a'),
}

const focus = (w: unknown): string => extract(w as never)

const loud = (w: unknown): string => focus(w).toUpperCase()

const whole = (w: unknown): string => (toArray(w as never) as string[]).join('')
