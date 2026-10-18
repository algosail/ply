import assert from 'node:assert/strict'
import { test } from 'node:test'
import { of } from '../../src/classes/applicative.ts'
import { map } from '../../src/classes/functor.ts'
import { empty } from '../../src/classes/monoid.ts'
import { lte } from '../../src/classes/ord.ts'
import { equals } from '../../src/classes/setoid.ts'
import { show } from '../../src/classes/show.ts'
import { Big } from '../../src/natives/bigint.ts'

test ('Big: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (Big['@@type'], 'BigInt')
  assert.deepStrictEqual (Big.is (0n), true)
  assert.deepStrictEqual (Big.is (-7n), true)
  assert.deepStrictEqual (Big.is (huge), true)
  assert.deepStrictEqual (Big.is (0), false)
  assert.deepStrictEqual (Big.is ('1'), false)
  assert.deepStrictEqual (Big.is (null), false)
  assert.deepStrictEqual (Big.is (Object (1n)), false)
})

test ('Big.equals: compares values by content', () => {
  assert.deepStrictEqual (Big.equals (1n, 1n), true)
  assert.deepStrictEqual (Big.equals (1n, 2n), false)
  assert.deepStrictEqual (Big.equals (0n, -0n), true)
  assert.deepStrictEqual (Big.equals (-7n, -7n), true)
})

test ('Big.equals: distinguishes integers beyond Number precision', () => {
  assert.deepStrictEqual (Number (huge) === Number (alsoHuge), true)
  assert.deepStrictEqual (Big.equals (huge, alsoHuge), false)
})

test ('Big.lte: orders values from smaller to larger', () => {
  assert.deepStrictEqual (Big.lte (1n, 2n), true)
  assert.deepStrictEqual (Big.lte (2n, 1n), false)
  assert.deepStrictEqual (Big.lte (1n, 1n), true)
  assert.deepStrictEqual (Big.lte (-2n, -1n), true)
  assert.deepStrictEqual (Big.lte (-1n, 1n), true)
  assert.deepStrictEqual (Big.lte (alsoHuge, huge), true)
  assert.deepStrictEqual (Big.lte (huge, alsoHuge), false)
})

test ('Big.show: formats values as readable strings', () => {
  assert.deepStrictEqual (Big.show (0n), '0')
  assert.deepStrictEqual (Big.show (10n), '10')
  assert.deepStrictEqual (Big.show (-7n), '-7')
  assert.deepStrictEqual (Big.show (huge), '9007199254740993')
  assert.deepStrictEqual (Big.show (1n).endsWith ('n'), false)
})

test ('Big.show: show distinguishes the same things as equals', () => {
  assert.deepStrictEqual (Big.show (huge) === Big.show (alsoHuge), false)
})

test ('the Big class dictionary is wired into the instance tables', () => {
  const one: bigint = 1n
  const two: bigint = 2n
  assert.deepStrictEqual (show (10n), '10')
  assert.deepStrictEqual (equals (one) (one), true)
  assert.deepStrictEqual (equals (one) (two), false)
  assert.deepStrictEqual (lte (two) (one), true)
  assert.deepStrictEqual (lte (one) (two), false)
})

test ('bigint and number are different types, not two spellings of one', () => {
  assert.deepStrictEqual (equals (1n as never, 1 as never), false)
  assert.deepStrictEqual (equals (1n as never, '1' as never), false)
})

test ('Big.equals: Setoid laws', () => {
  const probes = [0n, 1n, -1n, 7n, huge, alsoHuge]
  for (const a of probes) assert.deepStrictEqual (Big.equals (a, a), true)
  for (const a of probes) {
    for (const b of probes) {
      assert.deepStrictEqual (Big.equals (a, b), Big.equals (b, a))
      for (const c of probes) {
        if (Big.equals (a, b) && Big.equals (b, c)) {
          assert.deepStrictEqual (Big.equals (a, c), true)
        }
      }
    }
  }
})

test ('Big.lte: Ord laws', () => {
  const probes = [0n, 1n, -1n, 7n, -7n, huge, alsoHuge]
  for (const a of probes) {
    for (const b of probes) {
      assert.deepStrictEqual (Big.lte (a, b) || Big.lte (b, a), true)
      if (Big.lte (a, b) && Big.lte (b, a)) assert.deepStrictEqual (Big.equals (a, b), true)
      for (const c of probes) {
        if (Big.lte (a, b) && Big.lte (b, c)) {
          assert.deepStrictEqual (Big.lte (a, c), true)
        }
      }
    }
  }
})

test ('bigint does not support Functor, Monoid and Applicative', () => {
  assert.throws (
    () => map ((n: bigint) => n) (1n as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Functor'),
  )
  assert.throws (
    () => empty (Big as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Monoid'),
  )
  assert.throws (
    () => of (Big as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Applicative'),
  )
})

const huge = 9007199254740993n

const alsoHuge = 9007199254740992n
