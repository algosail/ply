import assert from 'node:assert/strict'
import { test } from 'node:test'
import { show, showNatives } from '../../src/classes/show.ts'
import { left, right } from '../../src/data/either.ts'
import { identity } from '../../src/data/identity.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'

test ("show: formats a value as a readable string, including ply's wrapped values", () => {
  assert.deepStrictEqual (show ([1, 'a']), '[1, "a"]')
  assert.deepStrictEqual (show ({ b: 2, a: 1 }), '{"a": 1, "b": 2}')
  assert.deepStrictEqual (show (new Set ([1, 2])), 'Set ([1, 2])')
  assert.deepStrictEqual (show (just (1)), 'Just (1)')
})

test ('show: numbers', () => {
  assert.deepStrictEqual (show (42), '42')
  assert.deepStrictEqual (show (0), '0')
  assert.deepStrictEqual (show (-0), '-0')
  assert.deepStrictEqual (show (NaN), 'NaN')
  assert.deepStrictEqual (show (Infinity), 'Infinity')
  assert.deepStrictEqual (show (-Infinity), '-Infinity')
  assert.deepStrictEqual (show (1e21), '1e+21')
  assert.deepStrictEqual (show (0.1), '0.1')
})

test ('show: strings are escaped', () => {
  assert.deepStrictEqual (show ('foo'), '"foo"')
  assert.deepStrictEqual (show (''), '""')
  assert.deepStrictEqual (show ('42'), '"42"')
  assert.deepStrictEqual (show ('a"b'), '"a\\"b"')
  assert.deepStrictEqual (show ('a\nb'), '"a\\nb"')
  assert.deepStrictEqual (show ('a\\b'), '"a\\\\b"')
  assert.deepStrictEqual (show ('a\tb'), '"a\\tb"')
})

test ('show: the remaining primitives', () => {
  assert.deepStrictEqual (show (true), 'true')
  assert.deepStrictEqual (show (false), 'false')
  assert.deepStrictEqual (show (null), 'null')
  assert.deepStrictEqual (show (undefined), 'undefined')
  assert.deepStrictEqual (show (10n), '10')
  assert.deepStrictEqual (show (-7n), '-7')
  assert.deepStrictEqual (show (Symbol ('s')), 'Symbol(s)')
})

test ('show: arrays', () => {
  assert.deepStrictEqual (show ([]), '[]')
  assert.deepStrictEqual (show ([1, 2, 3]), '[1, 2, 3]')
  assert.deepStrictEqual (show ([[1], [2]]), '[[1], [2]]')
  assert.deepStrictEqual (show (['a', 'b']), '["a", "b"]')
  assert.deepStrictEqual (show ([1, , 3]), '[1, , 3]')
  assert.deepStrictEqual (show ([1, undefined, 3]), '[1, undefined, 3]')
})

test ('show: Set and Map', () => {
  assert.deepStrictEqual (show (new Set ()), 'Set ([])')
  assert.deepStrictEqual (show (new Set ([1, 2])), 'Set ([1, 2])')
  assert.deepStrictEqual (show (new Map ()), 'Map ([])')
  assert.deepStrictEqual (
    show (new Map ([['b', 1], ['a', 2]])),
    'Map ([["b", 1], ["a", 2]])',
  )
  assert.deepStrictEqual (show (new Map ([['a', new Set ([1])]])), 'Map ([["a", Set ([1])]])')
})

test ('show: the keys of an object are sorted', () => {
  assert.deepStrictEqual (show ({}), '{}')
  assert.deepStrictEqual (show ({ a: 1, b: 2 }), '{"a": 1, "b": 2}')
  assert.deepStrictEqual (show ({ b: 2, a: 1 }), '{"a": 1, "b": 2}')
  assert.deepStrictEqual (show ({ 'b c': 1 }), '{"b c": 1}')
  assert.deepStrictEqual (show ({ a: { b: [1, 'x'] } }), '{"a": {"b": [1, "x"]}}')
})

