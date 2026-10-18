import assert from 'node:assert/strict'
import { test } from 'node:test'
import { done, loop, type Step } from '../../src/classes/chainrec.ts'
import { sequence, traverse } from '../../src/classes/traversable.ts'
import {
  type Either,
  Either as EitherRep,
  left,
  right,
} from '../../src/data/either.ts'
import { Identity, identity } from '../../src/data/identity.ts'
import { just, type Maybe, Maybe as MaybeRep, nothing } from '../../src/data/maybe.ts'
import { type Pair, pair } from '../../src/data/pair.ts'
import {
  Arr,
  array,
  chunksOf,
  dropWhile,
  find,
  findIndex,
  findMap,
  fromIterable,
  groupBy,
  index,
  nub,
  nubBy,
  range,
  takeWhile,
  unfold,
  unfoldr,
  zip,
  zipWith,
} from '../../src/natives/array.ts'

test ('fromIterable: copies an iterable into an array', () => {
  assert.deepStrictEqual (fromIterable ('ab'), ['a', 'b'])
  assert.deepStrictEqual (fromIterable (new Set ([1, 1, 2])), [1, 2])
  assert.deepStrictEqual (fromIterable (new Map ([['a', 1]])), [['a', 1]])
  assert.deepStrictEqual (fromIterable ([1, 2]), [1, 2])
  assert.deepStrictEqual (fromIterable (new Set<number> ()), [])
})

test ('fromIterable: drains the iterator exactly once', () => {
  function* counted() {
    yield 1
    yield 2
    yield 3
  }

  assert.deepStrictEqual (fromIterable (counted ()), [1, 2, 3])
})

test ('range: creates consecutive integers from start up to, but excluding, end', () => {
  assert.deepStrictEqual (range (0) (5), [0, 1, 2, 3, 4])
  assert.deepStrictEqual (range (-5) (0), [-5, -4, -3, -2, -1])
  assert.deepStrictEqual (range (3) (3), [])
  assert.deepStrictEqual (range (5) (1), [])
})

test ('takeWhile: keeps the leading values that pass the predicate', () => {
  const odd = (n: number) => n % 2 !== 0

  assert.deepStrictEqual (takeWhile (odd) ([3, 3, 3, 7, 6, 3, 5, 4]), [3, 3, 3, 7])
  assert.deepStrictEqual (takeWhile (odd) ([]), [])
  assert.deepStrictEqual (takeWhile (odd) ([2, 4]), [])
  assert.deepStrictEqual (takeWhile (odd) ([1, 3]), [1, 3])
})

test ('dropWhile: removes the leading values that pass the predicate', () => {
  const odd = (n: number) => n % 2 !== 0

  assert.deepStrictEqual (dropWhile (odd) ([3, 3, 3, 7, 6, 3, 5, 4]), [6, 3, 5, 4])
  assert.deepStrictEqual (dropWhile (odd) ([]), [])
  assert.deepStrictEqual (dropWhile (odd) ([2, 4]), [2, 4])
  assert.deepStrictEqual (dropWhile (odd) ([1, 3]), [])
})

test ('takeWhile and dropWhile cut the array at exactly one point', () => {
  const values = [1, 3, 5, 2, 7, 4]
  for (const p of [even, (n: number) => n < 5, () => true, () => false]) {
    assert.deepStrictEqual ([...takeWhile (p) (values), ...dropWhile (p) (values)], values)
  }
})

test ('takeWhile and dropWhile do not touch the input', () => {
  const values = [1, 2, 3]
  takeWhile (even) (values)
  dropWhile (even) (values)

  assert.deepStrictEqual (values, [1, 2, 3])
})

test ('chunksOf: splits an array into chunks of at most n values', () => {
  assert.deepStrictEqual (chunksOf (2) ([1, 2, 3, 4, 5]), [[1, 2], [3, 4], [5]])
  assert.deepStrictEqual (chunksOf (2) ([1, 2, 3, 4]), [[1, 2], [3, 4]])
  assert.deepStrictEqual (chunksOf (1) ([1, 2]), [[1], [2]])
  assert.deepStrictEqual (chunksOf (5) ([1, 2]), [[1, 2]])
  assert.deepStrictEqual (chunksOf (2) ([]), [])
})

