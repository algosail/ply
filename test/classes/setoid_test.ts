import assert from 'node:assert/strict'
import { test } from 'node:test'
import { map } from '../../src/classes/functor.ts'
import { equals, setoidNatives } from '../../src/classes/setoid.ts'
import { left, right } from '../../src/data/either.ts'
import { identity } from '../../src/data/identity.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'

test ('equals: compares values by content, including nested arrays and records', () => {
  const one: number = 1
  const two: number = 2
  assert.deepStrictEqual (equals (one) (one), true)
  assert.deepStrictEqual (equals (two) (one), false)
  assert.deepStrictEqual (equals ('a' as string) ('a'), true)
  assert.deepStrictEqual (equals ([1, [2]] as number[][]) ([1, [2]] as never), true)
  assert.deepStrictEqual (equals ([1, [2]] as number[][]) ([1, [3]] as never), false)
  assert.deepStrictEqual (equals (one, one), true)
  assert.deepStrictEqual (equals ([1, [2]], [1, [2]]), true)
})

test ('equals: the comparison is structural, not by reference', () => {
  assert.deepStrictEqual (equals ([[1], [2]], [[1], [2]]), true)
  assert.deepStrictEqual (equals ([{ a: [1] }]) ([{ a: [1] }]), true)
  assert.deepStrictEqual (equals ({ a: { b: [1] } }) ({ a: { b: [1] } }), true)
  assert.deepStrictEqual (equals ({ a: { b: [1] } }) ({ a: { b: [2] } }), false)
})

test ('equals: values of different types are not equal', () => {
  assert.deepStrictEqual (eq (1, '1'), false)
  assert.deepStrictEqual (eq (1, 1n), false)
  assert.deepStrictEqual (eq ([1], new Set ([1])), false)
  assert.deepStrictEqual (eq ({ a: 1 }, new Map ([['a', 1]])), false)
  assert.deepStrictEqual (eq (null, undefined), false)
  assert.deepStrictEqual (eq (just (1), right (1)), false)
})

test ('equals: ply data types are compared by their own method', () => {
  assert.deepStrictEqual (eq (just (1), just (1)), true)
  assert.deepStrictEqual (eq (just (1), just (2)), false)
  assert.deepStrictEqual (eq (just (1), nothing<number> ()), false)
  assert.deepStrictEqual (eq (nothing<number> (), nothing<number> ()), true)
  assert.deepStrictEqual (eq (right<string, number> (1), right<string, number> (1)), true)
  assert.deepStrictEqual (eq (right<string, number> (1), left<string, number> ('1')), false)
  assert.deepStrictEqual (eq (left<string, number> ('e'), left<string, number> ('e')), true)
  assert.deepStrictEqual (eq (pair ('l', 1), pair ('l', 1)), true)
  assert.deepStrictEqual (eq (pair ('l', 1), pair ('l', 2)), false)
  assert.deepStrictEqual (eq (identity (1), identity (1)), true)
})

test ('equals: a type without Setoid answers false instead of failing', () => {
  class Point {
    constructor(readonly x: number) {}
  }
  assert.deepStrictEqual (eq (new Point (1), new Point (1)), false)
  const same = new Point (1)
  assert.deepStrictEqual (eq (same, same), true)
  const f = (n: number) => n
  assert.deepStrictEqual (eq (f, f), true)
  assert.deepStrictEqual (eq (f, (n: number) => n), false)
})

test ('equals: reflexivity law across supported types', () => {
  for (const [name, x] of probes) assert.deepStrictEqual (eq (x, x), true, name)
})

test ('equals: symmetry law across supported types', () => {
  for (const [nameA, a] of probes) {
    for (const [nameB, b] of probes) {
      assert.deepStrictEqual (eq (a, b), eq (b, a), `${nameA} / ${nameB}`)
    }
  }
})

test ('equals: transitivity law across supported types', () => {
  for (const [nameA, a] of probes) {
    for (const [nameB, b] of probes) {
      if (!eq (a, b)) continue
      for (const [nameC, c] of probes) {
        if (!eq (b, c)) continue
        assert.deepStrictEqual (eq (a, c), true, `${nameA} / ${nameB} / ${nameC}`)
      }
    }
  }
})

