import { assertEquals, assertThrows, equal } from '@std/assert'
import { clamp, gt, gte, lt, lte, max, min, ordNatives } from './ord.ts'
import { Arr } from '../natives/array.ts'
import { just, nothing } from '../data/maybe.ts'
import { left, right } from '../data/either.ts'
import { identity } from '../data/identity.ts'
import { pair } from '../data/pair.ts'

// Examples

Deno.test('lte: checks whether the value is at most the supplied bound', () => {
  assertEquals(lte(10 as number)(5), true)
  assertEquals(lte(5 as number)(10), false)
  assertEquals(lte(5 as number)(5), true)
  assertEquals(lte('m' as string)('a'), true)
  assertEquals(lte([1, 2] as number[])([1, 1] as number[]), true)
})

Deno.test('lt: checks whether the value is below the supplied bound', () => {
  assertEquals(lt(10)(5), true)
  assertEquals(lt(10)(15), false)
  assertEquals(lt(10)(10), false)
  assertEquals(lt('m')('a'), true)
})

Deno.test('gt: checks whether the value is above the supplied bound', () => {
  assertEquals(gt(10)(15), true)
  assertEquals(gt(10)(5), false)
  assertEquals(gt(10)(10), false)
  assertEquals(gt('m')('z'), true)
})

Deno.test('gte: checks whether the value is at least the supplied bound', () => {
  assertEquals(gte(10)(10), true)
  assertEquals(gte(10)(15), true)
  assertEquals(gte(10)(5), false)
})

Deno.test("min: returns the smaller of two values according to ply's ordering", () => {
  assertEquals(min(1)(3), 1)
  assertEquals(min(3)(1), 1)
  assertEquals(min('a')('b'), 'a')
})

Deno.test("max: returns the larger of two values according to ply's ordering", () => {
  assertEquals(max(1)(3), 3)
  assertEquals(max(3)(1), 3)
  assertEquals(max('a')('b'), 'b')
})

Deno.test('clamp: limits a value to the inclusive bounds supplied as (lower, upper)', () => {
  assertEquals(clamp(0, 10)(20), 10)
  assertEquals(clamp(0, 10)(-5), 0)
  assertEquals(clamp(0, 10)(5), 5)
  assertEquals(clamp(0, 10)(0), 0)
  assertEquals(clamp(0, 10)(10), 10)
  assertEquals(clamp('b', 'y')('a'), 'b')
  assertEquals(clamp('b', 'y')('z'), 'y')
  assertEquals(clamp('b', 'y')('m'), 'm')
})

Deno.test('lt, gt, gte: expressed through lte across supported types', () => {
  for (const [name, values] of Object.entries(samplesByType)) {
    for (const a of values) {
      for (const b of values) {
        const leAB = le(a, b), leBA = le(b, a)
        assertEquals(lt(b)(a), leAB && !leBA, `lt ${name}`)
        assertEquals(gt(b)(a), !leAB, `gt ${name}`)
        assertEquals(gte(b)(a), leBA, `gte ${name}`)
      }
    }
  }
})

Deno.test('min, max: pick the smaller and the larger across supported types', () => {
  for (const [name, values] of Object.entries(samplesByType)) {
    for (const a of values) {
      for (const b of values) {
        const lo = min(a)(b)
        const hi = max(a)(b)
        assertEquals(le(lo, a) && le(lo, b), true, `min ${name}`)
        assertEquals(le(a, hi) && le(b, hi), true, `max ${name}`)
        assertEquals(Object.is(lo, a) || Object.is(lo, b), true, `min ${name}`)
        assertEquals(Object.is(hi, a) || Object.is(hi, b), true, `max ${name}`)
      }
    }
  }
})

Deno.test('clamp: the result is always inside the segment', () => {
  const bounds = [0, 1, 5, 10]
  const values = [-100, 0, 3, 7, 10, 100]
  for (const lo of bounds) {
    for (const hi of bounds) {
      if (!le(lo, hi)) continue
      for (const x of values) {
        const c = clamp(lo, hi)(x)
        assertEquals(le(lo, c) && le(c, hi), true, `[${lo},${hi}] ${x}`)
        if (le(lo, x) && le(x, hi)) assertEquals(c, x)
      }
    }
  }
})

Deno.test('lte: arrays are compared lexicographically', () => {
  assertEquals(Arr.lte([1, 1], [1, 2]), true)
  assertEquals(Arr.lte([1, 2], [1, 1]), false)
  assertEquals(Arr.lte([1], [1, 2]), true)
  assertEquals(Arr.lte([1, 2], [1]), false)
  assertEquals(Arr.lte([], [1]), true)
  assertEquals(Arr.lte([2], [1, 1, 1]), false)
  assertEquals(le([[1], [2]], [[1], [3]]), true)
})

Deno.test('lte: the order on the types of our own', () => {
  assertEquals(le(nothing<number>(), just(1)), true)
  assertEquals(le(just(1), nothing<number>()), false)
  assertEquals(le(just(1), just(2)), true)
  assertEquals(le(left<string, number>('z'), right<string, number>(0)), true)
  assertEquals(le(right<string, number>(0), left<string, number>('z')), false)
  assertEquals(le(left<string, number>('a'), left<string, number>('b')), true)
  assertEquals(le(pair('a', 1), pair('a', 2)), true)
  assertEquals(le(pair('a', 2), pair('a', 1)), false)
  assertEquals(le(pair('a', 9), pair('b', 0)), true)
  assertEquals(le(identity(1), identity(2)), true)
})

