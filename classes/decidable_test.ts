import { assertEquals, assertThrows } from '@std/assert'
import type { Either } from '../data/either.ts'
import { choose, decidableNatives, lose } from './decidable.ts'
import { divide } from './divisible.ts'
import { contramap } from './contravariant.ts'
import { Predicate, predicate } from '../data/predicate.ts'
import { equivalence } from '../data/equivalence.ts'
import { left, right } from '../data/either.ts'
import { just } from '../data/maybe.ts'

// Examples

Deno.test('choose: validates each order status with its own rule', () => {
  const acceptable = choose(byStatus)(smallEnough)(knownCarrier)
  assertEquals(acceptable(anOpen), true)
  assertEquals(acceptable(bigOpen), false)
  assertEquals(acceptable(aShipped), true)
  assertEquals(
    acceptable({ status: 'shipped', carrier: 'ups' }),
    false,
  )
})

Deno.test('choose: exactly one branch is consulted', () => {
  const asked: string[] = []
  const open = predicate<Open>((o) => (asked.push('open'), o.total < 800))
  const shipped = predicate<Shipped>(() => (asked.push('shipped'), true))
  const rule = choose(byStatus)(open)(shipped)

  asked.length = 0
  rule(anOpen)
  assertEquals(asked, ['open'])
  asked.length = 0
  rule(aShipped)
  assertEquals(asked, ['shipped'])
})

Deno.test('choose: dispatches by branch instead of checking every rule', () => {
  const lying = contramap((o: Order) => o as Open)(smallEnough)
  assertEquals(lying(aShipped), false)
  assertEquals(choose(byStatus)(smallEnough)(knownCarrier)(aShipped), true)

  const asked: string[] = []
  const open = predicate<Open>((o) => (asked.push('open'), o.total < 800))
  const shipped = predicate<Shipped>(() => (asked.push('shipped'), true))
  const viaDivide = divide((o: Order) => [o as Open, o as Shipped] as const)(
    open,
  )(shipped)
  asked.length = 0
  assertEquals(viaDivide(aShipped), false)
  assertEquals(asked, ['open'])
  asked.length = 0
  divide((o: Order) => [o as Shipped, o as Open] as const)(shipped)(open)(
    aShipped,
  )
  assertEquals(asked, ['shipped', 'open'])
})

Deno.test('choose on Equivalence: different branches are never equal', () => {
  const sameTotal = equivalence<Open>((a, b) => a.total === b.total)
  const sameCarrier = equivalence<Shipped>((a, b) => a.carrier === b.carrier)
  const same = choose(byStatus)(sameTotal)(sameCarrier)
  assertEquals(same(anOpen, anOpen), true)
  assertEquals(same(anOpen, bigOpen), false)
  assertEquals(same(aShipped, aShipped), true)
  assertEquals(same(anOpen, aShipped), false)
  assertEquals(same(aShipped, anOpen), false)
})

Deno.test('lose: the unreachable branch is never evaluated', () => {
  let called = 0
  const absurd = (x: never): never => {
    called += 1
    return x
  }
  type OnlyOpen = Open
  const onlyOpen = choose(
    (o: OnlyOpen): Either<Open, never> => left(o),
  )(smallEnough)(lose(Predicate)(absurd))
  assertEquals(onlyOpen(anOpen), true)
  assertEquals(onlyOpen(bigOpen), false)
  assertEquals(called, 0)
})

Deno.test('choose: combines field validation with status-specific rules', () => {
  const openRule = divide((o: Open) => [o.total, o.total] as const)(
    predicate<number>((t) => t > 0),
  )(predicate<number>((t) => t < 800))
  const shippedRule = contramap((o: Shipped) => o.carrier)(
    predicate<string>((c) => c.length === 3),
  )
  const rule = choose(byStatus)(openRule)(shippedRule)
  assertEquals(
    [anOpen, bigOpen, aShipped, { status: 'shipped', carrier: 'x' } as Order]
      .map(rule),
    [true, false, true, false],
  )
})

// Edge cases

Deno.test('a type without Decidable throws a descriptive TypeError', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => choose(byStatus)([1, 2] as never)(just(1) as never),
    TypeError,
    'choose: Array has no Decidable',
  )
  assertThrows(
    () => lose(just(1) as never)((x: never) => x),
    TypeError,
    'lose: Maybe has no Decidable',
  )
})

// Native operation tables

Deno.test('decidableNatives: has no native implementations', () => {
  assertEquals(Object.keys(decidableNatives), [])
})

// Shared fixtures

type Open = { readonly status: 'open'; readonly total: number }

type Shipped = { readonly status: 'shipped'; readonly carrier: string }

type Order = Open | Shipped

const anOpen: Open = { status: 'open', total: 500 }

const bigOpen: Open = { status: 'open', total: 9000 }

const aShipped: Shipped = { status: 'shipped', carrier: 'dhl' }

const byStatus = (o: Order): Either<Open, Shipped> =>
  o.status === 'open' ? left(o) : right(o)

const smallEnough = predicate<Open>((o) => o.total < 800)

const knownCarrier = predicate<Shipped>((o) => o.carrier === 'dhl')
