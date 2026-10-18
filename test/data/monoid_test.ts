import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { MonoidDict } from '../../src/classes/monoid.ts'
import type { Nullary } from '../../src/core/shape.ts'
import { foldMap } from '../../src/classes/foldable.ts'
import { just, type Maybe, nothing } from '../../src/data/maybe.ts'
import {
  All,
  Any,
  Concat,
  Endo,
  First,
  Last,
  Max,
  Min,
  Product,
  RightUnion,
  Sum,
} from '../../src/data/monoid.ts'

test ('Sum: adds numbers with zero as the identity', () => {
  assert.deepStrictEqual (Sum.empty (), 0)
  assert.deepStrictEqual (Sum.concat (2, 3), 5)
  assert.deepStrictEqual (Sum.concat (-1, 1), 0)
})

test ('Product: multiplies numbers with one as the identity', () => {
  assert.deepStrictEqual (Product.empty (), 1)
  assert.deepStrictEqual (Product.concat (3, 4), 12)
  assert.deepStrictEqual (Product.concat (0, 5), 0)
})

test ('Min: selects the minimum with Infinity as the identity', () => {
  assert.deepStrictEqual (Min.empty (), Infinity)
  assert.deepStrictEqual (Min.concat (3, 1), 1)
  assert.deepStrictEqual (Min.concat (1, 3), 1)
  assert.deepStrictEqual (Min.concat (-Infinity, 0), -Infinity)
})

test ('Max: selects the maximum with -Infinity as the identity', () => {
  assert.deepStrictEqual (Max.empty (), -Infinity)
  assert.deepStrictEqual (Max.concat (3, 1), 3)
  assert.deepStrictEqual (Max.concat (1, 3), 3)
  assert.deepStrictEqual (Max.concat (Infinity, 0), Infinity)
})

test ('Concat: joins strings with an empty string as the identity', () => {
  assert.deepStrictEqual (Concat.empty (), '')
  assert.deepStrictEqual (Concat.concat ('abc', 'def'), 'abcdef')
  assert.deepStrictEqual (Concat.concat ('def', 'abc'), 'defabc')
})

test ('All: combines booleans with AND', () => {
  assert.deepStrictEqual (All.empty (), true)
  assert.deepStrictEqual (All.concat (true, true), true)
  assert.deepStrictEqual (All.concat (true, false), false)
  assert.deepStrictEqual (All.concat (false, true), false)
  assert.deepStrictEqual (All.concat (false, false), false)
})

test ('Any: combines booleans with OR', () => {
  assert.deepStrictEqual (Any.empty (), false)
  assert.deepStrictEqual (Any.concat (true, true), true)
  assert.deepStrictEqual (Any.concat (true, false), true)
  assert.deepStrictEqual (Any.concat (false, true), true)
  assert.deepStrictEqual (Any.concat (false, false), false)
})

test ('First: keeps the first Just', () => {
  assert.deepStrictEqual (First<number> ().empty (), nothing<number> ())
  assert.deepStrictEqual (First<number> ().concat (just (1), just (2)), just (1))
  assert.deepStrictEqual (First<number> ().concat (nothing<number> (), just (2)), just (2))
  assert.deepStrictEqual (First<number> ().concat (just (1), nothing<number> ()), just (1))
  assert.deepStrictEqual (
    First<number> ().concat (nothing<number> (), nothing<number> ()),
    nothing<number> (),
  )
})

test ('Last: keeps the last Just', () => {
  assert.deepStrictEqual (Last<number> ().empty (), nothing<number> ())
  assert.deepStrictEqual (Last<number> ().concat (just (1), just (2)), just (2))
  assert.deepStrictEqual (Last<number> ().concat (nothing<number> (), just (2)), just (2))
  assert.deepStrictEqual (Last<number> ().concat (just (1), nothing<number> ()), just (1))
  assert.deepStrictEqual (
    Last<number> ().concat (nothing<number> (), nothing<number> ()),
    nothing<number> (),
  )
})

test ('RightUnion: merges records with later values winning', () => {
  assert.deepStrictEqual (RightUnion<number> ().empty (), {})
  assert.deepStrictEqual (RightUnion<number> ().concat ({ a: 1 }, { a: 2 }), { a: 2 })
  assert.deepStrictEqual (RightUnion<number> ().concat ({ a: 2 }, { a: 1 }), { a: 1 })
  assert.deepStrictEqual (RightUnion<number> ().concat ({ a: 1 }, { b: 2 }), { a: 1, b: 2 })
})

test ('Endo: composes functions from right to left', () => {
  assert.deepStrictEqual (Endo<number> ().concat ((n) => n + 1, (n) => n * 10) (2), 21)
  assert.deepStrictEqual (Endo<number> ().concat ((n) => n * 10, (n) => n + 1) (2), 30)
  assert.deepStrictEqual (Endo<number> ().empty () (7), 7)
})

