import { assertEquals, assertThrows } from '@std/assert'
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
} from './pair.ts'
import { map } from '../classes/functor.ts'
import { ap, apFirst, apSecond, lift2, lift3 } from '../classes/apply.ts'
import { chain, join } from '../classes/chain.ts'
import { compose } from '../classes/semigroupoid.ts'
import { bimap, mapLeft } from '../classes/bifunctor.ts'
import { duplicate, extend } from '../classes/extend.ts'
import { extract } from '../classes/comonad.ts'
import { all, reduce, size, toArray } from '../classes/foldable.ts'
import { sequence, traverse } from '../classes/traversable.ts'
import { concat } from '../classes/semigroup.ts'
import { equals } from '../classes/setoid.ts'
import { lte } from '../classes/ord.ts'
import { show } from '../classes/show.ts'
import { of } from '../classes/applicative.ts'
import { alt } from '../classes/alt.ts'
import { zero } from '../classes/plus.ts'
import { filter } from '../classes/filterable.ts'
import { chainRec, done } from '../classes/chainrec.ts'
import { just, Maybe, nothing } from './maybe.ts'
import { Arr } from '../natives/array.ts'

// Examples

Deno.test('pair: creates a pair of values. map transforms the second value', () => {
  const p = pair('record', 42)

  assertEquals(p.fst, 'record')
  assertEquals(p.snd, 42)
  assertEquals(p['@@type'], 'Pair')
  assertEquals(pair(1, 2).fst, 1)
  assertEquals(pair(1, 2).snd, 2)
  assertEquals(Object.getPrototypeOf(pair(1, 2)).constructor, Pair)
})

Deno.test('fst: returns the first value of a pair', () => {
  assertEquals(fst(pair('foo', 42)), 'foo')
})

Deno.test('snd: returns the second value of a pair', () => {
  assertEquals(snd(pair('foo', 42)), 42)
})

Deno.test('swap: exchanges the first and second values of a pair', () => {
  assertEquals(swap(pair('foo', 42)), pair(42, 'foo'))

  const p = pair('foo', 42)

  assertEquals(swap(swap(p)), p)
})

Deno.test('diagonal: creates a pair containing the supplied value in both positions', () => {
  assertEquals(diagonal(42), pair(42, 42))
  assertEquals(swap(diagonal('x')), diagonal('x'))
})

Deno.test('uncurry: applies a curried two-argument function to the two values of a pair', () => {
  function addSides(l: number) {
    return (r: number) => l + r
  }

  assertEquals(uncurry(addSides)(pair(1, 2)), 3)

  function joinSides(l: string) {
    return (r: string) => l + r
  }

  assertEquals(
    uncurry(joinSides)(pair('l', 'r')),
    'lr',
  )
})

Deno.test('fromTuple: converts a two-element tuple into a ply pair', () => {
  assertEquals(fromTuple(['foo', 42]), pair('foo', 42))
})

Deno.test('toTuple: converts a ply pair into a two-element tuple', () => {
  assertEquals(toTuple(pair('foo', 42)), ['foo', 42])
  assertEquals(fromTuple(toTuple(pair('foo', 42))), pair('foo', 42))
  assertEquals(toTuple(fromTuple(['foo', 42])), ['foo', 42])
})

Deno.test('map: identity and composition across accumulator types', () => {
  function doubleThenIncrement(n: number) {
    return increment(doubleNumber(n))
  }

  for (const [name, [l]] of Object.entries(logs)) {
    const p = pair(l, 1)

    assertEquals(map(id)(p), p, name)
    assertEquals(
      map(doubleThenIncrement)(p),
      map(increment)(map(doubleNumber)(p)),
      name,
    )
  }
})

Deno.test('map: touches only snd', () => {
  assertEquals(map(increment)(pair('record', 1)), pair('record', 2))
  const values = [1]

  assertEquals(
    (map(increment)(pair(values, 1)) as Pair<number[], number>).fst,
    values,
  )
})

Deno.test('ap: applies wrapped functions to wrapped values', () => {
  assertEquals(
    ap(pair('a', increment))(pair('b', 1)),
    pair('ab', 2),
  )
})

Deno.test('ap: combines Pair accumulators in call order', () => {
  for (const [name, [l1, l2]] of Object.entries(logs)) {
    assertEquals(
      ap(pair(l1, increment))(pair(l2, 1)),
      pair(glued[name], 2),
      name,
    )
  }
})

