import { assertEquals, assertThrows } from '@std/assert'
import { chain } from '../classes/chain.ts'
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
} from './either.ts'
import { just, Maybe, nothing } from './maybe.ts'
import { Identity, identity } from './identity.ts'
import { alt } from '../classes/alt.ts'
import { ap, apFirst, apSecond } from '../classes/apply.ts'
import { filter } from '../classes/filterable.ts'
import { size, toArray } from '../classes/foldable.ts'
import { map } from '../classes/functor.ts'
import { empty } from '../classes/monoid.ts'
import { zero } from '../classes/plus.ts'
import { concat } from '../classes/semigroup.ts'
import { traverse } from '../classes/traversable.ts'

// Examples

Deno.test('left: creates an Either containing an error or alternative value', () => {
  const e = left<string, number>('err')

  assertEquals(e.tag, 'left')
  assertEquals((e as { value: string }).value, 'err')
  assertEquals(e['@@type'], 'Either')
})

Deno.test('right: creates an Either containing a successful value', () => {
  const e = right<string, number>(1)

  assertEquals(e.tag, 'right')
  assertEquals((e as { value: number }).value, 1)
  assertEquals(e['@@type'], 'Either')
})

Deno.test('match: calls the handler for the active branch', () => {
  assertEquals(
    right<string, number>(2).match((e) => 'L' + e, (a) => 'R' + a),
    'R2',
  )
  assertEquals(
    left<string, number>('x').match((e) => 'L' + e, (a) => 'R' + a),
    'Lx',
  )
})

Deno.test('lefts: keeps and unwraps Left values, discarding Right values', () => {
  const mixed: E[] = [
    right<string, number>(20),
    left<string, number>('foo'),
    right<string, number>(10),
    left<string, number>('bar'),
  ]

  assertEquals(lefts(mixed), ['foo', 'bar'])
  assertEquals(lefts([] as E[]), [])
  assertEquals(lefts([right<string, number>(1)]), [])
})

Deno.test('rights: keeps and unwraps Right values, discarding Left values', () => {
  const mixed: E[] = [
    right<string, number>(20),
    left<string, number>('foo'),
    right<string, number>(10),
    left<string, number>('bar'),
  ]

  assertEquals(rights(mixed), [20, 10])
  assertEquals(rights([] as E[]), [])
  assertEquals(rights([left<string, number>('a')]), [])
})

Deno.test('lefts and rights: they work on any Filterable', () => {
  const sm = { a: left<number, number>(1), b: right<number, number>(2) }

  assertEquals(lefts(sm), { a: 1 })
  assertEquals(rights(sm), { b: 2 })
})

Deno.test('fromLeft: unwraps a Left, or returns the supplied default for Right', () => {
  assertEquals(fromLeft('abc')(left<string, number>('xyz')), 'xyz')
  assertEquals(fromLeft('abc')(right<string, number>(123)), 'abc')
})

Deno.test('fromRight: unwraps a Right, or returns the supplied default for Left', () => {
  assertEquals(fromRight(0)(right<string, number>(1)), 1)
  assertEquals(fromRight(0)(left<string, number>('a')), 0)
})

Deno.test('fromEither: unwraps either branch when both branches contain the same value type', () => {
  assertEquals(fromEither(left<number, number>(42)), 42)
  assertEquals(fromEither(right<number, number>(42)), 42)
})

Deno.test('tagBy: wraps a value in Right if it passes the predicate, or in Left otherwise', () => {
  assertEquals(tagBy(odd)(1), right<number, number>(1))
  assertEquals(tagBy(odd)(0), left<number, number>(0))
})

Deno.test('eitherFromPredicate: returns Right on success and builds a Left on failure', () => {
  const f = eitherFromPredicate(odd, (n: number) => `${n} is even`)

  assertEquals(f(1), right<string, number>(1))
  assertEquals(f(2), left<string, number>('2 is even'))
})

