import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alt } from '../../src/classes/alt.ts'
import { of } from '../../src/classes/applicative.ts'
import { ap, apFirst, apSecond, lift2, lift3 } from '../../src/classes/apply.ts'
import { bimap, mapLeft } from '../../src/classes/bifunctor.ts'
import { chain, join } from '../../src/classes/chain.ts'
import { chainRec, done } from '../../src/classes/chainrec.ts'
import { extract } from '../../src/classes/comonad.ts'
import { duplicate, extend } from '../../src/classes/extend.ts'
import { filter } from '../../src/classes/filterable.ts'
import { all, reduce, size, toArray } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { lte } from '../../src/classes/ord.ts'
import { zero } from '../../src/classes/plus.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { compose } from '../../src/classes/semigroupoid.ts'
import { equals } from '../../src/classes/setoid.ts'
import { show } from '../../src/classes/show.ts'
import { sequence, traverse } from '../../src/classes/traversable.ts'
import { just, Maybe, nothing } from '../../src/data/maybe.ts'
import {
  diagonal,
  fromTuple,
  fst,
  Pair,
  pair,
  snd,
  swap,
  toTuple,
  uncurry,
} from '../../src/data/pair.ts'
import { Arr } from '../../src/natives/array.ts'

test ('Pair: supports direct construction and a detached type guard', () => {
  const value = new Pair ('log', 42)
  const { is } = Pair

  assert.deepStrictEqual (Object.getPrototypeOf (value).constructor.name, 'Pair')
  assert.deepStrictEqual (value, pair ('log', 42))
  assert.deepStrictEqual (is (value), true)
  assert.deepStrictEqual (is (['log', 42]), false)
})

test ('Pair: instances store both values and share their methods', () => {
  const first = pair ('a', 1)
  const second = pair ('b', 2)

  assert.deepStrictEqual (Object.keys (first), ['fst', 'snd'])
  assert.deepStrictEqual (first.map === second.map, true)
  assert.deepStrictEqual (JSON.stringify (first), '{"fst":"a","snd":1}')
})

test ('pair: creates a pair of values. map transforms the second value', () => {
  const p = pair ('record', 42)

  assert.deepStrictEqual (p.fst, 'record')
  assert.deepStrictEqual (p.snd, 42)
  assert.deepStrictEqual (p.constructor['@@type'], 'Pair')
  assert.deepStrictEqual (pair (1, 2).fst, 1)
  assert.deepStrictEqual (pair (1, 2).snd, 2)
  assert.deepStrictEqual (Object.getPrototypeOf (pair (1, 2)).constructor, Pair)
})

test ('fst: returns the first value of a pair', () => {
  assert.deepStrictEqual (fst (pair ('foo', 42)), 'foo')
})

test ('snd: returns the second value of a pair', () => {
  assert.deepStrictEqual (snd (pair ('foo', 42)), 42)
})

test ('swap: exchanges the first and second values of a pair', () => {
  assert.deepStrictEqual (swap (pair ('foo', 42)), pair (42, 'foo'))

  const p = pair ('foo', 42)

  assert.deepStrictEqual (swap (swap (p)), p)
})

test ('diagonal: creates a pair containing the supplied value in both positions', () => {
  assert.deepStrictEqual (diagonal (42), pair (42, 42))
  assert.deepStrictEqual (swap (diagonal ('x')), diagonal ('x'))
})

test ('uncurry: applies a curried two-argument function to the two values of a pair', () => {
  function addSides(l: number) {
    return (r: number) => l + r
  }

  assert.deepStrictEqual (uncurry (addSides) (pair (1, 2)), 3)

  function joinSides(l: string) {
    return (r: string) => l + r
  }

  assert.deepStrictEqual (
    uncurry (joinSides) (pair ('l', 'r')),
    'lr',
  )
})

test ('fromTuple: converts a two-element tuple into a ply pair', () => {
  assert.deepStrictEqual (fromTuple (['foo', 42]), pair ('foo', 42))
})

test ('toTuple: converts a ply pair into a two-element tuple', () => {
  assert.deepStrictEqual (toTuple (pair ('foo', 42)), ['foo', 42])
  assert.deepStrictEqual (fromTuple (toTuple (pair ('foo', 42))), pair ('foo', 42))
  assert.deepStrictEqual (toTuple (fromTuple (['foo', 42])), ['foo', 42])
})

test ('map: identity and composition across accumulator types', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  for (const [name, [l]] of Object.entries (logs)) {
    const p = pair (l, 1)

    assert.deepStrictEqual (map (id) (p), p, name)
    assert.deepStrictEqual (
      map (doubleThenIncrement) (p),
      map (increment) (map (doubleNumber) (p)),
      name,
    )
  }
})

