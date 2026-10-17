import { test } from 'node:test'
import { assertEquals, assertThrows } from '../assert.ts'
import { contramap, contravariantNatives } from '../../src/classes/contravariant.ts'
import { compose } from '../../src/classes/semigroupoid.ts'
import { just } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'
import { predicate } from '../../src/data/predicate.ts'
import { equivalence } from '../../src/data/equivalence.ts'

test ('contramap: adapts a function, predicate, or comparison to a new input type', () => {
  const f = contramap (len) (doubleNumber)

  assertEquals (f ('abc'), 6)
  assertEquals (f (''), 0)
})

test ('contramap reaches the types that bring it as a method', () => {
  const long = predicate<string> ((s) => s.length > 3)
  const byName = contramap ((u: { readonly name: string }) => u.name) (long)

  assertEquals (byName ({ name: 'abcd' }), true)
  assertEquals (byName ({ name: 'ab' }), false)

  const sameLength = equivalence<string> ((a, b) => a.length === b.length)
  const sameNameLength = contramap ((u: { readonly name: string }) => u.name) (
    sameLength,
  )

  assertEquals (sameNameLength ({ name: 'ann' }, { name: 'bob' }), true)
  assertEquals (sameNameLength ({ name: 'ann' }, { name: 'annie' }), false)
})

test ('contramap: identity law', () => {
  const probes = [0, 1, -7, 42]
  const same = contramap (idf<number>) (doubleNumber)
  for (const n of probes) assertEquals (same (n), doubleNumber (n))
})

test ('contramap: composition law turns the order around', () => {
  const p = (n: number) => `#${n}`
  const twice = contramap (increment) (contramap (doubleNumber) (p))
  const once = contramap ((n: number) => doubleNumber (increment (n))) (p)
  for (const n of [0, 1, 5]) assertEquals (twice (n), once (n))
})

test ('contramap: agrees with compose on functions', () => {
  const viaContramap = contramap (len) (doubleNumber)
  const viaCompose = compose (doubleNumber) (len)
  for (const s of ['', 'ab', 'abcde']) {
    assertEquals (viaContramap (s), viaCompose (s))
  }
})

test ('contramap: passes only the input to its adapter', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  contramap (recordArguments) (doubleNumber) ('abc')

  assertEquals (calls, [['abc']])
})

test ('contramap: rejects values without Contravariant', () => {
  for (
    const [name, wrappedValue] of [
      ['Array', [1, 2, 3]],
      ['Maybe', just (1)],
      ['Pair', pair ('l', 1)],
    ] as const
  ) {
    assertThrows (
      () => contramap (len) (wrappedValue as never),
      TypeError,
      `contramap: ${name} has no Contravariant`,
    )
  }
})

test ('contravariantNatives: provides only Fn operations', () => {
  assertEquals (Object.keys (contravariantNatives), ['Fn'])
  assertEquals (typeof contravariantNatives.Fn.contramap, 'function')
})

const len = (s: string) => s.length

const doubleNumber = (n: number) => n * 2

const increment = (n: number) => n + 1

const idf = <A>(a: A): A => a
