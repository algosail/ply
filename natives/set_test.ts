import { assertEquals, assertThrows } from '@std/assert'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'
import { setDifference, setFromIterable, setMember, Sets } from './set.ts'
import { just } from '../data/maybe.ts'
import { Maybe } from '../data/maybe.ts'
import { concat } from '../classes/semigroup.ts'
import { empty } from '../classes/monoid.ts'
import { alt } from '../classes/alt.ts'
import { zero } from '../classes/plus.ts'
import { of } from '../classes/applicative.ts'
import { ap } from '../classes/apply.ts'
import { chain } from '../classes/chain.ts'
import { filter, reject } from '../classes/filterable.ts'
import { foldMap, reduce, size, toArray } from '../classes/foldable.ts'
import { map } from '../classes/functor.ts'
import { lte } from '../classes/ord.ts'
import { traverse } from '../classes/traversable.ts'
import { Concat } from '../data/monoid.ts'

// Examples

Deno.test("setFromIterable: creates a Set from an iterable, using JavaScript's usual set equality", () => {
  assertEquals(items(setFromIterable([1, 2, 2])), [1, 2])
  assertEquals(items(setFromIterable('ab')), ['a', 'b'])
  assertEquals(items(setFromIterable([])), [])
  assertEquals(items(setFromIterable(new Map([['a', 1]]))), [['a', 1]])
  assertEquals(items(setFromIterable([3, 1, 3, 2])), [3, 1, 2])
})

Deno.test('setFromIterable: dedupes by JS identity, not structurally', () => {
  assertEquals(items(setFromIterable([[1], [1]])).length, 2)
  assertEquals(items(setFromIterable([NaN, NaN])), [NaN])
})

Deno.test('setDifference: returns values from the first set that have no equal value in the second', () => {
  assertEquals(items(setDifference(new Set([1, 2]), new Set([1]))), [2])
  assertEquals(items(setDifference(new Set([1, 2]), new Set([3]))), [1, 2])
  assertEquals(items(setDifference(new Set([1]), new Set([1]))), [])
  assertEquals(items(setDifference(new Set<number>(), new Set([1]))), [])
})

Deno.test('setDifference: membership is structural', () => {
  assertEquals(
    items(setDifference(new Set([[1], [2]]), new Set([[1]]))),
    [[2]],
  )
  assertEquals(
    items(setDifference(new Set([just(1), just(2)]), new Set([just(1)]))),
    [just(2)],
  )
})

Deno.test("setMember: checks whether a set contains an equal value using ply's equals", () => {
  assertEquals(setMember(1)(new Set([1, 2])), true)
  assertEquals(setMember(3)(new Set([1, 2])), false)
  assertEquals(setMember(1)(new Set<number>()), false)
})

Deno.test('setMember: membership is structural', () => {
  assertEquals(setMember([1])(new Set([[1]])), true)
  assertEquals(setMember([2])(new Set([[1]])), false)
  assertEquals(setMember(just(1))(new Set([just(1)])), true)
})

Deno.test('Sets: recognizes values and provides the declared operations', () => {
  assertEquals(Sets['@@type'], 'Set')
  assertEquals(Sets.is(new Set()), true)
  assertEquals(Sets.is(new Set([1])), true)
  assertEquals(Sets.is(new WeakSet()), false)
  assertEquals(Sets.is(new Map()), false)
  assertEquals(Sets.is([1]), false)
  assertEquals(Sets.is(null), false)
})

Deno.test('Sets.of: wraps a single value', () => {
  assertEquals(items(Sets.of(1)), [1])
  assertEquals(items(of(Sets)(7) as Set<number>), [7])
  assertEquals(items(Sets.of(new Set([1]))), [new Set([1])])
})

Deno.test('Sets.show: formats values as readable strings', () => {
  assertEquals(Sets.show(new Set()), 'Set ([])')
  assertEquals(Sets.show(new Set([2, 1])), 'Set ([2, 1])')
  assertEquals(Sets.show(new Set([just(1)])), 'Set ([Just (1)])')
})

