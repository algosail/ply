import { assertEquals } from '@std/assert'
import { assertThrows } from '@std/assert'
import { equals, setoidNatives } from './setoid.ts'
import { map } from './functor.ts'
import { just, nothing } from '../data/maybe.ts'
import { left, right } from '../data/either.ts'
import { identity } from '../data/identity.ts'
import { pair } from '../data/pair.ts'

// Examples

Deno.test('equals: compares values by content, including nested arrays and records', () => {
  const one: number = 1
  const two: number = 2
  assertEquals(equals(one)(one), true)
  assertEquals(equals(two)(one), false)
  assertEquals(equals('a' as string)('a'), true)
  assertEquals(equals([1, [2]] as number[][])([1, [2]] as never), true)
  assertEquals(equals([1, [2]] as number[][])([1, [3]] as never), false)
  assertEquals(equals(one, one), true)
  assertEquals(equals([1, [2]], [1, [2]]), true)
})

Deno.test('equals: the comparison is structural, not by reference', () => {
  assertEquals(equals([[1], [2]], [[1], [2]]), true)
  assertEquals(equals([{ a: [1] }])([{ a: [1] }]), true)
  assertEquals(equals({ a: { b: [1] } })({ a: { b: [1] } }), true)
  assertEquals(equals({ a: { b: [1] } })({ a: { b: [2] } }), false)
})

Deno.test('equals: values of different types are not equal', () => {
  assertEquals(eq(1, '1'), false)
  assertEquals(eq(1, 1n), false)
  assertEquals(eq([1], new Set([1])), false)
  assertEquals(eq({ a: 1 }, new Map([['a', 1]])), false)
  assertEquals(eq(null, undefined), false)
  assertEquals(eq(just(1), right(1)), false)
})

Deno.test('equals: ply data types are compared by their own method', () => {
  assertEquals(eq(just(1), just(1)), true)
  assertEquals(eq(just(1), just(2)), false)
  assertEquals(eq(just(1), nothing<number>()), false)
  assertEquals(eq(nothing<number>(), nothing<number>()), true)
  assertEquals(eq(right<string, number>(1), right<string, number>(1)), true)
  assertEquals(eq(right<string, number>(1), left<string, number>('1')), false)
  assertEquals(eq(left<string, number>('e'), left<string, number>('e')), true)
  assertEquals(eq(pair('l', 1), pair('l', 1)), true)
  assertEquals(eq(pair('l', 1), pair('l', 2)), false)
  assertEquals(eq(identity(1), identity(1)), true)
})

Deno.test('equals: a type without Setoid answers false instead of failing', () => {
  class Point {
    constructor(readonly x: number) {}
  }
  assertEquals(eq(new Point(1), new Point(1)), false)
  const same = new Point(1)
  assertEquals(eq(same, same), true)
  const f = (n: number) => n
  assertEquals(eq(f, f), true)
  assertEquals(eq(f, (n: number) => n), false)
})

// Laws

Deno.test('equals: reflexivity law across supported types', () => {
  for (const [name, x] of probes) assertEquals(eq(x, x), true, name)
})

Deno.test('equals: symmetry law across supported types', () => {
  for (const [nameA, a] of probes) {
    for (const [nameB, b] of probes) {
      assertEquals(eq(a, b), eq(b, a), `${nameA} / ${nameB}`)
    }
  }
})

Deno.test('equals: transitivity law across supported types', () => {
  for (const [nameA, a] of probes) {
    for (const [nameB, b] of probes) {
      if (!eq(a, b)) continue
      for (const [nameC, c] of probes) {
        if (!eq(b, c)) continue
        assertEquals(eq(a, c), true, `${nameA} / ${nameB} / ${nameC}`)
      }
    }
  }
})

// Edge cases

Deno.test('equals: currying is decided by the number of actual arguments', () => {
  assertEquals(typeof equals(1), 'function')
  assertEquals(
    (map(equals as never)([1, 2] as never) as unknown[]).map((x) => typeof x),
    ['function', 'function'],
  )
})

