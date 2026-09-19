import { assertEquals, assertThrows } from '@std/assert'
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
} from './number.ts'
import { map } from '../classes/functor.ts'
import { empty } from '../classes/monoid.ts'
import { of } from '../classes/applicative.ts'
import { just, nothing } from '../data/maybe.ts'

// Examples

Deno.test('add: adds positive, zero, and negative values', () => {
  assertEquals(add(1)(1), 2)
  assertEquals(add(0)(42), 42)
  assertEquals(add(-1)(1), 0)
})

Deno.test('sub: subtracts the first argument from the second', () => {
  assertEquals(map(sub(1))([1, 2, 3]), [0, 1, 2])
  assertEquals(sub(1)(10), 9)
  assertEquals(sub(10)(1), -9)
  assertEquals(sub(0)(5), 5)
})

Deno.test('mult: multiplies positive, zero, and negative values', () => {
  assertEquals(mult(4)(2), 8)
  assertEquals(mult(0)(42), 0)
  assertEquals(mult(-3)(2), -6)
})

Deno.test('div: divides the second argument by the first', () => {
  assertEquals(map(div(2))([0, 1, 2, 3]), [0, 0.5, 1, 1.5])
  assertEquals(div(2)(7), 3.5)
  assertEquals(div(7)(2), 2 / 7)
  assertEquals(div(0)(1), Infinity)
})

Deno.test('pow: raises the second argument to the first argument’s power', () => {
  assertEquals(map(pow(2))([-3, -2, -1, 0, 1, 2, 3]), [9, 4, 1, 0, 1, 4, 9])
  assertEquals(map(pow(0.5))([1, 4, 9, 16, 25]), [1, 2, 3, 4, 5])
  assertEquals(pow(3)(2), 8)
  assertEquals(pow(0)(42), 1)
  assertEquals(pow(-1)(4), 0.25)
})

Deno.test('negate: changes the sign', () => {
  assertEquals(negate(12.5), -12.5)
  assertEquals(negate(-42), 42)
})

Deno.test('even: checks whether an integer is even', () => {
  assertEquals(even(42), true)
  assertEquals(even(99), false)
  assertEquals(even(0), true)
  assertEquals(even(-2), true)
  assertEquals(even(-3), false)
})

Deno.test('odd: checks whether an integer is odd', () => {
  assertEquals(odd(99), true)
  assertEquals(odd(42), false)
  assertEquals(odd(0), false)
  assertEquals(odd(-3), true)
  assertEquals(odd(-2), false)
})

Deno.test('sum: adds contained numbers, starting at zero', () => {
  assertEquals(sum([1, 2, 3, 4, 5]), 15)
  assertEquals(sum([]), 0)
  assertEquals(sum(just(42)), 42)
  assertEquals(sum(nothing<number>()), 0)
})

Deno.test('sum: accepts records and Maybe values', () => {
  assertEquals(sum({ a: 1, b: 2, c: 3 }), 6)
  assertEquals(sum(just(1)), 1)
})

Deno.test('product: multiplies contained numbers, starting at one', () => {
  assertEquals(product([1, 2, 3, 4, 5]), 120)
  assertEquals(product([]), 1)
  assertEquals(product(just(42)), 42)
  assertEquals(product(nothing<number>()), 1)
})

Deno.test('product: accepts records and Maybe values', () => {
  assertEquals(product({ a: 2, b: 5 }), 10)
  assertEquals(product(just(7)), 7)
})

Deno.test('mean: returns the arithmetic mean as Just, or Nothing when there are no values', () => {
  assertEquals(mean([1, 2, 3, 4]), just(2.5))
  assertEquals(mean([42]), just(42))
  assertEquals(mean([]), nothing())
  assertEquals(mean(just(7)), just(7))
  assertEquals(mean(nothing<number>()), nothing())
})

Deno.test('mean: computes the average of record values', () => {
  assertEquals(mean({ a: 1, b: 2, c: 3, d: 4 }), just(2.5))
})

Deno.test('Num: recognizes values and provides the declared operations', () => {
  assertEquals(Num['@@type'], 'Number')
  assertEquals(Num.is(0), true)
  assertEquals(Num.is(-1.5), true)
  assertEquals(Num.is(NaN), true)
  assertEquals(Num.is(Infinity), true)
  assertEquals(Num.is('1'), false)
  assertEquals(Num.is(1n), false)
  assertEquals(Num.is(new Number(1)), false)
})

Deno.test('Num.equals: compares values by content', () => {
  assertEquals(Num.equals(1, 1), true)
  assertEquals(Num.equals(1, 2), false)
  assertEquals(Num.equals(NaN, NaN), true)
  assertEquals(Num.equals(NaN, 1), false)
  assertEquals(Num.equals(0, -0), true)
  assertEquals(Num.equals(Infinity, Infinity), true)
  assertEquals(Num.equals(Infinity, -Infinity), false)
})

Deno.test('Num.lte: orders values from smaller to larger', () => {
  assertEquals(Num.lte(1, 2), true)
  assertEquals(Num.lte(2, 1), false)
  assertEquals(Num.lte(1, 1), true)
  assertEquals(Num.lte(-1, 0), true)
  assertEquals(Num.lte(-Infinity, Infinity), true)
  assertEquals(Num.lte(0, -0), true)
  assertEquals(Num.lte(-0, 0), true)
})

Deno.test('Num.show: formats values as readable strings', () => {
  assertEquals(Num.show(42), '42')
  assertEquals(Num.show(-1.5), '-1.5')
  assertEquals(Num.show(0), '0')
  assertEquals(Num.show(NaN), 'NaN')
  assertEquals(Num.show(Infinity), 'Infinity')
  assertEquals(Num.show(-Infinity), '-Infinity')
  assertEquals(Num.show(1e21), '1e+21')
})