test ('map: touches only snd', () => {
  assert.deepStrictEqual (map (increment) (pair ('record', 1)), pair ('record', 2))
  const values = [1]

  assert.deepStrictEqual (
    (map (increment) (pair (values, 1)) as Pair<number[], number>).fst,
    values,
  )
})

test ('ap: applies wrapped functions to wrapped values', () => {
  assert.deepStrictEqual (
    ap (pair ('a', increment)) (pair ('b', 1)),
    pair ('ab', 2),
  )
})

test ('ap: combines Pair accumulators in call order', () => {
  for (const [name, [l1, l2]] of Object.entries (logs)) {
    assert.deepStrictEqual (
      ap (pair (l1, increment)) (pair (l2, 1)),
      pair (glued[name], 2),
      name,
    )
  }
})

test ('lift2 and lift3: preserve Pair accumulator order', () => {
  const add = (a: number) => (b: number) => a + b
  const add3 = (a: number) => (b: number) => (c: number) => a + b + c

  assert.deepStrictEqual (
    lift2 (add) (pair ('A', 1)) (pair ('B', 2)),
    pair ('AB', 3),
  )
  assert.deepStrictEqual (
    lift3 (add3) (pair ('A', 1)) (pair ('B', 2)) (pair ('C', 3)),
    pair ('ABC', 6),
  )
  assert.deepStrictEqual (
    apFirst (pair ('A', 1)) (pair ('B', 2)),
    pair ('AB', 1),
  )
  assert.deepStrictEqual (
    apSecond (pair ('A', 1)) (pair ('B', 2)),
    pair ('AB', 2),
  )
  assert.deepStrictEqual (join (pair ('A', pair ('B', 7))), pair ('AB', 7))
})

test ('chain: sequences computations that return the same wrapper', () => {
  function doubleWithLog(n: number) {
    return pair ('b', n * 2)
  }

  assert.deepStrictEqual (
    chain (doubleWithLog) (pair ('a', 1)),
    pair ('ab', 2),
  )
})

test ('compose: runs the second function before the first', () => {
  assert.deepStrictEqual (compose (pair ('y', 'z')) (pair ('x', 'y')), pair ('x', 'z'))
})

test ('compose: keeps the first input and final output of a Pair', () => {
  assert.deepStrictEqual (compose (pair (2, 3)) (pair (1, 2)), pair (1, 3))
  const a1 = pair (0, 1), a2 = pair (1, 2), a3 = pair (2, 3)

  assert.deepStrictEqual (
    compose (compose (a3) (a2)) (a1),
    compose (a3) (compose (a2) (a1)),
  )
})

test ('extract: unwraps an Identity, or returns the second value of a Pair', () => {
  assert.deepStrictEqual (extract (pair ('l', 42)), 42)
  assert.deepStrictEqual (extract (pair ('l', 42)), snd (pair ('l', 42)))
})

test ('bimap: transforms both sides of a Pair, or the active branch of an Either', () => {
  assert.deepStrictEqual (
    bimap ((s: string) => s.length) (increment) (pair ('record', 1)),
    pair (6, 2),
  )
  assert.deepStrictEqual (bimap (id) (id) (pair ('l', 1)), pair ('l', 1))
})

test ('mapLeft: transforms a Left value or the first value of a Pair', () => {
  assert.deepStrictEqual (
    mapLeft ((s: string) => s.length) (pair ('record', 1)),
    pair (6, 1),
  )
})

test ('reduce: only snd is folded', () => {
  assert.deepStrictEqual (
    reduce ((accumulator: number, a: number) => accumulator + a) (1000) (
      pair ('l', 7),
    ),
    1007,
  )
  assert.deepStrictEqual (toArray (pair ('l', 7)), [7])
  assert.deepStrictEqual (size (pair ('l', 7)), 1)
  assert.deepStrictEqual (all ((n: number) => n > 0) (pair ('l', 7)), true)
})

test ('traverse: transforms values into a chosen wrapper and collects them inside one result', () => {
  assert.deepStrictEqual (
    traverse (Maybe) ((n: number) => n >= 0 ? just (n) : nothing<number> ()) (
      pair ('l', 1),
    ),
    just (pair ('l', 1)),
  )
  assert.deepStrictEqual (
    traverse (Maybe) ((_: number) => nothing<number> ()) (pair ('l', 1)),
    nothing (),
  )
})

test ('traverse: the accumulator survives the effect', () => {
  assert.deepStrictEqual (
    (traverse (Arr) ((n: number) => [n, -n]) (pair ('l', 1)) as Pair<
      string,
      number
    >[]).map ((p) => toTuple (p)),
    [['l', 1], ['l', -1]],
  )
  assert.deepStrictEqual (sequence (Maybe) (pair ('l', just (1))), just (pair ('l', 1)))
  assert.deepStrictEqual (
    sequence (Maybe) (pair ('l', nothing<number> ())),
    nothing (),
  )
})

