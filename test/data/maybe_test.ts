import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alt } from '../../src/classes/alt.ts'
import { bimap } from '../../src/classes/bifunctor.ts'
import { extract } from '../../src/classes/comonad.ts'
import { size, toArray } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { empty } from '../../src/classes/monoid.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { sequence, traverse } from '../../src/classes/traversable.ts'
import { Either, left, right } from '../../src/data/either.ts'
import { Identity, identity } from '../../src/data/identity.ts'
import {
  fromMaybe,
  fromMaybe_,
  fromNullable,
  fromPredicate,
  isJust,
  isNothing,
  just,
  justs,
  Maybe,
  maybe,
  maybe_,
  maybeEncase,
  maybeToEither,
  maybeToEither_,
  maybeToNullable,
  nothing,
  safeAfter,
  safeLift,
} from '../../src/data/maybe.ts'

test ('Maybe: values contain only their tag and payload', () => {
  const first = just (1)
  const second = just (2)

  assert.deepStrictEqual (Object.keys (first), ['tag', 'value'])
  assert.deepStrictEqual (Object.keys (nothing ()), ['tag'])
  assert.deepStrictEqual (first.map === second.map, true)
  assert.deepStrictEqual (JSON.stringify (first), '{"tag":"just","value":1}')
})

test ('nothing: shares one frozen value across type arguments', () => {
  assert.deepStrictEqual (Object.is (nothing<number> (), nothing<string> ()), true)
  assert.deepStrictEqual (Object.isFrozen (nothing ()), true)
  assert.deepStrictEqual (Object.hasOwn (nothing (), 'value'), false)
})

test ('just: stores a present value, including undefined', () => {
  const result = just (1)

  assert.deepStrictEqual (result.tag, 'just')
  if (!isJust (result)) throw new Error ('Expected Just')

  assert.deepStrictEqual (result.value, 1)
  assert.deepStrictEqual (result.constructor['@@type'], 'Maybe')
  assert.deepStrictEqual (just (undefined).tag, 'just')
})

test ('nothing: creates a Maybe with no value', () => {
  const m = nothing<number> ()

  assert.deepStrictEqual (m.tag, 'nothing')
  assert.deepStrictEqual ('value' in m, false)
  assert.deepStrictEqual (m.constructor['@@type'], 'Maybe')
})

test ('match: calls the handler for the active branch', () => {
  assert.deepStrictEqual (just (4).match (() => 'n', (a) => 'j' + a), 'j4')
  assert.deepStrictEqual (nothing<number> ().match (() => 'n', (a) => 'j' + a), 'n')
})

test ('maybe: transforms a Just value, or returns the supplied default for Nothing', () => {
  assert.deepStrictEqual (maybe (0) ((a: number) => a * 2) (just (4)), 8)
  assert.deepStrictEqual (maybe (0) ((a: number) => a * 2) (nothing<number> ()), 0)
})

test ('fromMaybe: unwraps a Just, or returns the supplied default for Nothing', () => {
  assert.deepStrictEqual (fromMaybe (0) (just (1)), 1)
  assert.deepStrictEqual (fromMaybe (0) (nothing<number> ()), 0)
})

test ('fromMaybe_: unwraps Just or computes a default for Nothing', () => {
  assert.deepStrictEqual (fromMaybe_ (() => 9) (just (1)), 1)
  assert.deepStrictEqual (fromMaybe_ (() => 9) (nothing<number> ()), 9)
})

test ('fromNullable: preserves present values, including falsy values', () => {
  assert.deepStrictEqual (fromNullable (1), just (1))
  assert.deepStrictEqual (fromNullable (0), just (0))
  assert.deepStrictEqual (fromNullable (''), just (''))
  assert.deepStrictEqual (fromNullable (false), just (false))
  assert.deepStrictEqual (fromNullable (NaN), just (NaN))
})

