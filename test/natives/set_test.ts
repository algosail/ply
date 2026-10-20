import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alt } from '../../src/classes/alt.ts'
import { of } from '../../src/classes/applicative.ts'
import { ap } from '../../src/classes/apply.ts'
import { chain } from '../../src/classes/chain.ts'
import { filter, reject } from '../../src/classes/filterable.ts'
import { foldMap, reduce, size, toArray } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { empty } from '../../src/classes/monoid.ts'
import { lte } from '../../src/classes/ord.ts'
import { zero } from '../../src/classes/plus.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { equals } from '../../src/classes/setoid.ts'
import { show } from '../../src/classes/show.ts'
import { traverse } from '../../src/classes/traversable.ts'
import { just } from '../../src/data/maybe.ts'
import { Maybe } from '../../src/data/maybe.ts'
import { Concat } from '../../src/data/monoid.ts'
import { setDifference, setFromIterable, setMember, Sets } from '../../src/natives/set.ts'

test ("setFromIterable: creates a Set from an iterable, using JavaScript's usual set equality", () => {
  assert.deepStrictEqual (items (setFromIterable ([1, 2, 2])), [1, 2])
  assert.deepStrictEqual (items (setFromIterable ('ab')), ['a', 'b'])
  assert.deepStrictEqual (items (setFromIterable ([])), [])
  assert.deepStrictEqual (items (setFromIterable (new Map ([['a', 1]]))), [['a', 1]])
  assert.deepStrictEqual (items (setFromIterable ([3, 1, 3, 2])), [3, 1, 2])
})

test ('setFromIterable: dedupes by JS identity, not structurally', () => {
  assert.deepStrictEqual (items (setFromIterable ([[1], [1]])).length, 2)
  assert.deepStrictEqual (items (setFromIterable ([NaN, NaN])), [NaN])
})

test ('setDifference: returns values from the first set that have no equal value in the second', () => {
  assert.deepStrictEqual (items (setDifference (new Set ([1, 2])) (new Set ([1]))), [2])
  assert.deepStrictEqual (items (setDifference (new Set ([1, 2])) (new Set ([3]))), [1, 2])
  assert.deepStrictEqual (items (setDifference (new Set ([1])) (new Set ([1]))), [])
  assert.deepStrictEqual (items (setDifference (new Set<number> ()) (new Set ([1]))), [])
})

test ('setDifference: membership is structural', () => {
  assert.deepStrictEqual (
    items (setDifference (new Set ([[1], [2]])) (new Set ([[1]]))),
    [[2]],
  )
  assert.deepStrictEqual (
    items (setDifference (new Set ([just (1), just (2)])) (new Set ([just (1)]))),
    [just (2)],
  )
})

test ("setMember: checks whether a set contains an equal value using ply's equals", () => {
  assert.deepStrictEqual (setMember (1) (new Set ([1, 2])), true)
  assert.deepStrictEqual (setMember (3) (new Set ([1, 2])), false)
  assert.deepStrictEqual (setMember (1) (new Set<number> ()), false)
})

test ('setMember: membership is structural', () => {
  assert.deepStrictEqual (setMember ([1]) (new Set ([[1]])), true)
  assert.deepStrictEqual (setMember ([2]) (new Set ([[1]])), false)
  assert.deepStrictEqual (setMember (just (1)) (new Set ([just (1)])), true)
})

test ('Sets: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (Sets['@@type'], 'Set')
  assert.deepStrictEqual (Sets.is (new Set ()), true)
  assert.deepStrictEqual (Sets.is (new Set ([1])), true)
  assert.deepStrictEqual (Sets.is (new WeakSet ()), false)
  assert.deepStrictEqual (Sets.is (new Map ()), false)
  assert.deepStrictEqual (Sets.is ([1]), false)
  assert.deepStrictEqual (Sets.is (null), false)
})

test ('Sets.of: wraps a single value', () => {
  assert.deepStrictEqual (items (Sets.of (1)), [1])
  assert.deepStrictEqual (items (of (Sets) (7) as Set<number>), [7])
  assert.deepStrictEqual (items (Sets.of (new Set ([1]))), [new Set ([1])])
})

