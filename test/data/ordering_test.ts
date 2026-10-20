import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mconcat } from '../../src/classes/monoid.ts'
import { compare, comparing, Ordering, sortWith } from '../../src/data/ordering.ts'

test ('compare: says which of two values comes first', () => {
  assert.deepStrictEqual (Ordering.isLT (compare (1, 2)), true)
  assert.deepStrictEqual (Ordering.isGT (compare (2, 1)), true)
  assert.deepStrictEqual (Ordering.isEQ (compare (2, 2)), true)
})

test ('comparing: compares by what the function reads', () => {
  const byLength = comparing ((s: string) => s.length)

  assert.deepStrictEqual (Ordering.isLT (byLength ('ab', 'cde')), true)
  assert.deepStrictEqual (Ordering.isEQ (byLength ('ab', 'cd')), true)
})

test ('sortWith: sorts and leaves the array it was given alone', () => {
  const given = ['aaa', 'a', 'aa']
  const sorted = sortWith (comparing ((s: string) => s.length)) (given)

  assert.deepStrictEqual (sorted, ['a', 'aa', 'aaa'])
  assert.deepStrictEqual (given, ['aaa', 'a', 'aa'])
})

test ('the first inequality decides, and equality is the empty answer', () => {
  const byLength = comparing ((s: string) => s.length)
  const alphabetical = comparing ((s: string) => s)
  const both = (a: string, b: string) =>
    mconcat (Ordering) ([byLength (a, b), alphabetical (a, b)])

  assert.deepStrictEqual (sortWith (both) (['bb', 'a', 'ba', 'ab']), ['a', 'ab', 'ba', 'bb'])
  assert.deepStrictEqual (Ordering.isEQ (Ordering.empty ()), true)
  assert.deepStrictEqual (Ordering.concat (Ordering.lt, Ordering.gt), Ordering.lt)
  assert.deepStrictEqual (Ordering.concat (Ordering.eq, Ordering.gt), Ordering.gt)
})

test ('fromNumber reads the sign, not only -1, 0 and 1', () => {
  assert.deepStrictEqual (Ordering.isLT (Ordering.fromNumber (-5)), true)
  assert.deepStrictEqual (Ordering.isGT (Ordering.fromNumber (5)), true)
  assert.deepStrictEqual (Ordering.isEQ (Ordering.fromNumber (0)), true)
})

test ('toNumber hands the answer to somebody else sort', () => {
  assert.deepStrictEqual ([1, 3, 2].sort ((a, b) => Ordering.toNumber (compare (a, b))), [
    1,
    2,
    3,
  ])
})

test ('reverse turns the answer round, equality excepted', () => {
  assert.deepStrictEqual (Ordering.reverse (Ordering.lt), Ordering.gt)
  assert.deepStrictEqual (Ordering.reverse (Ordering.gt), Ordering.lt)
  assert.deepStrictEqual (Ordering.reverse (Ordering.eq), Ordering.eq)
})

test ('sortWith: an empty array sorts to an empty array', () => {
  assert.deepStrictEqual (sortWith (comparing ((n: number) => n)) ([]), [])
})