test ('fromPredicate: wraps a value in Just if it passes the predicate, or returns Nothing', () => {
  assert.deepStrictEqual (fromPredicate (isPositive) (1), just (1))
  assert.deepStrictEqual (fromPredicate (isPositive) (-1), nothing ())
})

test ('safeLift: checks the input before transforming it', () => {
  const half = safeLift (even, (n: number) => n / 2)

  assert.deepStrictEqual (half (4), just (2))
  assert.deepStrictEqual (half (3), nothing ())
})

test ('safeAfter: applies a function, then checks its result before wrapping it in Just', () => {
  const find = safeAfter ((n: number) => n >= 0, (s: string) => s.indexOf ('a'))

  assert.deepStrictEqual (find ('bab'), just (1))
  assert.deepStrictEqual (find ('xyz'), nothing ())
})

test ('maybeToNullable: unwraps a Just, or returns null for Nothing', () => {
  assert.deepStrictEqual (maybeToNullable (just (42)), 42)
  assert.deepStrictEqual (maybeToNullable (nothing<number> ()), null)
  assert.deepStrictEqual (maybeToNullable (just (null)), null)
})

test ('justs: keeps and unwraps Just values, discarding Nothing values', () => {
  assert.deepStrictEqual (justs ([just ('foo'), nothing<string> (), just ('baz')]), [
    'foo',
    'baz',
  ])
  assert.deepStrictEqual (justs ([] as Maybe<number>[]), [])
  assert.deepStrictEqual (justs ([nothing<number> ()]), [])
})

test ('justs: works on any Filterable, not only on an array', () => {
  assert.deepStrictEqual (
    justs (
      { a: just (1), b: nothing<number> () } as Record<string, Maybe<number>>,
    ),
    { a: 1 },
  )
  assert.deepStrictEqual (justs (new Set ([just (1), nothing<number> ()])), new Set ([1]))
})

test ('maybeToEither: converts Just to Right, or Nothing to Left with the supplied error', () => {
  assert.deepStrictEqual (maybeToEither ('e') (just (1)), right<string, number> (1))
  assert.deepStrictEqual (maybeToEither ('e') (nothing<number> ()), left<string, number> ('e'))
})

test ('maybeToEither_: converts absence into a computed error', () => {
  assert.deepStrictEqual (maybeToEither_ (() => 'e') (just (1)), right<string, number> (1))
  assert.deepStrictEqual (
    maybeToEither_ (() => 'e') (nothing<number> ()),
    left<string, number> ('e'),
  )
  let calls = 0

  function createMissingValueError() {
    calls++
    return 'e'
  }

  maybeToEither_ (createMissingValueError) (just (1))

  assert.deepStrictEqual (calls, 0)
})

test ('Maybe: creates values and identifies their type', () => {
  assert.deepStrictEqual (Maybe['@@type'], 'Maybe')
  assert.deepStrictEqual (Maybe.of (1), just (1))
  assert.deepStrictEqual (Maybe.zero<number> (), nothing<number> ())

  const rep: unknown = just (1).constructor

  assert.deepStrictEqual (rep, Maybe)
})

test ('Maybe: the constructor uses the public type name', () => {
  assert.deepStrictEqual (Object.getPrototypeOf (just (1)).constructor.name, 'Maybe')
  assert.deepStrictEqual (Object.getPrototypeOf (nothing ()).constructor.name, 'Maybe')
  assert.deepStrictEqual (just (1).constructor, Maybe)
  assert.deepStrictEqual (nothing ().constructor, Maybe)
  assert.deepStrictEqual (Maybe.is (just (1)), true)
  assert.deepStrictEqual (Maybe.is (nothing ()), true)
})

test ('Maybe: static functions work when passed separately', () => {
  const { is, of, zero } = Maybe

  assert.deepStrictEqual (of (42), just (42))
  assert.deepStrictEqual (zero<number> (), nothing<number> ())
  assert.deepStrictEqual (is (of (42)), true)
  assert.deepStrictEqual (is (zero ()), true)
  assert.deepStrictEqual (is (42), false)
})