test ("traverse: the applicative's of is not needed", () => {
  const exploding = {
    '@@type': 'Maybe' as const,
    _shape: undefined as never,
    of: () => {
      throw new Error ('of was called')
    },
  }

  assert.deepStrictEqual (
    traverse (exploding as never) ((n: number) => just (n) as never) (
      pair ('l', 1) as never,
    ),
    just (pair ('l', 1)),
  )
})

test ('concat: combines both Pair fields', () => {
  const cat = (a: unknown, b: unknown): unknown =>
    concat (a as never) (b as never)

  assert.deepStrictEqual (cat (pair ('a', [1]), pair ('b', [2])), pair ('ab', [1, 2]))
  const a = pair ('a', [1]), b = pair ('b', [2]), c = pair ('c', [3])

  assert.deepStrictEqual (cat (cat (a, b), c), cat (a, cat (b, c)))
})

test ('equals: compares values by content, including nested arrays and records', () => {
  assert.deepStrictEqual (equals (pair ('l', 1)) (pair ('l', 1)), true)
  assert.deepStrictEqual (equals (pair ('l', 1)) (pair ('l', 2)), false)
  assert.deepStrictEqual (equals (pair ('l', 1)) (pair ('r', 1)), false)
  assert.deepStrictEqual (
    equals (pair ('l', pair (1, [2]))) (pair ('l', pair (1, [2]))),
    true,
  )
  assert.deepStrictEqual (
    equals (pair ('l', pair (1, [2]))) (pair ('l', pair (1, [3]))),
    false,
  )
  assert.deepStrictEqual (
    equals (pair ('l', 1)) (pair ('r', 2)),
    equals (pair ('r', 2)) (pair ('l', 1)),
  )
})

test ('lte: lexicographic order, the accumulator first', () => {
  assert.deepStrictEqual (lte (pair ('b', 1)) (pair ('a', 9)), true)
  assert.deepStrictEqual (lte (pair ('a', 9)) (pair ('b', 1)), false)
  assert.deepStrictEqual (lte (pair ('a', 2)) (pair ('a', 1)), true)
  assert.deepStrictEqual (lte (pair ('a', 1)) (pair ('a', 2)), false)
  const ps = [pair ('a', 1), pair ('a', 2), pair ('b', 1), pair ('c', 0)]
  for (const x of ps) assert.deepStrictEqual (lte (x) (x), true)
  for (const x of ps) {
    for (const y of ps) {
      assert.deepStrictEqual (
        lte (y) (x) || lte (x) (y),
        true,
      )
      for (const z of ps) {
        if (lte (y) (x) && lte (z) (y)) {
          assert.deepStrictEqual (lte (z) (x), true)
        }
      }
    }
  }
})

test ("show: formats a value as a readable string, including ply's wrapped values", () => {
  assert.deepStrictEqual (show (pair (1, 'a')), 'Pair (1) ("a")')
  assert.deepStrictEqual (show (pair ('record', 42)), 'Pair ("record") (42)')
  assert.deepStrictEqual (
    show (just (pair (1, nothing<number> ()))),
    'Just (Pair (1) (Nothing))',
  )
})

test ('duplicate: a pair inside a pair, with the accumulator kept', () => {
  assert.deepStrictEqual (duplicate (pair ('l', 1)), pair ('l', pair ('l', 1)))
})

test ('ap: composition law across accumulator types', () => {
  const composeFunctions =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f (g (a))
  for (const [name, [l1, l2, l3]] of Object.entries (logs)) {
    const u = pair (l1, increment), v = pair (l2, doubleNumber), w = pair (l3, 5)

    assert.deepStrictEqual (
      ap (ap (map (composeFunctions) (u)) (v)) (w),
      ap (u) (ap (v) (w)),
      name,
    )
  }
})

test ('ap: agrees with chain', () => {
  for (const [name, [l1, l2]] of Object.entries (logs)) {
    const wrappedFunctions = pair (l1, increment), wrappedValue = pair (l2, 5)

    assert.deepStrictEqual (
      ap (wrappedFunctions) (wrappedValue),
      chain ((f: (n: number) => number) => map (f) (wrappedValue)) (
        wrappedFunctions,
      ),
      name,
    )
  }
})

test ('chain: associativity across accumulator types', () => {
  for (const [name, [l1, l2, l3]] of Object.entries (logs)) {
    const p = pair (l1, 1)
    const f = (n: number) => pair (l2, increment (n))
    const g = (n: number) => pair (l3, doubleNumber (n))

    assert.deepStrictEqual (
      chain (g) (chain (f) (p)),
      chain ((n: number) => chain (g) (f (n))) (p),
      name,
    )
  }
})

