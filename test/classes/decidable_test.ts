import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Either } from '../../src/data/either.ts'
import { contramap } from '../../src/classes/contravariant.ts'
import { choose, decidableNatives, lose } from '../../src/classes/decidable.ts'
import { divide } from '../../src/classes/divisible.ts'
import { left, right } from '../../src/data/either.ts'
import { equivalence } from '../../src/data/equivalence.ts'
import { just } from '../../src/data/maybe.ts'
import { Predicate, predicate } from '../../src/data/predicate.ts'

test ('choose: validates each order status with its own rule', () => {
  const acceptable = choose (byStatus) (smallEnough) (knownCarrier)
  assert.deepStrictEqual (acceptable (anOpen), true)
  assert.deepStrictEqual (acceptable (bigOpen), false)
  assert.deepStrictEqual (acceptable (aShipped), true)
  assert.deepStrictEqual (
    acceptable ({ status: 'shipped', carrier: 'ups' }),
    false,
  )
})

test ('choose: exactly one branch is consulted', () => {
  const asked: string[] = []
  const open = predicate<Open> ((o) => (asked.push ('open'), o.total < 800))
  const shipped = predicate<Shipped> (() => (asked.push ('shipped'), true))
  const rule = choose (byStatus) (open) (shipped)

  asked.length = 0
  rule (anOpen)
  assert.deepStrictEqual (asked, ['open'])
  asked.length = 0
  rule (aShipped)
  assert.deepStrictEqual (asked, ['shipped'])
})

test ('choose: dispatches by branch instead of checking every rule', () => {
  const lying = contramap ((o: Order) => o as Open) (smallEnough)
  assert.deepStrictEqual (lying (aShipped), false)
  assert.deepStrictEqual (choose (byStatus) (smallEnough) (knownCarrier) (aShipped), true)

  const asked: string[] = []
  const open = predicate<Open> ((o) => (asked.push ('open'), o.total < 800))
  const shipped = predicate<Shipped> (() => (asked.push ('shipped'), true))
  const viaDivide = divide ((o: Order) => [o as Open, o as Shipped] as const) (
    open,
  ) (shipped)
  asked.length = 0
  assert.deepStrictEqual (viaDivide (aShipped), false)
  assert.deepStrictEqual (asked, ['open'])
  asked.length = 0
  divide ((o: Order) => [o as Shipped, o as Open] as const) (shipped) (open) (
    aShipped,
  )
  assert.deepStrictEqual (asked, ['shipped', 'open'])
})

test ('choose on Equivalence: different branches are never equal', () => {
  const sameTotal = equivalence<Open> ((a, b) => a.total === b.total)
  const sameCarrier = equivalence<Shipped> ((a, b) => a.carrier === b.carrier)
  const same = choose (byStatus) (sameTotal) (sameCarrier)
  assert.deepStrictEqual (same (anOpen, anOpen), true)
  assert.deepStrictEqual (same (anOpen, bigOpen), false)
  assert.deepStrictEqual (same (aShipped, aShipped), true)
  assert.deepStrictEqual (same (anOpen, aShipped), false)
  assert.deepStrictEqual (same (aShipped, anOpen), false)
})

test ('lose: the unreachable branch is never evaluated', () => {
  let called = 0
  const absurd = (x: never): never => {
    called += 1
    return x
  }
  type OnlyOpen = Open
  const onlyOpen = choose (
    (o: OnlyOpen): Either<Open, never> => left (o),
  ) (smallEnough) (lose (Predicate) (absurd))
  assert.deepStrictEqual (onlyOpen (anOpen), true)
  assert.deepStrictEqual (onlyOpen (bigOpen), false)
  assert.deepStrictEqual (called, 0)
})

test ('choose: combines field validation with status-specific rules', () => {
  const openRule = divide ((o: Open) => [o.total, o.total] as const) (
    predicate<number> ((t) => t > 0),
  ) (predicate<number> ((t) => t < 800))
  const shippedRule = contramap ((o: Shipped) => o.carrier) (
    predicate<string> ((c) => c.length === 3),
  )
  const rule = choose (byStatus) (openRule) (shippedRule)
  assert.deepStrictEqual (
    [anOpen, bigOpen, aShipped, { status: 'shipped', carrier: 'x' } as Order]
      .map (rule),
    [true, false, true, false],
  )
})

test ('a type without Decidable throws a descriptive TypeError', () => {
  assert.throws (
    () => choose (byStatus) ([1, 2] as never) (just (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('choose: Array has no Decidable'),
  )
  assert.throws (
    () => lose (just (1) as never) ((x: never) => x),
    (error: unknown) => error instanceof TypeError && error.message.includes ('lose: Maybe has no Decidable'),
  )
})

test ('decidableNatives: has no native implementations', () => {
  assert.deepStrictEqual (Object.keys (decidableNatives), [])
})

type Open = { readonly status: 'open'; readonly total: number }

type Shipped = { readonly status: 'shipped'; readonly carrier: string }

type Order = Open | Shipped

const anOpen: Open = { status: 'open', total: 500 }

const bigOpen: Open = { status: 'open', total: 9000 }

const aShipped: Shipped = { status: 'shipped', carrier: 'dhl' }

const byStatus = (o: Order): Either<Open, Shipped> =>
  o.status === 'open' ? left (o) : right (o)

const smallEnough = predicate<Open> ((o) => o.total < 800)

const knownCarrier = predicate<Shipped> ((o) => o.carrier === 'dhl')