Deno.test('Sets.map: transforms values', () => {
  assertEquals(items(Sets.map(new Set([1, 2, 3]), increment)), [2, 3, 4])
  assertEquals(items(Sets.map(new Set<number>(), increment)), [])
})

Deno.test('Sets.map: identical images collapse', () => {
  assertEquals(items(Sets.map(new Set([1, 2, 3]), () => 0)), [0])
})

Deno.test('Sets.ap: applies every wrapped function to the wrapped values', () => {
  const ten = (n: number) => n * 10

  assertEquals(items(Sets.ap(new Set([1, 2]), new Set([increment, ten]))), [
    2,
    3,
    10,
    20,
  ])
  assertEquals(
    items(
      ap(new Set([increment, ten]))(new Set([1, 2])) as Set<
        number
      >,
    ),
    [2, 3, 10, 20],
  )
  assertEquals(
    items(Sets.ap(new Set([1, 2]), new Set([increment, doubleNumber]))),
    [2, 3, 4],
  )
  assertEquals(items(Sets.ap(new Set<number>(), new Set([increment]))), [])
  assertEquals(
    items(Sets.ap(new Set([1]), new Set<(a: number) => number>())),
    [],
  )
})

Deno.test('Sets.chain: transforms values and flattens the results', () => {
  function includeTenfold(n: number) {
    return new Set([n, n * 10])
  }

  assertEquals(
    items(Sets.chain(new Set([1, 2]), includeTenfold)),
    [1, 10, 2, 20],
  )
  assertEquals(
    items(
      chain((n: number) => new Set([n, n + 1]))(new Set([1])) as Set<
        number
      >,
    ),
    [1, 2],
  )
  assertEquals(items(Sets.chain(new Set([1]), () => new Set<number>())), [])
})

Deno.test('Sets.filter: keeps values that pass the predicate', () => {
  const s = new Set([1, 2, 3, 4])

  assertEquals(items(Sets.filter(s, even)), [2, 4])
  assertEquals(items(filter(even)(s) as Set<number>), [2, 4])
  assertEquals(items(reject(even)(s) as Set<number>), [1, 3])
  assertEquals(items(Sets.filter(s, () => true)), items(s))
  assertEquals(items(Sets.filter(s, () => false)), [])
})

Deno.test('Sets.map: passes only values to Number.parseInt', () => {
  assertEquals(items(Sets.map(new Set(['1', '2', '3']), Number.parseInt)), [
    1,
    2,
    3,
  ])
})

Deno.test('map through the class does not confuse a Set with an array', () => {
  assertEquals(items(map(increment)(new Set([1, 2])) as Set<number>), [2, 3])
  assertEquals(map(increment)([1, 2]), [2, 3])
})

Deno.test('map and filter: preserve the tested object-identity relationship', () => {
  const k1 = [1]
  const k2 = [1]
  const a = new Set([k1, [2]])
  const b = new Set([k2, [2]])
  const head = (values: number[]) => values[0]

  assertPreservesEquality('map', a, b, (s) => Sets.map(s, head))
  assertPreservesEquality(
    'filter',
    a,
    b,
    (s) => Sets.filter(s, (values) => values[0] > 1),
  )
  assertPreservesEquality('ap', a, b, (s) => Sets.ap(s, new Set([head])))
  assertPreservesEquality(
    'chain',
    a,
    b,
    (s) => Sets.chain(s, (values) => new Set(values)),
  )
})

Deno.test('Set.map: fresh object results can change the number of distinct values', () => {
  const zeroArr = [0]
  const s = new Set([1, 2])

  const fresh = map((): number[] => [0])(s) as Set<unknown>
  const shared = map((): number[] => zeroArr)(s) as Set<unknown>

  assertEquals(fresh.size, 2, 'different objects did not collapse')
  assertEquals(shared.size, 1, 'one and the same object collapsed')
  assertEquals(fresh.size === shared.size, false)

  assertEquals(
    (chain((): Set<number[]> => new Set([[0]]))(s) as Set<unknown>)
      .size ===
      (chain((): Set<number[]> => new Set([zeroArr]))(s) as Set<
        unknown
      >).size,
    false,
  )
  assertEquals(
    filter((n: number) => n > 0)(s),
    filter((n: number) => n > 0)(new Set([2, 1])),
    'filter builds nothing and is therefore intact',
  )
})

