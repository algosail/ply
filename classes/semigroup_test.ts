import { assertEquals, assertThrows } from '@std/assert'
import { concat, semigroupNatives } from './semigroup.ts'
import { just } from '../data/maybe.ts'
import { left, right } from '../data/either.ts'
import { pair } from '../data/pair.ts'

// Examples

Deno.test('concat: the first argument is the left operand', () => {
  assertEquals(concat('ab')('cd'), 'abcd')
  assertEquals(concat([1] as number[])([2] as number[]), [1, 2])
})

Deno.test('concat: combines matching Either branches and prefers Right', () => {
  assertEquals(
    cat(right<string, string>('a'), right<string, string>('b')),
    right<string, string>('ab'),
  )
  assertEquals(
    cat(left<string, string>('e'), left<string, string>('f')),
    left<string, string>('ef'),
  )
  assertEquals(
    cat(left<string, string>('e'), right<string, string>('b')),
    right<string, string>('b'),
  )
  assertEquals(
    cat(right<string, string>('a'), left<string, string>('f')),
    right<string, string>('a'),
  )
})

Deno.test('concat: combines both fields of a Pair', () => {
  assertEquals(concat(pair('a', 'x'))(pair('b', 'y')), pair('ab', 'xy'))
  assertEquals(
    cat(pair('log', [1]), pair('!', [2])),
    pair('log!', [1, 2]),
  )
})

// Laws

Deno.test('concat: associativity law across supported types', () => {
  for (const [name, [a, b, c]] of Object.entries(triples)) {
    assertEquals(cat(cat(a, b), c), cat(a, cat(b, c)), name)
  }
})

// Edge cases

Deno.test('concat: rejects Set and Map inputs', () => {
  for (const [name, [a, b, c]] of Object.entries(withoutConcat)) {
    const message = `concat: ${name} has no Semigroup`
    assertThrows(() => cat(cat(a, b), c), TypeError, message, name)
    assertThrows(() => cat(a, cat(b, c)), TypeError, message, name)
  }
})

Deno.test('concat: rejects values without Semigroup', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => concat(just(1) as never)(just(2) as never),
    TypeError,
    'concat: Maybe has no Semigroup',
  )
  assertThrows(
    () => concat(1 as never)(2 as never),
    TypeError,
    'concat: Number has no Semigroup',
  )
  assertThrows(
    () => concat(true as never)(false as never),
    TypeError,
    'concat: Boolean has no Semigroup',
  )
  assertThrows(
    () => concat(null as never)(null as never),
    TypeError,
    'concat: Null has no Semigroup',
  )
})

// Type checking

Deno.test('concat: combines values in argument order', () => {
  assertEquals(concat('abc')('def'), 'abcdef')
  assertEquals(concat([1, 2] as number[])([3, 4] as number[]), [1, 2, 3, 4])
  assertEquals(
    concat({ a: 1 } as Record<string, number>)({ b: 2 }),
    { a: 1, b: 2 },
  )
  // @ts-expect-error concat has no overload for Set
  const _set = () => concat(new Set([1]))(new Set([2]))
  // @ts-expect-error concat has no overload for Map
  const _map = () => concat(new Map([['a', 1]]))(new Map([['b', 2]]))
  void _set, _map

  assertThrows(
    () => cat(new Set([1]), new Set([2])),
    TypeError,
    'concat: Set has no Semigroup',
  )
  assertThrows(
    () => cat(new Map([['a', 1]]), new Map([['b', 2]])),
    TypeError,
    'concat: Map has no Semigroup',
  )
})

Deno.test('concat: preserves the first record value for duplicate keys', () => {
  assertEquals(
    concat({ a: 1, b: 1 } as Record<string, number>)({ a: 2, c: 3 }),
    { a: 1, b: 1, c: 3 },
  )
  // @ts-expect-error concat has no overload for Map
  const _map = () => concat(new Map([['a', 1]]))(new Map([['a', 2]]))
  void _map
  assertThrows(
    () => cat(new Map([['a', 1]]), new Map([['a', 2], ['b', 3]])),
    TypeError,
    'concat: Map has no Semigroup',
  )
})

Deno.test('concat: the operands do not change', () => {
  const values = [1]
  const s = new Set([1])
  const m = new Map([['a', 1]])
  const o = { a: 1 }
  concat(values as number[])([2] as number[])
  concat(o as Record<string, number>)({ b: 2 })
  // @ts-expect-error concat has no overload for Set
  const _set = () => concat(s)(new Set([2]))
  // @ts-expect-error concat has no overload for Map
  const _map = () => concat(m)(new Map([['b', 2]]))
  void _set, _map
  assertThrows(
    () => cat(s, new Set([2])),
    TypeError,
    'concat: Set has no Semigroup',
  )
  assertThrows(
    () => cat(m, new Map([['b', 2]])),
    TypeError,
    'concat: Map has no Semigroup',
  )
  assertEquals(values, [1])
  assertEquals(s, new Set([1]))
  assertEquals(m, new Map([['a', 1]]))
  assertEquals(o, { a: 1 })
})

// Native operation tables

Deno.test('semigroupNatives: provides Array, StrMap, and String operations', () => {
  assertEquals(Object.keys(semigroupNatives), [
    'Array',
    'StrMap',
    'String',
  ])
  assertEquals(semigroupNatives.String.concat('a', 'b'), 'ab')
  assertEquals(semigroupNatives.Array.concat([1], [2]), [1, 2])
  for (const removed of ['Set', 'Map']) {
    assertEquals(removed in semigroupNatives, false, removed)
  }
})

// Shared fixtures

const cat = (a: unknown, b: unknown): unknown => concat(a as never)(b as never)

const triples: Record<string, readonly [unknown, unknown, unknown]> = {
  'Array': [[1], [2, 3], [4]],
  'Array nested': [[[1]], [[2]], [[3]]],
  'StrMap': [{ a: 1 }, { a: 2, b: 2 }, { b: 3, c: 3 }],
  'String': ['ab', 'cd', 'ef'],
  'Pair': [pair('a', [1]), pair('b', [2]), pair('c', [3])],
  'Either.Right': [
    right<string, string>('a'),
    right<string, string>('b'),
    right<string, string>('c'),
  ],
  'Either.Left': [
    left<string, string>('a'),
    left<string, string>('b'),
    left<string, string>('c'),
  ],
  'Either mixed': [
    left<string, string>('a'),
    right<string, string>('b'),
    left<string, string>('c'),
  ],
}

const withoutConcat: Record<string, readonly [unknown, unknown, unknown]> = {
  'Set': [new Set([1, 2]), new Set([2, 3]), new Set([3, 4])],
  'Map': [
    new Map([['a', 1]]),
    new Map([['a', 2], ['b', 2]]),
    new Map([['b', 3], ['c', 3]]),
  ],
}