Deno.test('eitherSwap: switches Left to Right or Right to Left, preserving the value', () => {
  assertEquals(
    eitherSwap(left<string, number>('e')),
    right<number, string>('e'),
  )
  assertEquals(eitherSwap(right<string, number>(1)), left<number, string>(1))

  assertEquals(
    eitherSwap(eitherSwap(left<string, number>('e'))),
    left<string, number>('e'),
  )
})

Deno.test('eitherToMaybe: converts Right to Just, or Left to Nothing, discarding the error', () => {
  assertEquals(eitherToMaybe(right<string, number>(1)), just(1))
  assertEquals(eitherToMaybe(left<string, number>('a')), nothing<number>())
})

Deno.test('Either: creates values and identifies their type', () => {
  assertEquals(Either['@@type'], 'Either')
  assertEquals(Either.of<string, number>(1), right<string, number>(1))
  const rep: unknown = right(1).constructor

  assertEquals(rep, Either)
})

Deno.test('map: transforms contained values', () => {
  assertEquals(
    right<string, number>(1).map(increment),
    right<string, number>(2),
  )
  assertEquals(
    left<string, number>('err').map(increment),
    left<string, number>('err'),
  )
  assertEquals(
    map(increment)(right<string, number>(1)),
    right<string, number>(2),
  )
})

Deno.test('ap: preserves the error from the wrapped function', () => {
  assertEquals(
    ap(left<string, (n: number) => number>('F'))(left<string, number>('S')),
    left<string, number>('F'),
  )
  assertEquals(
    ap(right<string, (n: number) => number>(increment))(
      left<string, number>('S'),
    ),
    left<string, number>('S'),
  )
  assertEquals(
    ap(left<string, (n: number) => number>('F'))(right<string, number>(1)),
    left<string, number>('F'),
  )
  assertEquals(
    ap(right<string, (n: number) => number>(increment))(
      right<string, number>(1),
    ),
    right<string, number>(2),
  )
  assertEquals(
    left<string, number>('S').ap(left<string, (n: number) => number>('F')),
    left<string, number>('F'),
  )
})

Deno.test('apFirst and apSecond: the same convention as ap', () => {
  assertEquals(
    apFirst(left<string, number>('F'))(left<string, number>('S')),
    left<string, number>('F'),
  )
  assertEquals(
    apSecond(left<string, number>('F'))(left<string, number>('S')),
    left<string, number>('F'),
  )
  assertEquals(
    apFirst(right<string, number>(1))(right<string, number>(2)),
    right<string, number>(1),
  )
  assertEquals(
    apSecond(right<string, number>(1))(right<string, number>(2)),
    right<string, number>(2),
  )
})

Deno.test(
  "Either as the applicative of someone else's traversal: the first error survives",
  () => {
    const wary = (n: number) =>
      n < 0 ? left<string, number>('err' + n) : right<string, number>(n)

    assertEquals(
      traverse(Either)(wary)([-1, 2, -3]),
      left<string, number[]>('err-1'),
    )
    assertEquals(
      traverse(Either)(wary)([1, -2, -3]),
      left<string, number[]>('err-2'),
    )
    assertEquals(
      traverse(Either)(wary)([1, 2, -3]),
      left<string, number[]>('err-3'),
    )
    assertEquals(
      traverse(Either)(wary)([1, 2, 3]),
      right<string, number[]>([1, 2, 3]),
    )
  },
)

Deno.test('chain: sequences computations that return the same wrapper', () => {
  const half = (n: number) =>
    n % 2 === 0
      ? right<string, number>(n / 2)
      : left<string, number>(`${n} is odd`)

  assertEquals(right<string, number>(4).chain(half), right<string, number>(2))
  assertEquals(
    right<string, number>(3).chain(half),
    left<string, number>('3 is odd'),
  )
  assertEquals(
    left<string, number>('err').chain(half),
    left<string, number>('err'),
  )
})

