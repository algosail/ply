import { assertEquals, assertThrows } from '@std/assert'
import { Identity, identity } from './identity.ts'
import { just, Maybe, nothing } from './maybe.ts'
import { Either, left, right } from './either.ts'
import { alt } from '../classes/alt.ts'
import { duplicate, extend } from '../classes/extend.ts'
import { extract } from '../classes/comonad.ts'
import { filter } from '../classes/filterable.ts'
import { size, toArray } from '../classes/foldable.ts'
import { map } from '../classes/functor.ts'
import { empty } from '../classes/monoid.ts'
import { concat } from '../classes/semigroup.ts'

// Examples

Deno.test('identity: wraps a value so it can be used with operations such as map and chain', () => {
  const w = identity(1)

  assertEquals(w.value, 1)
  assertEquals(w['@@type'], 'Identity')
  assertEquals(identity(identity(1)).value, identity(1))
})

Deno.test('Identity: creates values and identifies their type', () => {
  assertEquals(Identity['@@type'], 'Identity')
  assertEquals(Identity.of(1), identity(1))
  const rep: unknown = identity(1).constructor

  assertEquals(rep, Identity)
})

Deno.test('map: transforms contained values', () => {
  assertEquals(identity(1).map(increment), identity(2))
  assertEquals(map(increment)(identity(1)), identity(2))
  let calls = 0

  function recordValue(n: number) {
    calls++
    return n
  }

  identity(1).map(recordValue)

  assertEquals(calls, 1)
})

Deno.test('ap: applies wrapped functions to wrapped values', () => {
  assertEquals(identity(1).ap(identity(increment)), identity(2))
})

Deno.test('chain: sequences computations that return the same wrapper', () => {
  assertEquals(identity(4).chain((n) => identity(n / 2)), identity(2))
  assertEquals(
    identity(1).chain((n) => identity(identity(n))),
    identity(identity(1)),
  )
})

Deno.test('extract: unwraps an Identity, or returns the second value of a Pair', () => {
  assertEquals(identity(1).extract(), 1)
  assertEquals(extract(identity(1)), 1)
  assertEquals(extract(Identity.of('x')), 'x')
  assertEquals(Identity.of(extract(identity('x'))), identity('x'))
})

Deno.test('reduce: combines values from left to right, starting with an initial accumulator', () => {
  assertEquals(
    identity(3).reduce((accumulator: number, a) => accumulator + a, 10),
    13,
  )
  assertEquals(toArray(identity(1)), [1])
  assertEquals(size(identity(1)), 1)
})

Deno.test('traverse: transforms values into a chosen wrapper and collects them inside one result', () => {
  assertEquals(
    identity(1).traverse(Maybe, (n: number) => just(n * 2)),
    just(identity(2)),
  )
  assertEquals(
    identity(1).traverse(Maybe, () => nothing<number>()),
    nothing<Identity<number>>(),
  )
  assertEquals(
    identity(1).traverse(Identity, (n: number) => identity(n)),
    identity(identity(1)),
  )
  assertEquals(
    identity(-1).traverse(Identity, (n: number) => identity(n)),
    identity(identity(-1)),
  )
})

Deno.test('equals: compares values by content, including nested arrays and records', () => {
  assertEquals(identity(1).equals(identity(1)), true)
  assertEquals(identity(1).equals(identity(2)), false)
  assertEquals(identity([1, [2]]).equals(identity([1, [2]])), true)
  assertEquals(identity(just(1)).equals(identity(just(1))), true)
  assertEquals(identity(just(1)).equals(identity(nothing<number>())), false)
})

Deno.test('lte: checks whether the value is at most the supplied bound', () => {
  assertEquals(identity(1).lte(identity(2)), true)
  assertEquals(identity(2).lte(identity(1)), false)
  assertEquals(identity(1).lte(identity(1)), true)
  assertEquals(identity('a').lte(identity('b')), true)
  assertEquals(identity([1, 1]).lte(identity([1, 2])), true)
})

Deno.test("show: formats a value as a readable string, including ply's wrapped values", () => {
  assertEquals(identity(1).show(), 'Identity (1)')
  assertEquals(identity('foo').show(), 'Identity ("foo")')
  assertEquals(identity(identity(1)).show(), 'Identity (Identity (1))')
  assertEquals(identity(just(1)).show(), 'Identity (Just (1))')
  assertEquals(identity([1, 2]).show(), 'Identity ([1, 2])')
})

Deno.test('duplicate: wraps a value together with its existing wrapper', () => {
  assertEquals(duplicate(identity(1)), identity(identity(1)))
  assertEquals(duplicate(identity(1)), identity(1).extend(id))
})

// Laws