test ('Sets.show: formats values as readable strings', () => {
  assert.deepStrictEqual (Sets.show (new Set ()), 'Set ([])')
  assert.deepStrictEqual (Sets.show (new Set ([2, 1])), 'Set ([2, 1])')
  assert.deepStrictEqual (Sets.show (new Set ([just (1)])), 'Set ([Just (1)])')
})

test ('Sets.map: transforms values', () => {
  assert.deepStrictEqual (items (Sets.map (new Set ([1, 2, 3]), increment)), [2, 3, 4])
  assert.deepStrictEqual (items (Sets.map (new Set<number> (), increment)), [])
})

test ('Sets.map: identical images collapse', () => {
  assert.deepStrictEqual (items (Sets.map (new Set ([1, 2, 3]), () => 0)), [0])
})

test ('Sets.ap: applies every wrapped function to the wrapped values', () => {
  const ten = (n: number) => n * 10

  assert.deepStrictEqual (items (Sets.ap (new Set ([1, 2]), new Set ([increment, ten]))), [
    2,
    3,
    10,
    20,
  ])
  assert.deepStrictEqual (
    items (
      ap (new Set ([increment, ten])) (new Set ([1, 2])) as Set<
        number
      >,
    ),
    [2, 3, 10, 20],
  )
  assert.deepStrictEqual (
    items (Sets.ap (new Set ([1, 2]), new Set ([increment, doubleNumber]))),
    [2, 3, 4],
  )
  assert.deepStrictEqual (items (Sets.ap (new Set<number> (), new Set ([increment]))), [])
  assert.deepStrictEqual (
    items (Sets.ap (new Set ([1]), new Set<(a: number) => number> ())),
    [],
  )
})

test ('Sets.chain: transforms values and flattens the results', () => {
  function includeTenfold(n: number) {
    return new Set ([n, n * 10])
  }

  assert.deepStrictEqual (
    items (Sets.chain (new Set ([1, 2]), includeTenfold)),
    [1, 10, 2, 20],
  )
  assert.deepStrictEqual (
    items (
      chain ((n: number) => new Set ([n, n + 1])) (new Set ([1])) as Set<
        number
      >,
    ),
    [1, 2],
  )
  assert.deepStrictEqual (items (Sets.chain (new Set ([1]), () => new Set<number> ())), [])
})

test ('Sets.filter: keeps values that pass the predicate', () => {
  const s = new Set ([1, 2, 3, 4])

  assert.deepStrictEqual (items (Sets.filter (s, even)), [2, 4])
  assert.deepStrictEqual (items (filter (even) (s) as Set<number>), [2, 4])
  assert.deepStrictEqual (items (reject (even) (s) as Set<number>), [1, 3])
  assert.deepStrictEqual (items (Sets.filter (s, () => true)), items (s))
  assert.deepStrictEqual (items (Sets.filter (s, () => false)), [])
})

test ('Sets.map: passes only values to Number.parseInt', () => {
  assert.deepStrictEqual (items (Sets.map (new Set (['1', '2', '3']), Number.parseInt)), [
    1,
    2,
    3,
  ])
})

test ('map through the class does not confuse a Set with an array', () => {
  assert.deepStrictEqual (items (map (increment) (new Set ([1, 2])) as Set<number>), [2, 3])
  assert.deepStrictEqual (map (increment) ([1, 2]), [2, 3])
})

test ('map and filter: preserve the tested object-identity relationship', () => {
  const k1 = [1]
  const k2 = [1]
  const a = new Set ([k1, [2]])
  const b = new Set ([k2, [2]])
  const head = (values: number[]) => values[0]

  assertPreservesEquality ('map', a, b, (s) => Sets.map (s, head))
  assertPreservesEquality (
    'filter',
    a,
    b,
    (s) => Sets.filter (s, (values) => values[0] > 1),
  )
  assertPreservesEquality ('ap', a, b, (s) => Sets.ap (s, new Set ([head])))
  assertPreservesEquality (
    'chain',
    a,
    b,
    (s) => Sets.chain (s, (values) => new Set (values)),
  )
})