test ('map: transforms contained values', () => {
  assert.deepStrictEqual (just (1).map (increment), just (2))
  assert.deepStrictEqual (nothing<number> ().map (increment), nothing<number> ())
  assert.deepStrictEqual (map (increment) (just (1)), just (2))
})

test ('ap: applies wrapped functions to wrapped values', () => {
  assert.deepStrictEqual (just (1).ap (just (increment)), just (2))
  assert.deepStrictEqual (nothing<number> ().ap (just (increment)), nothing<number> ())
  assert.deepStrictEqual (just (1).ap (nothing<(n: number) => number> ()), nothing<number> ())
  assert.deepStrictEqual (
    nothing<number> ().ap (nothing<(n: number) => number> ()),
    nothing<number> (),
  )
})

test ('chain: sequences computations that return the same wrapper', () => {
  const half = (n: number) => even (n) ? just (n / 2) : nothing<number> ()

  assert.deepStrictEqual (just (4).chain (half), just (2))
  assert.deepStrictEqual (just (3).chain (half), nothing<number> ())
  assert.deepStrictEqual (nothing<number> ().chain (half), nothing<number> ())
})

test ('alt: combines alternatives in argument order', () => {
  assert.deepStrictEqual (alt (just (2)) (just (1)), just (1))
  assert.deepStrictEqual (alt (just (2)) (nothing<number> ()), just (2))
  assert.deepStrictEqual (alt (nothing<number> ()) (just (1)), just (1))
  assert.deepStrictEqual (alt (nothing<number> ()) (nothing<number> ()), nothing<number> ())
  assert.deepStrictEqual (just (1).alt (just (2)), just (1))
})

test ('filter: keeps values that pass the predicate, preserving the collection type', () => {
  assert.deepStrictEqual (just (2).filter (even), just (2))
  assert.deepStrictEqual (just (3).filter (even), nothing<number> ())
  assert.deepStrictEqual (nothing<number> ().filter (even), nothing<number> ())
})

test ('reduce: combines values from left to right, starting with an initial accumulator', () => {
  assert.deepStrictEqual (
    just (3).reduce ((accumulator: number, a) => accumulator + a, 10),
    13,
  )
  assert.deepStrictEqual (
    nothing<number> ().reduce ((accumulator: number, a) => accumulator + a, 10),
    10,
  )
})

test ('reduce: Maybe folds like a list of zero or one', () => {
  assert.deepStrictEqual (toArray (just (1)), [1])
  assert.deepStrictEqual (toArray (nothing<number> ()), [])
  assert.deepStrictEqual (size (just (1)), 1)
  assert.deepStrictEqual (size (nothing<number> ()), 0)
})

test ('traverse: transforms values into a chosen wrapper and collects them inside one result', () => {
  assert.deepStrictEqual (
    just (1).traverse (Identity, (n: number) => identity (n * 2)),
    identity (just (2)),
  )
  assert.deepStrictEqual (
    nothing<number> ().traverse (Identity, (n: number) => identity (n * 2)),
    identity (nothing<number> ()),
  )
})

test ('traverse and sequence: collect array values into Maybe', () => {
  assert.deepStrictEqual (
    traverse (Maybe) ((n: number) => just (n)) ([1, 2, 3]),
    just ([1, 2, 3]),
  )
  const visited: number[] = []

  function recordAndCheckValue(n: number) {
    visited.push (n)
    return n < 3 ? just (n) : nothing<number> ()
  }

  assert.deepStrictEqual (
    traverse (Maybe) (recordAndCheckValue) ([1, 2, 3]),
    nothing<number[]> (),
  )
  assert.deepStrictEqual (visited, [1, 2, 3])
  assert.deepStrictEqual (
    sequence (Maybe) ([just (1), just (2)]),
    just ([1, 2]),
  )
  assert.deepStrictEqual (
    sequence (Maybe) ([just (1), nothing<number> ()]),
    nothing<number[]> (),
  )
  assert.deepStrictEqual (
    traverse (Maybe) ((n: number) => just (n)) ([]),
    just ([]),
  )
})