test ('find: returns the first matching value as Just, or Nothing if none match', () => {
  assert.deepStrictEqual (find (even) ([1, 2, 3, 4]), just (2))
  assert.deepStrictEqual (find (even) ([1, 3]), nothing ())
  assert.deepStrictEqual (find (even) ([]), nothing ())
  assert.deepStrictEqual (find ((n: number) => n > 1) ([1, 2, 3]), just (2))
})

test ('find: stops at the first hit', () => {
  const seen: number[] = []

  function recordAndFindTwo(n: number) {
    seen.push (n)
    return n === 2
  }

  find (recordAndFindTwo) ([1, 2, 3, 4])

  assert.deepStrictEqual (seen, [1, 2])
})

test ('findIndex: returns the zero-based index of the first match as Just', () => {
  assert.deepStrictEqual (findIndex (even) ([1, 2, 3, 4]), just (1))
  assert.deepStrictEqual (findIndex (even) ([2]), just (0))
  assert.deepStrictEqual (findIndex (even) ([1, 3]), nothing ())
  assert.deepStrictEqual (findIndex (even) ([]), nothing ())
})

test ('findMap: returns the first successful result', () => {
  const half = (n: number) => even (n) ? just (n / 2) : nothing<number> ()

  assert.deepStrictEqual (findMap (half) ([1, 3, 4, 6]), just (2))
  assert.deepStrictEqual (findMap (half) ([1, 3]), nothing ())
  assert.deepStrictEqual (findMap (half) ([]), nothing ())
})

test ('findMap: does not call the function after the first Just', () => {
  const seen: number[] = []

  function recordAndMatchTwo(n: number) {
    seen.push (n)
    return n === 2 ? just ('yes') : nothing<string> ()
  }

  findMap (recordAndMatchTwo) ([1, 2, 3])

  assert.deepStrictEqual (seen, [1, 2])
})

test ('index: returns the value at a zero-based index as Just', () => {
  assert.deepStrictEqual (index (0) ([1, 2, 3]), just (1))
  assert.deepStrictEqual (index (2) ([1, 2, 3]), just (3))
  assert.deepStrictEqual (index (3) ([1, 2, 3]), nothing ())
  assert.deepStrictEqual (index (-1) ([1, 2, 3]), nothing ())
  assert.deepStrictEqual (index (0) ([]), nothing ())
})

test ('zipWith: combines corresponding values up to the shorter length', () => {
  assert.deepStrictEqual (zipWith ((a: number, b: number) => a + b) ([1, 2]) ([10, 20]), [
    11,
    22,
  ])
  assert.deepStrictEqual (zipWith ((a: number, b: number) => a + b) ([1, 2, 3]) ([10]), [11])
  assert.deepStrictEqual (zipWith ((a: number, b: number) => a + b) ([]) ([10]), [])
  assert.deepStrictEqual (
    zipWith ((a: number, b: string) => `${a}${b}`) ([1, 2]) (['a', 'b']),
    ['1a', '2b'],
  )
})

test ('zip: pairs corresponding values up to the shorter length', () => {
  assert.deepStrictEqual (zip ([1, 2]) (['a', 'b']), [[1, 'a'], [2, 'b']])
  assert.deepStrictEqual (zip ([1, 2, 3]) (['a']), [[1, 'a']])
  assert.deepStrictEqual (zip<number> ([]) (['a']), [])
})

