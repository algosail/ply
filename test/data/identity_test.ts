import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alt } from '../../src/classes/alt.ts'
import { extract } from '../../src/classes/comonad.ts'
import { duplicate, extend } from '../../src/classes/extend.ts'
import { filter } from '../../src/classes/filterable.ts'
import { size, toArray } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { empty } from '../../src/classes/monoid.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { Either, left, right } from '../../src/data/either.ts'
import { Identity, identity } from '../../src/data/identity.ts'
import { just, Maybe, nothing } from '../../src/data/maybe.ts'

test ('Identity: uses its public name and supports detached static functions', () => {
  const { is, of } = Identity

  assert.deepStrictEqual (Object.getPrototypeOf (of (42)).constructor.name, 'Identity')
  assert.deepStrictEqual (of (42), identity (42))
  assert.deepStrictEqual (is (of (42)), true)
  assert.deepStrictEqual (is (42), false)
})

test ('Identity: instances store the payload and share their methods', () => {
  const first = identity (1)
  const second = identity (2)

  assert.deepStrictEqual (Object.keys (first), ['value'])
  assert.deepStrictEqual (first.map === second.map, true)
  assert.deepStrictEqual (JSON.stringify (first), '{"value":1}')
})

test ('identity: wraps a value so it can be used with operations such as map and chain', () => {
  const w = identity (1)

  assert.deepStrictEqual (w.value, 1)
  assert.deepStrictEqual (w.constructor['@@type'], 'Identity')
  assert.deepStrictEqual (identity (identity (1)).value, identity (1))
})

test ('Identity: creates values and identifies their type', () => {
  assert.deepStrictEqual (Identity['@@type'], 'Identity')
  assert.deepStrictEqual (Identity.of (1), identity (1))
  const rep: unknown = identity (1).constructor

  assert.deepStrictEqual (rep, Identity)
})

test ('map: transforms contained values', () => {
  assert.deepStrictEqual (identity (1).map (increment), identity (2))
  assert.deepStrictEqual (map (increment) (identity (1)), identity (2))
  let calls = 0

  function recordValue(n: number) {
    calls++
    return n
  }

  identity (1).map (recordValue)

  assert.deepStrictEqual (calls, 1)
})

test ('ap: applies wrapped functions to wrapped values', () => {
  assert.deepStrictEqual (identity (1).ap (identity (increment)), identity (2))
})

test ('chain: sequences computations that return the same wrapper', () => {
  assert.deepStrictEqual (identity (4).chain ((n) => identity (n / 2)), identity (2))
  assert.deepStrictEqual (
    identity (1).chain ((n) => identity (identity (n))),
    identity (identity (1)),
  )
})

test ('extract: unwraps an Identity, or returns the second value of a Pair', () => {
  assert.deepStrictEqual (identity (1).extract (), 1)
  assert.deepStrictEqual (extract (identity (1)), 1)
  assert.deepStrictEqual (extract (Identity.of ('x')), 'x')
  assert.deepStrictEqual (Identity.of (extract (identity ('x'))), identity ('x'))
})

test ('reduce: combines values from left to right, starting with an initial accumulator', () => {
  assert.deepStrictEqual (
    identity (3).reduce ((accumulator: number, a) => accumulator + a, 10),
    13,
  )
  assert.deepStrictEqual (toArray (identity (1)), [1])
  assert.deepStrictEqual (size (identity (1)), 1)
})

test ('traverse: transforms values into a chosen wrapper and collects them inside one result', () => {
  assert.deepStrictEqual (
    identity (1).traverse (Maybe, (n: number) => just (n * 2)),
    just (identity (2)),
  )
  assert.deepStrictEqual (
    identity (1).traverse (Maybe, () => nothing<number> ()),
    nothing<Identity<number>> (),
  )
  assert.deepStrictEqual (
    identity (1).traverse (Identity, (n: number) => identity (n)),
    identity (identity (1)),
  )
  assert.deepStrictEqual (
    identity (-1).traverse (Identity, (n: number) => identity (n)),
    identity (identity (-1)),
  )
})

test ('equals: compares values by content, including nested arrays and records', () => {
  assert.deepStrictEqual (identity (1).equals (identity (1)), true)
  assert.deepStrictEqual (identity (1).equals (identity (2)), false)
  assert.deepStrictEqual (identity ([1, [2]]).equals (identity ([1, [2]])), true)
  assert.deepStrictEqual (identity (just (1)).equals (identity (just (1))), true)
  assert.deepStrictEqual (identity (just (1)).equals (identity (nothing<number> ())), false)
})

test ('lte: checks whether the value is at most the supplied bound', () => {
  assert.deepStrictEqual (identity (1).lte (identity (2)), true)
  assert.deepStrictEqual (identity (2).lte (identity (1)), false)
  assert.deepStrictEqual (identity (1).lte (identity (1)), true)
  assert.deepStrictEqual (identity ('a').lte (identity ('b')), true)
  assert.deepStrictEqual (identity ([1, 1]).lte (identity ([1, 2])), true)
})

test ("show: formats a value as a readable string, including ply's wrapped values", () => {
  assert.deepStrictEqual (identity (1).show (), 'Identity (1)')
  assert.deepStrictEqual (identity ('foo').show (), 'Identity ("foo")')
  assert.deepStrictEqual (identity (identity (1)).show (), 'Identity (Identity (1))')
  assert.deepStrictEqual (identity (just (1)).show (), 'Identity (Just (1))')
  assert.deepStrictEqual (identity ([1, 2]).show (), 'Identity ([1, 2])')
})

