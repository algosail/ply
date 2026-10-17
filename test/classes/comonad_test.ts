import { test } from 'node:test'
import { assertEquals, assertThrows } from '../assert.ts'
import { comonadNatives, extract } from '../../src/classes/comonad.ts'
import { duplicate, extend } from '../../src/classes/extend.ts'
import { map } from '../../src/classes/functor.ts'
import { toArray } from '../../src/classes/foldable.ts'
import { identity } from '../../src/data/identity.ts'
import { pair } from '../../src/data/pair.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { right } from '../../src/data/either.ts'

test ('extract: unwraps an Identity, or returns the second value of a Pair', () => {
  assertEquals (extract (identity ('a')), 'a')
  assertEquals (extract (pair ('log', 42)), 42)
})

test ('extract: on two-slot types it takes the right slot', () => {
  assertEquals (extract (pair (1, 2)), 2)
})

test ('extract: the left identity law across supported types', () => {
  for (const [name, w] of Object.entries (samplesByType)) {
    assertEquals (extract (extend (whole) (w as never) as never), whole (w), name)
    assertEquals (extract (extend (loud) (w as never) as never), loud (w), name)
  }
})

test ('extract: the right identity law across supported types', () => {
  for (const [name, w] of Object.entries (samplesByType)) {
    assertEquals (extend (extract) (w), w, name)
  }
})

test ('extract: extract ∘ duplicate is the identity', () => {
  for (const [name, w] of Object.entries (samplesByType)) {
    assertEquals (extract (duplicate (w)), w, name)
  }
})

test ('extract: map(extract) ∘ duplicate is the identity', () => {
  for (const [name, w] of Object.entries (samplesByType)) {
    assertEquals (map (extract as never) (duplicate (w as never) as never), w, name)
  }
})

test ('extract: the coassociativity of duplicate across supported types', () => {
  for (const [name, w] of Object.entries (samplesByType)) {
    assertEquals (
      duplicate (duplicate (w as never) as never),
      map (duplicate as never) (duplicate (w as never) as never),
      name,
    )
  }
})

test ('extract: rejects values without Comonad', () => {
  const strangers = {
    'Array': [1, 2, 3],
    'Set': new Set ([1, 2, 3]),
    'Map': new Map ([['a', 1]]),
    'StrMap': { a: 1 },
    'Maybe.Just': just (1),
    'Maybe.Nothing': nothing<number> (),
    'Either.Right': right<string, number> (1),
    'String': 'string',
  }
  for (const [name, wrappedValue] of Object.entries (strangers)) {
    assertThrows (
      () => extract (wrappedValue as never),
      TypeError,
      'has no Comonad',
      name,
    )
  }
})

test ('extract: rejects both Just and Nothing', () => {
  assertThrows (() => extract (just (1) as never), TypeError, 'Maybe')
})

test ('comonadNatives: there are no native representatives', () => {
  assertEquals (Object.keys (comonadNatives), [])
})

const samplesByType = {
  'Identity': identity ('a'),
  'Pair': pair ('log', 'a'),
}

const focus = (w: unknown): string => extract (w as never)

const loud = (w: unknown): string => focus (w).toUpperCase ()

const whole = (w: unknown): string => (toArray (w as never) as string[]).join ('')
