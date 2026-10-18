import assert from 'node:assert/strict'
import { test } from 'node:test'
import { concat, semigroupNatives } from '../../src/classes/semigroup.ts'
import { left, right } from '../../src/data/either.ts'
import { just } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'

test ('concat: the first argument is the left operand', () => {
  assert.deepStrictEqual (concat ('ab') ('cd'), 'abcd')
  assert.deepStrictEqual (concat ([1] as number[]) ([2] as number[]), [1, 2])
})

test ('concat: combines matching Either branches and prefers Right', () => {
  assert.deepStrictEqual (
    cat (right<string, string> ('a'), right<string, string> ('b')),
    right<string, string> ('ab'),
  )
  assert.deepStrictEqual (
    cat (left<string, string> ('e'), left<string, string> ('f')),
    left<string, string> ('ef'),
  )
  assert.deepStrictEqual (
    cat (left<string, string> ('e'), right<string, string> ('b')),
    right<string, string> ('b'),
  )
  assert.deepStrictEqual (
    cat (right<string, string> ('a'), left<string, string> ('f')),
    right<string, string> ('a'),
  )
})

test ('concat: combines both fields of a Pair', () => {
  assert.deepStrictEqual (concat (pair ('a', 'x')) (pair ('b', 'y')), pair ('ab', 'xy'))
  assert.deepStrictEqual (
    cat (pair ('log', [1]), pair ('!', [2])),
    pair ('log!', [1, 2]),
  )
})

test ('concat: associativity law across supported types', () => {
  for (const [name, [a, b, c]] of Object.entries (triples)) {
    assert.deepStrictEqual (cat (cat (a, b), c), cat (a, cat (b, c)), name)
  }
})

test ('concat: rejects Set and Map inputs', () => {
  for (const [name, [a, b, c]] of Object.entries (withoutConcat)) {
    const message = `concat: ${name} has no Semigroup`
    assert.throws (
      () => cat (cat (a, b), c),
      (error: unknown) => error instanceof TypeError && error.message.includes (message),
      name,
    )
    assert.throws (
      () => cat (a, cat (b, c)),
      (error: unknown) => error instanceof TypeError && error.message.includes (message),
      name,
    )
  }
})

test ('concat: rejects values without Semigroup', () => {
  assert.throws (
    () => concat (just (1) as never) (just (2) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Maybe has no Semigroup'),
  )
  assert.throws (
    () => concat (1 as never) (2 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Number has no Semigroup'),
  )
  assert.throws (
    () => concat (true as never) (false as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Boolean has no Semigroup'),
  )
  assert.throws (
    () => concat (null as never) (null as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Null has no Semigroup'),
  )
})

test ('concat: combines values in argument order', () => {
  assert.deepStrictEqual (concat ('abc') ('def'), 'abcdef')
  assert.deepStrictEqual (concat ([1, 2] as number[]) ([3, 4] as number[]), [1, 2, 3, 4])
  assert.deepStrictEqual (
    concat ({ a: 1 } as Record<string, number>) ({ b: 2 }),
    { a: 1, b: 2 },
  )
  // @ts-expect-error concat has no overload for Set
  const _set = () => concat (new Set ([1])) (new Set ([2]))
  // @ts-expect-error concat has no overload for Map
  const _map = () => concat (new Map ([['a', 1]])) (new Map ([['b', 2]]))
  void _set, _map

  assert.throws (
    () => cat (new Set ([1]), new Set ([2])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Set has no Semigroup'),
  )
  assert.throws (
    () => cat (new Map ([['a', 1]]), new Map ([['b', 2]])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Map has no Semigroup'),
  )
})

test ('concat: preserves the first record value for duplicate keys', () => {
  assert.deepStrictEqual (
    concat ({ a: 1, b: 1 } as Record<string, number>) ({ a: 2, c: 3 }),
    { a: 1, b: 1, c: 3 },
  )
  // @ts-expect-error concat has no overload for Map
  const _map = () => concat (new Map ([['a', 1]])) (new Map ([['a', 2]]))
  void _map
  assert.throws (
    () => cat (new Map ([['a', 1]]), new Map ([['a', 2], ['b', 3]])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Map has no Semigroup'),
  )
})

test ('concat: the operands do not change', () => {
  const values = [1]
  const s = new Set ([1])
  const m = new Map ([['a', 1]])
  const o = { a: 1 }
  concat (values as number[]) ([2] as number[])
  concat (o as Record<string, number>) ({ b: 2 })
  // @ts-expect-error concat has no overload for Set
  const _set = () => concat (s) (new Set ([2]))
  // @ts-expect-error concat has no overload for Map
  const _map = () => concat (m) (new Map ([['b', 2]]))
  void _set, _map
  assert.throws (
    () => cat (s, new Set ([2])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Set has no Semigroup'),
  )
  assert.throws (
    () => cat (m, new Map ([['b', 2]])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Map has no Semigroup'),
  )
  assert.deepStrictEqual (values, [1])
  assert.deepStrictEqual (s, new Set ([1]))
  assert.deepStrictEqual (m, new Map ([['a', 1]]))
  assert.deepStrictEqual (o, { a: 1 })
})

test ('semigroupNatives: provides Array, StrMap, and String operations', () => {
  assert.deepStrictEqual (Object.keys (semigroupNatives), [
    'Array',
    'StrMap',
    'String',
  ])
  assert.deepStrictEqual (semigroupNatives.String.concat ('a', 'b'), 'ab')
  assert.deepStrictEqual (semigroupNatives.Array.concat ([1], [2]), [1, 2])
  for (const removed of ['Set', 'Map']) {
    assert.deepStrictEqual (removed in semigroupNatives, false, removed)
  }
})

const cat = (a: unknown, b: unknown): unknown => concat (a as never) (b as never)

const triples: Record<string, readonly [unknown, unknown, unknown]> = {
  Array: [[1], [2, 3], [4]],
  'Array nested': [[[1]], [[2]], [[3]]],
  StrMap: [{ a: 1 }, { a: 2, b: 2 }, { b: 3, c: 3 }],
  String: ['ab', 'cd', 'ef'],
  Pair: [pair ('a', [1]), pair ('b', [2]), pair ('c', [3])],
  'Either.Right': [
    right<string, string> ('a'),
    right<string, string> ('b'),
    right<string, string> ('c'),
  ],
  'Either.Left': [
    left<string, string> ('a'),
    left<string, string> ('b'),
    left<string, string> ('c'),
  ],
  'Either mixed': [
    left<string, string> ('a'),
    right<string, string> ('b'),
    left<string, string> ('c'),
  ],
}

const withoutConcat: Record<string, readonly [unknown, unknown, unknown]> = {
  Set: [new Set ([1, 2]), new Set ([2, 3]), new Set ([3, 4])],
  Map: [
    new Map ([['a', 1]]),
    new Map ([['a', 2], ['b', 2]]),
    new Map ([['b', 3], ['c', 3]]),
  ],
}