test ('equals: currying is decided by the number of actual arguments', () => {
  assert.deepStrictEqual (typeof equals (1), 'function')
  assert.deepStrictEqual (
    (map (equals as never) ([1, 2] as never) as unknown[]).map ((x) => typeof x),
    ['function', 'function'],
  )
})

test ('equals: NaN equals itself', () => {
  assert.deepStrictEqual (equals (NaN) (NaN), true)
  assert.deepStrictEqual (equals ([NaN]) ([NaN]), true)
  assert.deepStrictEqual (equals (NaN) (0), false)
})

test ('equals: the JS Set and Map have no Setoid at all', () => {
  assert.throws (
    () => eq (new Set ([1, 2]), new Set ([2, 1])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('equals: Set has no Setoid'),
  )
  assert.throws (
    () => eq (new Map ([['a', 1]]), new Map ([['a', 1]])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('equals: Map has no Setoid'),
  )
  const s = new Set ([1])
  assert.deepStrictEqual (eq (s, s), true)
})

test ('equals: StrMap is compared by keys, not by insertion order', () => {
  assert.deepStrictEqual (eq ({ a: 1, b: 2 }, { b: 2, a: 1 }), true)
  assert.deepStrictEqual (eq ({ a: 1 }, { a: 1, b: 2 }), false)
  assert.deepStrictEqual (eq ({ a: 1 }, { b: 1 }), false)
})

test ('equals: a cyclic structure does not loop the comparison', () => {
  const a: unknown[] = [1]
  a.push (a)
  const b: unknown[] = [1]
  b.push (b)
  assert.deepStrictEqual (eq (a, b), true)

  const c: unknown[] = [2]
  c.push (c)
  assert.deepStrictEqual (eq (a, c), false)

  assert.deepStrictEqual (eq (a, b), true)
  assert.deepStrictEqual (eq (a, c), false)
})

test ('equals: a hole in an array is not the same as undefined', () => {
  assert.deepStrictEqual (eq ([1, , 3], [1, undefined, 3]), false)
  assert.deepStrictEqual (eq ([1, , 3], [1, , 3]), true)
})

test ('equals: an invalid Date equals itself, just like NaN', () => {
  assert.deepStrictEqual (eq (new Date (NaN), new Date (NaN)), true)
  const d = new Date (NaN)
  assert.deepStrictEqual (eq (d, d), true)
  assert.deepStrictEqual (eq (new Date (NaN), new Date (0)), false)
  assert.deepStrictEqual (eq (new Date (0), new Date (NaN)), false)
})

test ('equals: the two-argument form tells undefined from a missing argument', () => {
  assert.deepStrictEqual (equals (1, undefined), false)
  assert.deepStrictEqual (equals (undefined, undefined), true)
  assert.deepStrictEqual (equals (undefined, null), false)
  assert.deepStrictEqual (typeof equals (undefined), 'function')
})

test ('setoidNatives: lists the supported native implementations', () => {
  assert.deepStrictEqual (Object.keys (setoidNatives), [
    'Array',
    'StrMap',
    'String',
    'Number',
    'Boolean',
    'BigInt',
    'Date',
    'RegExp',
  ])
  assert.deepStrictEqual (setoidNatives.Array['@@type'], 'Array')
  assert.deepStrictEqual (setoidNatives.RegExp.equals (/a/g, /a/i), false)
  assert.deepStrictEqual (setoidNatives.RegExp.equals (/a/g, /a/g), true)
})

const eq = (a: unknown, b: unknown): boolean => equals (b as never) (a as never)

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
  ['date', new Date (5)],
  ['an equal date', new Date (5)],
  ['invalid date', new Date (NaN)],
  ['another invalid date', new Date (NaN)],
  ['regexp', /a/g],
  ['an equal regexp', /a/g],
  ['Just', just (1)],
  ['an equal Just', just (1)],
  ['Nothing', nothing<number> ()],
  ['Right', right<string, number> (1)],
  ['Left', left<string, number> ('e')],
  ['Identity', identity (1)],
  ['an equal Identity', identity (1)],
  ['Pair', pair ('l', 1)],
  ['an equal Pair', pair ('l', 1)],
]