Deno.test('lift2 and lift3: preserve Pair accumulator order', () => {
  const add = (a: number) => (b: number) => a + b
  const add3 = (a: number) => (b: number) => (c: number) => a + b + c

  assertEquals(
    lift2(add)(pair('A', 1))(pair('B', 2)),
    pair('AB', 3),
  )
  assertEquals(
    lift3(add3)(pair('A', 1))(pair('B', 2))(pair('C', 3)),
    pair('ABC', 6),
  )
  assertEquals(
    apFirst(pair('A', 1))(pair('B', 2)),
    pair('AB', 1),
  )
  assertEquals(
    apSecond(pair('A', 1))(pair('B', 2)),
    pair('AB', 2),
  )
  assertEquals(join(pair('A', pair('B', 7))), pair('AB', 7))
})

Deno.test('chain: sequences computations that return the same wrapper', () => {
  function doubleWithLog(n: number) {
    return pair('b', n * 2)
  }

  assertEquals(
    chain(doubleWithLog)(pair('a', 1)),
    pair('ab', 2),
  )
})

Deno.test('compose: runs the second function before the first', () => {
  assertEquals(compose(pair('y', 'z'))(pair('x', 'y')), pair('x', 'z'))
})

Deno.test('compose: keeps the first input and final output of a Pair', () => {
  assertEquals(compose(pair(2, 3))(pair(1, 2)), pair(1, 3))
  const a1 = pair(0, 1), a2 = pair(1, 2), a3 = pair(2, 3)

  assertEquals(
    compose(compose(a3)(a2))(a1),
    compose(a3)(compose(a2)(a1)),
  )
})

Deno.test('extract: unwraps an Identity, or returns the second value of a Pair', () => {
  assertEquals(extract(pair('l', 42)), 42)
  assertEquals(extract(pair('l', 42)), snd(pair('l', 42)))
})

Deno.test('bimap: transforms both sides of a Pair, or the active branch of an Either', () => {
  assertEquals(
    bimap((s: string) => s.length)(increment)(pair('record', 1)),
    pair(6, 2),
  )
  assertEquals(bimap(id)(id)(pair('l', 1)), pair('l', 1))
})

Deno.test('mapLeft: transforms a Left value or the first value of a Pair', () => {
  assertEquals(
    mapLeft((s: string) => s.length)(pair('record', 1)),
    pair(6, 1),
  )
})

Deno.test('reduce: only snd is folded', () => {
  assertEquals(
    reduce((accumulator: number, a: number) => accumulator + a)(1000)(
      pair('l', 7),
    ),
    1007,
  )
  assertEquals(toArray(pair('l', 7)), [7])
  assertEquals(size(pair('l', 7)), 1)
  assertEquals(all((n: number) => n > 0)(pair('l', 7)), true)
})

Deno.test('traverse: transforms values into a chosen wrapper and collects them inside one result', () => {
  assertEquals(
    traverse(Maybe)((n: number) => n >= 0 ? just(n) : nothing<number>())(
      pair('l', 1),
    ),
    just(pair('l', 1)),
  )
  assertEquals(
    traverse(Maybe)((_: number) => nothing<number>())(pair('l', 1)),
    nothing(),
  )
})

Deno.test('traverse: the accumulator survives the effect', () => {
  assertEquals(
    (traverse(Arr)((n: number) => [n, -n])(pair('l', 1)) as Pair<
      string,
      number
    >[]).map((p) => toTuple(p)),
    [['l', 1], ['l', -1]],
  )
  assertEquals(sequence(Maybe)(pair('l', just(1))), just(pair('l', 1)))
  assertEquals(
    sequence(Maybe)(pair('l', nothing<number>())),
    nothing(),
  )
})

Deno.test("traverse: the applicative's of is not needed", () => {
  const exploding = {
    '@@type': 'Maybe' as const,
    _shape: undefined as never,
    of: () => {
      throw new Error('of was called')
    },
  }

  assertEquals(
    traverse(exploding as never)((n: number) => just(n) as never)(
      pair('l', 1) as never,
    ),
    just(pair('l', 1)),
  )
})

