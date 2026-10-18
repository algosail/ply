import assert from 'node:assert/strict'
import { test } from 'node:test'
import { of } from '../../src/classes/applicative.ts'
import { map } from '../../src/classes/functor.ts'
import { empty } from '../../src/classes/monoid.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import {
  add,
  div,
  even,
  mean,
  mult,
  negate,
  Num,
  odd,
  pow,
  product,
  sub,
  sum,
} from '../../src/natives/number.ts'

test ('add: adds positive, zero, and negative values', () => {
  assert.deepStrictEqual (add (1) (1), 2)
  assert.deepStrictEqual (add (0) (42), 42)
  assert.deepStrictEqual (add (-1) (1), 0)
})

test ('sub: subtracts the first argument from the second', () => {
  assert.deepStrictEqual (map (sub (1)) ([1, 2, 3]), [0, 1, 2])
  assert.deepStrictEqual (sub (1) (10), 9)
  assert.deepStrictEqual (sub (10) (1), -9)
  assert.deepStrictEqual (sub (0) (5), 5)
})

test ('mult: multiplies positive, zero, and negative values', () => {
  assert.deepStrictEqual (mult (4) (2), 8)
  assert.deepStrictEqual (mult (0) (42), 0)
  assert.deepStrictEqual (mult (-3) (2), -6)
})

test ('div: divides the second argument by the first', () => {
  assert.deepStrictEqual (map (div (2)) ([0, 1, 2, 3]), [0, 0.5, 1, 1.5])
  assert.deepStrictEqual (div (2) (7), 3.5)
  assert.deepStrictEqual (div (7) (2), 2 / 7)
  assert.deepStrictEqual (div (0) (1), Infinity)
})

test ('pow: raises the second argument to the first argument’s power', () => {
  assert.deepStrictEqual (map (pow (2)) ([-3, -2, -1, 0, 1, 2, 3]), [9, 4, 1, 0, 1, 4, 9])
  assert.deepStrictEqual (map (pow (0.5)) ([1, 4, 9, 16, 25]), [1, 2, 3, 4, 5])
  assert.deepStrictEqual (pow (3) (2), 8)
  assert.deepStrictEqual (pow (0) (42), 1)
  assert.deepStrictEqual (pow (-1) (4), 0.25)
})

test ('negate: changes the sign', () => {
  assert.deepStrictEqual (negate (12.5), -12.5)
  assert.deepStrictEqual (negate (-42), 42)
})

test ('even: checks whether an integer is even', () => {
  assert.deepStrictEqual (even (42), true)
  assert.deepStrictEqual (even (99), false)
  assert.deepStrictEqual (even (0), true)
  assert.deepStrictEqual (even (-2), true)
  assert.deepStrictEqual (even (-3), false)
})

test ('odd: checks whether an integer is odd', () => {
  assert.deepStrictEqual (odd (99), true)
  assert.deepStrictEqual (odd (42), false)
  assert.deepStrictEqual (odd (0), false)
  assert.deepStrictEqual (odd (-3), true)
  assert.deepStrictEqual (odd (-2), false)
})

test ('sum: adds contained numbers, starting at zero', () => {
  assert.deepStrictEqual (sum ([1, 2, 3, 4, 5]), 15)
  assert.deepStrictEqual (sum ([]), 0)
  assert.deepStrictEqual (sum (just (42)), 42)
  assert.deepStrictEqual (sum (nothing<number> ()), 0)
})

test ('sum: accepts records and Maybe values', () => {
  assert.deepStrictEqual (sum ({ a: 1, b: 2, c: 3 }), 6)
  assert.deepStrictEqual (sum (just (1)), 1)
})

test ('product: multiplies contained numbers, starting at one', () => {
  assert.deepStrictEqual (product ([1, 2, 3, 4, 5]), 120)
  assert.deepStrictEqual (product ([]), 1)
  assert.deepStrictEqual (product (just (42)), 42)
  assert.deepStrictEqual (product (nothing<number> ()), 1)
})

test ('product: accepts records and Maybe values', () => {
  assert.deepStrictEqual (product ({ a: 2, b: 5 }), 10)
  assert.deepStrictEqual (product (just (7)), 7)
})