test ('show: Date and RegExp', () => {
  assert.deepStrictEqual (
    show (new Date ('2011-01-19T17:40:00Z')),
    'Date ("2011-01-19T17:40:00.000Z")',
  )
  assert.deepStrictEqual (show (new Date (NaN)), 'Date (NaN)')
  assert.deepStrictEqual (show (/a/gi), '/a/gi')
  assert.deepStrictEqual (show (/^$/), '/^$/')
})

test ('show: a function is printed as its own source', () => {
  assert.deepStrictEqual (show (function named() {}).includes ('named'), true)
  assert.deepStrictEqual (show ((x: number) => x), String ((x: number) => x))
})

test ('show: ply data types', () => {
  assert.deepStrictEqual (show (nothing<number> ()), 'Nothing')
  assert.deepStrictEqual (show (just (just (1))), 'Just (Just (1))')
  assert.deepStrictEqual (show (left<string, number> ('x')), 'Left ("x")')
  assert.deepStrictEqual (show (right<string, number> (1)), 'Right (1)')
  assert.deepStrictEqual (show (pair (1, 'a')), 'Pair (1) ("a")')
  assert.deepStrictEqual (show (identity (1)), 'Identity (1)')
})

test ('show: a value is printed by its own method', () => {
  assert.deepStrictEqual (just (1).show (), 'Just (1)')
  assert.deepStrictEqual (show ({ '@@type': 'Own', show: () => 'Own (7)' }), 'Own (7)')
})

test ('show: the layers nest inside one another', () => {
  assert.deepStrictEqual (show ([just (1), nothing<number> ()]), '[Just (1), Nothing]')
  assert.deepStrictEqual (show (new Set ([just (1)])), 'Set ([Just (1)])')
  assert.deepStrictEqual (show (just ({ b: 2, a: 1 })), 'Just ({"a": 1, "b": 2})')
  assert.deepStrictEqual (show (just (-0)), 'Just (-0)')
  assert.deepStrictEqual (
    show (just (pair (1, nothing<number> ()))),
    'Just (Pair (1) (Nothing))',
  )
})

test ('show: a repeated value is not a cycle', () => {
  const inner = [1]
  assert.deepStrictEqual (show ([inner, inner]), '[[1], [1]]')
  assert.deepStrictEqual (show ({ a: inner, b: inner }), '{"a": [1], "b": [1]}')
})

test ('show: an unknown type is printed as an object', () => {
  class Point {
    constructor(readonly x: number, readonly y: number) {}
  }
  assert.deepStrictEqual (show (new Point (1, 2)), '{"x": 1, "y": 2}')
  assert.deepStrictEqual (show (new Point (1, 2)) === show ({ y: 2, x: 1 }), true)
})

test ('show: a circular reference is cut off', () => {
  const a: unknown[] = [1]
  a.push (a)
  assert.deepStrictEqual (show (a), '[1, <Circular>]')

  const o: Record<string, unknown> = {}
  o.self = o
  assert.deepStrictEqual (show (o), '{"self": <Circular>}')

  const b: unknown[] = [1]
  b.push (just (b))
  assert.deepStrictEqual (show (b), '[1, Just (<Circular>)]')

  assert.deepStrictEqual (show (a), '[1, <Circular>]')
})

test ('show sorts the keys of an object that has no Show dictionary', () => {
  class Box {
    constructor(readonly b: number, readonly a: number) {}
  }
  assert.deepStrictEqual (show (new Box (2, 1)), '{"a": 1, "b": 2}')

  class Mixed {
    constructor(readonly zeta = 1, readonly alpha = 2, readonly mu = 3) {}
  }
  assert.deepStrictEqual (show (new Mixed ()), '{"alpha": 2, "mu": 3, "zeta": 1}')
})

test ('showNatives: lists the supported native implementations', () => {
  assert.deepStrictEqual (Object.keys (showNatives), [
    'Array',
    'Set',
    'Map',
    'StrMap',
    'String',
    'Number',
    'Boolean',
    'BigInt',
    'Date',
    'RegExp',
    'Fn',
  ])
  assert.deepStrictEqual (showNatives.Number.show (-0), '-0')
  assert.deepStrictEqual (showNatives.String.show ('a'), '"a"')
})
