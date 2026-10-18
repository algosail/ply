import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupNatives, invert } from '../../src/classes/group.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { just } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'

test ('invert: returns a value that cancels the input when combined with concat', () => {
  assert.deepStrictEqual (invert (add (3)).value, -3)
  assert.deepStrictEqual (invert (add (-3)).value, 3)
  assert.strictEqual (invert (zero).value, -0)
})

test ('invert: the inverse element law', () => {
  for (const n of [0, 1, -1, 42]) {
    const x = add (n)
    assert.deepStrictEqual ((concat (x) (invert (x)) as Add).value, zero.value)
    assert.deepStrictEqual ((concat (invert (x)) (x) as Add).value, zero.value)
    assert.deepStrictEqual (invert (invert (x)).value, x.value)
  }
})

test ('invert: rejects values without Group', () => {
  const msg = 'has no Group'
  assert.throws (
    () => invert (5 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => invert ('abc' as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => invert ([1] as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => invert (new Set ([1]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => invert (new Map () as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => invert ({ a: 1 } as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => invert (just (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => invert (pair ('a', 1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => invert (null as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
  assert.throws (
    () => invert (undefined as never),
    (error: unknown) => error instanceof TypeError && error.message.includes (msg),
  )
})

test ('invert: a non-function field does not pass for a method', () => {
  assert.throws (
    () => invert ({ '@@type': 'Fake', invert: 1 } as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Group'),
  )
})

test ('groupNatives: has no native implementations', () => {
  assert.deepStrictEqual (Object.keys (groupNatives), [])
})

interface Add {
  readonly '@@type': 'Add'
  readonly value: number
  concat(that: Add): Add
  invert(): Add
}

const add = (value: number): Add => ({
  '@@type': 'Add',
  value,
  concat(that: Add): Add {
    return add (this.value + that.value)
  },
  invert(): Add {
    return add (-this.value)
  },
})

const zero = add (0)
