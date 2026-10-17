import { test } from 'node:test'
import { assertEquals, assertThrows } from '../assert.ts'
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
import { just, type Maybe, Maybe as MaybeRep, nothing } from '../../src/data/maybe.ts'
import { type Pair, pair } from '../../src/data/pair.ts'
import {
  type Either,
  Either as EitherRep,
  left,
  right,
} from '../../src/data/either.ts'
import { Identity, identity } from '../../src/data/identity.ts'
import { done, loop, type Step } from '../../src/classes/chainrec.ts'
import { sequence, traverse } from '../../src/classes/traversable.ts'

test ('fromIterable: copies an iterable into an array', () => {
  assertEquals (fromIterable ('ab'), ['a', 'b'])
  assertEquals (fromIterable (new Set ([1, 1, 2])), [1, 2])
  assertEquals (fromIterable (new Map ([['a', 1]])), [['a', 1]])
  assertEquals (fromIterable ([1, 2]), [1, 2])
  assertEquals (fromIterable (new Set<number> ()), [])
})

test ('fromIterable: drains the iterator exactly once', () => {
  function* counted() {
    yield 1
    yield 2
    yield 3
  }

  assertEquals (fromIterable (counted ()), [1, 2, 3])
})

test ('range: creates consecutive integers from start up to, but excluding, end', () => {
  assertEquals (range (0) (5), [0, 1, 2, 3, 4])
  assertEquals (range (-5) (0), [-5, -4, -3, -2, -1])
  assertEquals (range (3) (3), [])
  assertEquals (range (5) (1), [])
})

test ('takeWhile: keeps the leading values that pass the predicate', () => {
  const odd = (n: number) => n % 2 !== 0

  assertEquals (takeWhile (odd) ([3, 3, 3, 7, 6, 3, 5, 4]), [3, 3, 3, 7])
  assertEquals (takeWhile (odd) ([]), [])
  assertEquals (takeWhile (odd) ([2, 4]), [])
  assertEquals (takeWhile (odd) ([1, 3]), [1, 3])
})

test ('dropWhile: removes the leading values that pass the predicate', () => {
  const odd = (n: number) => n % 2 !== 0

  assertEquals (dropWhile (odd) ([3, 3, 3, 7, 6, 3, 5, 4]), [6, 3, 5, 4])
  assertEquals (dropWhile (odd) ([]), [])
  assertEquals (dropWhile (odd) ([2, 4]), [2, 4])
  assertEquals (dropWhile (odd) ([1, 3]), [])
})

test ('takeWhile and dropWhile cut the array at exactly one point', () => {
  const values = [1, 3, 5, 2, 7, 4]
  for (const p of [even, (n: number) => n < 5, () => true, () => false]) {
    assertEquals ([...takeWhile (p) (values), ...dropWhile (p) (values)], values)
  }
})

test ('takeWhile and dropWhile do not touch the input', () => {
  const values = [1, 2, 3]
  takeWhile (even) (values)
  dropWhile (even) (values)

  assertEquals (values, [1, 2, 3])
})

test ('chunksOf: splits an array into chunks of at most n values', () => {
  assertEquals (chunksOf (2) ([1, 2, 3, 4, 5]), [[1, 2], [3, 4], [5]])
  assertEquals (chunksOf (2) ([1, 2, 3, 4]), [[1, 2], [3, 4]])
  assertEquals (chunksOf (1) ([1, 2]), [[1], [2]])
  assertEquals (chunksOf (5) ([1, 2]), [[1, 2]])
  assertEquals (chunksOf (2) ([]), [])
})

test ('find: returns the first matching value as Just, or Nothing if none match', () => {
  assertEquals (find (even) ([1, 2, 3, 4]), just (2))
  assertEquals (find (even) ([1, 3]), nothing ())
  assertEquals (find (even) ([]), nothing ())
  assertEquals (find ((n: number) => n > 1) ([1, 2, 3]), just (2))
})

