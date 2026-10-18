import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FnShape } from '../../src/natives/function.ts'
import { categoryNatives, id } from '../../src/classes/category.ts'
import { compose, semigroupoidNatives } from '../../src/classes/semigroupoid.ts'
import { Maybe } from '../../src/data/maybe.ts'
import { Pair } from '../../src/data/pair.ts'
import { Arr } from '../../src/natives/array.ts'
import { Fn } from '../../src/natives/function.ts'
import { StrMap } from '../../src/natives/strmap.ts'

test ('id: creates an identity for the chosen type', () => {
  assert.deepStrictEqual (id<FnShape, number> (Fn) (9), 9)
  assert.deepStrictEqual (id<FnShape, string> (Fn) ('one'), 'one')

  const values = [1, 2, 3]
  assert.deepStrictEqual (id<FnShape, number[]> (Fn) (values) === values, true)
})

test ('id: the category identity laws', () => {
  const f = (s: string) => s.length
  const probes = ['', 'a', 'abcd']
  const left = compose (id<FnShape, number> (Fn)) (f)
  const right = compose (f) (id<FnShape, string> (Fn))
  for (const s of probes) {
    assert.deepStrictEqual (left (s), f (s))
    assert.deepStrictEqual (right (s), f (s))
  }
})

test ('id: a type without an identity arrow throws a descriptive TypeError', () => {
  for (
    const [name, T] of [
      ['Array', Arr],
      ['StrMap', StrMap],
      ['Pair', Pair],
      ['Maybe', Maybe],
    ] as const
  ) {
    assert.throws (
      () => id (T as never),
      (error: unknown) => error instanceof TypeError && error.message.includes (`id: ${name} has no Category`),
    )
  }
})

test ('id: an empty argument is named by name too', () => {
  assert.throws (
    () => id (null as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('id: Null has no Category'),
  )
  assert.throws (
    () => id (undefined as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('id: Undefined has no Category'),
  )
})

test ('categoryNatives: provides only Fn operations', () => {
  assert.deepStrictEqual (Object.keys (categoryNatives), ['Fn'])
  assert.deepStrictEqual (typeof categoryNatives.Fn.id, 'function')
  for (const name of Object.keys (categoryNatives)) {
    assert.deepStrictEqual (Object.hasOwn (semigroupoidNatives, name), true, name)
  }
})
