import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contramap } from '../../src/classes/contravariant.ts'
import { conquer, divide, divisibleNatives } from '../../src/classes/divisible.ts'
import { empty } from '../../src/classes/monoid.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { Equivalence, equivalence } from '../../src/data/equivalence.ts'
import { just } from '../../src/data/maybe.ts'
import { Predicate, predicate } from '../../src/data/predicate.ts'

test ('divide: validates each field with its own predicate', () => {
  const known = predicate<string> ((c) => c === 'ann')
  const small = predicate<number> ((t) => t < 800)
  const ok = divide (split) (known) (small)
  assert.deepStrictEqual ([ok (ann500), ok (ann900), ok (bob500)], [true, false, false])
})

test ('divide: skips the second predicate when the first fails', () => {
  const asked: string[] = []
  const known = predicate<string> ((c) => (asked.push ('customer'), c === 'ann'))
  const small = predicate<number> ((t) => (asked.push ('total'), t < 800))
  const ok = divide (split) (known) (small)

  asked.length = 0
  ok (ann500)
  assert.deepStrictEqual (asked, ['customer', 'total'])
  asked.length = 0
  ok (bob500)
  assert.deepStrictEqual (asked, ['customer'])
})

test ('divide assembles a comparison for a record out of its fields', () => {
  const sameString = equivalence<string> ((a, b) => a === b)
  const sameNumber = equivalence<number> ((a, b) => a === b)
  const sameOrder = divide (split) (sameString) (sameNumber)
  assert.deepStrictEqual (sameOrder (ann500, ann500), true)
  assert.deepStrictEqual (sameOrder (ann500, ann900), false)
  assert.deepStrictEqual (sameOrder (ann500, bob500), false)
})

test ('concat is divide along the diagonal', () => {
  const long = predicate<string> ((c) => c.length > 2)
  const startsA = predicate<string> ((c) => c.startsWith ('a'))
  const viaConcat = concat (long) (startsA)
  const viaDivide = divide ((a: string) => [a, a] as const) (long) (startsA)
  for (const s of ['', 'a', 'ann', 'bob', 'abcd']) {
    assert.deepStrictEqual (viaConcat (s), viaDivide (s), s)
  }

  const sameLen = equivalence<string> ((a, b) => a.length === b.length)
  const sameHead = equivalence<string> ((a, b) => a[0] === b[0])
  const eConcat = concat (sameLen) (sameHead)
  const eDivide = divide ((a: string) => [a, a] as const) (sameLen) (sameHead)
  for (const [a, b] of [['ann', 'amy'], ['ann', 'bob'], ['a', 'ab']] as const) {
    assert.deepStrictEqual (eConcat (a, b), eDivide (a, b), `${a}/${b}`)
  }
})

test ('conquer is the unit, and it is the same value as empty', () => {
  const known = predicate<string> ((c) => c === 'ann')
  const alone = divide ((a: string) => [a, a] as const) (known) (
    conquer (Predicate),
  )
  for (const c of ['ann', 'bob', '']) assert.deepStrictEqual (alone (c), known (c))
  assert.deepStrictEqual (conquer (Predicate) ('anything'), empty (Predicate) ('anything'))
  assert.deepStrictEqual (conquer (Equivalence) (1, 'x'), empty (Equivalence) (1, 'x'))
})

test ('divide agrees with the contramap-and-concat spelling', () => {
  const known = predicate<string> ((c) => c === 'ann')
  const small = predicate<number> ((t) => t < 800)
  const short = divide (split) (known) (small)
  const long = concat (contramap ((o: Order) => o.customer) (known)) (
    contramap ((o: Order) => o.total) (small),
  )
  for (const o of [ann500, ann900, bob500]) assert.deepStrictEqual (short (o), long (o))
})

test ('a type without Divisible throws a descriptive TypeError', () => {
  assert.throws (
    () => divide (split) ([1, 2] as never) (just (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('divide: Array has no Divisible'),
  )
  assert.throws (
    () => conquer (just (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('conquer: Maybe has no Divisible'),
  )
})

test ('divisibleNatives: has no native implementations', () => {
  assert.deepStrictEqual (Object.keys (divisibleNatives), [])
})

type Order = { readonly customer: string; readonly total: number }

const ann500: Order = { customer: 'ann', total: 500 }

const ann900: Order = { customer: 'ann', total: 900 }

const bob500: Order = { customer: 'bob', total: 500 }

const split = (o: Order) => [o.customer, o.total] as const
