import type { FnShape } from '../natives/function.ts'
import { assertEquals, assertThrows } from '@std/assert'
import { categoryNatives, id } from './category.ts'
import { compose, semigroupoidNatives } from './semigroupoid.ts'
import { Fn } from '../natives/function.ts'
import { Arr } from '../natives/array.ts'
import { StrMap } from '../natives/strmap.ts'
import { Pair } from '../data/pair.ts'
import { Maybe } from '../data/maybe.ts'

// Examples

Deno.test('id: creates an identity for the chosen type', () => {
  assertEquals(id<FnShape, number>(Fn)(9), 9)
  assertEquals(id<FnShape, string>(Fn)('one'), 'one')

  const values = [1, 2, 3]
  assertEquals(id<FnShape, number[]>(Fn)(values) === values, true)
})

// Laws

Deno.test('id: the category identity laws', () => {
  const f = (s: string) => s.length
  const probes = ['', 'a', 'abcd']
  const left = compose(id<FnShape, number>(Fn))(f)
  const right = compose(f)(id<FnShape, string>(Fn))
  for (const s of probes) {
    assertEquals(left(s), f(s))
    assertEquals(right(s), f(s))
  }
})

// Edge cases

Deno.test('id: a type without an identity arrow throws a descriptive TypeError', () => {
  // Bypass the type checker to verify the runtime error.
  for (
    const [name, T] of [
      ['Array', Arr],
      ['StrMap', StrMap],
      ['Pair', Pair],
      ['Maybe', Maybe],
    ] as const
  ) {
    assertThrows(
      () => id(T as never),
      TypeError,
      `id: ${name} has no Category`,
    )
  }
})

Deno.test('id: an empty argument is named by name too', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(() => id(null as never), TypeError, 'id: Null has no Category')
  assertThrows(
    () => id(undefined as never),
    TypeError,
    'id: Undefined has no Category',
  )
})

// Native operation tables

Deno.test('categoryNatives: provides only Fn operations', () => {
  assertEquals(Object.keys(categoryNatives), ['Fn'])
  assertEquals(typeof categoryNatives.Fn.id, 'function')
  for (const name of Object.keys(categoryNatives)) {
    assertEquals(Object.hasOwn(semigroupoidNatives, name), true, name)
  }
})