test ('duplicate: wraps a value together with its existing wrapper', () => {
  assert.deepStrictEqual (duplicate (identity (1)), identity (identity (1)))
  assert.deepStrictEqual (duplicate (identity (1)), identity (1).extend (id))
})

test ('lte: the order is total and antisymmetric', () => {
  const values = [identity (1), identity (2), identity (3)]
  for (const a of values) {
    for (const b of values) {
      assert.deepStrictEqual (a.lte (b) || b.lte (a), true, 'totality')
      if (a.lte (b) && b.lte (a)) assert.deepStrictEqual (a.equals (b), true, 'antisymm.')
      for (const c of values) {
        if (a.lte (b) && b.lte (c)) assert.deepStrictEqual (a.lte (c), true, 'transitivity')
      }
    }
  }
})

test ('map: functor laws', () => {
  const w = identity (3)

  assert.deepStrictEqual (w.map (id), w, 'identity')
  assert.deepStrictEqual (
    w.map ((n) => increment (doubleNumber (n))),
    w.map (doubleNumber).map (increment),
    'composition',
  )
})

test ('ap: applicative laws', () => {
  const f = (n: number) => n + 3
  const v = identity (7)

  assert.deepStrictEqual (v.ap (Identity.of (id)), v, 'identity')
  assert.deepStrictEqual (
    Identity.of (7).ap (Identity.of (f)),
    Identity.of (f (7)),
    'homomorphism',
  )
  assert.deepStrictEqual (
    Identity.of (7).ap (identity (f)),
    identity (f).ap (Identity.of ((g: (n: number) => number) => g (7))),
    'interchange',
  )
  const composeFunctions =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f (g (a))
  const u = identity (increment)
  const vv = identity (doubleNumber)
  const w = identity (5)

  assert.deepStrictEqual (
    w.ap (vv.ap (u.map (composeFunctions))),
    w.ap (vv).ap (u),
    'composition',
  )
})

test ('chain: monad laws', () => {
  function incrementIdentity(n: number) {
    return identity (n + 1)
  }

  const f = (n: number) => identity (n * 2)
  const g = incrementIdentity
  const m = identity (3)

  assert.deepStrictEqual (m.chain (f).chain (g), m.chain ((n) => f (n).chain (g)), 'assoc.')
  assert.deepStrictEqual (m.chain ((a) => Identity.of (a)), m, 'right identity')
  assert.deepStrictEqual (Identity.of (3).chain (f), f (3), 'left identity')
})

test ('extend: comonad laws', () => {
  const w = identity (5)
  const f = (x: Identity<number>) => x.extract () + 1
  const g = (x: Identity<number>) => x.extract () * 2

  assert.deepStrictEqual (w.extend ((x) => x.extract ()), w, 'left identity')
  assert.deepStrictEqual (w.extend (f).extract (), f (w), 'right identity')
  assert.deepStrictEqual (
    w.extend (g).extend (f),
    w.extend ((x) => f (x.extend (g))),
    'extend associativity',
  )
})

test ('equals: Setoid laws', () => {
  const values = [identity (1), identity (2), identity (1)]
  for (const a of values) {
    assert.deepStrictEqual (a.equals (a), true, 'reflexivity')
    for (const b of values) {
      assert.deepStrictEqual (a.equals (b), b.equals (a), 'symmetry')
      for (const c of values) {
        if (a.equals (b) && b.equals (c)) {
          assert.deepStrictEqual (a.equals (c), true, 'transitivity')
        }
      }
    }
  }
})

test ('extend: computes a new value from the whole wrapper', () => {
  assert.deepStrictEqual (identity (1).extend ((w) => w.value + 1), identity (2))
  assert.deepStrictEqual (
    extend ((w: Identity<number>) => w.extract () * 10) (identity (3)),
    identity (30),
  )
})

test ('traverse: preserves the failure returned by the callback', () => {
  assert.deepStrictEqual (
    identity (1).traverse (Either, (n: number) => right<string, number> (n)),
    right<string, Identity<number>> (identity (1)),
  )
  assert.deepStrictEqual (
    identity (1).traverse (Either, () => left<string, number> ('err')),
    left<string, Identity<number>> ('err'),
  )
})

test ('Identity: alt, filter, concat and empty all refuse', () => {
  assert.throws (
    () => alt (identity (2) as never) (identity (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('alt: Identity has no Alt'),
  )
  assert.throws (
    () => filter (((n: number) => n > 0) as never) (identity (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('filter: Identity has no Filterable'),
  )
  assert.throws (
    () => concat (identity ('a') as never) (identity ('b') as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Identity has no Semigroup'),
  )
  assert.throws (
    () => empty (Identity as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('empty: Identity has no Monoid'),
  )
})

test ('map: Identity passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  identity (1).map (recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('chain: Identity passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return identity (1)
  }

  identity (1).chain (recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('extend: Identity passes the whole wrapper', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  identity (1).extend (recordArguments)

  assert.deepStrictEqual (calls, [[identity (1)]])
})

test ('traverse: Identity passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return identity (1)
  }

  identity (1).traverse (Identity, recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('reduce: Identity passes accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  identity (1).reduce (recordArguments, 0)

  assert.deepStrictEqual (calls, [[0, 1]])
})

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a