test ('unfold: builds an array by repeatedly applying a function to a seed', () => {
  function doubleUntilThousand(n: number) {
    return n < 1000 ? just (pair (n, 2 * n)) : nothing<Pair<number, number>> ()
  }

  assert.deepStrictEqual (
    unfold (doubleUntilThousand) (1),
    [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
  )
  assert.deepStrictEqual (unfold ((_n: number) => nothing<Pair<number, number>> ()) (1), [])
})

test ('unfoldr: builds an array from a seed. Alias of unfold', () => {
  function countUpToFive(n: number) {
    return n < 5 ? just (pair (n, n + 1)) : nothing<Pair<number, number>> ()
  }

  assert.deepStrictEqual (
    unfoldr (countUpToFive) (1),
    [1, 2, 3, 4],
  )
})

test ('unfold and unfoldr are one operation under two names', () => {
  const step = (n: number) =>
    n < 6 ? just (pair (n * n, n + 1)) : nothing<Pair<number, number>> ()
  for (const seed of [0, 1, 5, 6, 100]) {
    assert.deepStrictEqual (unfold (step) (seed), unfoldr (step) (seed))
  }
})

test ('groupBy: groups consecutive values that match the first value in each group', () => {
  function sameNumber(a: number) {
    return (b: number) => a === b
  }

  assert.deepStrictEqual (
    groupBy (sameNumber) ([1, 1, 2, 1, 1]),
    [[1, 1], [2], [1, 1]],
  )
  assert.deepStrictEqual (groupBy (sameNumber) ([]), [])
  assert.deepStrictEqual (groupBy (sameNumber) ([1]), [[1]])
})

test ('groupBy: compares against the group leader, not against the neighbour', () => {
  function oppositeNumbers(a: number) {
    return (b: number) => a + b === 0
  }

  assert.deepStrictEqual (
    groupBy (oppositeNumbers) ([
      2,
      -3,
      3,
      3,
      3,
      4,
      -4,
      4,
    ]),
    [[2], [-3, 3, 3, 3], [4, -4], [4]],
  )

  function sameMagnitude(a: number) {
    return (b: number) => Math.abs (a) === Math.abs (b)
  }

  assert.deepStrictEqual (
    groupBy (sameMagnitude) ([
      2,
      -3,
      3,
      3,
      3,
      4,
      -4,
      4,
    ]),
    [[2], [-3, 3, 3, 3], [4, -4, 4]],
  )
})

test ('groupBy: gluing the groups back gives the original array', () => {
  const values = [1, 1, 2, 3, 3, 3, 1]
  for (
    const same of [
      (a: number) => (b: number) => a === b,
      (_a: number) => (_b: number) => true,
      (_a: number) => (_b: number) => false,
    ]
  ) {
    assert.deepStrictEqual (groupBy (same) (values).flat (), values)
  }
})

test ('Arr.map: passes no array index to Number.parseInt', () => {
  assert.deepStrictEqual (['1', '2', '3'].map (Number.parseInt), [1, NaN, NaN])
  assert.deepStrictEqual (Arr.map (['1', '2', '3'], Number.parseInt), [1, 2, 3])
})

test ('Arr: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (Arr['@@type'], 'Array')
  assert.deepStrictEqual (Arr.is ([]), true)
  assert.deepStrictEqual (Arr.is ([1, 2]), true)
  assert.deepStrictEqual (Arr.is ('string'), false)
  assert.deepStrictEqual (Arr.is (new Set ([1])), false)
  assert.deepStrictEqual (Arr.is ({ length: 0 }), false)
  assert.deepStrictEqual (Arr.is (null), false)
})

test ('Arr.of: wraps a single value', () => {
  assert.deepStrictEqual (Arr.of (1), [1])
  assert.deepStrictEqual (Arr.of ([1, 2]), [[1, 2]])
})

test ('Arr.empty and Arr.zero', () => {
  assert.deepStrictEqual (Arr.empty (), [])
  assert.deepStrictEqual (Arr.zero (), [])
  assert.deepStrictEqual (Arr.empty<number> () === Arr.empty<number> (), false)
  assert.deepStrictEqual (Arr.zero<number> () === Arr.zero<number> (), false)
})

test ('Arr.equals: compares values by content', () => {
  assert.deepStrictEqual (Arr.equals ([], []), true)
  assert.deepStrictEqual (Arr.equals ([1, 2], [1, 2]), true)
  assert.deepStrictEqual (Arr.equals ([1, 2], [2, 1]), false)
  assert.deepStrictEqual (Arr.equals ([1], [1, 2]), false)
  assert.deepStrictEqual (Arr.equals ([[1], [2]], [[1], [2]]), true)
  assert.deepStrictEqual (Arr.equals ([{ a: [1] }], [{ a: [1] }]), true)
  assert.deepStrictEqual (Arr.equals ([{ a: 1 }], [{ a: 1 }]), true)
  assert.deepStrictEqual (Arr.equals ([{ a: 1 }], [{ a: 2 }]), false)
})

test ('Arr.lte: lexicographic order', () => {
  assert.deepStrictEqual (Arr.lte ([1, 1], [1, 2]), true)
  assert.deepStrictEqual (Arr.lte ([1, 2], [1, 1]), false)
  assert.deepStrictEqual (Arr.lte ([1], [1, 2]), true)
  assert.deepStrictEqual (Arr.lte ([1, 2], [1]), false)
  assert.deepStrictEqual (Arr.lte ([], []), true)
  assert.deepStrictEqual (Arr.lte ([], [1]), true)
  assert.deepStrictEqual (Arr.lte ([2], [1, 5]), false)
  assert.deepStrictEqual (Arr.lte ([1, 5], [2]), true)
  assert.deepStrictEqual (Arr.lte (['a', 'b'], ['a', 'c']), true)
})