Deno.test('alt: combines alternatives in argument order', () => {
  assertEquals(
    alt(right<string, number>(2))(right<string, number>(1)),
    right<string, number>(1),
  )
  assertEquals(
    alt(right<string, number>(2))(left<string, number>('err')),
    right<string, number>(2),
  )
  assertEquals(
    alt(left<string, number>('err'))(right<string, number>(1)),
    right<string, number>(1),
  )
  assertEquals(
    alt(left<string, number>('b'))(left<string, number>('a')),
    left<string, number>('b'),
  )
})

Deno.test('bimap: transforms both sides of a Pair, or the active branch of an Either', () => {
  const f = (s: string) => s.length

  assertEquals(
    right<string, number>(1).bimap(f, increment),
    right<number, number>(2),
  )
  assertEquals(
    left<string, number>('er').bimap(f, increment),
    left<number, number>(2),
  )
})

Deno.test('concat: combines values in argument order', () => {
  assertEquals(
    concat(left<string, string>('e'))(left<string, string>('f')),
    left<string, string>('ef'),
  )
  assertEquals(
    concat(right<string, string>('a'))(left<string, string>('e')),
    right<string, string>('a'),
  )
  assertEquals(
    concat(left<string, string>('e'))(right<string, string>('a')),
    right<string, string>('a'),
  )
  assertEquals(
    concat(right<string, string>('a'))(right<string, string>('b')),
    right<string, string>('ab'),
  )
})

Deno.test('reduce: combines values from left to right, starting with an initial accumulator', () => {
  assertEquals(
    right<string, number>(3).reduce(
      (accumulator: number, a) => accumulator + a,
      10,
    ),
    13,
  )
  assertEquals(
    left<string, number>('err').reduce(
      (accumulator: number, a) => accumulator + a,
      10,
    ),
    10,
  )
})

Deno.test('reduce: Either folds like a list of zero or one', () => {
  assertEquals(toArray(right<string, number>(1)), [1])
  assertEquals(toArray(left<string, number>('err')), [])
  assertEquals(size(right<string, number>(1)), 1)
  assertEquals(size(left<string, number>('err')), 0)
})

Deno.test('traverse: transforms values into a chosen wrapper and collects them inside one result', () => {
  assertEquals(
    right<string, number>(1).traverse(Identity, (n: number) => identity(n * 2)),
    identity(right<string, number>(2)),
  )
  assertEquals(
    left<string, number>('err').traverse(
      Identity,
      (n: number) => identity(n * 2),
    ),
    identity(left<string, number>('err')),
  )
})

Deno.test('equals: compares values by content, including nested arrays and records', () => {
  assertEquals(right<string, number>(1).equals(right<string, number>(1)), true)
  assertEquals(right<string, number>(1).equals(right<string, number>(2)), false)
  assertEquals(
    left<string, number>('a').equals(left<string, number>('a')),
    true,
  )
  assertEquals(
    left<string, number>('a').equals(left<string, number>('b')),
    false,
  )
  assertEquals(left<number, number>(1).equals(right<number, number>(1)), false)
  assertEquals(right<number, number>(1).equals(left<number, number>(1)), false)
})

Deno.test('equals: the contents are compared structurally, not by reference', () => {
  assertEquals(
    right<string, number[]>([1, 2]).equals(right<string, number[]>([1, 2])),
    true,
  )
  assertEquals(
    left<string[], number>(['a']).equals(left<string[], number>(['a'])),
    true,
  )
})

Deno.test('lte: checks whether the value is at most the supplied bound', () => {
  assertEquals(left<string, number>('z').lte(right<string, number>(0)), true)
  assertEquals(right<string, number>(0).lte(left<string, number>('a')), false)
  assertEquals(left<string, number>('a').lte(left<string, number>('b')), true)
  assertEquals(left<string, number>('b').lte(left<string, number>('a')), false)
  assertEquals(right<string, number>(1).lte(right<string, number>(2)), true)
  assertEquals(right<string, number>(2).lte(right<string, number>(1)), false)
})

