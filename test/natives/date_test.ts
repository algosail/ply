import assert from 'node:assert/strict'
import { test } from 'node:test'
import { map } from '../../src/classes/functor.ts'
import { gt, lt, lte, max, min } from '../../src/classes/ord.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { equals } from '../../src/classes/setoid.ts'
import { Dates } from '../../src/natives/date.ts'
import { Num } from '../../src/natives/number.ts'

test ('Dates: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (Dates['@@type'], 'Date')
  assert.deepStrictEqual (Dates.is (new Date ()), true)
  assert.deepStrictEqual (Dates.is (new Date (NaN)), true)
  assert.deepStrictEqual (Dates.is (0), false)
  assert.deepStrictEqual (Dates.is ('2011-01-19'), false)
  assert.deepStrictEqual (Dates.is (null), false)
  assert.deepStrictEqual (Dates.is ({}), false)
})

test ('Dates.equals: compares values by content', () => {
  assert.deepStrictEqual (Dates.equals (noon (), noon ()), true)
  assert.deepStrictEqual (Dates.equals (noon (), later ()), false)
  assert.deepStrictEqual (Dates.equals (epoch (), new Date (0)), true)
  assert.deepStrictEqual (equals (noon ()) (noon ()), true)
  assert.deepStrictEqual (equals (noon ()) (later ()), false)
})

test ('Dates.equals: the instant is compared, not the spelling', () => {
  assert.deepStrictEqual (
    Dates.equals (
      new Date ('2011-01-19T17:40:00Z'),
      new Date (Date.UTC (2011, 0, 19, 17, 40, 0)),
    ),
    true,
  )
  assert.deepStrictEqual (
    Dates.equals (new Date ('2011-01-19T17:40:00Z'), new Date (1295458800000)),
    true,
  )
  assert.deepStrictEqual (Dates.equals (new Date (0), new Date (1)), false)
})

test ('Dates.lte: orders values from smaller to larger', () => {
  assert.deepStrictEqual (Dates.lte (epoch (), noon ()), true)
  assert.deepStrictEqual (Dates.lte (noon (), epoch ()), false)
  assert.deepStrictEqual (Dates.lte (noon (), noon ()), true)
  assert.deepStrictEqual (lte (noon ()) (epoch ()), true)
  assert.deepStrictEqual (lte (epoch ()) (noon ()), false)
  assert.deepStrictEqual (lt (noon ()) (epoch ()), true)
  assert.deepStrictEqual (gt (epoch ()) (noon ()), true)
})

test ('min and max on dates', () => {
  assert.deepStrictEqual (min (epoch ()) (noon ()), epoch ())
  assert.deepStrictEqual (max (epoch ()) (noon ()), noon ())
})

test ('Dates.show: formats values as readable strings', () => {
  assert.deepStrictEqual (Dates.show (noon ()), 'Date ("2011-01-19T17:40:00.000Z")')
  assert.deepStrictEqual (Dates.show (epoch ()), 'Date ("1970-01-01T00:00:00.000Z")')
})

test ('Dates.equals: Setoid laws', () => {
  const samples = [epoch (), noon (), later (), new Date (0)]
  for (const a of samples) assert.deepStrictEqual (Dates.equals (a, a), true)
  for (const a of samples) {
    for (const b of samples) {
      assert.deepStrictEqual (Dates.equals (a, b), Dates.equals (b, a))
      for (const c of samples) {
        if (Dates.equals (a, b) && Dates.equals (b, c)) {
          assert.deepStrictEqual (Dates.equals (a, c), true)
        }
      }
    }
  }
})

test ('Dates.lte: Ord laws', () => {
  const samples = [epoch (), noon (), later (), new Date (0)]
  for (const a of samples) {
    for (const b of samples) {
      assert.deepStrictEqual (Dates.lte (a, b) || Dates.lte (b, a), true)
      if (Dates.lte (a, b) && Dates.lte (b, a)) {
        assert.deepStrictEqual (Dates.equals (a, b), true)
      }
      for (const c of samples) {
        if (Dates.lte (a, b) && Dates.lte (b, c)) {
          assert.deepStrictEqual (Dates.lte (a, c), true)
        }
      }
    }
  }
})

test ('Dates.show: an invalid date prints as NaN', () => {
  assert.deepStrictEqual (Dates.show (new Date (NaN)), 'Date (NaN)')
  assert.deepStrictEqual (Dates.show (new Date ('not a date')), 'Date (NaN)')
})

test ('Dates: an invalid date behaves exactly like NaN', () => {
  const bad = new Date (NaN)
  const bad2 = new Date (NaN)

  assert.deepStrictEqual (Dates.equals (bad, bad2), Num.equals (NaN, NaN))
  assert.deepStrictEqual (Dates.equals (bad, bad2), true)
  assert.deepStrictEqual (Dates.equals (bad, epoch ()), Num.equals (NaN, 0))
  assert.deepStrictEqual (Dates.equals (bad, epoch ()), false)

  assert.deepStrictEqual (Dates.lte (bad, bad2), Num.lte (NaN, NaN))
  assert.deepStrictEqual (Dates.lte (bad, bad2), true)
  assert.deepStrictEqual (Dates.lte (epoch (), bad), Num.lte (0, NaN))
  assert.deepStrictEqual (Dates.lte (bad, epoch ()), Num.lte (NaN, 0))

  assert.deepStrictEqual (Dates.equals (bad, bad), true, 'Setoid reflexivity')
  assert.deepStrictEqual (Dates.lte (bad, bad), true, 'Ord reflexivity')
  assert.deepStrictEqual (
    Dates.lte (bad, epoch ()) || Dates.lte (epoch (), bad),
    true,
    'Ord totality',
  )
})

test ('Date does not support Functor and Semigroup', () => {
  assert.throws (
    () => map ((n: number) => n) (new Date () as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('map: Date has no Functor'),
  )
  assert.throws (
    () => concat (new Date () as never) (new Date () as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Date has no Semigroup'),
  )
})

const epoch = () => new Date (0)

const noon = () => new Date ('2011-01-19T17:40:00Z')

const later = () => new Date ('2020-05-05T00:00:00Z')