test ('Arr.show: formats values as readable strings', () => {
  assert.deepStrictEqual (Arr.show ([]), '[]')
  assert.deepStrictEqual (Arr.show ([1, 2, 3]), '[1, 2, 3]')
  assert.deepStrictEqual (Arr.show ([1, 'a', [2]]), '[1, "a", [2]]')
  assert.deepStrictEqual (Arr.show ([true, null, undefined]), '[true, null, undefined]')
})

test ('Arr.concat: combines values in argument order', () => {
  assert.deepStrictEqual (Arr.concat ([1, 2], [3, 4]), [1, 2, 3, 4])
  assert.deepStrictEqual (Arr.concat ([], [1]), [1])
  assert.deepStrictEqual (Arr.concat ([1], []), [1])
})

test ('Arr.alt: combines alternatives', () => {
  assert.deepStrictEqual (Arr.alt ([1, 2], [3]), [1, 2, 3])
  assert.deepStrictEqual (Arr.alt ([], [3]), [3])
  assert.deepStrictEqual (Arr.alt ([1], []), [1])
  assert.deepStrictEqual (Arr.alt ([1, 2], [3]), Arr.concat ([1, 2], [3]))
})

test ('Arr.map: transforms values', () => {
  assert.deepStrictEqual (Arr.map ([1, 2, 3], increment), [2, 3, 4])
  assert.deepStrictEqual (Arr.map ([], increment), [])
})

test ('Arr.ap: applies every wrapped function to the wrapped values', () => {
  assert.deepStrictEqual (Arr.ap ([1, 2], [increment]), [2, 3])
  assert.deepStrictEqual (Arr.ap ([1, 2], []), [])
  assert.deepStrictEqual (Arr.ap ([], [increment]), [])
})

test ('Arr.ap: functions are the outer loop, values the inner one', () => {
  assert.deepStrictEqual (Arr.ap ([1, 2], [(n: number) => n, (n: number) => -n]), [
    1,
    2,
    -1,
    -2,
  ])
})

test ('Arr.chain: transforms values and flattens the results', () => {
  function repeatNumber(n: number) {
    return [n, n]
  }

  assert.deepStrictEqual (Arr.chain ([1, 2], repeatNumber), [1, 1, 2, 2])
  assert.deepStrictEqual (Arr.chain ([1, 2], (_n: number) => []), [])
  assert.deepStrictEqual (Arr.chain ([], (n: number) => [n]), [])
  assert.deepStrictEqual (Arr.chain ([1], (n: number) => [[n]]), [[1]])
})

test ('Arr.filter: keeps values that pass the predicate', () => {
  assert.deepStrictEqual (Arr.filter ([1, 2, 3, 4], even), [2, 4])
  assert.deepStrictEqual (Arr.filter ([1, 3], even), [])
  assert.deepStrictEqual (Arr.filter ([], even), [])
})

test ('Arr.reduce: combines values with an initial accumulator', () => {
  assert.deepStrictEqual (
    Arr.reduce (
      [1, 2, 3],
      (accumulator: number, n: number) => accumulator + n,
      0,
    ),
    6,
  )
  assert.deepStrictEqual (
    Arr.reduce ([], (accumulator: number, n: number) => accumulator + n, 0),
    0,
  )
  assert.deepStrictEqual (
    Arr.reduce (
      ['a', 'b', 'c'],
      (accumulator: string, s: string) => accumulator + s,
      '',
    ),
    'abc',
  )
  assert.deepStrictEqual (
    Arr.reduce (
      [1, 2, 3],
      (accumulator: string, n: number) => `(${accumulator} ${n})`,
      '0',
    ),
    '(((0 1) 2) 3)',
  )
})

test ('Arr.traverse: collects wrapped results', () => {
  assert.deepStrictEqual (travMaybe ((n: number) => just (n)) ([1, 2, 3]), just ([1, 2, 3]))
  assert.deepStrictEqual (travMaybe ((n: number) => just (n)) ([]), just ([]))
  assert.deepStrictEqual (
    travMaybe ((n: number) => n < 3 ? just (n) : nothing<number> ()) ([1, 2, 3]),
    nothing (),
  )
})