test ('the dictionaries fit where a MonoidDict is expected', () => {
  assert.deepStrictEqual (foldMap (Concat) ((n: number) => `${n}`) ([1, 2]), '12')
  assert.deepStrictEqual (foldMap (Sum) ((n: number) => n) ([1, 2, 3]), 6)
  assert.deepStrictEqual (foldMap (Any) ((n: number) => n > 2) ([1, 2, 3]), true)
  assert.deepStrictEqual (foldMap (All) ((n: number) => n > 2) ([1, 2, 3]), false)
  assert.deepStrictEqual (foldMap (Sum) ((n: number) => n) ([]), 0)
})

test (
  'First and Last: Nothing is neutral on the left and on the right',
  () => {
    const F = First<number> ()
    const L = Last<number> ()
    for (const m of [just (1), nothing<number> ()] as Maybe<number>[]) {
      assert.deepStrictEqual (F.concat (F.empty (), m), m)
      assert.deepStrictEqual (F.concat (m, F.empty ()), m)
      assert.deepStrictEqual (L.concat (L.empty (), m), m)
      assert.deepStrictEqual (L.concat (m, L.empty ()), m)
    }
  },
)

test ('Sum: identity and associativity laws', () => {
  assertMonoidLaws (Sum, [0, 1, -3, 2.5, 100])
})

test ('Product: identity and associativity laws', () => {
  assertMonoidLaws (Product, [1, 0, 2, -3, 0.5])
})

test ('Min: identity and associativity laws', () => {
  assertMonoidLaws (Min, [0, 1, -3, Infinity, -Infinity])
})

test ('Max: identity and associativity laws', () => {
  assertMonoidLaws (Max, [0, 1, -3, Infinity, -Infinity])
})

test ('Concat: identity and associativity laws', () => {
  assertMonoidLaws (Concat, ['', 'a', 'bc', 'a long string'])
})

test ('All: identity and associativity laws', () => {
  assertMonoidLaws (All, [true, false])
})

test ('Any: identity and associativity laws', () => {
  assertMonoidLaws (Any, [true, false])
})

test ('First: identity and associativity laws', () => {
  assertMonoidLaws (First<number> (), [nothing<number> (), just (1), just (2)])
})

test ('Last: identity and associativity laws', () => {
  assertMonoidLaws (Last<number> (), [nothing<number> (), just (1), just (2)])
})

test ('RightUnion: identity and associativity laws', () => {
  assertMonoidLaws (RightUnion<number> (), [{}, { a: 1 }, { a: 2, b: 3 }, {
    b: 9,
  }])
})

test ('Endo: identity and associativity laws', () => {
  const probes = [0, 1, -3, 7]
  const onProbes = (f: (n: number) => number) => probes.map (f)

  assertMonoidLaws (
    Endo<number> (),
    [(n: number) => n + 1, (n: number) => n * 10, (n: number) => -n],
    onProbes,
  )
})

test ('Min and Max: on ties the operands do not get mixed up', () => {
  assert.deepStrictEqual (Object.is (Min.concat (-0, 0), -0), true)
  assert.deepStrictEqual (Object.is (Max.concat (-0, 0), 0), true)
  assert.deepStrictEqual (Object.is (Min.concat (0, -0), 0), true)
  assert.deepStrictEqual (Object.is (Max.concat (0, -0), -0), true)
})

test ('RightUnion: the operands survive the merge unmodified', () => {
  const a = { a: 1 }
  const b = { a: 2 }
  const c = RightUnion<number> ().concat (a, b)

  assert.deepStrictEqual (a, { a: 1 })
  assert.deepStrictEqual (b, { a: 2 })
  assert.deepStrictEqual (c === a, false)
  assert.deepStrictEqual (c === b, false)
})

test ('Endo: each function receives only the preceding result', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  Endo<number> ().concat (recordArguments, recordArguments) (0)

  assert.deepStrictEqual (calls, [[0], [1]])
})

const id = <A>(a: A): A => a

const assertMonoidLaws = <A>(
  M: MonoidDict<Nullary<A>>,
  samples: readonly A[],
  view: (a: A) => unknown = id,
) => {
  for (const a of samples) {
    assert.deepStrictEqual (view (M.concat (M.empty (), a)), view (a), 'left neutral element')
    assert.deepStrictEqual (view (M.concat (a, M.empty ())), view (a), 'right neutral element')
    for (const b of samples) {
      for (const c of samples) {
        assert.deepStrictEqual (
          view (M.concat (M.concat (a, b), c)),
          view (M.concat (a, M.concat (b, c))),
          'associativity',
        )
      }
    }
  }
}
