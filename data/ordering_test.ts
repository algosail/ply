import { assertEquals } from '@std/assert'
import { compare, comparing, Ordering, sortWith } from './ordering.ts'
import { mconcat } from '../classes/monoid.ts'

// Examples

Deno.test('compare: says which of two values comes first', () => {
  assertEquals(Ordering.isLT(compare(1, 2)), true)
  assertEquals(Ordering.isGT(compare(2, 1)), true)
  assertEquals(Ordering.isEQ(compare(2, 2)), true)
})

Deno.test('compare: two values that neither precedes are equal', () => {
  // `NaN` is less than nothing and greater than nothing, so it is equal to
  // itself here — the one answer that leaves sorting well defined.
  assertEquals(Ordering.isEQ(compare(Number.NaN, Number.NaN)), true)
})

Deno.test('comparing: compares by what the function reads', () => {
  const byLength = comparing((s: string) => s.length)

  assertEquals(Ordering.isLT(byLength('ab', 'cde')), true)
  assertEquals(Ordering.isEQ(byLength('ab', 'cd')), true)
})

Deno.test('sortWith: sorts and leaves the array it was given alone', () => {
  const given = ['aaa', 'a', 'aa']
  const sorted = sortWith(comparing((s: string) => s.length))(given)

  assertEquals(sorted, ['a', 'aa', 'aaa'])
  assertEquals(given, ['aaa', 'a', 'aa'])
})

// The monoid

Deno.test('the first inequality decides, and equality is the empty answer', () => {
  const byLength = comparing((s: string) => s.length)
  const alphabetical = comparing((s: string) => s)
  const both = (a: string, b: string) =>
    mconcat(Ordering)([byLength(a, b), alphabetical(a, b)])

  assertEquals(sortWith(both)(['bb', 'a', 'ba', 'ab']), ['a', 'ab', 'ba', 'bb'])
  assertEquals(Ordering.isEQ(Ordering.empty()), true)
  assertEquals(Ordering.concat(Ordering.lt, Ordering.gt), Ordering.lt)
  assertEquals(Ordering.concat(Ordering.eq, Ordering.gt), Ordering.gt)
})

// Edge cases

Deno.test('fromNumber reads the sign, not only -1, 0 and 1', () => {
  assertEquals(Ordering.isLT(Ordering.fromNumber(-5)), true)
  assertEquals(Ordering.isGT(Ordering.fromNumber(5)), true)
  assertEquals(Ordering.isEQ(Ordering.fromNumber(0)), true)
})

Deno.test('toNumber hands the answer to somebody else sort', () => {
  assertEquals([1, 3, 2].sort((a, b) => Ordering.toNumber(compare(a, b))), [
    1,
    2,
    3,
  ])
})

Deno.test('reverse turns the answer round, equality excepted', () => {
  assertEquals(Ordering.reverse(Ordering.lt), Ordering.gt)
  assertEquals(Ordering.reverse(Ordering.gt), Ordering.lt)
  assertEquals(Ordering.reverse(Ordering.eq), Ordering.eq)
})

Deno.test('sortWith: an empty array sorts to an empty array', () => {
  assertEquals(sortWith(comparing((n: number) => n))([]), [])
})