Deno.test('concat: combines both Pair fields', () => {
  const cat = (a: unknown, b: unknown): unknown =>
    concat(a as never)(b as never)

  assertEquals(cat(pair('a', [1]), pair('b', [2])), pair('ab', [1, 2]))
  const a = pair('a', [1]), b = pair('b', [2]), c = pair('c', [3])

  assertEquals(cat(cat(a, b), c), cat(a, cat(b, c)))
})

Deno.test('equals: compares values by content, including nested arrays and records', () => {
  assertEquals(equals(pair('l', 1))(pair('l', 1)), true)
  assertEquals(equals(pair('l', 1))(pair('l', 2)), false)
  assertEquals(equals(pair('l', 1))(pair('r', 1)), false)
  assertEquals(
    equals(pair('l', pair(1, [2])))(pair('l', pair(1, [2]))),
    true,
  )
  assertEquals(
    equals(pair('l', pair(1, [2])))(pair('l', pair(1, [3]))),
    false,
  )
  assertEquals(
    equals(pair('l', 1))(pair('r', 2)),
    equals(pair('r', 2))(pair('l', 1)),
  )
})

Deno.test('lte: lexicographic order, the accumulator first', () => {
  assertEquals(lte(pair('b', 1))(pair('a', 9)), true)
  assertEquals(lte(pair('a', 9))(pair('b', 1)), false)
  assertEquals(lte(pair('a', 2))(pair('a', 1)), true)
  assertEquals(lte(pair('a', 1))(pair('a', 2)), false)
  const ps = [pair('a', 1), pair('a', 2), pair('b', 1), pair('c', 0)]
  for (const x of ps) assertEquals(lte(x)(x), true)
  for (const x of ps) {
    for (const y of ps) {
      assertEquals(
        lte(y)(x) || lte(x)(y),
        true,
      )
      for (const z of ps) {
        if (lte(y)(x) && lte(z)(y)) {
          assertEquals(lte(z)(x), true)
        }
      }
    }
  }
})

Deno.test("show: formats a value as a readable string, including ply's wrapped values", () => {
  assertEquals(show(pair(1, 'a')), 'Pair (1) ("a")')
  assertEquals(show(pair('record', 42)), 'Pair ("record") (42)')
  assertEquals(
    show(just(pair(1, nothing<number>()))),
    'Just (Pair (1) (Nothing))',
  )
})

Deno.test('duplicate: a pair inside a pair, with the accumulator kept', () => {
  assertEquals(duplicate(pair('l', 1)), pair('l', pair('l', 1)))
})

// Laws

Deno.test('ap: composition law across accumulator types', () => {
  const composeFunctions =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f(g(a))
  for (const [name, [l1, l2, l3]] of Object.entries(logs)) {
    const u = pair(l1, increment), v = pair(l2, doubleNumber), w = pair(l3, 5)

    assertEquals(
      ap(ap(map(composeFunctions)(u))(v))(w),
      ap(u)(ap(v)(w)),
      name,
    )
  }
})

Deno.test('ap: agrees with chain', () => {
  for (const [name, [l1, l2]] of Object.entries(logs)) {
    const wrappedFunctions = pair(l1, increment), wrappedValue = pair(l2, 5)

    assertEquals(
      ap(wrappedFunctions)(wrappedValue),
      chain((f: (n: number) => number) => map(f)(wrappedValue))(
        wrappedFunctions,
      ),
      name,
    )
  }
})

Deno.test('chain: associativity across accumulator types', () => {
  for (const [name, [l1, l2, l3]] of Object.entries(logs)) {
    const p = pair(l1, 1)
    const f = (n: number) => pair(l2, increment(n))
    const g = (n: number) => pair(l3, doubleNumber(n))

    assertEquals(
      chain(g)(chain(f)(p)),
      chain((n: number) => chain(g)(f(n)))(p),
      name,
    )
  }
})

Deno.test('extend: the Extend and Comonad laws across accumulator types', () => {
  const f = (w: Pair<unknown, number>) => extract(w) + 1
  const g = (w: Pair<unknown, number>) => extract(w) * 3
  for (const [name, [l]] of Object.entries(logs)) {
    const w = pair(l, 7)

    assertEquals(
      extend(f)(extend(g)(w)),
      extend((ww: Pair<unknown, number>) => f(extend(g)(ww)))(w),
      name,
    )
    assertEquals(extract(extend(f)(w)), f(w), name)
    assertEquals(extend(extract)(w), w, name)
  }
})

// Edge cases

