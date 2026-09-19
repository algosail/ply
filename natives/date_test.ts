import { assertEquals, assertThrows } from '@std/assert'
import { Dates } from './date.ts'
import { Num } from './number.ts'
import { concat } from '../classes/semigroup.ts'
import { equals } from '../classes/setoid.ts'
import { gt, lt, lte, max, min } from '../classes/ord.ts'
import { map } from '../classes/functor.ts'

// Examples

Deno.test('Dates: recognizes values and provides the declared operations', () => {
  assertEquals(Dates['@@type'], 'Date')
  assertEquals(Dates.is(new Date()), true)
  assertEquals(Dates.is(new Date(NaN)), true)
  assertEquals(Dates.is(0), false)
  assertEquals(Dates.is('2011-01-19'), false)
  assertEquals(Dates.is(null), false)
  assertEquals(Dates.is({}), false)
})

Deno.test('Dates.equals: compares values by content', () => {
  assertEquals(Dates.equals(noon(), noon()), true)
  assertEquals(Dates.equals(noon(), later()), false)
  assertEquals(Dates.equals(epoch(), new Date(0)), true)
  assertEquals(equals(noon())(noon()), true)
  assertEquals(equals(noon())(later()), false)
})

Deno.test('Dates.equals: the instant is compared, not the spelling', () => {
  assertEquals(
    Dates.equals(
      new Date('2011-01-19T17:40:00Z'),
      new Date(Date.UTC(2011, 0, 19, 17, 40, 0)),
    ),
    true,
  )
  assertEquals(
    Dates.equals(new Date('2011-01-19T17:40:00Z'), new Date(1295458800000)),
    true,
  )
  assertEquals(Dates.equals(new Date(0), new Date(1)), false)
})

Deno.test('Dates.lte: orders values from smaller to larger', () => {
  assertEquals(Dates.lte(epoch(), noon()), true)
  assertEquals(Dates.lte(noon(), epoch()), false)
  assertEquals(Dates.lte(noon(), noon()), true)
  assertEquals(lte(noon())(epoch()), true)
  assertEquals(lte(epoch())(noon()), false)
  assertEquals(lt(noon())(epoch()), true)
  assertEquals(gt(epoch())(noon()), true)
})

Deno.test('min and max on dates', () => {
  assertEquals(min(epoch())(noon()), epoch())
  assertEquals(max(epoch())(noon()), noon())
})

Deno.test('Dates.show: formats values as readable strings', () => {
  assertEquals(Dates.show(noon()), 'Date ("2011-01-19T17:40:00.000Z")')
  assertEquals(Dates.show(epoch()), 'Date ("1970-01-01T00:00:00.000Z")')
})

// Laws

Deno.test('Dates.equals: Setoid laws', () => {
  const samples = [epoch(), noon(), later(), new Date(0)]
  for (const a of samples) assertEquals(Dates.equals(a, a), true)
  for (const a of samples) {
    for (const b of samples) {
      assertEquals(Dates.equals(a, b), Dates.equals(b, a))
      for (const c of samples) {
        if (Dates.equals(a, b) && Dates.equals(b, c)) {
          assertEquals(Dates.equals(a, c), true)
        }
      }
    }
  }
})

Deno.test('Dates.lte: Ord laws', () => {
  const samples = [epoch(), noon(), later(), new Date(0)]
  for (const a of samples) {
    for (const b of samples) {
      assertEquals(Dates.lte(a, b) || Dates.lte(b, a), true)
      if (Dates.lte(a, b) && Dates.lte(b, a)) {
        assertEquals(Dates.equals(a, b), true)
      }
      for (const c of samples) {
        if (Dates.lte(a, b) && Dates.lte(b, c)) {
          assertEquals(Dates.lte(a, c), true)
        }
      }
    }
  }
})

// Edge cases

Deno.test('Dates.show: an invalid date prints as NaN', () => {
  assertEquals(Dates.show(new Date(NaN)), 'Date (NaN)')
  assertEquals(Dates.show(new Date('not a date')), 'Date (NaN)')
})

Deno.test('Dates: an invalid date behaves exactly like NaN', () => {
  const bad = new Date(NaN)
  const bad2 = new Date(NaN)

  assertEquals(Dates.equals(bad, bad2), Num.equals(NaN, NaN))
  assertEquals(Dates.equals(bad, bad2), true)
  assertEquals(Dates.equals(bad, epoch()), Num.equals(NaN, 0))
  assertEquals(Dates.equals(bad, epoch()), false)

  assertEquals(Dates.lte(bad, bad2), Num.lte(NaN, NaN))
  assertEquals(Dates.lte(bad, bad2), true)
  assertEquals(Dates.lte(epoch(), bad), Num.lte(0, NaN))
  assertEquals(Dates.lte(bad, epoch()), Num.lte(NaN, 0))

  assertEquals(Dates.equals(bad, bad), true, 'Setoid reflexivity')
  assertEquals(Dates.lte(bad, bad), true, 'Ord reflexivity')
  assertEquals(
    Dates.lte(bad, epoch()) || Dates.lte(epoch(), bad),
    true,
    'Ord totality',
  )
})

Deno.test('Date does not support Functor and Semigroup', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => map((n: number) => n)(new Date() as never),
    TypeError,
    'map: Date has no Functor',
  )
  assertThrows(
    () => concat(new Date() as never)(new Date() as never),
    TypeError,
    'concat: Date has no Semigroup',
  )
})

// Shared fixtures

const epoch = () => new Date(0)

const noon = () => new Date('2011-01-19T17:40:00Z')

const later = () => new Date('2020-05-05T00:00:00Z')