test ('mean: returns the arithmetic mean as Just, or Nothing when there are no values', () => {
  assert.deepStrictEqual (mean ([1, 2, 3, 4]), just (2.5))
  assert.deepStrictEqual (mean ([42]), just (42))
  assert.deepStrictEqual (mean ([]), nothing ())
  assert.deepStrictEqual (mean (just (7)), just (7))
  assert.deepStrictEqual (mean (nothing<number> ()), nothing ())
})

test ('mean: computes the average of record values', () => {
  assert.deepStrictEqual (mean ({ a: 1, b: 2, c: 3, d: 4 }), just (2.5))
})

test ('Num: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (Num['@@type'], 'Number')
  assert.deepStrictEqual (Num.is (0), true)
  assert.deepStrictEqual (Num.is (-1.5), true)
  assert.deepStrictEqual (Num.is (NaN), true)
  assert.deepStrictEqual (Num.is (Infinity), true)
  assert.deepStrictEqual (Num.is ('1'), false)
  assert.deepStrictEqual (Num.is (1n), false)
  assert.deepStrictEqual (Num.is (new Number (1)), false)
})

test ('Num.equals: compares values by content', () => {
  assert.deepStrictEqual (Num.equals (1, 1), true)
  assert.deepStrictEqual (Num.equals (1, 2), false)
  assert.deepStrictEqual (Num.equals (NaN, NaN), true)
  assert.deepStrictEqual (Num.equals (NaN, 1), false)
  assert.deepStrictEqual (Num.equals (0, -0), true)
  assert.deepStrictEqual (Num.equals (Infinity, Infinity), true)
  assert.deepStrictEqual (Num.equals (Infinity, -Infinity), false)
})

test ('Num.lte: orders values from smaller to larger', () => {
  assert.deepStrictEqual (Num.lte (1, 2), true)
  assert.deepStrictEqual (Num.lte (2, 1), false)
  assert.deepStrictEqual (Num.lte (1, 1), true)
  assert.deepStrictEqual (Num.lte (-1, 0), true)
  assert.deepStrictEqual (Num.lte (-Infinity, Infinity), true)
  assert.deepStrictEqual (Num.lte (0, -0), true)
  assert.deepStrictEqual (Num.lte (-0, 0), true)
})

test ('Num.show: formats values as readable strings', () => {
  assert.deepStrictEqual (Num.show (42), '42')
  assert.deepStrictEqual (Num.show (-1.5), '-1.5')
  assert.deepStrictEqual (Num.show (0), '0')
  assert.deepStrictEqual (Num.show (NaN), 'NaN')
  assert.deepStrictEqual (Num.show (Infinity), 'Infinity')
  assert.deepStrictEqual (Num.show (-Infinity), '-Infinity')
  assert.deepStrictEqual (Num.show (1e21), '1e+21')
})

test ('add: swapping the operands preserves the sum', () => {
  assert.deepStrictEqual (add (2) (3), add (3) (2))
})

test ('mult: swapping the operands preserves the product', () => {
  assert.deepStrictEqual (mult (2) (3), mult (3) (2))
})

test ('negate: applying it twice restores the original number', () => {
  for (const number of [0, 1, -1, 3.5, 1e21]) {
    assert.deepStrictEqual (negate (negate (number)), number, `input: ${number}`)
  }
})

test ('even and odd complement each other', () => {
  for (const n of [0, 1, -1, 2, -2, 99, 1e6]) assert.deepStrictEqual (even (n), !odd (n))
})

test ('sum and product: combining arrays agrees with combining their results', () => {
  const first = [1, 2, 3]
  const second = [4, 5]

  assert.deepStrictEqual (sum ([...first, ...second]), sum (first) + sum (second))
  assert.deepStrictEqual (product ([...first, ...second]), product (first) * product (second))
})

test ('Num.equals: the Setoid laws', () => {
  const probes = [0, -0, 1, -1, 1.5, NaN, Infinity, -Infinity]
  for (const a of probes) assert.deepStrictEqual (Num.equals (a, a), true)
  for (const a of probes) {
    for (const b of probes) {
      assert.deepStrictEqual (Num.equals (a, b), Num.equals (b, a))
      for (const c of probes) {
        if (Num.equals (a, b) && Num.equals (b, c)) {
          assert.deepStrictEqual (Num.equals (a, c), true)
        }
      }
    }
  }
})