test ('find: stops at the first hit', () => {
  const seen: number[] = []

  function recordAndFindTwo(n: number) {
    seen.push (n)
    return n === 2
  }

  find (recordAndFindTwo) ([1, 2, 3, 4])

  assertEquals (seen, [1, 2])
})

test ('findIndex: returns the zero-based index of the first match as Just', () => {
  assertEquals (findIndex (even) ([1, 2, 3, 4]), just (1))
  assertEquals (findIndex (even) ([2]), just (0))
  assertEquals (findIndex (even) ([1, 3]), nothing ())
  assertEquals (findIndex (even) ([]), nothing ())
})

test ('findMap: returns the first successful result', () => {
  const half = (n: number) => even (n) ? just (n / 2) : nothing<number> ()

  assertEquals (findMap (half) ([1, 3, 4, 6]), just (2))
  assertEquals (findMap (half) ([1, 3]), nothing ())
  assertEquals (findMap (half) ([]), nothing ())
})

test ('findMap: does not call the function after the first Just', () => {
  const seen: number[] = []

  function recordAndMatchTwo(n: number) {
    seen.push (n)
    return n === 2 ? just ('yes') : nothing<string> ()
  }

  findMap (recordAndMatchTwo) ([1, 2, 3])

  assertEquals (seen, [1, 2])
})

test ('index: returns the value at a zero-based index as Just', () => {
  assertEquals (index (0) ([1, 2, 3]), just (1))
  assertEquals (index (2) ([1, 2, 3]), just (3))
  assertEquals (index (3) ([1, 2, 3]), nothing ())
  assertEquals (index (-1) ([1, 2, 3]), nothing ())
  assertEquals (index (0) ([]), nothing ())
})

test ('zipWith: combines corresponding values up to the shorter length', () => {
  assertEquals (zipWith ((a: number, b: number) => a + b) ([1, 2]) ([10, 20]), [
    11,
    22,
  ])
  assertEquals (zipWith ((a: number, b: number) => a + b) ([1, 2, 3]) ([10]), [11])
  assertEquals (zipWith ((a: number, b: number) => a + b) ([]) ([10]), [])
  assertEquals (
    zipWith ((a: number, b: string) => `${a}${b}`) ([1, 2]) (['a', 'b']),
    ['1a', '2b'],
  )
})

test ('zip: pairs corresponding values up to the shorter length', () => {
  assertEquals (zip ([1, 2]) (['a', 'b']), [[1, 'a'], [2, 'b']])
  assertEquals (zip ([1, 2, 3]) (['a']), [[1, 'a']])
  assertEquals (zip<number> ([]) (['a']), [])
})

