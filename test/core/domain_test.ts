import assert from 'node:assert/strict'
import { test } from 'node:test'
import { finiteFrom, integer, integerFrom } from '../../src/core/domain.ts'

test ('integer: lets whole numbers through, zero and negatives included', () => {
  for (const n of [0, 1, -1, 42, -42, Number.MAX_SAFE_INTEGER]) {
    assert.deepStrictEqual (integer ('op', n), n)
  }

  assert.deepStrictEqual (Object.is (integer ('op', -0), -0), true)
})

test ('integer: rejects fractions, NaN and the infinities', () => {
  for (const n of [2.5, -0.5, 1e-9, NaN, Infinity, -Infinity]) {
    assert.throws (
      () => integer ('op', n),
      (error: unknown) => error instanceof TypeError && error.message.includes ('is not an integer'),
    )
  }
})

test ('integer: the message names the operation and the value itself', () => {
  assert.throws (
    () => integer ('take', 2.5),
    (error: unknown) => error instanceof TypeError && error.message.includes ('take: 2.5 is not an integer'),
  )
  assert.throws (
    () => integer ('index', NaN),
    (error: unknown) => error instanceof TypeError && error.message.includes ('index: NaN is not an integer'),
  )
  assert.throws (
    () => integer ('op', -0.5),
    (error: unknown) => error instanceof TypeError && error.message.includes ('op: -0.5 is not an integer'),
  )
})

test ('integerFrom: the lower bound', () => {
  assert.deepStrictEqual (integerFrom ('op', 1, 1), 1)
  assert.deepStrictEqual (integerFrom ('op', 1, 99), 99)
  assert.deepStrictEqual (integerFrom ('op', 0, 0), 0)
  assert.throws (
    () => integerFrom ('op', 1, 0),
    (error: unknown) => error instanceof TypeError && error.message.includes ('is not an integer >= 1'),
  )
  assert.throws (
    () => integerFrom ('op', 1, -5),
    (error: unknown) => error instanceof TypeError && error.message.includes ('is not an integer >= 1'),
  )
  assert.throws (
    () => integerFrom ('op', 1, 2.5),
    (error: unknown) => error instanceof TypeError && error.message.includes ('is not an integer >= 1'),
  )
})

test ('finiteFrom: a fraction is allowed, infinity and NaN are not', () => {
  assert.deepStrictEqual (finiteFrom ('after', 0, 12.5), 12.5)
  assert.deepStrictEqual (finiteFrom ('after', 0, 0), 0)

  for (const n of [NaN, Infinity, -Infinity]) {
    assert.throws (
      () => finiteFrom ('after', 0, n),
      (error: unknown) => error instanceof TypeError && error.message.includes ('is not a finite number >= 0'),
    )
  }
  assert.throws (
    () => finiteFrom ('after', 0, -1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('is not a finite number >= 0'),
  )
})
