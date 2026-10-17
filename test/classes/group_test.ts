import { test } from 'node:test'
import { assertEquals, assertThrows } from '../assert.ts'
import { groupNatives, invert } from '../../src/classes/group.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { just } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'

test ('invert: returns a value that cancels the input when combined with concat', () => {
  assertEquals (invert (add (3)).value, -3)
  assertEquals (invert (add (-3)).value, 3)
  assertEquals (invert (zero).value, 0)
})

test ('invert: the inverse element law', () => {
  for (const n of [0, 1, -1, 42]) {
    const x = add (n)
    assertEquals ((concat (x) (invert (x)) as Add).value, zero.value)
    assertEquals ((concat (invert (x)) (x) as Add).value, zero.value)
    assertEquals (invert (invert (x)).value, x.value)
  }
})

test ('invert: rejects values without Group', () => {
  const msg = 'has no Group'
  assertThrows (() => invert (5 as never), TypeError, msg)
  assertThrows (() => invert ('abc' as never), TypeError, msg)
  assertThrows (() => invert ([1] as never), TypeError, msg)
  assertThrows (() => invert (new Set ([1]) as never), TypeError, msg)
  assertThrows (() => invert (new Map () as never), TypeError, msg)
  assertThrows (() => invert ({ a: 1 } as never), TypeError, msg)
  assertThrows (() => invert (just (1) as never), TypeError, msg)
  assertThrows (() => invert (pair ('a', 1) as never), TypeError, msg)
  assertThrows (() => invert (null as never), TypeError, msg)
  assertThrows (() => invert (undefined as never), TypeError, msg)
})

test ('invert: a non-function field does not pass for a method', () => {
  assertThrows (
    () => invert ({ '@@type': 'Fake', invert: 1 } as never),
    TypeError,
    'has no Group',
  )
})

test ('groupNatives: has no native implementations', () => {
  assertEquals (Object.keys (groupNatives), [])
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
