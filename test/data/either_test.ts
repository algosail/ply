import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alt } from '../../src/classes/alt.ts'
import { ap, apFirst, apSecond } from '../../src/classes/apply.ts'
import { chain } from '../../src/classes/chain.ts'
import { filter } from '../../src/classes/filterable.ts'
import { size, toArray } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { empty } from '../../src/classes/monoid.ts'
import { zero } from '../../src/classes/plus.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { traverse } from '../../src/classes/traversable.ts'
import {
  Either,
  either,
  eitherFromNullable,
  eitherFromPredicate,
  eitherSwap,
  eitherToMaybe,
  encase,
  fromEither,
  fromLeft,
  fromRight,
  isLeft,
  isRight,
  left,
  lefts,
  right,
  rights,
  tagBy,
} from '../../src/data/either.ts'
import { Identity, identity } from '../../src/data/identity.ts'
import { just, Maybe, nothing } from '../../src/data/maybe.ts'

test ('Either: uses its public name and supports detached static functions', () => {
  const { is, of, left: fail } = Either
  const failure = fail<string, number> ('error')

  assert.deepStrictEqual (Object.getPrototypeOf (failure).constructor.name, 'Either')
  assert.deepStrictEqual (Object.getPrototypeOf (of (42)).constructor.name, 'Either')
  assert.deepStrictEqual (failure, left<string, number> ('error'))
  assert.deepStrictEqual (of (42), right (42))
  assert.deepStrictEqual (is (failure), true)
  assert.deepStrictEqual (is (of (42)), true)
  assert.deepStrictEqual (is (42), false)
})

test ('Either: both branches contain only their tag and payload', () => {
  const failure = left<string, number> ('missing')
  const success = right<string, number> (42)

  assert.deepStrictEqual (Object.keys (failure), ['tag', 'value'])
  assert.deepStrictEqual (Object.keys (success), ['tag', 'value'])
  assert.deepStrictEqual (failure.map === success.map, true)
  assert.deepStrictEqual (failure.constructor, Either)
  assert.deepStrictEqual (success.constructor, Either)
  assert.deepStrictEqual (JSON.stringify (failure), '{"tag":"left","value":"missing"}')
  assert.deepStrictEqual (JSON.stringify (success), '{"tag":"right","value":42}')
})

test ('left: creates an Either containing an error or alternative value', () => {
  const e = left<string, number> ('err')

  assert.deepStrictEqual (e.tag, 'left')
  assert.deepStrictEqual ((e as { value: string }).value, 'err')
  assert.deepStrictEqual (e.constructor['@@type'], 'Either')
})

test ('right: creates an Either containing a successful value', () => {
  const e = right<string, number> (1)

  assert.deepStrictEqual (e.tag, 'right')
  assert.deepStrictEqual ((e as { value: number }).value, 1)
  assert.deepStrictEqual (e.constructor['@@type'], 'Either')
})

test ('match: calls the handler for the active branch', () => {
  assert.deepStrictEqual (
    right<string, number> (2).match ((e) => 'L' + e, (a) => 'R' + a),
    'R2',
  )
  assert.deepStrictEqual (
    left<string, number> ('x').match ((e) => 'L' + e, (a) => 'R' + a),
    'Lx',
  )
})

test ('lefts: keeps and unwraps Left values, discarding Right values', () => {
  const mixed: E[] = [
    right<string, number> (20),
    left<string, number> ('foo'),
    right<string, number> (10),
    left<string, number> ('bar'),
  ]

  assert.deepStrictEqual (lefts (mixed), ['foo', 'bar'])
  assert.deepStrictEqual (lefts ([] as E[]), [])
  assert.deepStrictEqual (lefts ([right<string, number> (1)]), [])
})

test ('rights: keeps and unwraps Right values, discarding Left values', () => {
  const mixed: E[] = [
    right<string, number> (20),
    left<string, number> ('foo'),
    right<string, number> (10),
    left<string, number> ('bar'),
  ]

  assert.deepStrictEqual (rights (mixed), [20, 10])
  assert.deepStrictEqual (rights ([] as E[]), [])
  assert.deepStrictEqual (rights ([left<string, number> ('a')]), [])
})

test ('lefts and rights: they work on any Filterable', () => {
  const sm = { a: left<number, number> (1), b: right<number, number> (2) }

  assert.deepStrictEqual (lefts (sm), { a: 1 })
  assert.deepStrictEqual (rights (sm), { b: 2 })
})