test ('unfold: builds an array by repeatedly applying a function to a seed', () => {
  function doubleUntilThousand(n: number) {
    return n < 1000 ? just (pair (n, 2 * n)) : nothing<Pair<number, number>> ()
  }

  assertEquals (
    unfold (doubleUntilThousand) (1),
    [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
  )
  assertEquals (unfold ((_n: number) => nothing<Pair<number, number>> ()) (1), [])
})

test ('unfoldr: builds an array from a seed. Alias of unfold', () => {
  function countUpToFive(n: number) {
    return n < 5 ? just (pair (n, n + 1)) : nothing<Pair<number, number>> ()
  }

  assertEquals (
    unfoldr (countUpToFive) (1),
    [1, 2, 3, 4],
  )
})

test ('unfold and unfoldr are one operation under two names', () => {
  const step = (n: number) =>
    n < 6 ? just (pair (n * n, n + 1)) : nothing<Pair<number, number>> ()
  for (const seed of [0, 1, 5, 6, 100]) {
    assertEquals (unfold (step) (seed), unfoldr (step) (seed))
  }
})

test ('groupBy: groups consecutive values that match the first value in each group', () => {
  function sameNumber(a: number) {
    return (b: number) => a === b
  }

  assertEquals (
    groupBy (sameNumber) ([1, 1, 2, 1, 1]),
    [[1, 1], [2], [1, 1]],
  )
  assertEquals (groupBy (sameNumber) ([]), [])
  assertEquals (groupBy (sameNumber) ([1]), [[1]])
})

test ('groupBy: compares against the group leader, not against the neighbour', () => {
  function oppositeNumbers(a: number) {
    return (b: number) => a + b === 0
  }

  assertEquals (
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

  assertEquals (
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
    assertEquals (groupBy (same) (values).flat (), values)
  }
})

test ('Arr.map: passes no array index to Number.parseInt', () => {
  assertEquals (['1', '2', '3'].map (Number.parseInt), [1, NaN, NaN])
  assertEquals (Arr.map (['1', '2', '3'], Number.parseInt), [1, 2, 3])
})

test ('Arr: recognizes values and provides the declared operations', () => {
  assertEquals (Arr['@@type'], 'Array')
  assertEquals (Arr.is ([]), true)
  assertEquals (Arr.is ([1, 2]), true)
  assertEquals (Arr.is ('string'), false)
  assertEquals (Arr.is (new Set ([1])), false)
  assertEquals (Arr.is ({ length: 0 }), false)
  assertEquals (Arr.is (null), false)
})

test ('Arr.of: wraps a single value', () => {
  assertEquals (Arr.of (1), [1])
  assertEquals (Arr.of ([1, 2]), [[1, 2]])
})

test ('Arr.empty and Arr.zero', () => {
  assertEquals (Arr.empty (), [])
  assertEquals (Arr.zero (), [])
  assertEquals (Arr.empty<number> () === Arr.empty<number> (), false)
  assertEquals (Arr.zero<number> () === Arr.zero<number> (), false)
})

test ('Arr.equals: compares values by content', () => {
  assertEquals (Arr.equals ([], []), true)
  assertEquals (Arr.equals ([1, 2], [1, 2]), true)
  assertEquals (Arr.equals ([1, 2], [2, 1]), false)
  assertEquals (Arr.equals ([1], [1, 2]), false)
  assertEquals (Arr.equals ([[1], [2]], [[1], [2]]), true)
  assertEquals (Arr.equals ([{ a: [1] }], [{ a: [1] }]), true)
  assertEquals (Arr.equals ([{ a: 1 }], [{ a: 1 }]), true)
  assertEquals (Arr.equals ([{ a: 1 }], [{ a: 2 }]), false)
})

test ('Arr.lte: lexicographic order', () => {
  assertEquals (Arr.lte ([1, 1], [1, 2]), true)
  assertEquals (Arr.lte ([1, 2], [1, 1]), false)
  assertEquals (Arr.lte ([1], [1, 2]), true)
  assertEquals (Arr.lte ([1, 2], [1]), false)
  assertEquals (Arr.lte ([], []), true)
  assertEquals (Arr.lte ([], [1]), true)
  assertEquals (Arr.lte ([2], [1, 5]), false)
  assertEquals (Arr.lte ([1, 5], [2]), true)
  assertEquals (Arr.lte (['a', 'b'], ['a', 'c']), true)
})

test ('Arr.show: formats values as readable strings', () => {
  assertEquals (Arr.show ([]), '[]')
  assertEquals (Arr.show ([1, 2, 3]), '[1, 2, 3]')
  assertEquals (Arr.show ([1, 'a', [2]]), '[1, "a", [2]]')
  assertEquals (Arr.show ([true, null, undefined]), '[true, null, undefined]')
})

test ('Arr.concat: combines values in argument order', () => {
  assertEquals (Arr.concat ([1, 2], [3, 4]), [1, 2, 3, 4])
  assertEquals (Arr.concat ([], [1]), [1])
  assertEquals (Arr.concat ([1], []), [1])
})

test ('Arr.alt: combines alternatives', () => {
  assertEquals (Arr.alt ([1, 2], [3]), [1, 2, 3])
  assertEquals (Arr.alt ([], [3]), [3])
  assertEquals (Arr.alt ([1], []), [1])
  assertEquals (Arr.alt ([1, 2], [3]), Arr.concat ([1, 2], [3]))
})

test ('Arr.map: transforms values', () => {
  assertEquals (Arr.map ([1, 2, 3], increment), [2, 3, 4])
  assertEquals (Arr.map ([], increment), [])
})

test ('Arr.ap: applies every wrapped function to the wrapped values', () => {
  assertEquals (Arr.ap ([1, 2], [increment]), [2, 3])
  assertEquals (Arr.ap ([1, 2], []), [])
  assertEquals (Arr.ap ([], [increment]), [])
})

test ('Arr.ap: functions are the outer loop, values the inner one', () => {
  assertEquals (Arr.ap ([1, 2], [(n: number) => n, (n: number) => -n]), [
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

  assertEquals (Arr.chain ([1, 2], repeatNumber), [1, 1, 2, 2])
  assertEquals (Arr.chain ([1, 2], (_n: number) => []), [])
  assertEquals (Arr.chain ([], (n: number) => [n]), [])
  assertEquals (Arr.chain ([1], (n: number) => [[n]]), [[1]])
})

test ('Arr.filter: keeps values that pass the predicate', () => {
  assertEquals (Arr.filter ([1, 2, 3, 4], even), [2, 4])
  assertEquals (Arr.filter ([1, 3], even), [])
  assertEquals (Arr.filter ([], even), [])
})

test ('Arr.reduce: combines values with an initial accumulator', () => {
  assertEquals (
    Arr.reduce (
      [1, 2, 3],
      (accumulator: number, n: number) => accumulator + n,
      0,
    ),
    6,
  )
  assertEquals (
    Arr.reduce ([], (accumulator: number, n: number) => accumulator + n, 0),
    0,
  )
  assertEquals (
    Arr.reduce (
      ['a', 'b', 'c'],
      (accumulator: string, s: string) => accumulator + s,
      '',
    ),
    'abc',
  )
  assertEquals (
    Arr.reduce (
      [1, 2, 3],
      (accumulator: string, n: number) => `(${accumulator} ${n})`,
      '0',
    ),
    '(((0 1) 2) 3)',
  )
})

test ('Arr.traverse: collects wrapped results', () => {
  assertEquals (travMaybe ((n: number) => just (n)) ([1, 2, 3]), just ([1, 2, 3]))
  assertEquals (travMaybe ((n: number) => just (n)) ([]), just ([]))
  assertEquals (
    travMaybe ((n: number) => n < 3 ? just (n) : nothing<number> ()) ([1, 2, 3]),
    nothing (),
  )
})

test ('Arr.traverse: the accumulator is the first operand of ap', () => {
  assertEquals (sequence (Arr) ([[1, 2], [3, 4]]) as number[][], [
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
  ])
  const triple = sequence (Arr) ([[1, 2], [3, 4], [5, 6]]) as number[][]

  assertEquals (triple.length, 8)
  assertEquals (triple[0], [1, 3, 5])
  assertEquals (triple[1], [1, 3, 6])
  assertEquals (triple[7], [2, 4, 6])
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

    assertEquals (
      got.match ((e: string) => e, () => 'there was no refusal'),
      want,
    )
  }
})

test ('Arr.chainRec: repeats loop steps until done', () => {
  assertEquals (Arr.chainRec<number, number> ((n) => [done (n + 1)], 0), [1])
  assertEquals (
    Arr.chainRec<number, number> ((n) => n < 3 ? [loop (n + 1)] : [done (n)], 0),
    [3],
  )
  assertEquals (Arr.chainRec<number, number> (() => [], 0), [])
})

test ('Arr.chainRec: the order matches recursion through chain', () => {
  const viaChain = (n: number): string[] =>
    branch (n).flatMap ((s) => s.tag === 'done' ? [s.value] : viaChain (s.value))

  assertEquals (Arr.chainRec (branch, 0), viaChain (0))
  assertEquals (Arr.chainRec (branch, 0), [
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

  assertEquals (values, [1, 2, 3])

  const none = dropWhile (() => false) (values)
  none.push (99)

  assertEquals (values, [1, 2, 3])
})

test ('groupBy calls the predicate as same(leader)(candidate)', () => {
  const notLess = (leader: number) => (x: number) => x >= leader

  assertEquals (groupBy (notLess) ([3, 1, 4, 1]), [[3], [1, 4, 1]])
})

test ('nubBy calls the relation as same(kept, candidate)', () => {
  const less = (kept: number, candidate: number) => kept < candidate

  assertEquals (nubBy (less) ([3, 1, 5]), [3, 1])
})

test ('Arr.equals: Setoid laws', () => {
  const probes = [[], [1], [1, 2], [2, 1], [[1], [2]], [{
    a: 1,
  }]] as unknown[][]
  for (const a of probes) assertEquals (Arr.equals (a, a), true)
  for (const a of probes) {
    for (const b of probes) {
      assertEquals (Arr.equals (a, b), Arr.equals (b, a))
      for (const c of probes) {
        if (Arr.equals (a, b) && Arr.equals (b, c)) {
          assertEquals (Arr.equals (a, c), true)
        }
      }
    }
  }
})

test ('Arr.lte: Ord laws', () => {
  const probes = [[], [1], [1, 1], [1, 2], [2], [2, 0]]
  for (const a of probes) {
    for (const b of probes) {
      assertEquals (Arr.lte (a, b) || Arr.lte (b, a), true)
      if (Arr.lte (a, b) && Arr.lte (b, a)) assertEquals (Arr.equals (a, b), true)
      for (const c of probes) {
        if (Arr.lte (a, b) && Arr.lte (b, c)) {
          assertEquals (Arr.lte (a, c), true)
        }
      }
    }
  }
})

test ('Arr.concat: Semigroup and Monoid laws', () => {
  const a = [1, 2]
  const b = [3]
  const c = [4, 5]

  assertEquals (Arr.concat (Arr.concat (a, b), c), Arr.concat (a, Arr.concat (b, c)))
  assertEquals (Arr.concat (Arr.empty<number> (), a), a)
  assertEquals (Arr.concat (a, Arr.empty<number> ()), a)
})

test ('Arr.alt: Alt and Plus laws', () => {
  const a = [1, 2]
  const b = [3]
  const c = [4]

  assertEquals (Arr.alt (Arr.alt (a, b), c), Arr.alt (a, Arr.alt (b, c)))
  assertEquals (
    Arr.map (Arr.alt (a, b), increment),
    Arr.alt (Arr.map (a, increment), Arr.map (b, increment)),
  )
  assertEquals (Arr.alt (Arr.zero<number> (), a), a)
  assertEquals (Arr.alt (a, Arr.zero<number> ()), a)
  assertEquals (Arr.map (Arr.zero<number> (), increment), [])
})

test ('Arr.map: Functor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  const values = [1, 2, 3]

  assertEquals (Arr.map (values, (n: number) => n), values)
  assertEquals (
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

  assertEquals (
    Arr.ap (w, Arr.ap (v, Arr.map (u, compose))),
    Arr.ap (Arr.ap (w, v), u),
  )
})

test ('Arr.of and Arr.ap: Applicative laws', () => {
  const v = [1, 2, 3]
  const f = increment
  const y = 7
  const u = [increment, doubleNumber]

  assertEquals (Arr.ap (v, Arr.of ((a: number) => a)), v)
  assertEquals (Arr.ap (Arr.of (y), Arr.of (f)), Arr.of (f (y)))
  assertEquals (
    Arr.ap (Arr.of (y), u),
    Arr.ap (u, Arr.of ((g: (n: number) => number) => g (y))),
  )
})

test ('Arr.chain: Chain and Monad laws', () => {
  const m = [1, 2, 3]
  const f = (n: number) => [n, n * 10]
  const g = (n: number) => [n + 1]

  assertEquals (
    Arr.chain (Arr.chain (m, f), g),
    Arr.chain (m, (x: number) => Arr.chain (f (x), g)),
  )
  assertEquals (Arr.chain (Arr.of (1), f), f (1))
  assertEquals (Arr.chain (m, (a: number) => Arr.of (a)), m)
})

test ('Arr.filter: Filterable laws', () => {
  const v = [1, 2, 3, 4, 5]
  const p = even
  const q = (n: number) => n > 2

  assertEquals (
    Arr.filter (v, (x: number) => p (x) && q (x)),
    Arr.filter (Arr.filter (v, p), q),
  )
  assertEquals (Arr.filter (v, () => true), v)
  assertEquals (Arr.filter (v, () => false), Arr.filter ([9, 9], () => false))
})

test ('Arr.traverse: identity law', () => {
  assertEquals (
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

    assertEquals (
      t (travMaybe (f) (values)),
      traverse (Arr) ((n: number) => tf (f (n))) (values) as number[][],
    )
  }
})

test ('chunksOf: a non-positive or fractional step is refused', () => {
  for (const bad of [0, -1, 2.5, NaN, Infinity]) {
    assertThrows (
      () => chunksOf (bad) ([1, 2, 3]),
      TypeError,
      'chunksOf:',
      String (bad),
    )
  }

  assertThrows (() => chunksOf (0), TypeError, 'is not an integer >= 1')
})

test ('index: a fractional index is refused instead of giving Just (undefined)', () => {
  assertThrows (() => index (1.5), TypeError, 'index: 1.5 is not an integer')
  assertThrows (() => index (NaN), TypeError, 'is not an integer')
  assertEquals (index (-1) ([1, 2]), nothing ())
  assertEquals (index (99) ([1, 2]), nothing ())
  assertEquals (index (0) ([1, 2]), just (1))
})

test ("nub: removes duplicates using ply's equals, keeping the first occurrence", () => {
  assertEquals (nub ([1, 1, 2, 1, 3]), [1, 2, 3])
  assertEquals (nub ([]), [])
  assertEquals (nub ([3, 1, 3, 2, 1]), [3, 1, 2])
  assertEquals (nub ([[1], [1], [2]]), [[1], [2]])
  assertEquals (nub ([{ a: 1 }, { a: 1 }]), [{ a: 1 }])
})

test ('nub: does not touch the input', () => {
  const values = [1, 1, 2]

  assertEquals (nub (values), [1, 2])
  assertEquals (values, [1, 1, 2])
})

test ('nubBy: removes duplicates using the supplied comparison, keeping the first occurrence', () => {
  const sameParity = (a: number, b: number) => a % 2 === b % 2

  assertEquals (nubBy (sameParity) ([1, 2, 3, 4]), [1, 2])
  assertEquals (nubBy (sameParity) ([]), [])
  assertEquals (
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

  assertEquals (head ([]), nothing ())
  assertEquals (head ([1, 2, 3]), just (1))
  assertEquals (tail ([]), nothing ())
  assertEquals (tail ([1, 2, 3]), just ([2, 3]))

  function showHead(h: number) {
    return (_t: number[]) => String (h)
  }

  assertEquals (array ('e') (showHead) ([]), 'e')
  assertEquals (
    array ('e') (showHead) ([1, 2]),
    '1',
  )
})

test ('array: the empty branch does not evaluate the tail', () => {
  const boom = (_h: number) => (_t: number[]): string => {
    throw new Error ('should not have been called')
  }

  assertEquals (array ('empty') (boom) ([]), 'empty')
  assertThrows (() => array ('empty') (boom) ([1]))
})

test ('takeWhile: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  takeWhile (recordArguments) ([1, 2, 3])

  assertEquals (calls, [[1], [2], [3]])
})

test ('dropWhile: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return false
  }

  dropWhile (recordArguments) ([1, 2, 3])

  assertEquals (calls, [[1]])
})

test ('find: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return false
  }

  find (recordArguments) ([1, 2, 3])

  assertEquals (calls, [[1], [2], [3]])
})

test ('findIndex: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return false
  }

  findIndex (recordArguments) ([1, 2, 3])

  assertEquals (calls, [[1], [2], [3]])
})