test ('equals: compares values by content, including nested arrays and records', () => {
  assert.deepStrictEqual (just (1).equals (just (1)), true)
  assert.deepStrictEqual (just (1).equals (just (2)), false)
  assert.deepStrictEqual (just (1).equals (nothing<number> ()), false)
  assert.deepStrictEqual (nothing<number> ().equals (just (1)), false)
  assert.deepStrictEqual (nothing<number> ().equals (nothing<number> ()), true)
})

test ('equals: the contents are compared structurally, not by reference', () => {
  assert.deepStrictEqual (just ([1, [2]]).equals (just ([1, [2]])), true)
  assert.deepStrictEqual (just (just (1)).equals (just (just (1))), true)
  assert.deepStrictEqual (just (just (1)).equals (just (nothing<number> ())), false)
  assert.deepStrictEqual (just ({ a: [1] }).equals (just ({ a: [1] })), true)
})

test ('lte: checks whether the value is at most the supplied bound', () => {
  assert.deepStrictEqual (nothing<number> ().lte (just (1)), true)
  assert.deepStrictEqual (just (1).lte (nothing<number> ()), false)
  assert.deepStrictEqual (nothing<number> ().lte (nothing<number> ()), true)
  assert.deepStrictEqual (just (1).lte (just (2)), true)
  assert.deepStrictEqual (just (2).lte (just (1)), false)
  assert.deepStrictEqual (just (1).lte (just (1)), true)
})

test ("show: formats a value as a readable string, including ply's wrapped values", () => {
  assert.deepStrictEqual (just (1).show (), 'Just (1)')
  assert.deepStrictEqual (nothing<number> ().show (), 'Nothing')
  assert.deepStrictEqual (just ('foo').show (), 'Just ("foo")')
  assert.deepStrictEqual (just (just (1)).show (), 'Just (Just (1))')
  assert.deepStrictEqual (just ([1, 2]).show (), 'Just ([1, 2])')
  assert.deepStrictEqual (just (-0).show (), 'Just (-0)')
})

test ('maybe_: handles presence and absence with separate callbacks', () => {
  assert.deepStrictEqual (maybe_ (() => 0) ((a: number) => a * 2) (just (4)), 8)
  assert.deepStrictEqual (maybe_ (() => 0) ((a: number) => a * 2) (nothing<number> ()), 0)
})

test ("maybeEncase: wraps a function's result in Just, or returns Nothing if it throws", () => {
  const parse = maybeEncase (JSON.parse)

  assert.deepStrictEqual (parse ('[1,2]'), just ([1, 2]))
  assert.deepStrictEqual (parse ('['), nothing ())
})

test ('isNothing: checks whether a Maybe has no value', () => {
  assert.deepStrictEqual (isNothing (nothing<number> ()), true)
  assert.deepStrictEqual (isNothing (just (42)), false)
})

test ('lte: the order is total and antisymmetric', () => {
  const values = [nothing<number> (), just (1), just (2)]
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
  for (const m of samples ()) {
    assert.deepStrictEqual (m.map (id), m, 'identity')
    assert.deepStrictEqual (
      m.map ((n) => increment (doubleNumber (n))),
      m.map (doubleNumber).map (increment),
      'composition',
    )
  }
})

test ('ap: composition law', () => {
  const composeFunctions =
    (f: (b: number) => number) =>
    (g: (a: number) => number) =>
    (
      a: number,
    ) => f (g (a))
  const fs = [just (increment), nothing<(n: number) => number> ()]
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
    assert.deepStrictEqual (v.ap (Maybe.of (id)), v, 'identity')
  }

  assert.deepStrictEqual (Maybe.of (7).ap (Maybe.of (f)), Maybe.of (f (7)), 'homomorphism')
  for (const u of [just (f), nothing<(n: number) => number> ()]) {
    assert.deepStrictEqual (
      Maybe.of (7).ap (u),
      u.ap (Maybe.of ((g: (n: number) => number) => g (7))),
      'interchange',
    )
  }
})