test ('fromLeft: unwraps a Left, or returns the supplied default for Right', () => {
  assert.deepStrictEqual (fromLeft ('abc') (left<string, number> ('xyz')), 'xyz')
  assert.deepStrictEqual (fromLeft ('abc') (right<string, number> (123)), 'abc')
})

test ('fromRight: unwraps a Right, or returns the supplied default for Left', () => {
  assert.deepStrictEqual (fromRight (0) (right<string, number> (1)), 1)
  assert.deepStrictEqual (fromRight (0) (left<string, number> ('a')), 0)
})

test ('fromEither: unwraps either branch when both branches contain the same value type', () => {
  assert.deepStrictEqual (fromEither (left<number, number> (42)), 42)
  assert.deepStrictEqual (fromEither (right<number, number> (42)), 42)
})

test ('tagBy: wraps a value in Right if it passes the predicate, or in Left otherwise', () => {
  assert.deepStrictEqual (tagBy (odd) (1), right<number, number> (1))
  assert.deepStrictEqual (tagBy (odd) (0), left<number, number> (0))
})

test ('eitherFromPredicate: returns Right on success and builds a Left on failure', () => {
  const f = eitherFromPredicate (odd, (n: number) => `${n} is even`)

  assert.deepStrictEqual (f (1), right<string, number> (1))
  assert.deepStrictEqual (f (2), left<string, number> ('2 is even'))
})

test ('eitherSwap: switches Left to Right or Right to Left, preserving the value', () => {
  assert.deepStrictEqual (
    eitherSwap (left<string, number> ('e')),
    right<number, string> ('e'),
  )
  assert.deepStrictEqual (eitherSwap (right<string, number> (1)), left<number, string> (1))

  assert.deepStrictEqual (
    eitherSwap (eitherSwap (left<string, number> ('e'))),
    left<string, number> ('e'),
  )
})

test ('eitherToMaybe: converts Right to Just, or Left to Nothing, discarding the error', () => {
  assert.deepStrictEqual (eitherToMaybe (right<string, number> (1)), just (1))
  assert.deepStrictEqual (eitherToMaybe (left<string, number> ('a')), nothing<number> ())
})

test ('Either: creates values and identifies their type', () => {
  assert.deepStrictEqual (Either['@@type'], 'Either')
  assert.deepStrictEqual (Either.of<string, number> (1), right<string, number> (1))
  const rep: unknown = right (1).constructor

  assert.deepStrictEqual (rep, Either)
})

test ('map: transforms contained values', () => {
  assert.deepStrictEqual (
    right<string, number> (1).map (increment),
    right<string, number> (2),
  )
  assert.deepStrictEqual (
    left<string, number> ('err').map (increment),
    left<string, number> ('err'),
  )
  assert.deepStrictEqual (
    map (increment) (right<string, number> (1)),
    right<string, number> (2),
  )
})

test ('ap: preserves the error from the wrapped function', () => {
  assert.deepStrictEqual (
    ap (left<string, (n: number) => number> ('F')) (left<string, number> ('S')),
    left<string, number> ('F'),
  )
  assert.deepStrictEqual (
    ap (right<string, (n: number) => number> (increment)) (
      left<string, number> ('S'),
    ),
    left<string, number> ('S'),
  )
  assert.deepStrictEqual (
    ap (left<string, (n: number) => number> ('F')) (right<string, number> (1)),
    left<string, number> ('F'),
  )
  assert.deepStrictEqual (
    ap (right<string, (n: number) => number> (increment)) (
      right<string, number> (1),
    ),
    right<string, number> (2),
  )
  assert.deepStrictEqual (
    left<string, number> ('S').ap (left<string, (n: number) => number> ('F')),
    left<string, number> ('F'),
  )
})

test ('apFirst and apSecond: the same convention as ap', () => {
  assert.deepStrictEqual (
    apFirst (left<string, number> ('F')) (left<string, number> ('S')),
    left<string, number> ('F'),
  )
  assert.deepStrictEqual (
    apSecond (left<string, number> ('F')) (left<string, number> ('S')),
    left<string, number> ('F'),
  )
  assert.deepStrictEqual (
    apFirst (right<string, number> (1)) (right<string, number> (2)),
    right<string, number> (1),
  )
  assert.deepStrictEqual (
    apSecond (right<string, number> (1)) (right<string, number> (2)),
    right<string, number> (2),
  )
})

