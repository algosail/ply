import assert from 'node:assert/strict'
import { test } from 'node:test'
import { comonadNatives, extract } from '../../src/classes/comonad.ts'
import { duplicate, extend } from '../../src/classes/extend.ts'
import { toArray } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { right } from '../../src/data/either.ts'
import { identity } from '../../src/data/identity.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'

test ('extract: unwraps an Identity, or returns the second value of a Pair', () => {
  assert.deepStrictEqual (extract (identity ('a')), 'a')
  assert.deepStrictEqual (extract (pair ('log', 42)), 42)
})

test ('extract: on two-slot types it takes the right slot', () => {
  assert.deepStrictEqual (extract (pair (1, 2)), 2)
})

test ('extract: the left identity law across supported types', () => {
  for (const [name, w] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (extract (extend (whole) (w as never) as never), whole (w), name)
    assert.deepStrictEqual (extract (extend (loud) (w as never) as never), loud (w), name)
  }
})

test ('extract: the right identity law across supported types', () => {
  for (const [name, w] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (extend (extract) (w), w, name)
  }
})

test ('extract: extract ∘ duplicate is the identity', () => {
  for (const [name, w] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (extract (duplicate (w)), w, name)
  }
})

test ('extract: map(extract) ∘ duplicate is the identity', () => {
  for (const [name, w] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (map (extract as never) (duplicate (w as never) as never), w, name)
  }
})

test ('extract: the coassociativity of duplicate across supported types', () => {
  for (const [name, w] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (
      duplicate (duplicate (w as never) as never),
      map (duplicate as never) (duplicate (w as never) as never),
      name,
    )
  }
})

test ('extract: rejects values without Comonad', () => {
  const strangers = {
    Array: [1, 2, 3],
    Set: new Set ([1, 2, 3]),
    Map: new Map ([['a', 1]]),
    StrMap: { a: 1 },
    'Maybe.Just': just (1),
    'Maybe.Nothing': nothing<number> (),
    'Either.Right': right<string, number> (1),
    String: 'string',
  }
  for (const [name, wrappedValue] of Object.entries (strangers)) {
    assert.throws (
      () => extract (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Comonad'),
      name,
    )
  }
})

test ('extract: rejects both Just and Nothing', () => {
  assert.throws (
    () => extract (just (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Maybe'),
  )
})

test ('comonadNatives: there are no native representatives', () => {
  assert.deepStrictEqual (Object.keys (comonadNatives), [])
})

const samplesByType = {
  Identity: identity ('a'),
  Pair: pair ('log', 'a'),
}

const focus = (w: unknown): string => extract (w as never)

const loud = (w: unknown): string => focus (w).toUpperCase ()

const whole = (w: unknown): string => (toArray (w as never) as string[]).join ('')