Deno.test('lte: the order is total and antisymmetric', () => {
  const values = [identity(1), identity(2), identity(3)]
  for (const a of values) {
    for (const b of values) {
      assertEquals(a.lte(b) || b.lte(a), true, 'totality')
      if (a.lte(b) && b.lte(a)) assertEquals(a.equals(b), true, 'antisymm.')
      for (const c of values) {
        if (a.lte(b) && b.lte(c)) assertEquals(a.lte(c), true, 'transitivity')
      }
    }
  }
})

Deno.test('map: functor laws', () => {
  const w = identity(3)

  assertEquals(w.map(id), w, 'identity')
  assertEquals(
    w.map((n) => increment(doubleNumber(n))),
    w.map(doubleNumber).map(increment),
    'composition',
  )
})

Deno.test('ap: applicative laws', () => {
  const f = (n: number) => n + 3
  const v = identity(7)

  assertEquals(v.ap(Identity.of(id)), v, 'identity')
  assertEquals(
    Identity.of(7).ap(Identity.of(f)),
    Identity.of(f(7)),
    'homomorphism',
  )
  assertEquals(
    Identity.of(7).ap(identity(f)),
    identity(f).ap(Identity.of((g: (n: number) => number) => g(7))),
    'interchange',
  )
  const composeFunctions =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f(g(a))
  const u = identity(increment)
  const vv = identity(doubleNumber)
  const w = identity(5)

  assertEquals(
    w.ap(vv.ap(u.map(composeFunctions))),
    w.ap(vv).ap(u),
    'composition',
  )
})

Deno.test('chain: monad laws', () => {
  function incrementIdentity(n: number) {
    return identity(n + 1)
  }

  const f = (n: number) => identity(n * 2)
  const g = incrementIdentity
  const m = identity(3)

  assertEquals(m.chain(f).chain(g), m.chain((n) => f(n).chain(g)), 'assoc.')
  assertEquals(m.chain((a) => Identity.of(a)), m, 'right identity')
  assertEquals(Identity.of(3).chain(f), f(3), 'left identity')
})

Deno.test('extend: comonad laws', () => {
  const w = identity(5)
  const f = (x: Identity<number>) => x.extract() + 1
  const g = (x: Identity<number>) => x.extract() * 2

  assertEquals(w.extend((x) => x.extract()), w, 'left identity')
  assertEquals(w.extend(f).extract(), f(w), 'right identity')
  assertEquals(
    w.extend(g).extend(f),
    w.extend((x) => f(x.extend(g))),
    'extend associativity',
  )
})

Deno.test('equals: Setoid laws', () => {
  const values = [identity(1), identity(2), identity(1)]
  for (const a of values) {
    assertEquals(a.equals(a), true, 'reflexivity')
    for (const b of values) {
      assertEquals(a.equals(b), b.equals(a), 'symmetry')
      for (const c of values) {
        if (a.equals(b) && b.equals(c)) {
          assertEquals(a.equals(c), true, 'transitivity')
        }
      }
    }
  }
})

// Edge cases

Deno.test('extend: computes a new value from the whole wrapper', () => {
  assertEquals(identity(1).extend((w) => w.value + 1), identity(2))
  assertEquals(
    extend((w: Identity<number>) => w.extract() * 10)(identity(3)),
    identity(30),
  )
})

Deno.test('traverse: preserves the failure returned by the callback', () => {
  assertEquals(
    identity(1).traverse(Either, (n: number) => right<string, number>(n)),
    right<string, Identity<number>>(identity(1)),
  )
  assertEquals(
    identity(1).traverse(Either, () => left<string, number>('err')),
    left<string, Identity<number>>('err'),
  )
})

Deno.test('Identity: alt, filter, concat and empty all refuse', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => alt(identity(2) as never)(identity(1) as never),
    TypeError,
    'alt: Identity has no Alt',
  )
  assertThrows(
    () => filter(((n: number) => n > 0) as never)(identity(1) as never),
    TypeError,
    'filter: Identity has no Filterable',
  )
  assertThrows(
    () => concat(identity('a') as never)(identity('b') as never),
    TypeError,
    'concat: Identity has no Semigroup',
  )
  assertThrows(
    () => empty(Identity as never),
    TypeError,
    'empty: Identity has no Monoid',
  )
})

Deno.test('map: Identity passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  identity(1).map(recordArguments)

  assertEquals(calls, [[1]])
})

Deno.test('chain: Identity passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return identity(1)
  }

  identity(1).chain(recordArguments)

  assertEquals(calls, [[1]])
})

Deno.test('extend: Identity passes the whole wrapper', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  identity(1).extend(recordArguments)

  assertEquals(calls, [[identity(1)]])
})

Deno.test('traverse: Identity passes only its value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return identity(1)
  }

  identity(1).traverse(Identity, recordArguments)

  assertEquals(calls, [[1]])
})

Deno.test('reduce: Identity passes accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  identity(1).reduce(recordArguments, 0)

  assertEquals(calls, [[0, 1]])
})

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a