test ('Set.map: fresh object results can change the number of distinct values', () => {
  const zeroArr = [0]
  const s = new Set ([1, 2])

  const fresh = map ((): number[] => [0]) (s) as Set<unknown>
  const shared = map ((): number[] => zeroArr) (s) as Set<unknown>

  assert.deepStrictEqual (fresh.size, 2, 'different objects did not collapse')
  assert.deepStrictEqual (shared.size, 1, 'one and the same object collapsed')
  assert.deepStrictEqual ((fresh.size as number) === shared.size, false)

  assert.deepStrictEqual (
    (chain ((): Set<number[]> => new Set ([[0]])) (s) as Set<unknown>)
      .size ===
      (chain ((): Set<number[]> => new Set ([zeroArr])) (s) as Set<
        unknown
      >).size,
    false,
  )
  assert.deepStrictEqual (
    filter ((n: number) => n > 0) (s),
    filter ((n: number) => n > 0) (new Set ([2, 1])),
    'filter builds nothing and is therefore intact',
  )
})

test ('Set.show: distinct object identities can have the same printed value', () => {
  const a = new Set ([1, 2])
  const b = new Set ([2, 1])

  assert.deepStrictEqual (a, b)
  assert.deepStrictEqual (show (a), 'Set ([1, 2])')
  assert.deepStrictEqual (show (b), 'Set ([2, 1])')
})

test ('Sets: the dictionary holds exactly what is lawful', () => {
  assert.deepStrictEqual (opsOf (Sets), [
    'ap',
    'chain',
    'filter',
    'is',
    'map',
    'of',
    'show',
  ])
  for (const name of ['concat', 'empty', 'alt', 'zero', 'reduce']) {
    assert.deepStrictEqual (name in Sets, false, name)
  }
})

test ('Sets.map: the Functor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  const s = new Set ([1, 2, 3])

  assert.deepStrictEqual (items (Sets.map (s, (n: number) => n)), items (s))
  assert.deepStrictEqual (
    items (Sets.map (s, doubleThenIncrement)),
    items (Sets.map (Sets.map (s, doubleNumber), increment)),
  )
})

test ('Sets.ap: the Apply and Applicative laws', () => {
  const v = new Set ([1, 2])
  const u = new Set ([increment, doubleNumber])
  const w = new Set ([(n: number) => n + 10, (n: number) => n * 100])
  const compose =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f (g (a))

  assert.deepStrictEqual (items (Sets.ap (v, Sets.of ((a: number) => a))), items (v))
  assert.deepStrictEqual (
    items (Sets.ap (Sets.of (1), Sets.of (increment))),
    items (Sets.of (increment (1))),
  )
  assert.deepStrictEqual (
    items (Sets.ap (Sets.of (1), u)),
    items (Sets.ap (u, Sets.of ((f: (a: number) => number) => f (1)))),
  )
  assert.deepStrictEqual (
    items (Sets.ap (v, Sets.ap (w, Sets.map (u, compose)))),
    items (Sets.ap (Sets.ap (v, w), u)),
  )
})

test ('Sets.chain: the Monad laws', () => {
  function includeTenfold(n: number) {
    return new Set ([n, n * 10])
  }

  const m = new Set ([1, 2])
  const f = includeTenfold
  const g = (n: number) => new Set ([n + 1])

  assert.deepStrictEqual (
    items (Sets.chain (Sets.chain (m, f), g)),
    items (Sets.chain (m, (n: number) => Sets.chain (f (n), g))),
  )
  assert.deepStrictEqual (items (Sets.chain (Sets.of (1), f)), items (f (1)))
  assert.deepStrictEqual (items (Sets.chain (m, (n: number) => Sets.of (n))), items (m))
})

