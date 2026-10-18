import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clamp, gt, gte, lt, lte, max, min, ordNatives } from '../../src/classes/ord.ts'
import { equals } from '../../src/classes/setoid.ts'
import { left, right } from '../../src/data/either.ts'
import { identity } from '../../src/data/identity.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'
import { Arr } from '../../src/natives/array.ts'

test ('lte: checks whether the value is at most the supplied bound', () => {
  assert.deepStrictEqual (lte (10 as number) (5), true)
  assert.deepStrictEqual (lte (5 as number) (10), false)
  assert.deepStrictEqual (lte (5 as number) (5), true)
  assert.deepStrictEqual (lte ('m' as string) ('a'), true)
  assert.deepStrictEqual (lte ([1, 2] as number[]) ([1, 1] as number[]), true)
})

test ('lt: checks whether the value is below the supplied bound', () => {
  assert.deepStrictEqual (lt (10) (5), true)
  assert.deepStrictEqual (lt (10) (15), false)
  assert.deepStrictEqual (lt (10) (10), false)
  assert.deepStrictEqual (lt ('m') ('a'), true)
})

test ('gt: checks whether the value is above the supplied bound', () => {
  assert.deepStrictEqual (gt (10) (15), true)
  assert.deepStrictEqual (gt (10) (5), false)
  assert.deepStrictEqual (gt (10) (10), false)
  assert.deepStrictEqual (gt ('m') ('z'), true)
})

test ('gte: checks whether the value is at least the supplied bound', () => {
  assert.deepStrictEqual (gte (10) (10), true)
  assert.deepStrictEqual (gte (10) (15), true)
  assert.deepStrictEqual (gte (10) (5), false)
})

test ("min: returns the smaller of two values according to ply's ordering", () => {
  assert.deepStrictEqual (min (1) (3), 1)
  assert.deepStrictEqual (min (3) (1), 1)
  assert.deepStrictEqual (min ('a') ('b'), 'a')
})

test ("max: returns the larger of two values according to ply's ordering", () => {
  assert.deepStrictEqual (max (1) (3), 3)
  assert.deepStrictEqual (max (3) (1), 3)
  assert.deepStrictEqual (max ('a') ('b'), 'b')
})

test ('clamp: limits a value to the inclusive bounds supplied as (lower, upper)', () => {
  assert.deepStrictEqual (clamp (0, 10) (20), 10)
  assert.deepStrictEqual (clamp (0, 10) (-5), 0)
  assert.deepStrictEqual (clamp (0, 10) (5), 5)
  assert.deepStrictEqual (clamp (0, 10) (0), 0)
  assert.deepStrictEqual (clamp (0, 10) (10), 10)
  assert.deepStrictEqual (clamp ('b', 'y') ('a'), 'b')
  assert.deepStrictEqual (clamp ('b', 'y') ('z'), 'y')
  assert.deepStrictEqual (clamp ('b', 'y') ('m'), 'm')
})

test ('lt, gt, gte: expressed through lte across supported types', () => {
  for (const [name, values] of Object.entries (samplesByType)) {
    for (const a of values) {
      for (const b of values) {
        const leAB = le (a, b), leBA = le (b, a)
        assert.deepStrictEqual (lt (b) (a), leAB && !leBA, `lt ${name}`)
        assert.deepStrictEqual (gt (b) (a), !leAB, `gt ${name}`)
        assert.deepStrictEqual (gte (b) (a), leBA, `gte ${name}`)
      }
    }
  }
})

test ('min, max: pick the smaller and the larger across supported types', () => {
  for (const [name, values] of Object.entries (samplesByType)) {
    for (const a of values) {
      for (const b of values) {
        const lo = min (a) (b)
        const hi = max (a) (b)
        assert.deepStrictEqual (le (lo, a) && le (lo, b), true, `min ${name}`)
        assert.deepStrictEqual (le (a, hi) && le (b, hi), true, `max ${name}`)
        assert.deepStrictEqual (Object.is (lo, a) || Object.is (lo, b), true, `min ${name}`)
        assert.deepStrictEqual (Object.is (hi, a) || Object.is (hi, b), true, `max ${name}`)
      }
    }
  }
})

test ('clamp: the result is always inside the segment', () => {
  const bounds = [0, 1, 5, 10]
  const values = [-100, 0, 3, 7, 10, 100]
  for (const lo of bounds) {
    for (const hi of bounds) {
      if (!le (lo, hi)) continue
      for (const x of values) {
        const c = clamp (lo, hi) (x)
        assert.deepStrictEqual (le (lo, c) && le (c, hi), true, `[${lo},${hi}] ${x}`)
        if (le (lo, x) && le (x, hi)) assert.deepStrictEqual (c, x)
      }
    }
  }
})

test ('lte: arrays are compared lexicographically', () => {
  assert.deepStrictEqual (Arr.lte ([1, 1], [1, 2]), true)
  assert.deepStrictEqual (Arr.lte ([1, 2], [1, 1]), false)
  assert.deepStrictEqual (Arr.lte ([1], [1, 2]), true)
  assert.deepStrictEqual (Arr.lte ([1, 2], [1]), false)
  assert.deepStrictEqual (Arr.lte ([], [1]), true)
  assert.deepStrictEqual (Arr.lte ([2], [1, 1, 1]), false)
  assert.deepStrictEqual (le ([[1], [2]], [[1], [3]]), true)
})

