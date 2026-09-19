import { assertEquals } from '@std/assert'
import { show, showNatives } from './show.ts'
import { just, nothing } from '../data/maybe.ts'
import { left, right } from '../data/either.ts'
import { identity } from '../data/identity.ts'
import { pair } from '../data/pair.ts'

// Examples

Deno.test("show: formats a value as a readable string, including ply's wrapped values", () => {
  // from @example
  assertEquals(show([1, 'a']), '[1, "a"]')
  assertEquals(show({ b: 2, a: 1 }), '{"a": 1, "b": 2}')
  assertEquals(show(new Set([1, 2])), 'Set ([1, 2])')
  assertEquals(show(just(1)), 'Just (1)')
})

Deno.test('show: numbers', () => {
  assertEquals(show(42), '42')
  assertEquals(show(0), '0')
  assertEquals(show(-0), '-0')
  assertEquals(show(NaN), 'NaN')
  assertEquals(show(Infinity), 'Infinity')
  assertEquals(show(-Infinity), '-Infinity')
  assertEquals(show(1e21), '1e+21')
  assertEquals(show(0.1), '0.1')
})

Deno.test('show: strings are escaped', () => {
  assertEquals(show('foo'), '"foo"')
  assertEquals(show(''), '""')
  assertEquals(show('42'), '"42"')
  assertEquals(show('a"b'), '"a\\"b"')
  assertEquals(show('a\nb'), '"a\\nb"')
  assertEquals(show('a\\b'), '"a\\\\b"')
  assertEquals(show('a\tb'), '"a\\tb"')
})

Deno.test('show: the remaining primitives', () => {
  assertEquals(show(true), 'true')
  assertEquals(show(false), 'false')
  assertEquals(show(null), 'null')
  assertEquals(show(undefined), 'undefined')
  assertEquals(show(10n), '10')
  assertEquals(show(-7n), '-7')
  assertEquals(show(Symbol('s')), 'Symbol(s)')
})

Deno.test('show: arrays', () => {
  assertEquals(show([]), '[]')
  assertEquals(show([1, 2, 3]), '[1, 2, 3]')
  assertEquals(show([[1], [2]]), '[[1], [2]]')
  assertEquals(show(['a', 'b']), '["a", "b"]')
  assertEquals(show([1, , 3]), '[1, , 3]')
  assertEquals(show([1, undefined, 3]), '[1, undefined, 3]')
})

Deno.test('show: Set and Map', () => {
  assertEquals(show(new Set()), 'Set ([])')
  assertEquals(show(new Set([1, 2])), 'Set ([1, 2])')
  assertEquals(show(new Map()), 'Map ([])')
  assertEquals(
    show(new Map([['b', 1], ['a', 2]])),
    'Map ([["b", 1], ["a", 2]])',
  )
  assertEquals(show(new Map([['a', new Set([1])]])), 'Map ([["a", Set ([1])]])')
})

Deno.test('show: the keys of an object are sorted', () => {
  assertEquals(show({}), '{}')
  assertEquals(show({ a: 1, b: 2 }), '{"a": 1, "b": 2}')
  assertEquals(show({ b: 2, a: 1 }), '{"a": 1, "b": 2}')
  assertEquals(show({ 'b c': 1 }), '{"b c": 1}')
  assertEquals(show({ a: { b: [1, 'x'] } }), '{"a": {"b": [1, "x"]}}')
})

Deno.test('show: Date and RegExp', () => {
  assertEquals(
    show(new Date('2011-01-19T17:40:00Z')),
    'Date ("2011-01-19T17:40:00.000Z")',
  )
  assertEquals(show(new Date(NaN)), 'Date (NaN)')
  assertEquals(show(/a/gi), '/a/gi')
  assertEquals(show(/^$/), '/^$/')
})

Deno.test('show: a function is printed as its own source', () => {
  assertEquals(show(function named() {}).includes('named'), true)
  assertEquals(show((x: number) => x), String((x: number) => x))
})

Deno.test('show: ply data types', () => {
  assertEquals(show(nothing<number>()), 'Nothing')
  assertEquals(show(just(just(1))), 'Just (Just (1))')
  assertEquals(show(left<string, number>('x')), 'Left ("x")')
  assertEquals(show(right<string, number>(1)), 'Right (1)')
  assertEquals(show(pair(1, 'a')), 'Pair (1) ("a")')
  assertEquals(show(identity(1)), 'Identity (1)')
})

Deno.test('show: a value is printed by its own method', () => {
  assertEquals(just(1).show(), 'Just (1)')
  assertEquals(show({ '@@type': 'Own', show: () => 'Own (7)' }), 'Own (7)')
})

Deno.test('show: the layers nest inside one another', () => {
  assertEquals(show([just(1), nothing<number>()]), '[Just (1), Nothing]')
  assertEquals(show(new Set([just(1)])), 'Set ([Just (1)])')
  assertEquals(show(just({ b: 2, a: 1 })), 'Just ({"a": 1, "b": 2})')
  assertEquals(show(just(-0)), 'Just (-0)')
  assertEquals(
    show(just(pair(1, nothing<number>()))),
    'Just (Pair (1) (Nothing))',
  )
})

Deno.test('show: a repeated value is not a cycle', () => {
  const inner = [1]
  assertEquals(show([inner, inner]), '[[1], [1]]')
  assertEquals(show({ a: inner, b: inner }), '{"a": [1], "b": [1]}')
})

Deno.test('show: an unknown type is printed as an object', () => {
  class Point {
    constructor(readonly x: number, readonly y: number) {}
  }
  assertEquals(show(new Point(1, 2)), '{"x": 1, "y": 2}')
  assertEquals(show(new Point(1, 2)) === show({ y: 2, x: 1 }), true)
})

// Edge cases

Deno.test('show: a circular reference is cut off', () => {
  const a: unknown[] = [1]
  a.push(a)
  assertEquals(show(a), '[1, <Circular>]')

  const o: Record<string, unknown> = {}
  o.self = o
  assertEquals(show(o), '{"self": <Circular>}')

  const b: unknown[] = [1]
  b.push(just(b))
  assertEquals(show(b), '[1, Just (<Circular>)]')

  assertEquals(show(a), '[1, <Circular>]')
})

Deno.test('show sorts the keys of an object that has no Show dictionary', () => {
  class Box {
    constructor(readonly b: number, readonly a: number) {}
  }
  assertEquals(show(new Box(2, 1)), '{"a": 1, "b": 2}')

  class Mixed {
    constructor(readonly zeta = 1, readonly alpha = 2, readonly mu = 3) {}
  }
  assertEquals(show(new Mixed()), '{"alpha": 2, "mu": 3, "zeta": 1}')
})

// Native operation tables

Deno.test('showNatives: lists the supported native implementations', () => {
  assertEquals(Object.keys(showNatives), [
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
  assertEquals(showNatives.Number.show(-0), '-0')
  assertEquals(showNatives.String.show('a'), '"a"')
})