Deno.test("show: formats a value as a readable string, including ply's wrapped values", () => {
  assertEquals(left<string, number>('x').show(), 'Left ("x")')
  assertEquals(right<string, number>(1).show(), 'Right (1)')
  assertEquals(right<string, number[]>([1, 2]).show(), 'Right ([1, 2])')
  assertEquals(
    right<string, Maybe<number>>(just(1)).show(),
    'Right (Just (1))',
  )
})

Deno.test('chain on a Left does not call the function at all', () => {
  let calls = 0
  const f = (n: number) => {
    calls += 1
    return right<string, number>(n * 2)
  }

  assertEquals(
    chain(f)(left<string, number>('no')),
    left('no'),
  )
  assertEquals(calls, 0)

  assertEquals(chain(f)(right<string, number>(21)), right(42))
  assertEquals(calls, 1)
})

Deno.test('ap on a Left does not call the function at all', () => {
  let calls = 0
  const f = (n: number) => {
    calls += 1
    return n * 2
  }
  ap(right<string, (n: number) => number>(f))(left<string, number>('no'))

  assertEquals(calls, 0)
})

// Laws

Deno.test('lte: the order is total and antisymmetric', () => {
  const values = [
    left<string, number>('a'),
    left<string, number>('b'),
    right<string, number>(1),
    right<string, number>(2),
  ]
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
  for (const e of samples()) {
    assertEquals(e.map(id), e, 'identity')
    assertEquals(
      e.map((n) => increment(doubleNumber(n))),
      e.map(doubleNumber).map(increment),
      'composition',
    )
  }
})

Deno.test('ap: composition law', () => {
  const composeFunctions =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f(g(a))
  const fs = [
    right<string, (n: number) => number>(increment),
    left<string, (n: number) => number>('f'),
  ]
  for (const u of fs) {
    for (const v of fs) {
      for (const w of samples()) {
        assertEquals(w.ap(v.ap(u.map(composeFunctions))), w.ap(v).ap(u))
      }
    }
  }
})

Deno.test('ap: applicative laws', () => {
  const f = (n: number) => n + 3
  for (const v of samples()) {
    assertEquals(v.ap(Either.of<string, typeof id>(id)), v, 'identity')
  }

  assertEquals(
    Either.of<string, number>(7).ap(Either.of<string, typeof f>(f)),
    Either.of<string, number>(f(7)),
    'homomorphism',
  )
  for (
    const u of [
      right<string, (n: number) => number>(f),
      left<string, (n: number) => number>('f'),
    ]
  ) {
    assertEquals(
      Either.of<string, number>(7).ap(u),
      u.ap(
        Either.of<string, (g: (n: number) => number) => number>((g) => g(7)),
      ),
      'interchange',
    )
  }
})

Deno.test('chain: monad laws', () => {
  const f = (n: number) =>
    n > 0 ? right<string, number>(n * 2) : left<string, number>('f')
  const g = (n: number) =>
    n < 10 ? right<string, number>(n + 1) : left<string, number>('g')
  for (const m of samples()) {
    assertEquals(m.chain(f).chain(g), m.chain((n) => f(n).chain(g)), 'assoc.')
    assertEquals(
      m.chain((a) => Either.of<string, number>(a)),
      m,
      'right identity',
    )
  }
  for (const a of [1, -1, 42]) {
    assertEquals(Either.of<string, number>(a).chain(f), f(a), 'left identity')
  }
})

Deno.test('alt: Alt laws', () => {
  for (const a of samples()) {
    for (const b of samples()) {
      assertEquals(
        a.alt(b).map(increment),
        a.map(increment).alt(b.map(increment)),
        'distributivity',
      )
      for (const c of samples()) {
        assertEquals(a.alt(b).alt(c), a.alt(b.alt(c)), 'associativity')
      }
    }
  }
})

