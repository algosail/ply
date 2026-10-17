import { test } from 'node:test'
import type { FnShape } from '../../src/natives/function.ts'
import { assertEquals, assertThrows } from '../assert.ts'
import { categoryNatives, id } from '../../src/classes/category.ts'
import { compose, semigroupoidNatives } from '../../src/classes/semigroupoid.ts'
import { Fn } from '../../src/natives/function.ts'
import { Arr } from '../../src/natives/array.ts'
import { StrMap } from '../../src/natives/strmap.ts'
import { Pair } from '../../src/data/pair.ts'
import { Maybe } from '../../src/data/maybe.ts'

test ('id: creates an identity for the chosen type', () => {
  assertEquals (id<FnShape, number> (Fn) (9), 9)
  assertEquals (id<FnShape, string> (Fn) ('one'), 'one')

  const values = [1, 2, 3]
  assertEquals (id<FnShape, number[]> (Fn) (values) === values, true)
})

test ('id: the category identity laws', () => {
  const f = (s: string) => s.length
  const probes = ['', 'a', 'abcd']
  const left = compose (id<FnShape, number> (Fn)) (f)
  const right = compose (f) (id<FnShape, string> (Fn))
  for (const s of probes) {
    assertEquals (left (s), f (s))
    assertEquals (right (s), f (s))
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
    assertThrows (
      () => id (T as never),
      TypeError,
      `id: ${name} has no Category`,
    )
  }
})

test ('id: an empty argument is named by name too', () => {
  assertThrows (() => id (null as never), TypeError, 'id: Null has no Category')
  assertThrows (
    () => id (undefined as never),
    TypeError,
    'id: Undefined has no Category',
  )
})

test ('categoryNatives: provides only Fn operations', () => {
  assertEquals (Object.keys (categoryNatives), ['Fn'])
  assertEquals (typeof categoryNatives.Fn.id, 'function')
  for (const name of Object.keys (categoryNatives)) {
    assertEquals (Object.hasOwn (semigroupoidNatives, name), true, name)
  }
})