test (
  "Either as the applicative of someone else's traversal: the first error survives",
  () => {
    const wary = (n: number) =>
      n < 0 ? left<string, number> ('err' + n) : right<string, number> (n)

    assert.deepStrictEqual (
      traverse (Either) (wary) ([-1, 2, -3]),
      left<string, number[]> ('err-1'),
    )
    assert.deepStrictEqual (
      traverse (Either) (wary) ([1, -2, -3]),
      left<string, number[]> ('err-2'),
    )
    assert.deepStrictEqual (
      traverse (Either) (wary) ([1, 2, -3]),
      left<string, number[]> ('err-3'),
    )
    assert.deepStrictEqual (
      traverse (Either) (wary) ([1, 2, 3]),
      right<string, number[]> ([1, 2, 3]),
    )
  },
)

test ('chain: sequences computations that return the same wrapper', () => {
  const half = (n: number) =>
    n % 2 === 0
      ? right<string, number> (n / 2)
      : left<string, number> (`${n} is odd`)

  assert.deepStrictEqual (right<string, number> (4).chain (half), right<string, number> (2))
  assert.deepStrictEqual (
    right<string, number> (3).chain (half),
    left<string, number> ('3 is odd'),
  )
  assert.deepStrictEqual (
    left<string, number> ('err').chain (half),
    left<string, number> ('err'),
  )
})

test ('alt: combines alternatives in argument order', () => {
  assert.deepStrictEqual (
    alt (right<string, number> (2)) (right<string, number> (1)),
    right<string, number> (1),
  )
  assert.deepStrictEqual (
    alt (right<string, number> (2)) (left<string, number> ('err')),
    right<string, number> (2),
  )
  assert.deepStrictEqual (
    alt (left<string, number> ('err')) (right<string, number> (1)),
    right<string, number> (1),
  )
  assert.deepStrictEqual (
    alt (left<string, number> ('b')) (left<string, number> ('a')),
    left<string, number> ('b'),
  )
})

test ('bimap: transforms both sides of a Pair, or the active branch of an Either', () => {
  const f = (s: string) => s.length

  assert.deepStrictEqual (
    right<string, number> (1).bimap (f, increment),
    right<number, number> (2),
  )
  assert.deepStrictEqual (
    left<string, number> ('er').bimap (f, increment),
    left<number, number> (2),
  )
})

test ('concat: combines values in argument order', () => {
  assert.deepStrictEqual (
    concat (left<string, string> ('e')) (left<string, string> ('f')),
    left<string, string> ('ef'),
  )
  assert.deepStrictEqual (
    concat (right<string, string> ('a')) (left<string, string> ('e')),
    right<string, string> ('a'),
  )
  assert.deepStrictEqual (
    concat (left<string, string> ('e')) (right<string, string> ('a')),
    right<string, string> ('a'),
  )
  assert.deepStrictEqual (
    concat (right<string, string> ('a')) (right<string, string> ('b')),
    right<string, string> ('ab'),
  )
})

test ('reduce: combines values from left to right, starting with an initial accumulator', () => {
  assert.deepStrictEqual (
    right<string, number> (3).reduce (
      (accumulator: number, a) => accumulator + a,
      10,
    ),
    13,
  )
  assert.deepStrictEqual (
    left<string, number> ('err').reduce (
      (accumulator: number, a) => accumulator + a,
      10,
    ),
    10,
  )
})

test ('reduce: Either folds like a list of zero or one', () => {
  assert.deepStrictEqual (toArray (right<string, number> (1)), [1])
  assert.deepStrictEqual (toArray (left<string, number> ('err')), [])
  assert.deepStrictEqual (size (right<string, number> (1)), 1)
  assert.deepStrictEqual (size (left<string, number> ('err')), 0)
})

test ('traverse: transforms values into a chosen wrapper and collects them inside one result', () => {
  assert.deepStrictEqual (
    right<string, number> (1).traverse (Identity, (n: number) => identity (n * 2)),
    identity (right<string, number> (2)),
  )
  assert.deepStrictEqual (
    left<string, number> ('err').traverse (
      Identity,
      (n: number) => identity (n * 2),
    ),
    identity (left<string, number> ('err')),
  )
})

test ('equals: compares values by content, including nested arrays and records', () => {
  assert.deepStrictEqual (right<string, number> (1).equals (right<string, number> (1)), true)
  assert.deepStrictEqual (right<string, number> (1).equals (right<string, number> (2)), false)
  assert.deepStrictEqual (
    left<string, number> ('a').equals (left<string, number> ('a')),
    true,
  )
  assert.deepStrictEqual (
    left<string, number> ('a').equals (left<string, number> ('b')),
    false,
  )
  assert.deepStrictEqual (left<number, number> (1).equals (right<number, number> (1)), false)
  assert.deepStrictEqual (right<number, number> (1).equals (left<number, number> (1)), false)
})

