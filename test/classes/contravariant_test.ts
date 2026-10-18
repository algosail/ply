import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contramap, contravariantNatives } from '../../src/classes/contravariant.ts'
import { compose } from '../../src/classes/semigroupoid.ts'
import { equivalence } from '../../src/data/equivalence.ts'
import { just } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'
import { predicate } from '../../src/data/predicate.ts'

test ('contramap: adapts a function, predicate, or comparison to a new input type', () => {
  const f = contramap (len) (doubleNumber)

  assert.deepStrictEqual (f ('abc'), 6)
  assert.deepStrictEqual (f (''), 0)
})

test ('contramap reaches the types that bring it as a method', () => {
  const long = predicate<string> ((s) => s.length > 3)
  const byName = contramap ((u: { readonly name: string }) => u.name) (long)

  assert.deepStrictEqual (byName ({ name: 'abcd' }), true)
  assert.deepStrictEqual (byName ({ name: 'ab' }), false)

  const sameLength = equivalence<string> ((a, b) => a.length === b.length)
  const sameNameLength = contramap ((u: { readonly name: string }) => u.name) (
    sameLength,
  )

  assert.deepStrictEqual (sameNameLength ({ name: 'ann' }, { name: 'bob' }), true)
  assert.deepStrictEqual (sameNameLength ({ name: 'ann' }, { name: 'annie' }), false)
})

test ('contramap: identity law', () => {
  const probes = [0, 1, -7, 42]
  const same = contramap (idf<number>) (doubleNumber)
  for (const n of probes) assert.deepStrictEqual (same (n), doubleNumber (n))
})

test ('contramap: composition law turns the order around', () => {
  const p = (n: number) => `#${n}`
  const twice = contramap (increment) (contramap (doubleNumber) (p))
  const once = contramap ((n: number) => doubleNumber (increment (n))) (p)
  for (const n of [0, 1, 5]) assert.deepStrictEqual (twice (n), once (n))
})

test ('contramap: agrees with compose on functions', () => {
  const viaContramap = contramap (len) (doubleNumber)
  const viaCompose = compose (doubleNumber) (len)
  for (const s of ['', 'ab', 'abcde']) {
    assert.deepStrictEqual (viaContramap (s), viaCompose (s))
  }
})

test ('contramap: passes only the input to its adapter', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  contramap (recordArguments) (doubleNumber) ('abc')

  assert.deepStrictEqual (calls, [['abc']])
})

test ('contramap: rejects values without Contravariant', () => {
  for (
    const [name, wrappedValue] of [
      ['Array', [1, 2, 3]],
      ['Maybe', just (1)],
      ['Pair', pair ('l', 1)],
    ] as const
  ) {
    assert.throws (
      () => contramap (len) (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes (`contramap: ${name} has no Contravariant`),
    )
  }
})

test ('contravariantNatives: provides only Fn operations', () => {
  assert.deepStrictEqual (Object.keys (contravariantNatives), ['Fn'])
  assert.deepStrictEqual (typeof contravariantNatives.Fn.contramap, 'function')
})

const len = (s: string) => s.length

const doubleNumber = (n: number) => n * 2

const increment = (n: number) => n + 1

const idf = <A>(a: A): A => a