Deno.test('Set.show: distinct object identities can have the same printed value', () => {
  const a = new Set([1, 2])
  const b = new Set([2, 1])

  assertEquals(a, b)
  assertEquals(show(a), 'Set ([1, 2])')
  assertEquals(show(b), 'Set ([2, 1])')
})

// Laws

Deno.test('Sets: the dictionary holds exactly what is lawful', () => {
  assertEquals(opsOf(Sets), [
    'ap',
    'chain',
    'filter',
    'is',
    'map',
    'of',
    'show',
  ])
  for (const name of ['concat', 'empty', 'alt', 'zero', 'reduce']) {
    assertEquals(name in Sets, false, name)
  }
})

Deno.test('Sets.map: the Functor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment(doubleNumber(n))
  }

  const s = new Set([1, 2, 3])

  assertEquals(items(Sets.map(s, (n: number) => n)), items(s))
  assertEquals(
    items(Sets.map(s, doubleThenIncrement)),
    items(Sets.map(Sets.map(s, doubleNumber), increment)),
  )
})

Deno.test('Sets.ap: the Apply and Applicative laws', () => {
  const v = new Set([1, 2])
  const u = new Set([increment, doubleNumber])
  const w = new Set([(n: number) => n + 10, (n: number) => n * 100])
  const compose =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f(g(a))

  assertEquals(items(Sets.ap(v, Sets.of((a: number) => a))), items(v))
  assertEquals(
    items(Sets.ap(Sets.of(1), Sets.of(increment))),
    items(Sets.of(increment(1))),
  )
  assertEquals(
    items(Sets.ap(Sets.of(1), u)),
    items(Sets.ap(u, Sets.of((f: (a: number) => number) => f(1)))),
  )
  assertEquals(
    items(Sets.ap(v, Sets.ap(w, Sets.map(u, compose)))),
    items(Sets.ap(Sets.ap(v, w), u)),
  )
})

Deno.test('Sets.chain: the Monad laws', () => {
  function includeTenfold(n: number) {
    return new Set([n, n * 10])
  }

  const m = new Set([1, 2])
  const f = includeTenfold
  const g = (n: number) => new Set([n + 1])

  assertEquals(
    items(Sets.chain(Sets.chain(m, f), g)),
    items(Sets.chain(m, (n: number) => Sets.chain(f(n), g))),
  )
  assertEquals(items(Sets.chain(Sets.of(1), f)), items(f(1)))
  assertEquals(items(Sets.chain(m, (n: number) => Sets.of(n))), items(m))
})

// Edge cases

Deno.test('Set: exposes no alt or zero operations', () => {
  const a = new Set([1, 2])
  const b = new Set([2, 3])
  const c = new Set([3, 4])
  const z = new Set<number>()

  assertThrows(
    () => alt(c as never)(alt(b as never)(a as never) as never),
    TypeError,
    'alt: Set has no ',
  )
  assertThrows(() => alt(b as never)(a as never), TypeError, 'alt: Set has no ')
  assertThrows(() => alt(z as never)(a as never), TypeError, 'alt: Set has no ')
  assertThrows(() => alt(a as never)(z as never), TypeError, 'alt: Set has no ')
  assertEquals(items(Sets.map(z, increment)), [])
})

Deno.test('setDifference: does not touch the operands', () => {
  const a = new Set([1, 2])
  const b = new Set([1])
  setDifference(a, b)

  assertEquals(items(a), [1, 2])
  assertEquals(items(b), [1])
})