test ('Arr.traverse: the accumulator is the first operand of ap', () => {
  assert.deepStrictEqual (sequence (Arr) ([[1, 2], [3, 4]]) as number[][], [
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
  ])
  const triple = sequence (Arr) ([[1, 2], [3, 4], [5, 6]]) as number[][]

  assert.deepStrictEqual (triple.length, 8)
  assert.deepStrictEqual (triple[0], [1, 3, 5])
  assert.deepStrictEqual (triple[1], [1, 3, 6])
  assert.deepStrictEqual (triple[7], [2, 4, 6])
})

test ('Arr.traverse: the effects go left to right', () => {
  const boom = (n: number) =>
    n < 0 ? left<string, number> (`err${n}`) : right<string, number> (n)
  for (
    const [values, want] of [
      [[-1, 2, -3], 'err-1'],
      [[1, -2, -3], 'err-2'],
      [[1, 2, -3], 'err-3'],
    ] as const
  ) {
    const got = traverse (EitherRep) (boom) (values) as Either<string, number[]>

    assert.deepStrictEqual (
      got.match ((e: string) => e, () => 'there was no refusal'),
      want,
    )
  }
})

test ('Arr.chainRec: repeats loop steps until done', () => {
  assert.deepStrictEqual (Arr.chainRec<number, number> ((n) => [done (n + 1)], 0), [1])
  assert.deepStrictEqual (
    Arr.chainRec<number, number> ((n) => n < 3 ? [loop (n + 1)] : [done (n)], 0),
    [3],
  )
  assert.deepStrictEqual (Arr.chainRec<number, number> (() => [], 0), [])
})

test ('Arr.chainRec: the order matches recursion through chain', () => {
  const viaChain = (n: number): string[] =>
    branch (n).flatMap ((s) => s.tag === 'done' ? [s.value] : viaChain (s.value))

  assert.deepStrictEqual (Arr.chainRec (branch, 0), viaChain (0))
  assert.deepStrictEqual (Arr.chainRec (branch, 0), [
    'd0',
    'd1',
    'd2',
    'leaf3',
    'leaf12',
    'leaf11',
    'leaf10',
  ])
})

test ('takeWhile and dropWhile return an array detached from the input', () => {
  const values = [1, 2, 3]
  const all = takeWhile (() => true) (values)
  all.push (99)

  assert.deepStrictEqual (values, [1, 2, 3])

  const none = dropWhile (() => false) (values)
  none.push (99)

  assert.deepStrictEqual (values, [1, 2, 3])
})

test ('groupBy calls the predicate as same(leader)(candidate)', () => {
  const notLess = (leader: number) => (x: number) => x >= leader

  assert.deepStrictEqual (groupBy (notLess) ([3, 1, 4, 1]), [[3], [1, 4, 1]])
})

test ('nubBy calls the relation as same(kept, candidate)', () => {
  const less = (kept: number, candidate: number) => kept < candidate

  assert.deepStrictEqual (nubBy (less) ([3, 1, 5]), [3, 1])
})

test ('Arr.equals: Setoid laws', () => {
  const probes = [[], [1], [1, 2], [2, 1], [[1], [2]], [{
    a: 1,
  }]] as unknown[][]
  for (const a of probes) assert.deepStrictEqual (Arr.equals (a, a), true)
  for (const a of probes) {
    for (const b of probes) {
      assert.deepStrictEqual (Arr.equals (a, b), Arr.equals (b, a))
      for (const c of probes) {
        if (Arr.equals (a, b) && Arr.equals (b, c)) {
          assert.deepStrictEqual (Arr.equals (a, c), true)
        }
      }
    }
  }
})

test ('Arr.lte: Ord laws', () => {
  const probes = [[], [1], [1, 1], [1, 2], [2], [2, 0]]
  for (const a of probes) {
    for (const b of probes) {
      assert.deepStrictEqual (Arr.lte (a, b) || Arr.lte (b, a), true)
      if (Arr.lte (a, b) && Arr.lte (b, a)) assert.deepStrictEqual (Arr.equals (a, b), true)
      for (const c of probes) {
        if (Arr.lte (a, b) && Arr.lte (b, c)) {
          assert.deepStrictEqual (Arr.lte (a, c), true)
        }
      }
    }
  }
})

