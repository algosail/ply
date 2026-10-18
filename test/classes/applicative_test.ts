import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applicativeNatives, of } from '../../src/classes/applicative.ts'
import { ap } from '../../src/classes/apply.ts'
import { Either, right } from '../../src/data/either.ts'
import { Identity, identity } from '../../src/data/identity.ts'
import { just, Maybe, nothing } from '../../src/data/maybe.ts'
import { Pair } from '../../src/data/pair.ts'
import { Arr } from '../../src/natives/array.ts'
import { Fn } from '../../src/natives/function.ts'
import { Maps } from '../../src/natives/map.ts'
import { Sets } from '../../src/natives/set.ts'
import { Str } from '../../src/natives/string.ts'
import { StrMap } from '../../src/natives/strmap.ts'

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a

interface Case {
  readonly T: unknown
  readonly u: unknown
  readonly v: unknown
}

const applicatives: Record<string, Case> = {
  Array: { T: Arr, u: [increment, doubleNumber], v: [1, 2] },
  Set: { T: Sets, u: new Set ([increment, doubleNumber]), v: new Set ([1, 2]) },
  'Maybe.Just': { T: Maybe, u: just (increment), v: just (1) },
  'Maybe.Nothing': { T: Maybe, u: just (increment), v: nothing<number> () },
  Either: {
    T: Either,
    u: right<string, (a: number) => number> (increment),
    v: right<string, number> (1),
  },
  Identity: { T: Identity, u: identity (increment), v: identity (1) },
}

test ('of: wraps a value in the selected type', () => {
  assert.deepStrictEqual (of (Arr) (7), [7])
  assert.deepStrictEqual (of (Sets) (7), new Set ([7]))
  assert.deepStrictEqual (of (Maybe) (7), just (7))
  assert.deepStrictEqual (of (Either) (7), right (7))
  assert.deepStrictEqual (of (Identity) (7), identity (7))
})

test ('of: on functions this is the constant function', () => {
  const seven = of (Fn) (7) as (i: unknown) => number
  assert.deepStrictEqual ([seven (0), seven ('anything'), seven (null)], [7, 7, 7])
})

test ('of: identity law across supported applicatives', () => {
  for (const [name, { T, v }] of Object.entries (applicatives)) {
    assert.deepStrictEqual (ap (of (T as never) (id) as never) (v as never), v, name)
  }
})

test ('of: the homomorphism law across supported applicatives', () => {
  for (const [name, { T }] of Object.entries (applicatives)) {
    assert.deepStrictEqual (
      ap (of (T as never) (increment) as never) (of (T as never) (1) as never),
      of (T as never) (2),
      name,
    )
  }
})

test ('of: the interchange law across supported applicatives', () => {
  const y = 5
  for (const [name, { T, u }] of Object.entries (applicatives)) {
    assert.deepStrictEqual (
      ap (u as never) (of (T as never) (y) as never),
      ap (of (T as never) ((f: (a: number) => number) => f (y)) as never) (
        u as never,
      ),
      name,
    )
  }
})

test ('of: all three laws on functions', () => {
  const probes = [0, 1, 7]
  const u = (i: number) => (n: number) => n + i
  const v = (i: number) => i * 2
  const y = 5

  const identityLaw = ap (of (Fn) (id)) (v) as (
    i: number,
  ) => number
  for (const i of probes) {
    assert.deepStrictEqual (identityLaw (i), v (i), `identity at i=${i}`)
  }

  const homL = ap (of (Fn) (increment)) (of (Fn) (1)) as (
    i: number,
  ) => number
  const homR = of (Fn) (increment (1)) as (i: number) => number
  for (const i of probes) {
    assert.deepStrictEqual (homL (i), homR (i), `homomorphism at i=${i}`)
  }

  const excL = ap (u) (of (Fn) (y)) as (i: number) => number
  const excR = ap (of (Fn) ((f: (a: number) => number) => f (y))) (
    u,
  ) as (
    i: number,
  ) => number
  for (const i of probes) {
    assert.deepStrictEqual (excL (i), excR (i), `interchange at i=${i}`)
  }
})

test ('of: rejects values without Applicative', () => {
  assert.throws (
    () => of (Pair as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('of: Pair has no Applicative'),
  )
  assert.throws (
    () => of (Maps as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('of: Map has no Applicative'),
  )
  assert.throws (
    () => of (StrMap as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('of: StrMap has no Applicative'),
  )
  assert.throws (
    () => of (Str as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('of: String has no Applicative'),
  )
})

test ('of: the failure calls the type by name, not by value', () => {
  assert.throws (
    () => of (null as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('of: Null has no Applicative'),
  )
  assert.throws (
    () => of (undefined as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('of: Undefined has no Applicative'),
  )
  assert.throws (
    () => of ({} as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('of: StrMap has no Applicative'),
  )
})

test ('applicativeNatives: lists the supported native implementations', () => {
  assert.deepStrictEqual (
    new Set (Object.keys (applicativeNatives)),
    new Set (['Array', 'Fn', 'Set']),
  )
  assert.deepStrictEqual (applicativeNatives.Array.of (7), [7])
  assert.deepStrictEqual (applicativeNatives.Set.of (7), new Set ([7]))
  assert.deepStrictEqual (
    (applicativeNatives.Fn.of (7) as (i: never) => number) (0 as never),
    7,
  )
})