test ('equals: the contents are compared structurally, not by reference', () => {
  assert.deepStrictEqual (
    right<string, number[]> ([1, 2]).equals (right<string, number[]> ([1, 2])),
    true,
  )
  assert.deepStrictEqual (
    left<string[], number> (['a']).equals (left<string[], number> (['a'])),
    true,
  )
})

test ('lte: checks whether the value is at most the supplied bound', () => {
  assert.deepStrictEqual (left<string, number> ('z').lte (right<string, number> (0)), true)
  assert.deepStrictEqual (right<string, number> (0).lte (left<string, number> ('a')), false)
  assert.deepStrictEqual (left<string, number> ('a').lte (left<string, number> ('b')), true)
  assert.deepStrictEqual (left<string, number> ('b').lte (left<string, number> ('a')), false)
  assert.deepStrictEqual (right<string, number> (1).lte (right<string, number> (2)), true)
  assert.deepStrictEqual (right<string, number> (2).lte (right<string, number> (1)), false)
})

test ("show: formats a value as a readable string, including ply's wrapped values", () => {
  assert.deepStrictEqual (left<string, number> ('x').show (), 'Left ("x")')
  assert.deepStrictEqual (right<string, number> (1).show (), 'Right (1)')
  assert.deepStrictEqual (right<string, number[]> ([1, 2]).show (), 'Right ([1, 2])')
  assert.deepStrictEqual (
    right<string, Maybe<number>> (just (1)).show (),
    'Right (Just (1))',
  )
})

test ('chain on a Left does not call the function at all', () => {
  let calls = 0
  const f = (n: number) => {
    calls += 1
    return right<string, number> (n * 2)
  }

  assert.deepStrictEqual (
    chain (f) (left<string, number> ('no')),
    left ('no'),
  )
  assert.deepStrictEqual (calls, 0)

  assert.deepStrictEqual (chain (f) (right<string, number> (21)), right (42))
  assert.deepStrictEqual (calls, 1)
})

test ('ap on a Left does not call the function at all', () => {
  let calls = 0
  const f = (n: number) => {
    calls += 1
    return n * 2
  }
  ap (right<string, (n: number) => number> (f)) (left<string, number> ('no'))

  assert.deepStrictEqual (calls, 0)
})

test ('lte: the order is total and antisymmetric', () => {
  const values = [
    left<string, number> ('a'),
    left<string, number> ('b'),
    right<string, number> (1),
    right<string, number> (2),
  ]
  for (const a of values) {
    for (const b of values) {
      assert.deepStrictEqual (a.lte (b) || b.lte (a), true, 'totality')
      if (a.lte (b) && b.lte (a)) assert.deepStrictEqual (a.equals (b), true, 'antisymm.')
      for (const c of values) {
        if (a.lte (b) && b.lte (c)) assert.deepStrictEqual (a.lte (c), true, 'transitivity')
      }
    }
  }
})

test ('map: functor laws', () => {
  for (const e of samples ()) {
    assert.deepStrictEqual (e.map (id), e, 'identity')
    assert.deepStrictEqual (
      e.map ((n) => increment (doubleNumber (n))),
      e.map (doubleNumber).map (increment),
      'composition',
    )
  }
})

test ('ap: composition law', () => {
  const composeFunctions =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f (g (a))
  const fs = [
    right<string, (n: number) => number> (increment),
    left<string, (n: number) => number> ('f'),
  ]
  for (const u of fs) {
    for (const v of fs) {
      for (const w of samples ()) {
        assert.deepStrictEqual (w.ap (v.ap (u.map (composeFunctions))), w.ap (v).ap (u))
      }
    }
  }
})

test ('ap: applicative laws', () => {
  const f = (n: number) => n + 3
  for (const v of samples ()) {
    assert.deepStrictEqual (v.ap (Either.of<string, typeof id> (id)), v, 'identity')
  }

  assert.deepStrictEqual (
    Either.of<string, number> (7).ap (Either.of<string, typeof f> (f)),
    Either.of<string, number> (f (7)),
    'homomorphism',
  )
  for (
    const u of [
      right<string, (n: number) => number> (f),
      left<string, (n: number) => number> ('f'),
    ]
  ) {
    assert.deepStrictEqual (
      Either.of<string, number> (7).ap (u),
      u.ap (
        Either.of<string, (g: (n: number) => number) => number> ((g) => g (7)),
      ),
      'interchange',
    )
  }
})