Deno.test('Set inhabits neither Monoid nor Plus: there is no neutral element', () => {
  // Bypass the type checker to verify the runtime error.
  assertEquals('empty' in Sets, false)
  assertEquals('zero' in Sets, false)
  assertThrows(
    () => empty(Sets as never),
    TypeError,
    'empty: Set has no Monoid',
  )
  assertThrows(() => zero(Sets as never), TypeError, 'zero: Set has no Plus')
})

Deno.test('Set does not support Foldable: there is no fold', () => {
  const s = new Set([3, 1, 2])

  assertThrows(
    () =>
      reduce((accumulator: number, a: number) => accumulator + a)(0)(
        s as never,
      ),
    TypeError,
    'reduce: Set has no ',
  )
  assertThrows(
    () =>
      reduce((accumulator: string, a: number) => accumulator + a)('')(
        s as never,
      ),
    TypeError,
    'reduce: Set has no ',
  )
  assertThrows(
    () =>
      reduce((accumulator: number) => accumulator)(7)(
        new Set<number>() as never,
      ),
    TypeError,
    'reduce: Set has no ',
  )
})

Deno.test('Set does not support Foldable: the derived rejects too', () => {
  const s = new Set([3, 1, 2])

  assertThrows(() => toArray(s as never), TypeError, 'reduce: Set has no ')
  assertThrows(() => size(s as never), TypeError, 'reduce: Set has no ')
  assertThrows(
    () => foldMap(Concat)((n: number) => `${n}`)(s as never),
    TypeError,
    'reduce: Set has no ',
  )
})

Deno.test('Sets.map: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  Sets.map(new Set([1, 2]), recordArguments)

  assertEquals(calls, [[1], [2]])
})

Deno.test('Sets.filter: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  Sets.filter(new Set([1, 2]), recordArguments)

  assertEquals(calls, [[1], [2]])
})

Deno.test('Sets.chain: passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return new Set<number>()
  }

  Sets.chain(new Set([1, 2]), recordArguments)

  assertEquals(calls, [[1], [2]])
})

Deno.test('Sets.ap: passes only the value to each function', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  Sets.ap(new Set([1, 2]), new Set([recordArguments]))

  assertEquals(calls, [[1], [2]])
})

Deno.test('reduce: rejects Set before calling the callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  assertThrows(
    () => reduce(recordArguments)(0)(new Set([1, 2]) as never),
    TypeError,
    'reduce: Set has no Foldable',
  )
  assertEquals(calls, [])
})

Deno.test('Set inhabits neither Traversable nor Ord', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () =>
      traverse(Maybe as never)((n: number) => just(n))(new Set([1]) as never),
    TypeError,
    'traverse: Set has no Traversable',
  )
  assertThrows(
    () => lte(new Set([1]) as never)(new Set([2]) as never),
    TypeError,
    'has no Ord',
  )
})

Deno.test('counterexample: merging structurally equal collections can expose object identity', () => {
  const k1 = [1]
  const k2 = [1]
  const a = new Set([k1])
  const b = new Set([k2])

  assertEquals(sameSet(a, b), true)

  const c = new Set([k1])
  const union = (x: ReadonlySet<number[]>, y: ReadonlySet<number[]>) =>
    new Set([...x, ...y])

  assertEquals(union(a, c).size, 1)
  assertEquals(union(b, c).size, 2)
  assertEquals(sameSet(union(a, c), union(b, c)), false)
})

Deno.test('counterexample: folding structurally equal sets can expose insertion order', () => {
  const a = new Set([1, 2])
  const b = new Set([2, 1])

  assertEquals(sameSet(a, b), true)
  assertEquals(items(a), [1, 2])
  assertEquals(items(b), [2, 1])

  const fold = (s: ReadonlySet<number>) =>
    [...s].reduce((accumulator: string, n: number) => accumulator + n, '')

  assertEquals(fold(a), '12')
  assertEquals(fold(b), '21')
  assertEquals(fold(a) === fold(b), false)
})