test ('extend: the Extend and Comonad laws across accumulator types', () => {
  const f = (w: Pair<unknown, number>) => extract (w) + 1
  const g = (w: Pair<unknown, number>) => extract (w) * 3
  for (const [name, [l]] of Object.entries (logs)) {
    const w = pair (l, 7)

    assert.deepStrictEqual (
      extend (f) (extend (g) (w)),
      extend ((ww: Pair<unknown, number>) => f (extend (g) (ww))) (w),
      name,
    )
    assert.deepStrictEqual (extract (extend (f) (w)), f (w), name)
    assert.deepStrictEqual (extend (extract) (w), w, name)
  }
})

test ('Pair: a type representative without of', () => {
  assert.deepStrictEqual (Pair['@@type'], 'Pair')
  assert.deepStrictEqual ('of' in Pair, false)
  assert.throws (
    () => of (Pair as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('of: Pair has no Applicative'),
  )
})

test ('ap: an accumulator without Semigroup throws a TypeError', () => {
  assert.throws (
    () => ap (pair (1, increment) as never) (pair (2, 1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Semigroup'),
  )
  assert.throws (
    () => chain (((n: number) => pair (2, n)) as never) (pair (1, 1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Semigroup'),
  )
})

test ('extend: computes a new value from the whole wrapper', () => {
  assert.deepStrictEqual (
    extend ((w: Pair<string, number>) => w.snd * 2) (pair ('l', 21)),
    pair ('l', 42),
  )
})

test ('Pair: alt, zero, filter and chainRec all refuse', () => {
  assert.throws (
    () => alt (pair ('a', 1) as never) (pair ('b', 2) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('alt: Pair has no Alt'),
  )
  assert.throws (
    () => zero (Pair as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('zero: Pair has no Plus'),
  )
  assert.throws (
    () => filter ((_: number) => true) (pair ('a', 1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('filter: Pair has no Filterable'),
  )
  assert.throws (
    () =>
      chainRec (Pair as never, ((n: number) => done (n)) as never, 1 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('chainRec: Pair has no ChainRec'),
  )
})

test ('map: Pair passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  map (recordArguments) (pair ('l', 1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('ap: Pair passes only its value to the wrapped function', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  ap (pair ('l', recordArguments)) (pair ('r', 1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('extend: Pair passes the whole pair', () => {
  const value = pair ('l', 1)
  const calls: unknown[][] = []

  function recordArguments(...args: [typeof value]) {
    calls.push (args)
    return 1
  }

  extend (recordArguments) (value)

  assert.deepStrictEqual (calls, [[value]])
})

test ('chain: Pair passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return pair ('r', 1)
  }

  chain (recordArguments) (pair ('l', 1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('traverse: Pair passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return just (1)
  }

  traverse (Maybe) (recordArguments) (pair ('l', 1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('bimap: Pair passes each side in a separate call', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  bimap (recordArguments) (recordArguments) (pair (1, 1))

  assert.deepStrictEqual (calls, [[1], [1]])
})

test ('reduce: Pair passes accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  reduce (recordArguments) (0) (pair ('l', 1))

  assert.deepStrictEqual (calls, [[0, 1]])
})

test ('compose: ends that do not meet fail the type check', () => {
  // @ts-expect-error argument arrow ends in number, receiver starts in string
  const bad = compose (pair ('string', 1)) (pair ('x', 99))

  assert.deepStrictEqual (show (bad), 'Pair ("x") (1)')
})

test ('ap: different semigroups on the left fail the type check', () => {
  const glue = pair<string, (n: number) => number> ('l', increment)
  const other = pair<number[], number> ([1], 1)
  // @ts-expect-error the accumulators are a string and an array of numbers
  const bad = ap (glue) (other)

  assert.deepStrictEqual (show (bad), 'Pair ("l1") (2)')
})

test ('ap: the accumulators must be the same type, both ways', () => {
  assert.deepStrictEqual (
    show (ap (pair<string, (n: number) => number> ('l', increment)) (pair ('r', 1))),
    'Pair ("lr") (2)',
  )

  const tag = 'r' as const
  const pinned = pair (tag, 1)
  const _bad = () => {
    // @ts-expect-error a pinned literal accumulator is not the type `string` is
    return ap (pair<string, (n: number) => number> ('l', increment)) (pinned)
  }
})

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a

const logs: Record<string, readonly [unknown, unknown, unknown]> = {
  String: ['a', 'b', 'c'],
  Array: [[1], [2], [3]],
  StrMap: [{ x: 1 }, { y: 2 }, { z: 3 }],
}

const glued: Record<string, unknown> = {
  String: 'ab',
  Array: [1, 2],
  StrMap: { x: 1, y: 2 },
}