test ('Arr.concat: Semigroup and Monoid laws', () => {
  const a = [1, 2]
  const b = [3]
  const c = [4, 5]

  assert.deepStrictEqual (Arr.concat (Arr.concat (a, b), c), Arr.concat (a, Arr.concat (b, c)))
  assert.deepStrictEqual (Arr.concat (Arr.empty<number> (), a), a)
  assert.deepStrictEqual (Arr.concat (a, Arr.empty<number> ()), a)
})

test ('Arr.alt: Alt and Plus laws', () => {
  const a = [1, 2]
  const b = [3]
  const c = [4]

  assert.deepStrictEqual (Arr.alt (Arr.alt (a, b), c), Arr.alt (a, Arr.alt (b, c)))
  assert.deepStrictEqual (
    Arr.map (Arr.alt (a, b), increment),
    Arr.alt (Arr.map (a, increment), Arr.map (b, increment)),
  )
  assert.deepStrictEqual (Arr.alt (Arr.zero<number> (), a), a)
  assert.deepStrictEqual (Arr.alt (a, Arr.zero<number> ()), a)
  assert.deepStrictEqual (Arr.map (Arr.zero<number> (), increment), [])
})

test ('Arr.map: Functor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  const values = [1, 2, 3]

  assert.deepStrictEqual (Arr.map (values, (n: number) => n), values)
  assert.deepStrictEqual (
    Arr.map (values, doubleThenIncrement),
    Arr.map (Arr.map (values, doubleNumber), increment),
  )
})

test ('Arr.ap: the Apply composition law', () => {
  const compose =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f (g (a))
  const u = [increment, (n: number) => n * 10]
  const v = [(n: number) => n - 1, doubleNumber]
  const w = [1, 2]

  assert.deepStrictEqual (
    Arr.ap (w, Arr.ap (v, Arr.map (u, compose))),
    Arr.ap (Arr.ap (w, v), u),
  )
})

test ('Arr.of and Arr.ap: Applicative laws', () => {
  const v = [1, 2, 3]
  const f = increment
  const y = 7
  const u = [increment, doubleNumber]

  assert.deepStrictEqual (Arr.ap (v, Arr.of ((a: number) => a)), v)
  assert.deepStrictEqual (Arr.ap (Arr.of (y), Arr.of (f)), Arr.of (f (y)))
  assert.deepStrictEqual (
    Arr.ap (Arr.of (y), u),
    Arr.ap (u, Arr.of ((g: (n: number) => number) => g (y))),
  )
})

test ('Arr.chain: Chain and Monad laws', () => {
  const m = [1, 2, 3]
  const f = (n: number) => [n, n * 10]
  const g = (n: number) => [n + 1]

  assert.deepStrictEqual (
    Arr.chain (Arr.chain (m, f), g),
    Arr.chain (m, (x: number) => Arr.chain (f (x), g)),
  )
  assert.deepStrictEqual (Arr.chain (Arr.of (1), f), f (1))
  assert.deepStrictEqual (Arr.chain (m, (a: number) => Arr.of (a)), m)
})

test ('Arr.filter: Filterable laws', () => {
  const v = [1, 2, 3, 4, 5]
  const p = even
  const q = (n: number) => n > 2

  assert.deepStrictEqual (
    Arr.filter (v, (x: number) => p (x) && q (x)),
    Arr.filter (Arr.filter (v, p), q),
  )
  assert.deepStrictEqual (Arr.filter (v, () => true), v)
  assert.deepStrictEqual (Arr.filter (v, () => false), Arr.filter ([9, 9], () => false))
})

test ('Arr.traverse: identity law', () => {
  assert.deepStrictEqual (
    traverse (Identity) ((n: number) => identity (n)) ([1, 2, 3]) as Identity<
      number[]
    >,
    identity ([1, 2, 3]),
  )
})

test ('Arr.traverse: the naturality law', () => {
  const t = (m: Maybe<number[]>): number[][] => m.match (() => [], (a) => [a])
  const tf = (m: Maybe<number>): number[] => m.match (() => [], (a) => [a])
  for (const values of [[1, 2], [1, 2, 3], []]) {
    const f = (n: number) => n < 3 ? just (n) : nothing<number> ()

    assert.deepStrictEqual (
      t (travMaybe (f) (values)),
      traverse (Arr) ((n: number) => tf (f (n))) (values) as number[][],
    )
  }
})