test ('findMap: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return nothing<number> ()
  }

  findMap (recordArguments) ([1, 2, 3])

  assertEquals (calls, [[1], [2], [3]])
})

test ('unfold: passes only the seed', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return nothing<Pair<number, number>> ()
  }

  unfold (recordArguments) (0)

  assertEquals (calls, [[0]])
})

test ('unfoldr: passes only the seed', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return nothing<Pair<number, number>> ()
  }

  unfoldr (recordArguments) (0)

  assertEquals (calls, [[0]])
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

  assertEquals (leaderCalls, [[1], [1]])
  assertEquals (candidateCalls, [[2], [3]])
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

  assertEquals (headCalls, [[1]])
  assertEquals (tailCalls, [[[2, 3]]])
})

test ('zipWith: passes one value from each array', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  zipWith (recordArguments) ([1, 2]) ([3, 4])

  assertEquals (calls, [[1, 3], [2, 4]])
})

test ('nubBy: passes the retained value and candidate', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return false
  }

  nubBy (recordArguments) ([1, 2])

  assertEquals (calls, [[1, 2]])
})

test ('Arr.map: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Arr.map ([1, 2], recordArguments)

  assertEquals (calls, [[1], [2]])
})

test ('Arr.filter: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  Arr.filter ([1, 2], recordArguments)

  assertEquals (calls, [[1], [2]])
})