Deno.test('Pair: a type representative without of', () => {
  // Bypass the type checker to verify the runtime error.
  assertEquals(Pair['@@type'], 'Pair')
  assertEquals('of' in Pair, false)
  assertThrows(
    () => of(Pair as never)(1),
    TypeError,
    'of: Pair has no Applicative',
  )
})

Deno.test('ap: an accumulator without Semigroup throws a TypeError', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => ap(pair(1, increment) as never)(pair(2, 1) as never),
    TypeError,
    'has no Semigroup',
  )
  assertThrows(
    () => chain(((n: number) => pair(2, n)) as never)(pair(1, 1) as never),
    TypeError,
    'has no Semigroup',
  )
})

Deno.test('extend: computes a new value from the whole wrapper', () => {
  assertEquals(
    extend((w: Pair<string, number>) => w.snd * 2)(pair('l', 21)),
    pair('l', 42),
  )
})

Deno.test('Pair: alt, zero, filter and chainRec all refuse', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => alt(pair('a', 1) as never)(pair('b', 2) as never),
    TypeError,
    'alt: Pair has no Alt',
  )
  assertThrows(() => zero(Pair as never), TypeError, 'zero: Pair has no Plus')
  assertThrows(
    () => filter((_: number) => true)(pair('a', 1) as never),
    TypeError,
    'filter: Pair has no Filterable',
  )
  assertThrows(
    () =>
      chainRec(Pair as never, ((n: number) => done(n)) as never, 1 as never),
    TypeError,
    'chainRec: Pair has no ChainRec',
  )
})

Deno.test('map: Pair passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  map(recordArguments)(pair('l', 1))

  assertEquals(calls, [[1]])
})

Deno.test('ap: Pair passes only its value to the wrapped function', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  ap(pair('l', recordArguments))(pair('r', 1))

  assertEquals(calls, [[1]])
})

Deno.test('extend: Pair passes the whole pair', () => {
  const value = pair('l', 1)
  const calls: unknown[][] = []

  function recordArguments(...args: [typeof value]) {
    calls.push(args)
    return 1
  }

  extend(recordArguments)(value)

  assertEquals(calls, [[value]])
})

Deno.test('chain: Pair passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return pair('r', 1)
  }

  chain(recordArguments)(pair('l', 1))

  assertEquals(calls, [[1]])
})

Deno.test('traverse: Pair passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return just(1)
  }

  traverse(Maybe)(recordArguments)(pair('l', 1))

  assertEquals(calls, [[1]])
})

Deno.test('bimap: Pair passes each side in a separate call', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  bimap(recordArguments)(recordArguments)(pair(1, 1))

  assertEquals(calls, [[1], [1]])
})

Deno.test('reduce: Pair passes accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  reduce(recordArguments)(0)(pair('l', 1))

  assertEquals(calls, [[0, 1]])
})

// Type checking

Deno.test('compose: ends that do not meet fail the type check', () => {
  // @ts-expect-error argument arrow ends in number, receiver starts in string
  const bad = compose(pair('string', 1))(pair('x', 99))

  assertEquals(show(bad), 'Pair ("x") (1)')
})

Deno.test('ap: different semigroups on the left fail the type check', () => {
  const glue = pair<string, (n: number) => number>('l', increment)
  const other = pair<number[], number>([1], 1)
  // @ts-expect-error the accumulators are a string and an array of numbers
  const bad = ap(glue)(other)

  assertEquals(show(bad), 'Pair ("l1") (2)')
})

Deno.test('ap: the accumulators must be the same type, both ways', () => {
  assertEquals(
    show(ap(pair<string, (n: number) => number>('l', increment))(pair('r', 1))),
    'Pair ("lr") (2)',
  )

  const tag = 'r' as const
  const pinned = pair(tag, 1)
  const _bad = () => {
    // @ts-expect-error a pinned literal accumulator is not the type `string` is
    return ap(pair<string, (n: number) => number>('l', increment))(pinned)
  }
})

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a

const logs: Record<string, readonly [unknown, unknown, unknown]> = {
  'String': ['a', 'b', 'c'],
  'Array': [[1], [2], [3]],
  'StrMap': [{ x: 1 }, { y: 2 }, { z: 3 }],
}

const glued: Record<string, unknown> = {
  'String': 'ab',
  'Array': [1, 2],
  'StrMap': { x: 1, y: 2 },
}