test ('chunksOf: a non-positive or fractional step is refused', () => {
  for (const bad of [0, -1, 2.5, NaN, Infinity]) {
    assert.throws (
      () => chunksOf (bad) ([1, 2, 3]),
      (error: unknown) => error instanceof TypeError && error.message.includes ('chunksOf:'),
      String (bad),
    )
  }

  assert.throws (
    () => chunksOf (0),
    (error: unknown) => error instanceof TypeError && error.message.includes ('is not an integer >= 1'),
  )
})

test ('index: a fractional index is refused instead of giving Just (undefined)', () => {
  assert.throws (
    () => index (1.5),
    (error: unknown) => error instanceof TypeError && error.message.includes ('index: 1.5 is not an integer'),
  )
  assert.throws (
    () => index (NaN),
    (error: unknown) => error instanceof TypeError && error.message.includes ('is not an integer'),
  )
  assert.deepStrictEqual (index (-1) ([1, 2]), nothing ())
  assert.deepStrictEqual (index (99) ([1, 2]), nothing ())
  assert.deepStrictEqual (index (0) ([1, 2]), just (1))
})

test ("nub: removes duplicates using ply's equals, keeping the first occurrence", () => {
  assert.deepStrictEqual (nub ([1, 1, 2, 1, 3]), [1, 2, 3])
  assert.deepStrictEqual (nub ([]), [])
  assert.deepStrictEqual (nub ([3, 1, 3, 2, 1]), [3, 1, 2])
  assert.deepStrictEqual (nub ([[1], [1], [2]]), [[1], [2]])
  assert.deepStrictEqual (nub ([{ a: 1 }, { a: 1 }]), [{ a: 1 }])
})

test ('nub: does not touch the input', () => {
  const values = [1, 1, 2]

  assert.deepStrictEqual (nub (values), [1, 2])
  assert.deepStrictEqual (values, [1, 1, 2])
})

test ('nubBy: removes duplicates using the supplied comparison, keeping the first occurrence', () => {
  const sameParity = (a: number, b: number) => a % 2 === b % 2

  assert.deepStrictEqual (nubBy (sameParity) ([1, 2, 3, 4]), [1, 2])
  assert.deepStrictEqual (nubBy (sameParity) ([]), [])
  assert.deepStrictEqual (
    nubBy ((a: number, b: number) => Math.abs (a) === Math.abs (b)) ([1, -1, 2]),
    [1, 2],
  )
})

test ('array: handles empty arrays or passes the first value and remaining tail to a callback', () => {
  function keepHead(h: number) {
    return (_t: number[]) => just (h)
  }

  const head = array (nothing<number> ()) (keepHead)

  function keepTail(_h: number) {
    return (t: number[]) => just (t)
  }

  const tail = array (nothing<number[]> ()) (keepTail)

  assert.deepStrictEqual (head ([]), nothing ())
  assert.deepStrictEqual (head ([1, 2, 3]), just (1))
  assert.deepStrictEqual (tail ([]), nothing ())
  assert.deepStrictEqual (tail ([1, 2, 3]), just ([2, 3]))

  function showHead(h: number) {
    return (_t: number[]) => String (h)
  }

  assert.deepStrictEqual (array ('e') (showHead) ([]), 'e')
  assert.deepStrictEqual (
    array ('e') (showHead) ([1, 2]),
    '1',
  )
})

test ('array: the empty branch does not evaluate the tail', () => {
  const boom = (_h: number) => (_t: number[]): string => {
    throw new Error ('should not have been called')
  }

  assert.deepStrictEqual (array ('empty') (boom) ([]), 'empty')
  assert.throws (() => array ('empty') (boom) ([1]))
})

test ('takeWhile: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  takeWhile (recordArguments) ([1, 2, 3])

  assert.deepStrictEqual (calls, [[1], [2], [3]])
})

test ('dropWhile: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return false
  }

  dropWhile (recordArguments) ([1, 2, 3])

  assert.deepStrictEqual (calls, [[1]])
})

test ('find: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return false
  }

  find (recordArguments) ([1, 2, 3])

  assert.deepStrictEqual (calls, [[1], [2], [3]])
})

test ('findIndex: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return false
  }

  findIndex (recordArguments) ([1, 2, 3])

  assert.deepStrictEqual (calls, [[1], [2], [3]])
})

test ('findMap: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return nothing<number> ()
  }

  findMap (recordArguments) ([1, 2, 3])

  assert.deepStrictEqual (calls, [[1], [2], [3]])
})

test ('unfold: passes only the seed', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return nothing<Pair<number, number>> ()
  }

  unfold (recordArguments) (0)

  assert.deepStrictEqual (calls, [[0]])
})