test ('chain: monad laws', () => {
  const f = (n: number) =>
    n > 0 ? right<string, number> (n * 2) : left<string, number> ('f')
  const g = (n: number) =>
    n < 10 ? right<string, number> (n + 1) : left<string, number> ('g')
  for (const m of samples ()) {
    assert.deepStrictEqual (m.chain (f).chain (g), m.chain ((n) => f (n).chain (g)), 'assoc.')
    assert.deepStrictEqual (
      m.chain ((a) => Either.of<string, number> (a)),
      m,
      'right identity',
    )
  }
  for (const a of [1, -1, 42]) {
    assert.deepStrictEqual (Either.of<string, number> (a).chain (f), f (a), 'left identity')
  }
})

test ('alt: Alt laws', () => {
  for (const a of samples ()) {
    for (const b of samples ()) {
      assert.deepStrictEqual (
        a.alt (b).map (increment),
        a.map (increment).alt (b.map (increment)),
        'distributivity',
      )
      for (const c of samples ()) {
        assert.deepStrictEqual (a.alt (b).alt (c), a.alt (b.alt (c)), 'associativity')
      }
    }
  }
})

test ('bimap: bifunctor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  const f = (s: string) => s + '!'
  const g = (s: string) => s.toUpperCase ()
  for (const e of samples ()) {
    assert.deepStrictEqual (e.bimap (id, id), e, 'identity')
    assert.deepStrictEqual (
      e.bimap (
        (s: string) => g (f (s)),
        doubleThenIncrement,
      ),
      e.bimap (f, doubleNumber).bimap (g, increment),
      'composition',
    )
    assert.deepStrictEqual (e.bimap (id, increment), e.map (increment), 'agreement with map')
  }
})

test ('concat: is associative', () => {
  const values = [
    left<string, string> ('e'),
    left<string, string> ('f'),
    right<string, string> ('a'),
    right<string, string> ('b'),
  ]
  for (const a of values) {
    for (const b of values) {
      for (const c of values) {
        assert.deepStrictEqual (concat (concat (a) (b)) (c), concat (a) (concat (b) (c)))
      }
    }
  }
})

test ('traverse: identity law through Identity', () => {
  for (const e of samples ()) {
    assert.deepStrictEqual (e.traverse (Identity, (a: number) => identity (a)), identity (e))
  }
})

test ('equals: Setoid laws', () => {
  const values = [...samples (), right<string, number> (1)]
  for (const a of values) {
    assert.deepStrictEqual (a.equals (a), true, 'reflexivity')
    for (const b of values) {
      assert.deepStrictEqual (a.equals (b), b.equals (a), 'symmetry')
      for (const c of values) {
        if (a.equals (b) && b.equals (c)) {
          assert.deepStrictEqual (a.equals (c), true, 'transitivity')
        }
      }
    }
  }
})

test ('match: the other branch is not evaluated', () => {
  const boom = (): string => {
    throw new Error ('should not have been called')
  }

  assert.deepStrictEqual (right<string, number> (1).match (boom, String), '1')
  assert.deepStrictEqual (left<string, number> ('x').match (String, boom), 'x')
})

test ('either: handles Left and Right with separate callbacks', () => {
  const f = either ((e: string) => 'L' + e) ((a: number) => 'R' + a)

  assert.deepStrictEqual (f (left<string, number> ('x')), 'Lx')
  assert.deepStrictEqual (f (right<string, number> (1)), 'R1')
})

test ("encase: wraps a function's result in Right, or a thrown value in Left", () => {
  const parsed = encase (JSON.parse) ('["foo","bar"]')

  assert.deepStrictEqual (parsed, right<unknown, unknown> (['foo', 'bar']))

  const failed = encase (JSON.parse) ('[')

  assert.deepStrictEqual (failed.match ((e) => e instanceof SyntaxError, () => false), true)
})

test ('encase: all the arguments get through', () => {
  const f = encase ((a: number, b: number, c: number) => a + b + c)

  assert.deepStrictEqual (f (1, 2, 3), right<unknown, number> (6))
})

test ('eitherFromNullable: wraps present values or computes an error for null and undefined', () => {
  const f = eitherFromNullable (() => 'empty')

  assert.deepStrictEqual (f (1), right<string, number> (1))
  assert.deepStrictEqual (f (null as number | null), left<string, number> ('empty'))
  assert.deepStrictEqual (
    f (undefined as number | undefined),
    left<string, number> ('empty'),
  )

  assert.deepStrictEqual (f (0), right<string, number> (0))
  assert.deepStrictEqual (f (''), right<string, string> (''))
})

