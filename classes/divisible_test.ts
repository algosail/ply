import { assertEquals, assertThrows } from '@std/assert'
import { conquer, divide, divisibleNatives } from './divisible.ts'
import { concat } from './semigroup.ts'
import { empty } from './monoid.ts'
import { contramap } from './contravariant.ts'
import { Predicate, predicate } from '../data/predicate.ts'
import { Equivalence, equivalence } from '../data/equivalence.ts'
import { just } from '../data/maybe.ts'

// Examples

Deno.test('divide: validates each field with its own predicate', () => {
  const known = predicate<string>((c) => c === 'ann')
  const small = predicate<number>((t) => t < 800)
  const ok = divide(split)(known)(small)
  assertEquals([ok(ann500), ok(ann900), ok(bob500)], [true, false, false])
})

Deno.test('divide: skips the second predicate when the first fails', () => {
  const asked: string[] = []
  const known = predicate<string>((c) => (asked.push('customer'), c === 'ann'))
  const small = predicate<number>((t) => (asked.push('total'), t < 800))
  const ok = divide(split)(known)(small)

  asked.length = 0
  ok(ann500)
  assertEquals(asked, ['customer', 'total'])
  asked.length = 0
  ok(bob500)
  assertEquals(asked, ['customer'])
})

Deno.test('divide assembles a comparison for a record out of its fields', () => {
  const sameString = equivalence<string>((a, b) => a === b)
  const sameNumber = equivalence<number>((a, b) => a === b)
  const sameOrder = divide(split)(sameString)(sameNumber)
  assertEquals(sameOrder(ann500, ann500), true)
  assertEquals(sameOrder(ann500, ann900), false)
  assertEquals(sameOrder(ann500, bob500), false)
})

Deno.test('concat is divide along the diagonal', () => {
  const long = predicate<string>((c) => c.length > 2)
  const startsA = predicate<string>((c) => c.startsWith('a'))
  const viaConcat = concat(long)(startsA)
  const viaDivide = divide((a: string) => [a, a] as const)(long)(startsA)
  for (const s of ['', 'a', 'ann', 'bob', 'abcd']) {
    assertEquals(viaConcat(s), viaDivide(s), s)
  }

  const sameLen = equivalence<string>((a, b) => a.length === b.length)
  const sameHead = equivalence<string>((a, b) => a[0] === b[0])
  const eConcat = concat(sameLen)(sameHead)
  const eDivide = divide((a: string) => [a, a] as const)(sameLen)(sameHead)
  for (const [a, b] of [['ann', 'amy'], ['ann', 'bob'], ['a', 'ab']] as const) {
    assertEquals(eConcat(a, b), eDivide(a, b), `${a}/${b}`)
  }
})

Deno.test('conquer is the unit, and it is the same value as empty', () => {
  const known = predicate<string>((c) => c === 'ann')
  const alone = divide((a: string) => [a, a] as const)(known)(
    conquer(Predicate),
  )
  for (const c of ['ann', 'bob', '']) assertEquals(alone(c), known(c))
  assertEquals(conquer(Predicate)('anything'), empty(Predicate)('anything'))
  assertEquals(conquer(Equivalence)(1, 'x'), empty(Equivalence)(1, 'x'))
})

// Laws

Deno.test('divide agrees with the contramap-and-concat spelling', () => {
  const known = predicate<string>((c) => c === 'ann')
  const small = predicate<number>((t) => t < 800)
  const short = divide(split)(known)(small)
  const long = concat(contramap((o: Order) => o.customer)(known))(
    contramap((o: Order) => o.total)(small),
  )
  for (const o of [ann500, ann900, bob500]) assertEquals(short(o), long(o))
})

// Edge cases

Deno.test('a type without Divisible throws a descriptive TypeError', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => divide(split)([1, 2] as never)(just(1) as never),
    TypeError,
    'divide: Array has no Divisible',
  )
  assertThrows(
    () => conquer(just(1) as never),
    TypeError,
    'conquer: Maybe has no Divisible',
  )
})

// Native operation tables

Deno.test('divisibleNatives: has no native implementations', () => {
  assertEquals(Object.keys(divisibleNatives), [])
})

// Shared fixtures

type Order = { readonly customer: string; readonly total: number }

const ann500: Order = { customer: 'ann', total: 500 }

const ann900: Order = { customer: 'ann', total: 900 }

const bob500: Order = { customer: 'bob', total: 500 }

const split = (o: Order) => [o.customer, o.total] as const