test ('lte: the order on the types of our own', () => {
  assert.deepStrictEqual (le (nothing<number> (), just (1)), true)
  assert.deepStrictEqual (le (just (1), nothing<number> ()), false)
  assert.deepStrictEqual (le (just (1), just (2)), true)
  assert.deepStrictEqual (le (left<string, number> ('z'), right<string, number> (0)), true)
  assert.deepStrictEqual (le (right<string, number> (0), left<string, number> ('z')), false)
  assert.deepStrictEqual (le (left<string, number> ('a'), left<string, number> ('b')), true)
  assert.deepStrictEqual (le (pair ('a', 1), pair ('a', 2)), true)
  assert.deepStrictEqual (le (pair ('a', 2), pair ('a', 1)), false)
  assert.deepStrictEqual (le (pair ('a', 9), pair ('b', 0)), true)
  assert.deepStrictEqual (le (identity (1), identity (2)), true)
})

test ('min on a tie returns the first argument, max the second', () => {
  const d1 = new Date (0)
  const d2 = new Date (0)
  assert.deepStrictEqual (min (d1) (d2) === d1, true, 'min on a tie takes the first')
  assert.deepStrictEqual (max (d1) (d2) === d2, true, 'max on a tie takes the second')

  const a1 = [1, 2]
  const a2 = [1, 2]
  assert.deepStrictEqual (min (a1) (a2) === a1, true)
  assert.deepStrictEqual (max (a1) (a2) === a2, true)
})

test ('clamp at a bound returns the argument itself, not the bound', () => {
  const lo = new Date (0)
  const hi = new Date (100)
  const x = new Date (0)
  assert.deepStrictEqual (clamp (lo, hi) (x) === x, true, 'at the lower bound')
  const y = new Date (100)
  assert.deepStrictEqual (clamp (lo, hi) (y) === y, true, 'at the upper bound')
  assert.deepStrictEqual (clamp (lo, hi) (new Date (-1)) === lo, true)
  assert.deepStrictEqual (clamp (lo, hi) (new Date (101)) === hi, true)
})

test ('lte: reflexivity law across supported types', () => {
  for (const [name, values] of Object.entries (samplesByType)) {
    for (const x of values) assert.deepStrictEqual (le (x, x), true, name)
  }
})

test ('lte: totality law across supported types', () => {
  for (const [name, values] of Object.entries (samplesByType)) {
    for (const a of values) {
      for (const b of values) {
        assert.deepStrictEqual (le (a, b) || le (b, a), true, name)
      }
    }
  }
})

test ('lte: antisymmetry law across supported types', () => {
  for (const [name, values] of Object.entries (samplesByType)) {
    for (const a of values) {
      for (const b of values) {
        if (le (a, b) && le (b, a)) assert.strictEqual (equals (a, b), true, name)
      }
    }
  }
})

test ('lte: transitivity law across supported types', () => {
  for (const [name, values] of Object.entries (samplesByType)) {
    for (const a of values) {
      for (const b of values) {
        if (!le (a, b)) continue
        for (const c of values) {
          if (!le (b, c)) continue
          assert.deepStrictEqual (le (a, c), true, name)
        }
      }
    }
  }
})

test ('lte: rejects values without Ord', () => {
  assert.throws (
    () => lte ({ a: 1 } as never) ({ a: 2 } as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('lte: StrMap has no Ord'),
  )
  assert.throws (
    () => lte (new Set ([1]) as never) (new Set ([2]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Ord'),
  )
  assert.throws (
    () => lte (/a/ as never) (/b/ as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Ord'),
  )
  assert.throws (
    () => lte (null as never) (null as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('lte: Null has no Ord'),
  )
})

test ('lt, gt, gte, min, max, clamp: the failure travels up from lte', () => {
  const o = { a: 1 }
  const msg = 'has no Ord'
  assert.throws (
    () => lt (o as never) (o as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => gt (o as never) (o as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => gte (o as never) (o as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => min (o as never) (o as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => max (o as never) (o as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => clamp (o as never, o as never) (o as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
})

test ('lte: an invalid Date stays within the order', () => {
  const bad = new Date (NaN)
  const epoch = new Date (0)
  assert.deepStrictEqual (le (bad, bad), true, 'reflexivity')
  assert.deepStrictEqual (le (bad, epoch) || le (epoch, bad), true, 'totality')
  assert.deepStrictEqual (le (epoch, bad), true)
  assert.deepStrictEqual (le (bad, epoch), false)
})

test ('ordNatives: lists the supported native implementations', () => {
  assert.deepStrictEqual (Object.keys (ordNatives), [
    'Array',
    'String',
    'Number',
    'Boolean',
    'BigInt',
    'Date',
  ])
  assert.deepStrictEqual (ordNatives.Boolean.lte (false, true), true)
  assert.deepStrictEqual (ordNatives.Boolean.lte (true, false), false)
})

const le = (a: unknown, b: unknown): boolean => lte (b as never) (a as never)

const samplesByType: Record<string, readonly unknown[]> = {
  Number: [0, 1, -1, 2.5, Infinity, -Infinity, NaN, 1],
  String: ['', 'a', 'ab', 'b', 'Z', 'a'],
  Boolean: [false, true, false],
  BigInt: [0n, 1n, -1n, 1n],
  Date: [
    new Date (0),
    new Date (1),
    new Date (-5),
    new Date (NaN),
    new Date (0),
    new Date (NaN),
  ],
  Array: [[], [1], [1, 1], [1, 2], [2], [1, 2]],
  Maybe: [nothing<number> (), just (1), just (2), just (1)],
  Either: [
    left<string, number> ('a'),
    left<string, number> ('b'),
    right<string, number> (1),
    right<string, number> (2),
    left<string, number> ('a'),
  ],
  Identity: [identity (1), identity (2), identity (1)],
  Pair: [pair ('a', 1), pair ('a', 2), pair ('b', 1), pair ('a', 1)],
}