test ('Num.lte: the Ord laws', () => {
  const probes = [0, -0, 1, -1, 1.5, NaN, Infinity, -Infinity]
  for (const a of probes) {
    for (const b of probes) {
      assert.deepStrictEqual (Num.lte (a, b) || Num.lte (b, a), true)
      if (Num.lte (a, b) && Num.lte (b, a)) assert.deepStrictEqual (Num.equals (a, b), true)
      for (const c of probes) {
        if (Num.lte (a, b) && Num.lte (b, c)) {
          assert.deepStrictEqual (Num.lte (a, c), true)
        }
      }
    }
  }
})

test ('even and odd reject a non-integer', () => {
  for (const bad of [2.5, -0.5, NaN, Infinity, -Infinity]) {
    assert.throws (
      () => odd (bad),
      (error: unknown) => error instanceof TypeError && error.message.includes ('odd:'),
      String (bad),
    )
    assert.throws (
      () => even (bad),
      (error: unknown) => error instanceof TypeError && error.message.includes ('even:'),
      String (bad),
    )
  }

  assert.deepStrictEqual (odd (-3), true)
  assert.deepStrictEqual (even (-2), true)
  assert.deepStrictEqual (even (0), true)
  assert.deepStrictEqual (odd (0), false)
})

test ('numeric summaries: convert Set and Map values to arrays before folding', () => {
  const dropped: [string, unknown][] = [
    ['Set', new Set ([1, 2, 3])],
    ['Map', new Map ([['a', 1], ['b', 2]])],
  ]
  for (const [name, wrappedValue] of dropped) {
    assert.throws (
      () => sum (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      name,
    )
    assert.throws (
      () => product (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      name,
    )
    assert.throws (
      () => mean (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      name,
    )
  }
  assert.deepStrictEqual (sum ([...new Set ([1, 2, 3])]), 6)
  assert.deepStrictEqual (product ([...new Set ([2, 3, 4])]), 24)
  assert.deepStrictEqual (sum ([...new Map ([['a', 1], ['b', 2]]).values ()]), 3)
  assert.deepStrictEqual (mean ([...new Set ([1, 2, 3])]), just (2))
})

test ('sum and product: empty arrays return their identity values', () => {
  assert.deepStrictEqual (sum ([]), 0)
  assert.deepStrictEqual (product ([]), 1)
})

test ('Num.lte: NaN sorts above every number', () => {
  assert.deepStrictEqual (Num.lte (NaN, 5), false)
  assert.deepStrictEqual (Num.lte (5, NaN), true)
  assert.deepStrictEqual (Num.lte (NaN, NaN), true)
})

test ('Num.show: negative zero stays visible', () => {
  assert.deepStrictEqual (Num.show (-0), '-0')
  assert.deepStrictEqual (Num.show (0), '0')
})

test ('a number does not support Functor: map throws a descriptive TypeError', () => {
  assert.throws (
    () => map ((n: number) => n) (42 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Number'),
  )
  assert.throws (
    () => map ((n: number) => n) (42 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Functor'),
  )
})

test ('a number does not support Foldable: sum and mean refuse', () => {
  assert.throws (
    () => sum (42 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
  )
  assert.throws (
    () => product (42 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
  )
  assert.throws (
    () => mean (42),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
  )
})

test ('Num is neither a Monoid nor an Applicative', () => {
  assert.throws (
    () => empty (Num as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Monoid'),
  )
  assert.throws (
    () => of (Num as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Applicative'),
  )
})

test ('mean: a zero average is Just(0), an empty input is Nothing', () => {
  assert.deepStrictEqual (mean ([-1, 1]), just (0))
  assert.deepStrictEqual (mean ([0]), just (0))
  assert.deepStrictEqual (mean ([0, 0, 0]), just (0))
  assert.deepStrictEqual (mean ([-5, 5, 3]), just (1))
  assert.deepStrictEqual (mean ([] as number[]), nothing ())
})

test ('numeric summaries: empty inputs preserve positive zero and one', () => {
  assert.deepStrictEqual (Object.is (sum ([] as number[]), 0), true)
  assert.deepStrictEqual (Object.is (product ([] as number[]), 1), true)
  assert.deepStrictEqual (1 / sum ([] as number[]), Infinity)
  assert.deepStrictEqual (Num.show (sum ([] as number[])), '0')
})