test ('chain: monad laws', () => {
  const f = (n: number) => n > 0 ? just (n * 2) : nothing<number> ()
  const g = (n: number) => n < 10 ? just (n + 1) : nothing<number> ()
  for (const m of samples ()) {
    assert.deepStrictEqual (m.chain (f).chain (g), m.chain ((n) => f (n).chain (g)), 'assoc.')
    assert.deepStrictEqual (m.chain ((a) => Maybe.of (a)), m, 'right identity')
  }
  for (const a of [1, -1, 42]) {
    assert.deepStrictEqual (Maybe.of (a).chain (f), f (a), 'left identity')
  }
})

test ('alt: Alt and Plus laws', () => {
  for (const a of samples ()) {
    assert.deepStrictEqual (a.alt (Maybe.zero ()), a, 'right neutral element')
    assert.deepStrictEqual (Maybe.zero<number> ().alt (a), a, 'left neutral element')
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

  assert.deepStrictEqual (
    Maybe.zero<number> ().map (increment),
    nothing<number> (),
    'annihilation',
  )
})

test ('filter: Filterable laws', () => {
  for (const m of samples ()) {
    assert.deepStrictEqual (m.filter (() => true), m, 'identity')
    assert.deepStrictEqual (
      m.filter ((n) => isPositive (n) && even (n)),
      m.filter (isPositive).filter (even),
      'distributivity',
    )
  }

  assert.deepStrictEqual (
    Maybe.zero<number> ().filter (isPositive),
    nothing<number> (),
    'annihilation',
  )
})

test ('traverse: identity law through Identity', () => {
  for (const m of samples ()) {
    assert.deepStrictEqual (m.traverse (Identity, (a: number) => identity (a)), identity (m))
  }
})

test ('equals: Setoid laws', () => {
  const values = [just (1), just (2), nothing<number> (), just (1)]
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

test ('safeLift: skips the transformation when the predicate fails', () => {
  let calls = 0

  function recordValue(n: number) {
    calls++
    return n
  }

  safeLift (even, recordValue) (3)

  assert.deepStrictEqual (calls, 0)
})

test ('match: the other branch is not evaluated', () => {
  const boom = (): string => {
    throw new Error ('should not have been called')
  }

  assert.deepStrictEqual (just (1).match (boom, (a) => String (a)), '1')
  assert.deepStrictEqual (nothing<number> ().match (() => 'n', boom), 'n')
})

test ('fromMaybe_: skips the fallback for Just', () => {
  let fallbackCalls = 0
  const fallback = () => {
    fallbackCalls++
    return 9
  }

  assert.deepStrictEqual (fromMaybe_ (fallback) (just (1)), 1)
  assert.deepStrictEqual (fallbackCalls, 0)
})

test ('fromNullable: null and undefined become Nothing', () => {
  assert.deepStrictEqual (fromNullable (null), nothing ())
  assert.deepStrictEqual (fromNullable (undefined), nothing ())
})

test ('maybeEncase: all the arguments get through', () => {
  const f = maybeEncase ((a: number, b: number, c: number) => a + b + c)

  assert.deepStrictEqual (f (1, 2, 3), just (6))
})

test ('Maybe: rejects empty and concat', () => {
  assert.deepStrictEqual ('empty' in Maybe, false)
  assert.deepStrictEqual ('concat' in just (1), false)
  assert.throws (
    () => empty (Maybe as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('empty: Maybe has no Monoid'),
  )
  assert.throws (
    () => concat (just ('a') as never) (just ('b') as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Maybe has no Semigroup'),
  )
})

test ('map: on Nothing the function is not called', () => {
  function unexpectedCallback() {
    throw new Error ('should not have been called')
  }

  nothing<number> ().map (unexpectedCallback)
})

test ('traverse: a failed result makes the whole traversal fail', () => {
  const wary = (n: number) =>
    n > 0 ? right<string, number> (n) : left<string, number> ('err' + n)

  assert.deepStrictEqual (
    just (1).traverse (Identity, (n: number) => identity (n)),
    identity (just (1)),
  )
  assert.deepStrictEqual (
    just (1).traverse (
      Maybe,
      (n: number) => n > 0 ? just (n) : nothing<number> (),
    ),
    just (just (1)),
  )
  assert.deepStrictEqual (
    just (-1).traverse (
      Maybe,
      (n: number) => n > 0 ? just (n) : nothing<number> (),
    ),
    nothing<Maybe<number>> (),
  )
  assert.deepStrictEqual (
    just (-1).traverse (Either, wary),
    left<string, Maybe<number>> ('err-1'),
  )

  assert.deepStrictEqual (
    nothing<number> ().traverse (Either, wary),
    right<string, Maybe<number>> (nothing<number> ()),
  )
})

test ('Maybe: rejects extract and bimap', () => {
  assert.throws (
    () => extract (just (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('extract: Maybe has no Comonad'),
  )
  assert.throws (
    () => bimap ((e: string) => e) (increment) (just (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('bimap: Maybe has no Bifunctor'),
  )
})

test ('maybe_: absent branch receives no arguments', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  function returnValue(value: number): number {
    return value
  }

  maybe_ (recordArguments) (returnValue) (nothing<number> ())

  assert.deepStrictEqual (calls, [[]])
})

test ('maybe_: present branch receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  function defaultValue(): number {
    return 0
  }

  maybe_ (defaultValue) (recordArguments) (just (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('maybe: present branch receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  maybe (0) (recordArguments) (just (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('fromMaybe_: fallback receives no arguments', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  fromMaybe_ (recordArguments) (nothing<number> ())

  assert.deepStrictEqual (calls, [[]])
})

test ('fromPredicate: predicate receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  fromPredicate (recordArguments) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('safeLift: predicate receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  function returnValue(value: number): number {
    return value
  }

  safeLift (recordArguments, returnValue) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('safeLift: transformation receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  safeLift (isPositive, recordArguments) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('safeAfter: predicate receives only the result', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  function returnValue(value: number): number {
    return value
  }

  safeAfter (recordArguments, returnValue) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('safeAfter: transformation receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  safeAfter (isPositive, recordArguments) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('maybeToEither_: error factory receives no arguments', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  maybeToEither_ (recordArguments) (nothing<number> ())

  assert.deepStrictEqual (calls, [[]])
})

test ('match: present branch receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  function defaultValue(): number {
    return 0
  }

  just (1).match (defaultValue, recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('match: absent branch receives no arguments', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  function returnValue(value: number): number {
    return value
  }

  nothing<number> ().match (recordArguments, returnValue)

  assert.deepStrictEqual (calls, [[]])
})

test ('map: callback receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  just (1).map (recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('filter: predicate receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  just (1).filter (recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('chain: callback receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return just (1)
  }

  just (1).chain (recordArguments)

  assert.deepStrictEqual (calls, [[1]])
})

test ('reduce: callback receives only accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  just (1).reduce (recordArguments, 0)

  assert.deepStrictEqual (calls, [[0, 1]])
})

test ('fromPredicate: a type guard narrows the wrapped value to string', () => {
  const isString = (value: unknown): value is string =>
    typeof value === 'string'
  const input: unknown = 'abc'
  const result = fromPredicate (isString) (input)
  const text: Maybe<string> = result

  assert.deepStrictEqual (text, just ('abc'))
  assert.deepStrictEqual (fromPredicate (isString) (1 as unknown), nothing ())
})

test ('isJust: checks for Just and narrows the type so its value can be read', () => {
  assert.deepStrictEqual (isJust (just (42)), true)
  assert.deepStrictEqual (isJust (nothing<number> ()), false)
})

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a

const isPositive = (n: number) => n > 0

const even = (n: number) => n % 2 === 0

const samples = (): Maybe<number>[] => [just (1), just (2), nothing<number> ()]