Deno.test('map and filter: preserve the tested insertion-order relationship', () => {
  const a = new Set([1, 2])
  const b = new Set([2, 1])

  assertPreservesEquality('map', a, b, (s) => Sets.map(s, increment))
  assertPreservesEquality('filter', a, b, (s) => Sets.filter(s, even))
  assertPreservesEquality(
    'ap',
    a,
    b,
    (s) => Sets.ap(s, new Set([increment, doubleNumber])),
  )
  assertPreservesEquality(
    'chain',
    a,
    b,
    (s) => Sets.chain(s, (n) => new Set([n, n * 10])),
  )
})

Deno.test('Set: exposes no concat or empty operations', () => {
  const a = new Set([1, 2])
  const b = new Set([2, 3])
  const c = new Set([3, 4])
  const e = new Set<number>()
  // @ts-expect-error associativity: concat has no overload for Set
  const _associativity = () => concat(concat(a)(b))(c)
  // @ts-expect-error left unit: concat has no overload for Set
  const _leftUnit = () => concat(e)(a)
  // @ts-expect-error right unit: concat has no overload for Set
  const _rightUnit = () => concat(a)(e)
  void _associativity, _leftUnit, _rightUnit

  assertThrows(() => cat(cat(a, b), c), TypeError, 'concat: Set has no ')
  assertThrows(() => cat(e, a), TypeError, 'concat: Set has no ')
  assertThrows(() => cat(a, e), TypeError, 'concat: Set has no ')
})

// Type checking

Deno.test('Set inhabits neither Semigroup nor Alt: there is no union', () => {
  const a = new Set([1, 2])
  const b = new Set([2, 3])
  // @ts-expect-error concat has no overload for Set
  const _1 = () => concat(a)(b)
  // @ts-expect-error concat has no overload for Set
  const _2 = () => concat(new Set([1]))(new Set([2]))
  // @ts-expect-error alt has no overload for Set
  const _3 = () => alt(b)(a)
  // @ts-expect-error alt has no overload for Set
  const _4 = () => alt(new Set([2]))(new Set([1]))
  void _1, _2, _3, _4

  assertThrows(() => cat(a, b), TypeError, 'concat: Set has no ')
  assertThrows(
    () => cat(new Set([1]), new Set([2])),
    TypeError,
    'concat: Set has no ',
  )
  assertThrows(() => alt(b as never)(a as never), TypeError, 'alt: Set has no ')
  assertThrows(
    () => alt(new Set([2]) as never)(new Set([1]) as never),
    TypeError,
    'alt: Set has no ',
  )
})

Deno.test('concat over sets rejects without touching the operands', () => {
  const a = new Set([1])
  const b = new Set([2])
  // @ts-expect-error concat has no overload for Set
  const _call = () => concat(a)(b)
  void _call

  assertThrows(() => cat(a, b), TypeError, 'concat: Set has no ')
  assertEquals(items(a), [1])
  assertEquals(items(b), [2])
})

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const even = (n: number) => n % 2 === 0

const items = <A>(s: ReadonlySet<A>): A[] => [...s]

const opsOf = (dict: object): string[] =>
  Object.keys(dict).filter((k) => k !== '@@type' && k !== '_shape').sort()

const cat = (a: unknown, b: unknown): unknown => concat(a as never)(b as never)

const sameSet = <A>(a: ReadonlySet<A>, b: ReadonlySet<A>): boolean => {
  if (a.size !== b.size) return false
  const rest = [...b]
  for (const x of a) {
    const i = rest.findIndex((y) => equals(y as never)(x as never))
    if (i < 0) return false
    rest.splice(i, 1)
  }
  return true
}

const assertPreservesEquality = <A, B>(
  name: string,
  a: Set<A>,
  b: Set<A>,
  f: (s: Set<A>) => Set<B>,
) => {
  assertEquals(
    sameSet(a, b),
    true,
    `${name}: the input collections must be equal`,
  )
  assertEquals(sameSet(f(a), f(b)), true, name)
}