// Laws

Deno.test('add: swapping the operands preserves the sum', () => {
  assertEquals(add(2)(3), add(3)(2))
})

Deno.test('mult: swapping the operands preserves the product', () => {
  assertEquals(mult(2)(3), mult(3)(2))
})

Deno.test('negate: applying it twice restores the original number', () => {
  for (const number of [0, 1, -1, 3.5, 1e21]) {
    assertEquals(negate(negate(number)), number, `input: ${number}`)
  }
})

Deno.test('even and odd complement each other', () => {
  for (const n of [0, 1, -1, 2, -2, 99, 1e6]) assertEquals(even(n), !odd(n))
})

Deno.test('sum and product: combining arrays agrees with combining their results', () => {
  const first = [1, 2, 3]
  const second = [4, 5]

  assertEquals(sum([...first, ...second]), sum(first) + sum(second))
  assertEquals(product([...first, ...second]), product(first) * product(second))
})

Deno.test('Num.equals: the Setoid laws', () => {
  const probes = [0, -0, 1, -1, 1.5, NaN, Infinity, -Infinity]
  for (const a of probes) assertEquals(Num.equals(a, a), true)
  for (const a of probes) {
    for (const b of probes) {
      assertEquals(Num.equals(a, b), Num.equals(b, a))
      for (const c of probes) {
        if (Num.equals(a, b) && Num.equals(b, c)) {
          assertEquals(Num.equals(a, c), true)
        }
      }
    }
  }
})

Deno.test('Num.lte: the Ord laws', () => {
  const probes = [0, -0, 1, -1, 1.5, NaN, Infinity, -Infinity]
  for (const a of probes) {
    for (const b of probes) {
      assertEquals(Num.lte(a, b) || Num.lte(b, a), true)
      if (Num.lte(a, b) && Num.lte(b, a)) assertEquals(Num.equals(a, b), true)
      for (const c of probes) {
        if (Num.lte(a, b) && Num.lte(b, c)) {
          assertEquals(Num.lte(a, c), true)
        }
      }
    }
  }
})

// Edge cases

Deno.test('even and odd reject a non-integer', () => {
  for (const bad of [2.5, -0.5, NaN, Infinity, -Infinity]) {
    assertThrows(() => odd(bad), TypeError, 'odd:', String(bad))
    assertThrows(() => even(bad), TypeError, 'even:', String(bad))
  }

  assertEquals(odd(-3), true)
  assertEquals(even(-2), true)
  assertEquals(even(0), true)
  assertEquals(odd(0), false)
})

Deno.test('numeric summaries: convert Set and Map values to arrays before folding', () => {
  // Bypass the type checker to verify the runtime error.
  const dropped: [string, unknown][] = [
    ['Set', new Set([1, 2, 3])],
    ['Map', new Map([['a', 1], ['b', 2]])],
  ]
  for (const [name, wrappedValue] of dropped) {
    assertThrows(
      () => sum(wrappedValue as never),
      TypeError,
      `reduce: ${name} has no Foldable`,
      name,
    )
    assertThrows(
      () => product(wrappedValue as never),
      TypeError,
      `reduce: ${name} has no Foldable`,
      name,
    )
    assertThrows(
      () => mean(wrappedValue as never),
      TypeError,
      `reduce: ${name} has no Foldable`,
      name,
    )
  }
  assertEquals(sum([...new Set([1, 2, 3])]), 6)
  assertEquals(product([...new Set([2, 3, 4])]), 24)
  assertEquals(sum([...new Map([['a', 1], ['b', 2]]).values()]), 3)
  assertEquals(mean([...new Set([1, 2, 3])]), just(2))
})

Deno.test('sum and product: empty arrays return their identity values', () => {
  assertEquals(sum([]), 0)
  assertEquals(product([]), 1)
})

Deno.test('Num.lte: NaN sorts above every number', () => {
  assertEquals(Num.lte(NaN, 5), false)
  assertEquals(Num.lte(5, NaN), true)
  assertEquals(Num.lte(NaN, NaN), true)
})

Deno.test('Num.show: negative zero stays visible', () => {
  assertEquals(Num.show(-0), '-0')
  assertEquals(Num.show(0), '0')
})

Deno.test('a number does not support Functor: map throws a descriptive TypeError', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(() => map((n: number) => n)(42 as never), TypeError, 'Number')
  assertThrows(
    () => map((n: number) => n)(42 as never),
    TypeError,
    'has no Functor',
  )
})

Deno.test('a number does not support Foldable: sum and mean refuse', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(() => sum(42 as never), TypeError, 'has no Foldable')
  assertThrows(() => product(42 as never), TypeError, 'has no Foldable')
  assertThrows(() => mean(42), TypeError, 'has no Foldable')
})

Deno.test('Num is neither a Monoid nor an Applicative', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(() => empty(Num as never), TypeError, 'has no Monoid')
  assertThrows(() => of(Num as never), TypeError, 'has no Applicative')
})

Deno.test('mean: a zero average is Just(0), an empty input is Nothing', () => {
  assertEquals(mean([-1, 1]), just(0))
  assertEquals(mean([0]), just(0))
  assertEquals(mean([0, 0, 0]), just(0))
  assertEquals(mean([-5, 5, 3]), just(1))
  assertEquals(mean([] as number[]), nothing())
})

Deno.test('numeric summaries: empty inputs preserve positive zero and one', () => {
  assertEquals(Object.is(sum([] as number[]), 0), true)
  assertEquals(Object.is(product([] as number[]), 1), true)
  assertEquals(1 / sum([] as number[]), Infinity)
  assertEquals(Num.show(sum([] as number[])), '0')
})