test ('Arr.chain: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return [0]
  }

  Arr.chain ([1, 2], recordArguments)

  assertEquals (calls, [[1], [2]])
})

test ('Arr.ap: passes only the value to each function', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Arr.ap ([1, 2], [recordArguments])

  assertEquals (calls, [[1], [2]])
})

test ('Arr.chainRec: passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return [done<number, number> (0)]
  }

  Arr.chainRec<number, number> (recordArguments, 0)

  assertEquals (calls, [[0]])
})

test ('Arr.reduce: passes only accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Arr.reduce ([1, 2], recordArguments, 0)

  assertEquals (calls, [[0, 1], [0, 2]])
})

test ('Arr.equals: a hole is not the same thing as undefined', () => {
  const holed = new Array<number> (2)
  holed[1] = 1

  assertEquals (Arr.equals (holed, [undefined, 1]), false)
  const alsoHoled = new Array<number> (2)
  alsoHoled[1] = 1

  assertEquals (Arr.equals (holed, alsoHoled), true)
})

test ('Arr.lte: an element with no order throws a descriptive TypeError', () => {
  assertThrows (
    () => Arr.lte ([{ a: 1 }], [{ a: 2 }]),
    TypeError,
    'has no Ord',
  )
})

test ('Arr.show: a hole prints as empty space', () => {
  const holed = new Array<number> (3)
  holed[0] = 1
  holed[2] = 3

  assertEquals (Arr.show (holed), '[1, , 3]')
})

test ('Arr.concat: does not touch the operands', () => {
  const a = [1, 2]
  const b = [3]
  Arr.concat (a, b)

  assertEquals ([a, b], [[1, 2], [3]])
})

test ('Arr.traverse: an applicative with no of throws a descriptive TypeError', () => {
  assertThrows (
    () =>
      traverse ({ '@@type': 'Number' } as never) (((n: number) => [n]) as never) (
        [1] as never,
      ),
    TypeError,
    'has no Applicative',
  )
})

test ('Arr.chainRec: the stack does not grow with depth', () => {
  assertEquals (
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