Deno.test('bimap: bifunctor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment(doubleNumber(n))
  }

  const f = (s: string) => s + '!'
  const g = (s: string) => s.toUpperCase()
  for (const e of samples()) {
    assertEquals(e.bimap(id, id), e, 'identity')
    assertEquals(
      e.bimap(
        (s: string) => g(f(s)),
        doubleThenIncrement,
      ),
      e.bimap(f, doubleNumber).bimap(g, increment),
      'composition',
    )
    assertEquals(e.bimap(id, increment), e.map(increment), 'agreement with map')
  }
})

Deno.test('concat: is associative', () => {
  const values = [
    left<string, string>('e'),
    left<string, string>('f'),
    right<string, string>('a'),
    right<string, string>('b'),
  ]
  for (const a of values) {
    for (const b of values) {
      for (const c of values) {
        assertEquals(concat(concat(a)(b))(c), concat(a)(concat(b)(c)))
      }
    }
  }
})

Deno.test('traverse: identity law through Identity', () => {
  for (const e of samples()) {
    assertEquals(e.traverse(Identity, (a: number) => identity(a)), identity(e))
  }
})

Deno.test('equals: Setoid laws', () => {
  const values = [...samples(), right<string, number>(1)]
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

Deno.test('match: the other branch is not evaluated', () => {
  const boom = (): string => {
    throw new Error('should not have been called')
  }

  assertEquals(right<string, number>(1).match(boom, String), '1')
  assertEquals(left<string, number>('x').match(String, boom), 'x')
})

Deno.test('either: handles Left and Right with separate callbacks', () => {
  const f = either((e: string) => 'L' + e)((a: number) => 'R' + a)

  assertEquals(f(left<string, number>('x')), 'Lx')
  assertEquals(f(right<string, number>(1)), 'R1')
})

Deno.test("encase: wraps a function's result in Right, or a thrown value in Left", () => {
  const parsed = encase(JSON.parse)('["foo","bar"]')

  assertEquals(parsed, right<unknown, unknown>(['foo', 'bar']))

  const failed = encase(JSON.parse)('[')

  assertEquals(failed.match((e) => e instanceof SyntaxError, () => false), true)
})

Deno.test('encase: all the arguments get through', () => {
  const f = encase((a: number, b: number, c: number) => a + b + c)

  assertEquals(f(1, 2, 3), right<unknown, number>(6))
})

Deno.test('eitherFromNullable: wraps present values or computes an error for null and undefined', () => {
  const f = eitherFromNullable(() => 'empty')

  assertEquals(f(1), right<string, number>(1))
  assertEquals(f(null as number | null), left<string, number>('empty'))
  assertEquals(
    f(undefined as number | undefined),
    left<string, number>('empty'),
  )

  assertEquals(f(0), right<string, number>(0))
  assertEquals(f(''), right<string, string>(''))
})

Deno.test('eitherFromNullable: the handler is lazy', () => {
  let calls = 0

  function createMissingValueError() {
    calls++
    return 'empty'
  }

  eitherFromNullable(createMissingValueError)(1)

  assertEquals(calls, 0)
})

Deno.test('Either: neither Plus nor Monoid', () => {
  // Bypass the type checker to verify the runtime error.
  assertEquals('zero' in Either, false)
  assertEquals('empty' in Either, false)
  assertThrows(
    () => zero(Either as never),
    TypeError,
    'zero: Either has no Plus',
  )
  assertThrows(
    () => empty(Either as never),
    TypeError,
    'empty: Either has no Monoid',
  )
})

Deno.test('map: on Left the function is not called', () => {
  function unexpectedCallback() {
    throw new Error('should not have been called')
  }

  left<string, number>('err').map(unexpectedCallback)
})

Deno.test('concat: the contents must themselves be a semigroup', () => {
  assertThrows(
    () => concat(right<string, number>(1))(right<string, number>(2)),
    TypeError,
    'concat: Number has no Semigroup',
  )
})

Deno.test('traverse: a failed result makes the whole traversal fail', () => {
  const wary = (n: number) => n > 0 ? just(n) : nothing<number>()

  assertEquals(
    right<string, number>(1).traverse(Maybe, wary),
    just(right<string, number>(1)),
  )
  assertEquals(
    right<string, number>(-1).traverse(Maybe, wary),
    nothing<Either<string, number>>(),
  )
  assertEquals(
    left<string, number>('err').traverse(Maybe, wary),
    just(left<string, number>('err')),
  )
})

Deno.test('filter: Either has no Filterable and rejects', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => filter(odd as never)(right<string, number>(1) as never),
    TypeError,
    'filter: Either has no Filterable',
  )
})