// ── gaps found by mutation ─────────────────────────────────────────────────

Deno.test('min on a tie returns the first argument, max the second', () => {
  const d1 = new Date(0)
  const d2 = new Date(0)
  assertEquals(min(d1)(d2) === d1, true, 'min on a tie takes the first')
  assertEquals(max(d1)(d2) === d2, true, 'max on a tie takes the second')

  const a1 = [1, 2]
  const a2 = [1, 2]
  assertEquals(min(a1)(a2) === a1, true)
  assertEquals(max(a1)(a2) === a2, true)
})

Deno.test('clamp at a bound returns the argument itself, not the bound', () => {
  const lo = new Date(0)
  const hi = new Date(100)
  const x = new Date(0)
  assertEquals(clamp(lo, hi)(x) === x, true, 'at the lower bound')
  const y = new Date(100)
  assertEquals(clamp(lo, hi)(y) === y, true, 'at the upper bound')
  assertEquals(clamp(lo, hi)(new Date(-1)) === lo, true)
  assertEquals(clamp(lo, hi)(new Date(101)) === hi, true)
})

// Laws

Deno.test('lte: reflexivity law across supported types', () => {
  for (const [name, values] of Object.entries(samplesByType)) {
    for (const x of values) assertEquals(le(x, x), true, name)
  }
})

Deno.test('lte: totality law across supported types', () => {
  for (const [name, values] of Object.entries(samplesByType)) {
    for (const a of values) {
      for (const b of values) {
        assertEquals(le(a, b) || le(b, a), true, name)
      }
    }
  }
})

Deno.test('lte: antisymmetry law across supported types', () => {
  for (const [name, values] of Object.entries(samplesByType)) {
    for (const a of values) {
      for (const b of values) {
        if (le(a, b) && le(b, a)) assertEquals(equal(a, b), true, name)
      }
    }
  }
})

Deno.test('lte: transitivity law across supported types', () => {
  for (const [name, values] of Object.entries(samplesByType)) {
    for (const a of values) {
      for (const b of values) {
        if (!le(a, b)) continue
        for (const c of values) {
          if (!le(b, c)) continue
          assertEquals(le(a, c), true, name)
        }
      }
    }
  }
})

// Edge cases

Deno.test('lte: rejects values without Ord', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => lte({ a: 1 } as never)({ a: 2 } as never),
    TypeError,
    'lte: StrMap has no Ord',
  )
  assertThrows(
    () => lte(new Set([1]) as never)(new Set([2]) as never),
    TypeError,
    'has no Ord',
  )
  assertThrows(
    () => lte(/a/ as never)(/b/ as never),
    TypeError,
    'has no Ord',
  )
  assertThrows(
    () => lte(null as never)(null as never),
    TypeError,
    'lte: Null has no Ord',
  )
})

Deno.test('lt, gt, gte, min, max, clamp: the failure travels up from lte', () => {
  // Bypass the type checker to verify the runtime error.
  const o = { a: 1 }
  const msg = 'has no Ord'
  assertThrows(() => lt(o as never)(o as never), TypeError, msg)
  assertThrows(() => gt(o as never)(o as never), TypeError, msg)
  assertThrows(() => gte(o as never)(o as never), TypeError, msg)
  assertThrows(() => min(o as never)(o as never), TypeError, msg)
  assertThrows(() => max(o as never)(o as never), TypeError, msg)
  assertThrows(() => clamp(o as never, o as never)(o as never), TypeError, msg)
})

Deno.test('lte: an invalid Date stays within the order', () => {
  const bad = new Date(NaN)
  const epoch = new Date(0)
  assertEquals(le(bad, bad), true, 'reflexivity')
  assertEquals(le(bad, epoch) || le(epoch, bad), true, 'totality')
  assertEquals(le(epoch, bad), true)
  assertEquals(le(bad, epoch), false)
})

// Native operation tables

Deno.test('ordNatives: lists the supported native implementations', () => {
  assertEquals(Object.keys(ordNatives), [
    'Array',
    'String',
    'Number',
    'Boolean',
    'BigInt',
    'Date',
  ])
  assertEquals(ordNatives.Boolean.lte(false, true), true)
  assertEquals(ordNatives.Boolean.lte(true, false), false)
})

// Shared fixtures

const le = (a: unknown, b: unknown): boolean => lte(b as never)(a as never)

const samplesByType: Record<string, readonly unknown[]> = {
  'Number': [0, 1, -1, 2.5, Infinity, -Infinity, NaN, 1],
  'String': ['', 'a', 'ab', 'b', 'Z', 'a'],
  'Boolean': [false, true, false],
  'BigInt': [0n, 1n, -1n, 1n],
  'Date': [
    new Date(0),
    new Date(1),
    new Date(-5),
    new Date(NaN),
    new Date(0),
    new Date(NaN),
  ],
  'Array': [[], [1], [1, 1], [1, 2], [2], [1, 2]],
  'Maybe': [nothing<number>(), just(1), just(2), just(1)],
  'Either': [
    left<string, number>('a'),
    left<string, number>('b'),
    right<string, number>(1),
    right<string, number>(2),
    left<string, number>('a'),
  ],
  'Identity': [identity(1), identity(2), identity(1)],
  'Pair': [pair('a', 1), pair('a', 2), pair('b', 1), pair('a', 1)],
}