test ('eitherFromNullable: the handler is lazy', () => {
  let calls = 0

  function createMissingValueError() {
    calls++
    return 'empty'
  }

  eitherFromNullable (createMissingValueError) (1)

  assert.deepStrictEqual (calls, 0)
})

test ('Either: neither Plus nor Monoid', () => {
  assert.deepStrictEqual ('zero' in Either, false)
  assert.deepStrictEqual ('empty' in Either, false)
  assert.throws (
    () => zero (Either as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('zero: Either has no Plus'),
  )
  assert.throws (
    () => empty (Either as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('empty: Either has no Monoid'),
  )
})

test ('map: on Left the function is not called', () => {
  function unexpectedCallback() {
    throw new Error ('should not have been called')
  }

  left<string, number> ('err').map (unexpectedCallback)
})

test ('concat: the contents must themselves be a semigroup', () => {
  assert.throws (
    () => concat (right<string, number> (1)) (right<string, number> (2)),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Number has no Semigroup'),
  )
})

test ('traverse: a failed result makes the whole traversal fail', () => {
  const wary = (n: number) => n > 0 ? just (n) : nothing<number> ()

  assert.deepStrictEqual (
    right<string, number> (1).traverse (Maybe, wary),
    just (right<string, number> (1)),
  )
  assert.deepStrictEqual (
    right<string, number> (-1).traverse (Maybe, wary),
    nothing<Either<string, number>> (),
  )
  assert.deepStrictEqual (
    left<string, number> ('err').traverse (Maybe, wary),
    just (left<string, number> ('err')),
  )
})

test ('filter: Either has no Filterable and rejects', () => {
  assert.throws (
    () => filter (odd as never) (right<string, number> (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('filter: Either has no Filterable'),
  )
})

test ('either: Left handler receives only the error', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  function returnValue(value: number): number {
    return value
  }

  either (recordArguments) (returnValue) (left<string, number> ('e'))

  assert.deepStrictEqual (calls, [['e']])
})

test ('either: Right handler receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  function errorLength(error: string): number {
    return error.length
  }

  either (errorLength) (recordArguments) (right<string, number> (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('tagBy: predicate receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  tagBy (recordArguments) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('eitherFromNullable: error factory receives no arguments', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  eitherFromNullable (recordArguments) (null)

  assert.deepStrictEqual (calls, [[]])
})

test ('eitherFromPredicate: predicate receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  function returnValue(value: number): number {
    return value
  }

  eitherFromPredicate (recordArguments, returnValue) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('eitherFromPredicate: error factory receives only the rejected input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  function rejectValue(): boolean {
    return false
  }

  eitherFromPredicate (rejectValue, recordArguments) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('match: Left handler receives only the error', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  function returnValue(value: number): number {
    return value
  }

  left<string, number> ('e').match (recordArguments, returnValue)

  assert.deepStrictEqual (calls, [['e']])
})

test ('match: Right handler receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  function errorLength(error: string): number {
    return error.length
  }

  right<string, number> (1).match (errorLength, recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('map: callback receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  right<string, number> (1).map (recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('chain: callback receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return right<string, number> (1)
  }

  right<string, number> (1).chain (recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('reduce: callback receives only accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  right<string, number> (1).reduce (recordArguments, 0)

  assert.deepStrictEqual (calls, [[0, 1]])
})

test ('bimap: Left callback receives only the error', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  left<string, number> ('e').bimap (recordArguments, recordArguments)

  assert.deepStrictEqual (calls, [['e']])
})

test ('bimap: Right callback receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  right<string, number> (1).bimap (recordArguments, recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('isLeft: checks for Left and narrows the type to its error value', () => {
  assert.deepStrictEqual (isLeft (left<string, number> ('x')), true)
  assert.deepStrictEqual (isLeft (right<string, number> (42)), false)
})

test ('isRight: checks for Right and narrows the type to its success value', () => {
  assert.deepStrictEqual (isRight (right<string, number> (42)), true)
  assert.deepStrictEqual (isRight (left<string, number> ('x')), false)
})

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a

const odd = (n: number) => n % 2 === 1

type E = Either<string, number>

const samples = (): E[] => [
  right<string, number> (1),
  right<string, number> (2),
  left<string, number> ('err'),
]