Deno.test('equals: NaN equals itself', () => {
  assertEquals(equals(NaN)(NaN), true)
  assertEquals(equals([NaN])([NaN]), true)
  assertEquals(equals(NaN)(0), false)
})

Deno.test('equals: the JS Set and Map have no Setoid at all', () => {
  assertThrows(
    () => eq(new Set([1, 2]), new Set([2, 1])),
    TypeError,
    'equals: Set has no Setoid',
  )
  assertThrows(
    () => eq(new Map([['a', 1]]), new Map([['a', 1]])),
    TypeError,
    'equals: Map has no Setoid',
  )
  const s = new Set([1])
  assertEquals(eq(s, s), true)
})

Deno.test('equals: StrMap is compared by keys, not by insertion order', () => {
  assertEquals(eq({ a: 1, b: 2 }, { b: 2, a: 1 }), true)
  assertEquals(eq({ a: 1 }, { a: 1, b: 2 }), false)
  assertEquals(eq({ a: 1 }, { b: 1 }), false)
})

Deno.test('equals: a cyclic structure does not loop the comparison', () => {
  const a: unknown[] = [1]
  a.push(a)
  const b: unknown[] = [1]
  b.push(b)
  assertEquals(eq(a, b), true)

  const c: unknown[] = [2]
  c.push(c)
  assertEquals(eq(a, c), false)

  assertEquals(eq(a, b), true)
  assertEquals(eq(a, c), false)
})

Deno.test('equals: a hole in an array is not the same as undefined', () => {
  assertEquals(eq([1, , 3], [1, undefined, 3]), false)
  assertEquals(eq([1, , 3], [1, , 3]), true)
})

Deno.test('equals: an invalid Date equals itself, just like NaN', () => {
  assertEquals(eq(new Date(NaN), new Date(NaN)), true)
  const d = new Date(NaN)
  assertEquals(eq(d, d), true)
  assertEquals(eq(new Date(NaN), new Date(0)), false)
  assertEquals(eq(new Date(0), new Date(NaN)), false)
})

Deno.test('equals: the two-argument form tells undefined from a missing argument', () => {
  assertEquals(equals(1, undefined), false)
  assertEquals(equals(undefined, undefined), true)
  assertEquals(equals(undefined, null), false)
  assertEquals(typeof equals(undefined), 'function')
})

// Native operation tables

Deno.test('setoidNatives: lists the supported native implementations', () => {
  assertEquals(Object.keys(setoidNatives), [
    'Array',
    'StrMap',
    'String',
    'Number',
    'Boolean',
    'BigInt',
    'Date',
    'RegExp',
  ])
  assertEquals(setoidNatives.Array['@@type'], 'Array')
  assertEquals(setoidNatives.RegExp.equals(/a/g, /a/i), false)
  assertEquals(setoidNatives.RegExp.equals(/a/g, /a/g), true)
})

// Shared fixtures

const eq = (a: unknown, b: unknown): boolean => equals(b as never)(a as never)

const probes: [string, unknown][] = [
  ['number', 1],
  ['the same number', 1],
  ['another number', 2],
  ['NaN', NaN],
  ['another NaN', NaN],
  ['string', 'a'],
  ['the same string', 'a'],
  ['boolean', true],
  ['bigint', 1n],
  ['the same bigint', 1n],
  ['null', null],
  ['undefined', undefined],
  ['array', [1, [2]]],
  ['an equal array', [1, [2]]],
  ['object', { a: 1 }],
  ['object with the same fields', { a: 1 }],
  ['date', new Date(5)],
  ['an equal date', new Date(5)],
  // An invalid date is on a par with NaN: the equality of dates is delegated
  // to numbers.
  ['invalid date', new Date(NaN)],
  ['another invalid date', new Date(NaN)],
  ['regexp', /a/g],
  ['an equal regexp', /a/g],
  ['Just', just(1)],
  ['an equal Just', just(1)],
  ['Nothing', nothing<number>()],
  ['Right', right<string, number>(1)],
  ['Left', left<string, number>('e')],
  ['Identity', identity(1)],
  ['an equal Identity', identity(1)],
  ['Pair', pair('l', 1)],
  ['an equal Pair', pair('l', 1)],
]