Deno.test('either: Left handler receives only the error', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  function returnValue(value: number): number {
    return value
  }

  either(recordArguments)(returnValue)(left<string, number>('e'))

  assertEquals(calls, [['e']])
})

Deno.test('either: Right handler receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  function errorLength(error: string): number {
    return error.length
  }

  either(errorLength)(recordArguments)(right<string, number>(1))

  assertEquals(calls, [[1]])
})

Deno.test('tagBy: predicate receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  tagBy(recordArguments)(1)

  assertEquals(calls, [[1]])
})

Deno.test('eitherFromNullable: error factory receives no arguments', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  eitherFromNullable(recordArguments)(null)

  assertEquals(calls, [[]])
})

Deno.test('eitherFromPredicate: predicate receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  function returnValue(value: number): number {
    return value
  }

  eitherFromPredicate(recordArguments, returnValue)(1)

  assertEquals(calls, [[1]])
})

Deno.test('eitherFromPredicate: error factory receives only the rejected input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  function rejectValue(): boolean {
    return false
  }

  eitherFromPredicate(rejectValue, recordArguments)(1)

  assertEquals(calls, [[1]])
})

Deno.test('match: Left handler receives only the error', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  function returnValue(value: number): number {
    return value
  }

  left<string, number>('e').match(recordArguments, returnValue)

  assertEquals(calls, [['e']])
})

Deno.test('match: Right handler receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  function errorLength(error: string): number {
    return error.length
  }

  right<string, number>(1).match(errorLength, recordArguments)

  assertEquals(calls, [[1]])
})

Deno.test('map: callback receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  right<string, number>(1).map(recordArguments)

  assertEquals(calls, [[1]])
})

Deno.test('chain: callback receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return right<string, number>(1)
  }

  right<string, number>(1).chain(recordArguments)

  assertEquals(calls, [[1]])
})

Deno.test('reduce: callback receives only accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  right<string, number>(1).reduce(recordArguments, 0)

  assertEquals(calls, [[0, 1]])
})

Deno.test('bimap: Left callback receives only the error', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  left<string, number>('e').bimap(recordArguments, recordArguments)

  assertEquals(calls, [['e']])
})

Deno.test('bimap: Right callback receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  right<string, number>(1).bimap(recordArguments, recordArguments)

  assertEquals(calls, [[1]])
})

// Type checking

Deno.test('isLeft: checks for Left and narrows the type to its error value', () => {
  assertEquals(isLeft(left<string, number>('x')), true)
  assertEquals(isLeft(right<string, number>(42)), false)
})

Deno.test('isRight: checks for Right and narrows the type to its success value', () => {
  assertEquals(isRight(right<string, number>(42)), true)
  assertEquals(isRight(left<string, number>('x')), false)
})

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a

const odd = (n: number) => n % 2 === 1

type E = Either<string, number>

const samples = (): E[] => [
  right<string, number>(1),
  right<string, number>(2),
  left<string, number>('err'),
]