test ('Set: exposes no alt or zero operations', () => {
  const a = new Set ([1, 2])
  const b = new Set ([2, 3])
  const c = new Set ([3, 4])
  const z = new Set<number> ()

  assert.throws (
    () => alt (c as never) (alt (b as never) (a as never) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('alt: Set has no '),
  )
  assert.throws (
    () => alt (b as never) (a as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('alt: Set has no '),
  )
  assert.throws (
    () => alt (z as never) (a as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('alt: Set has no '),
  )
  assert.throws (
    () => alt (a as never) (z as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('alt: Set has no '),
  )
  assert.deepStrictEqual (items (Sets.map (z, increment)), [])
})

test ('setDifference: does not touch the operands', () => {
  const a = new Set ([1, 2])
  const b = new Set ([1])
  setDifference (a) (b)

  assert.deepStrictEqual (items (a), [1, 2])
  assert.deepStrictEqual (items (b), [1])
})

test ('Set inhabits neither Monoid nor Plus: there is no neutral element', () => {
  assert.deepStrictEqual ('empty' in Sets, false)
  assert.deepStrictEqual ('zero' in Sets, false)
  assert.throws (
    () => empty (Sets as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('empty: Set has no Monoid'),
  )
  assert.throws (
    () => zero (Sets as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('zero: Set has no Plus'),
  )
})

test ('Set does not support Foldable: there is no fold', () => {
  const s = new Set ([3, 1, 2])

  assert.throws (
    () =>
      reduce ((accumulator: number, a: number) => accumulator + a) (0) (
        s as never,
      ),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no '),
  )
  assert.throws (
    () =>
      reduce ((accumulator: string, a: number) => accumulator + a) ('') (
        s as never,
      ),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no '),
  )
  assert.throws (
    () =>
      reduce ((accumulator: number) => accumulator) (7) (
        new Set<number> () as never,
      ),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no '),
  )
})

test ('Set does not support Foldable: the derived rejects too', () => {
  const s = new Set ([3, 1, 2])

  assert.throws (
    () => toArray (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no '),
  )
  assert.throws (
    () => size (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no '),
  )
  assert.throws (
    () => foldMap (Concat) ((n: number) => `${n}`) (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no '),
  )
})

test ('Sets.map: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Sets.map (new Set ([1, 2]), recordArguments)

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('Sets.filter: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  Sets.filter (new Set ([1, 2]), recordArguments)

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('Sets.chain: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return new Set<number> ()
  }

  Sets.chain (new Set ([1, 2]), recordArguments)

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('Sets.ap: passes only the value to each function', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Sets.ap (new Set ([1, 2]), new Set ([recordArguments]))

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('reduce: rejects Set before calling the callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  assert.throws (
    () => reduce (recordArguments) (0) (new Set ([1, 2]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
  assert.deepStrictEqual (calls, [])
})

test ('Set inhabits neither Traversable nor Ord', () => {
  assert.throws (
    () =>
      traverse (Maybe as never) ((n: number) => just (n)) (new Set ([1]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('traverse: Set has no Traversable'),
  )
  assert.throws (
    () => lte (new Set ([1]) as never) (new Set ([2]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Ord'),
  )
})

test ('counterexample: merging structurally equal collections can expose object identity', () => {
  const k1 = [1]
  const k2 = [1]
  const a = new Set ([k1])
  const b = new Set ([k2])

  assert.deepStrictEqual (sameSet (a, b), true)

  const c = new Set ([k1])
  const union = (x: ReadonlySet<number[]>, y: ReadonlySet<number[]>) =>
    new Set ([...x, ...y])

  assert.deepStrictEqual (union (a, c).size, 1)
  assert.deepStrictEqual (union (b, c).size, 2)
  assert.deepStrictEqual (sameSet (union (a, c), union (b, c)), false)
})

test ('counterexample: folding structurally equal sets can expose insertion order', () => {
  const a = new Set ([1, 2])
  const b = new Set ([2, 1])

  assert.deepStrictEqual (sameSet (a, b), true)
  assert.deepStrictEqual (items (a), [1, 2])
  assert.deepStrictEqual (items (b), [2, 1])

  const fold = (s: ReadonlySet<number>) =>
    [...s].reduce ((accumulator: string, n: number) => accumulator + n, '')

  assert.deepStrictEqual (fold (a), '12')
  assert.deepStrictEqual (fold (b), '21')
  assert.deepStrictEqual (fold (a) === fold (b), false)
})

test ('map and filter: preserve the tested insertion-order relationship', () => {
  const a = new Set ([1, 2])
  const b = new Set ([2, 1])

  assertPreservesEquality ('map', a, b, (s) => Sets.map (s, increment))
  assertPreservesEquality ('filter', a, b, (s) => Sets.filter (s, even))
  assertPreservesEquality (
    'ap',
    a,
    b,
    (s) => Sets.ap (s, new Set ([increment, doubleNumber])),
  )
  assertPreservesEquality (
    'chain',
    a,
    b,
    (s) => Sets.chain (s, (n) => new Set ([n, n * 10])),
  )
})

test ('Set: exposes no concat or empty operations', () => {
  const a = new Set ([1, 2])
  const b = new Set ([2, 3])
  const c = new Set ([3, 4])
  const e = new Set<number> ()
  // @ts-expect-error associativity: concat has no overload for Set
  const _associativity = () => concat (concat (a) (b)) (c)
  // @ts-expect-error left unit: concat has no overload for Set
  const _leftUnit = () => concat (e) (a)
  // @ts-expect-error right unit: concat has no overload for Set
  const _rightUnit = () => concat (a) (e)
  void _associativity, _leftUnit, _rightUnit

  assert.throws (
    () => cat (cat (a, b), c),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Set has no '),
  )
  assert.throws (
    () => cat (e, a),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Set has no '),
  )
  assert.throws (
    () => cat (a, e),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Set has no '),
  )
})

test ('Set inhabits neither Semigroup nor Alt: there is no union', () => {
  const a = new Set ([1, 2])
  const b = new Set ([2, 3])
  // @ts-expect-error concat has no overload for Set
  const _1 = () => concat (a) (b)
  // @ts-expect-error concat has no overload for Set
  const _2 = () => concat (new Set ([1])) (new Set ([2]))
  // @ts-expect-error alt has no overload for Set
  const _3 = () => alt (b) (a)
  // @ts-expect-error alt has no overload for Set
  const _4 = () => alt (new Set ([2])) (new Set ([1]))
  void _1, _2, _3, _4

  assert.throws (
    () => cat (a, b),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Set has no '),
  )
  assert.throws (
    () => cat (new Set ([1]), new Set ([2])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Set has no '),
  )
  assert.throws (
    () => alt (b as never) (a as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('alt: Set has no '),
  )
  assert.throws (
    () => alt (new Set ([2]) as never) (new Set ([1]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('alt: Set has no '),
  )
})

test ('concat over sets rejects without touching the operands', () => {
  const a = new Set ([1])
  const b = new Set ([2])
  // @ts-expect-error concat has no overload for Set
  const _call = () => concat (a) (b)
  void _call

  assert.throws (
    () => cat (a, b),
    (error: unknown) => error instanceof TypeError && error.message.includes ('concat: Set has no '),
  )
  assert.deepStrictEqual (items (a), [1])
  assert.deepStrictEqual (items (b), [2])
})

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const even = (n: number) => n % 2 === 0

const items = <A>(s: ReadonlySet<A>): A[] => [...s]

const opsOf = (dict: object): string[] =>
  Object.keys (dict).filter ((k) => k !== '@@type' && k !== '_shape').sort ()

const cat = (a: unknown, b: unknown): unknown => concat (a as never) (b as never)

const sameSet = <A>(a: ReadonlySet<A>, b: ReadonlySet<A>): boolean => {
  if (a.size !== b.size) return false
  const rest = [...b]
  for (const x of a) {
    const i = rest.findIndex ((y) => equals (y as never) (x as never))
    if (i < 0) return false
    rest.splice (i, 1)
  }
  return true
}

const assertPreservesEquality = <A, B>(
  name: string,
  a: Set<A>,
  b: Set<A>,
  f: (s: Set<A>) => Set<B>,
) => {
  assert.deepStrictEqual (
    sameSet (a, b),
    true,
    `${name}: the input collections must be equal`,
  )
  assert.deepStrictEqual (sameSet (f (a), f (b)), true, name)
}
