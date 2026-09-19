import { assertEquals, assertThrows } from '@std/assert'
import { finiteFrom, integer, integerFrom } from './domain.ts'

// Edge cases

Deno.test('integer: lets whole numbers through, zero and negatives included', () => {
  for (const n of [0, 1, -1, 42, -42, Number.MAX_SAFE_INTEGER]) {
    assertEquals(integer('op', n), n)
  }

  assertEquals(Object.is(integer('op', -0), -0), true)
})

Deno.test('integer: rejects fractions, NaN and the infinities', () => {
  for (const n of [2.5, -0.5, 1e-9, NaN, Infinity, -Infinity]) {
    assertThrows(() => integer('op', n), TypeError, 'is not an integer')
  }
})

Deno.test('integer: the message names the operation and the value itself', () => {
  assertThrows(
    () => integer('take', 2.5),
    TypeError,
    'take: 2.5 is not an integer',
  )
  assertThrows(
    () => integer('index', NaN),
    TypeError,
    'index: NaN is not an integer',
  )
  assertThrows(
    () => integer('op', -0.5),
    TypeError,
    'op: -0.5 is not an integer',
  )
})

Deno.test('integerFrom: the lower bound', () => {
  assertEquals(integerFrom('op', 1, 1), 1)
  assertEquals(integerFrom('op', 1, 99), 99)
  assertEquals(integerFrom('op', 0, 0), 0)
  assertThrows(
    () => integerFrom('op', 1, 0),
    TypeError,
    'is not an integer >= 1',
  )
  assertThrows(
    () => integerFrom('op', 1, -5),
    TypeError,
    'is not an integer >= 1',
  )
  assertThrows(
    () => integerFrom('op', 1, 2.5),
    TypeError,
    'is not an integer >= 1',
  )
})

Deno.test('finiteFrom: a fraction is allowed, infinity and NaN are not', () => {
  assertEquals(finiteFrom('after', 0, 12.5), 12.5)
  assertEquals(finiteFrom('after', 0, 0), 0)

  for (const n of [NaN, Infinity, -Infinity]) {
    assertThrows(
      () => finiteFrom('after', 0, n),
      TypeError,
      'is not a finite number >= 0',
    )
  }
  assertThrows(
    () => finiteFrom('after', 0, -1),
    TypeError,
    'is not a finite number >= 0',
  )
})