test ('unfoldr: passes only the seed', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return nothing<Pair<number, number>> ()
  }

  unfoldr (recordArguments) (0)

  assert.deepStrictEqual (calls, [[0]])
})

test ('groupBy: passes the group leader and candidate in separate calls', () => {
  const leaderCalls: unknown[][] = []
  const candidateCalls: unknown[][] = []

  function leader(...args: [number]) {
    leaderCalls.push (args)
    return candidate
  }

  function candidate(...args: [number]) {
    candidateCalls.push (args)
    return true
  }

  groupBy (leader) ([1, 2, 3])

  assert.deepStrictEqual (leaderCalls, [[1], [1]])
  assert.deepStrictEqual (candidateCalls, [[2], [3]])
})

test ('array: passes the head and tail in separate calls', () => {
  const headCalls: unknown[][] = []
  const tailCalls: unknown[][] = []

  function head(...args: [number]) {
    headCalls.push (args)
    return tail
  }

  function tail(...args: [number[]]) {
    tailCalls.push (args)
    return 0
  }

  array (0) (head) ([1, 2, 3])

  assert.deepStrictEqual (headCalls, [[1]])
  assert.deepStrictEqual (tailCalls, [[[2, 3]]])
})

test ('zipWith: passes one value from each array', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  zipWith (recordArguments) ([1, 2]) ([3, 4])

  assert.deepStrictEqual (calls, [[1, 3], [2, 4]])
})

test ('nubBy: passes the retained value and candidate', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return false
  }

  nubBy (recordArguments) ([1, 2])

  assert.deepStrictEqual (calls, [[1, 2]])
})

test ('Arr.map: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Arr.map ([1, 2], recordArguments)

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('Arr.filter: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  Arr.filter ([1, 2], recordArguments)

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('Arr.chain: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return [0]
  }

  Arr.chain ([1, 2], recordArguments)

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('Arr.ap: passes only the value to each function', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Arr.ap ([1, 2], [recordArguments])

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('Arr.chainRec: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return [done<number, number> (0)]
  }

  Arr.chainRec<number, number> (recordArguments, 0)

  assert.deepStrictEqual (calls, [[0]])
})

test ('Arr.reduce: passes only accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Arr.reduce ([1, 2], recordArguments, 0)

  assert.deepStrictEqual (calls, [[0, 1], [0, 2]])
})

test ('Arr.equals: a hole is not the same thing as undefined', () => {
  const holed = new Array<number> (2)
  holed[1] = 1

  assert.deepStrictEqual (Arr.equals (holed, [undefined, 1]), false)
  const alsoHoled = new Array<number> (2)
  alsoHoled[1] = 1

  assert.deepStrictEqual (Arr.equals (holed, alsoHoled), true)
})

test ('Arr.lte: an element with no order throws a descriptive TypeError', () => {
  assert.throws (
    () => Arr.lte ([{ a: 1 }], [{ a: 2 }]),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Ord'),
  )
})

test ('Arr.show: a hole prints as empty space', () => {
  const holed = new Array<number> (3)
  holed[0] = 1
  holed[2] = 3

  assert.deepStrictEqual (Arr.show (holed), '[1, , 3]')
})

test ('Arr.concat: does not touch the operands', () => {
  const a = [1, 2]
  const b = [3]
  Arr.concat (a, b)

  assert.deepStrictEqual ([a, b], [[1, 2], [3]])
})

test ('Arr.traverse: an applicative with no of throws a descriptive TypeError', () => {
  assert.throws (
    () =>
      traverse ({ '@@type': 'Number' } as never) (((n: number) => [n]) as never) (
        [1] as never,
      ),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Applicative'),
  )
})

test ('Arr.chainRec: the stack does not grow with depth', () => {
  assert.deepStrictEqual (
    Arr.chainRec<number, number> (
      (n) => n < 200000 ? [loop (n + 1)] : [done (n)],
      0,
    ),
    [200000],
  )
})

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const even = (n: number) => n % 2 === 0

const travMaybe = <A>(f: (a: A) => Maybe<A>) => (values: readonly A[]) =>
  traverse (MaybeRep) (f as never) (values as never) as Maybe<A[]>

const branch = (n: number): Step<number, string>[] =>
  n >= 3 ? [done (`leaf${n}`)] : [done (`d${n}`), loop (n + 1), loop (n + 10)]
