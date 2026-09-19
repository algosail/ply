import { assertEquals, assertThrows } from '@std/assert'
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
} from './maybe.ts'
import { Either, left, right } from './either.ts'
import { Identity, identity } from './identity.ts'
import { bimap } from '../classes/bifunctor.ts'
import { extract } from '../classes/comonad.ts'
import { alt } from '../classes/alt.ts'
import { map } from '../classes/functor.ts'
import { empty } from '../classes/monoid.ts'
import { concat } from '../classes/semigroup.ts'
import { size, toArray } from '../classes/foldable.ts'
import { sequence, traverse } from '../classes/traversable.ts'

// Examples

Deno.test('just: stores a present value, including undefined', () => {
  const result = just(1)

  assertEquals(result.tag, 'just')
  if (!isJust(result)) throw new Error('Expected Just')

  assertEquals(result.value, 1)
  assertEquals(result['@@type'], 'Maybe')
  assertEquals(just(undefined).tag, 'just')
})

Deno.test('nothing: creates a Maybe with no value', () => {
  const m = nothing<number>()

  assertEquals(m.tag, 'nothing')
  assertEquals('value' in m, false)
  assertEquals(m['@@type'], 'Maybe')
})

Deno.test('match: calls the handler for the active branch', () => {
  assertEquals(just(4).match(() => 'n', (a) => 'j' + a), 'j4')
  assertEquals(nothing<number>().match(() => 'n', (a) => 'j' + a), 'n')
})

Deno.test('maybe: transforms a Just value, or returns the supplied default for Nothing', () => {
  assertEquals(maybe(0)((a: number) => a * 2)(just(4)), 8)
  assertEquals(maybe(0)((a: number) => a * 2)(nothing<number>()), 0)
})

Deno.test('fromMaybe: unwraps a Just, or returns the supplied default for Nothing', () => {
  assertEquals(fromMaybe(0)(just(1)), 1)
  assertEquals(fromMaybe(0)(nothing<number>()), 0)
})

Deno.test('fromMaybe_: unwraps Just or computes a default for Nothing', () => {
  assertEquals(fromMaybe_(() => 9)(just(1)), 1)
  assertEquals(fromMaybe_(() => 9)(nothing<number>()), 9)
})

Deno.test('fromNullable: preserves present values, including falsy values', () => {
  assertEquals(fromNullable(1), just(1))
  assertEquals(fromNullable(0), just(0))
  assertEquals(fromNullable(''), just(''))
  assertEquals(fromNullable(false), just(false))
  assertEquals(fromNullable(NaN), just(NaN))
})

Deno.test('fromPredicate: wraps a value in Just if it passes the predicate, or returns Nothing', () => {
  assertEquals(fromPredicate(isPositive)(1), just(1))
  assertEquals(fromPredicate(isPositive)(-1), nothing())
})

Deno.test('safeLift: checks the input before transforming it', () => {
  const half = safeLift(even, (n: number) => n / 2)

  assertEquals(half(4), just(2))
  assertEquals(half(3), nothing())
})

Deno.test('safeAfter: applies a function, then checks its result before wrapping it in Just', () => {
  const find = safeAfter((n: number) => n >= 0, (s: string) => s.indexOf('a'))

  assertEquals(find('bab'), just(1))
  assertEquals(find('xyz'), nothing())
})

Deno.test('maybeToNullable: unwraps a Just, or returns null for Nothing', () => {
  assertEquals(maybeToNullable(just(42)), 42)
  assertEquals(maybeToNullable(nothing<number>()), null)
  assertEquals(maybeToNullable(just(null)), null)
})

Deno.test('justs: keeps and unwraps Just values, discarding Nothing values', () => {
  assertEquals(justs([just('foo'), nothing<string>(), just('baz')]), [
    'foo',
    'baz',
  ])
  assertEquals(justs([] as Maybe<number>[]), [])
  assertEquals(justs([nothing<number>()]), [])
})

Deno.test('justs: works on any Filterable, not only on an array', () => {
  assertEquals(
    justs(
      { a: just(1), b: nothing<number>() } as Record<string, Maybe<number>>,
    ),
    { a: 1 },
  )
  assertEquals(justs(new Set([just(1), nothing<number>()])), new Set([1]))
})

Deno.test('maybeToEither: converts Just to Right, or Nothing to Left with the supplied error', () => {
  assertEquals(maybeToEither('e')(just(1)), right<string, number>(1))
  assertEquals(maybeToEither('e')(nothing<number>()), left<string, number>('e'))
})

Deno.test('maybeToEither_: converts absence into a computed error', () => {
  assertEquals(maybeToEither_(() => 'e')(just(1)), right<string, number>(1))
  assertEquals(
    maybeToEither_(() => 'e')(nothing<number>()),
    left<string, number>('e'),
  )
  let calls = 0

  function createMissingValueError() {
    calls++
    return 'e'
  }

  maybeToEither_(createMissingValueError)(just(1))

  assertEquals(calls, 0)
})

Deno.test('Maybe: creates values and identifies their type', () => {
  assertEquals(Maybe['@@type'], 'Maybe')
  assertEquals(Maybe.of(1), just(1))
  assertEquals(Maybe.zero<number>(), nothing<number>())

  const rep: unknown = just(1).constructor

  assertEquals(rep, Maybe)
})

Deno.test('map: transforms contained values', () => {
  assertEquals(just(1).map(increment), just(2))
  assertEquals(nothing<number>().map(increment), nothing<number>())
  assertEquals(map(increment)(just(1)), just(2))
})

Deno.test('ap: applies wrapped functions to wrapped values', () => {
  assertEquals(just(1).ap(just(increment)), just(2))
  assertEquals(nothing<number>().ap(just(increment)), nothing<number>())
  assertEquals(just(1).ap(nothing<(n: number) => number>()), nothing<number>())
  assertEquals(
    nothing<number>().ap(nothing<(n: number) => number>()),
    nothing<number>(),
  )
})

Deno.test('chain: sequences computations that return the same wrapper', () => {
  const half = (n: number) => even(n) ? just(n / 2) : nothing<number>()

  assertEquals(just(4).chain(half), just(2))
  assertEquals(just(3).chain(half), nothing<number>())
  assertEquals(nothing<number>().chain(half), nothing<number>())
})

Deno.test('alt: combines alternatives in argument order', () => {
  assertEquals(alt(just(2))(just(1)), just(1))
  assertEquals(alt(just(2))(nothing<number>()), just(2))
  assertEquals(alt(nothing<number>())(just(1)), just(1))
  assertEquals(alt(nothing<number>())(nothing<number>()), nothing<number>())
  assertEquals(just(1).alt(just(2)), just(1))
})

Deno.test('filter: keeps values that pass the predicate, preserving the collection type', () => {
  assertEquals(just(2).filter(even), just(2))
  assertEquals(just(3).filter(even), nothing<number>())
  assertEquals(nothing<number>().filter(even), nothing<number>())
})

Deno.test('reduce: combines values from left to right, starting with an initial accumulator', () => {
  assertEquals(
    just(3).reduce((accumulator: number, a) => accumulator + a, 10),
    13,
  )
  assertEquals(
    nothing<number>().reduce((accumulator: number, a) => accumulator + a, 10),
    10,
  )
})

Deno.test('reduce: Maybe folds like a list of zero or one', () => {
  assertEquals(toArray(just(1)), [1])
  assertEquals(toArray(nothing<number>()), [])
  assertEquals(size(just(1)), 1)
  assertEquals(size(nothing<number>()), 0)
})

Deno.test('traverse: transforms values into a chosen wrapper and collects them inside one result', () => {
  assertEquals(
    just(1).traverse(Identity, (n: number) => identity(n * 2)),
    identity(just(2)),
  )
  assertEquals(
    nothing<number>().traverse(Identity, (n: number) => identity(n * 2)),
    identity(nothing<number>()),
  )
})

Deno.test('traverse and sequence: collect array values into Maybe', () => {
  assertEquals(
    traverse(Maybe)((n: number) => just(n))([1, 2, 3]),
    just([1, 2, 3]),
  )
  const visited: number[] = []

  function recordAndCheckValue(n: number) {
    visited.push(n)
    return n < 3 ? just(n) : nothing<number>()
  }

  assertEquals(
    traverse(Maybe)(recordAndCheckValue)([1, 2, 3]),
    nothing<number[]>(),
  )
  assertEquals(visited, [1, 2, 3])
  assertEquals(
    sequence(Maybe)([just(1), just(2)]),
    just([1, 2]),
  )
  assertEquals(
    sequence(Maybe)([just(1), nothing<number>()]),
    nothing<number[]>(),
  )
  assertEquals(
    traverse(Maybe)((n: number) => just(n))([]),
    just([]),
  )
})

Deno.test('equals: compares values by content, including nested arrays and records', () => {
  assertEquals(just(1).equals(just(1)), true)
  assertEquals(just(1).equals(just(2)), false)
  assertEquals(just(1).equals(nothing<number>()), false)
  assertEquals(nothing<number>().equals(just(1)), false)
  assertEquals(nothing<number>().equals(nothing<number>()), true)
})

Deno.test('equals: the contents are compared structurally, not by reference', () => {
  assertEquals(just([1, [2]]).equals(just([1, [2]])), true)
  assertEquals(just(just(1)).equals(just(just(1))), true)
  assertEquals(just(just(1)).equals(just(nothing<number>())), false)
  assertEquals(just({ a: [1] }).equals(just({ a: [1] })), true)
})

Deno.test('lte: checks whether the value is at most the supplied bound', () => {
  assertEquals(nothing<number>().lte(just(1)), true)
  assertEquals(just(1).lte(nothing<number>()), false)
  assertEquals(nothing<number>().lte(nothing<number>()), true)
  assertEquals(just(1).lte(just(2)), true)
  assertEquals(just(2).lte(just(1)), false)
  assertEquals(just(1).lte(just(1)), true)
})

Deno.test("show: formats a value as a readable string, including ply's wrapped values", () => {
  assertEquals(just(1).show(), 'Just (1)')
  assertEquals(nothing<number>().show(), 'Nothing')
  assertEquals(just('foo').show(), 'Just ("foo")')
  assertEquals(just(just(1)).show(), 'Just (Just (1))')
  assertEquals(just([1, 2]).show(), 'Just ([1, 2])')
  assertEquals(just(-0).show(), 'Just (-0)')
})

Deno.test('maybe_: handles presence and absence with separate callbacks', () => {
  assertEquals(maybe_(() => 0)((a: number) => a * 2)(just(4)), 8)
  assertEquals(maybe_(() => 0)((a: number) => a * 2)(nothing<number>()), 0)
})

Deno.test("maybeEncase: wraps a function's result in Just, or returns Nothing if it throws", () => {
  const parse = maybeEncase(JSON.parse)

  assertEquals(parse('[1,2]'), just([1, 2]))
  assertEquals(parse('['), nothing())
})

Deno.test('isNothing: checks whether a Maybe has no value', () => {
  assertEquals(isNothing(nothing<number>()), true)
  assertEquals(isNothing(just(42)), false)
})

// Laws

Deno.test('lte: the order is total and antisymmetric', () => {
  const values = [nothing<number>(), just(1), just(2)]
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
  for (const m of samples()) {
    assertEquals(m.map(id), m, 'identity')
    assertEquals(
      m.map((n) => increment(doubleNumber(n))),
      m.map(doubleNumber).map(increment),
      'composition',
    )
  }
})

Deno.test('ap: composition law', () => {
  const composeFunctions =
    (f: (b: number) => number) =>
    (g: (a: number) => number) =>
    (
      a: number,
    ) => f(g(a))
  const fs = [just(increment), nothing<(n: number) => number>()]
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
    assertEquals(v.ap(Maybe.of(id)), v, 'identity')
  }

  assertEquals(Maybe.of(7).ap(Maybe.of(f)), Maybe.of(f(7)), 'homomorphism')
  for (const u of [just(f), nothing<(n: number) => number>()]) {
    assertEquals(
      Maybe.of(7).ap(u),
      u.ap(Maybe.of((g: (n: number) => number) => g(7))),
      'interchange',
    )
  }
})

Deno.test('chain: monad laws', () => {
  const f = (n: number) => n > 0 ? just(n * 2) : nothing<number>()
  const g = (n: number) => n < 10 ? just(n + 1) : nothing<number>()
  for (const m of samples()) {
    assertEquals(m.chain(f).chain(g), m.chain((n) => f(n).chain(g)), 'assoc.')
    assertEquals(m.chain((a) => Maybe.of(a)), m, 'right identity')
  }
  for (const a of [1, -1, 42]) {
    assertEquals(Maybe.of(a).chain(f), f(a), 'left identity')
  }
})

Deno.test('alt: Alt and Plus laws', () => {
  for (const a of samples()) {
    assertEquals(a.alt(Maybe.zero()), a, 'right neutral element')
    assertEquals(Maybe.zero<number>().alt(a), a, 'left neutral element')
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

  assertEquals(
    Maybe.zero<number>().map(increment),
    nothing<number>(),
    'annihilation',
  )
})

Deno.test('filter: Filterable laws', () => {
  for (const m of samples()) {
    assertEquals(m.filter(() => true), m, 'identity')
    assertEquals(
      m.filter((n) => isPositive(n) && even(n)),
      m.filter(isPositive).filter(even),
      'distributivity',
    )
  }

  assertEquals(
    Maybe.zero<number>().filter(isPositive),
    nothing<number>(),
    'annihilation',
  )
})

Deno.test('traverse: identity law through Identity', () => {
  for (const m of samples()) {
    assertEquals(m.traverse(Identity, (a: number) => identity(a)), identity(m))
  }
})

Deno.test('equals: Setoid laws', () => {
  const values = [just(1), just(2), nothing<number>(), just(1)]
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

Deno.test('safeLift: skips the transformation when the predicate fails', () => {
  let calls = 0

  function recordValue(n: number) {
    calls++
    return n
  }

  safeLift(even, recordValue)(3)

  assertEquals(calls, 0)
})

Deno.test('match: the other branch is not evaluated', () => {
  const boom = (): string => {
    throw new Error('should not have been called')
  }

  assertEquals(just(1).match(boom, (a) => String(a)), '1')
  assertEquals(nothing<number>().match(() => 'n', boom), 'n')
})

Deno.test('fromMaybe_: skips the fallback for Just', () => {
  let fallbackCalls = 0
  const fallback = () => {
    fallbackCalls++
    return 9
  }

  assertEquals(fromMaybe_(fallback)(just(1)), 1)
  assertEquals(fallbackCalls, 0)
})

Deno.test('fromNullable: null and undefined become Nothing', () => {
  assertEquals(fromNullable(null), nothing())
  assertEquals(fromNullable(undefined), nothing())
})

Deno.test('maybeEncase: all the arguments get through', () => {
  const f = maybeEncase((a: number, b: number, c: number) => a + b + c)

  assertEquals(f(1, 2, 3), just(6))
})

Deno.test('Maybe: rejects empty and concat', () => {
  // Bypass the type checker to verify the runtime error.
  assertEquals('empty' in Maybe, false)
  assertEquals('concat' in just(1), false)
  assertThrows(
    () => empty(Maybe as never),
    TypeError,
    'empty: Maybe has no Monoid',
  )
  assertThrows(
    () => concat(just('a') as never)(just('b') as never),
    TypeError,
    'concat: Maybe has no Semigroup',
  )
})

Deno.test('map: on Nothing the function is not called', () => {
  function unexpectedCallback() {
    throw new Error('should not have been called')
  }

  nothing<number>().map(unexpectedCallback)
})

Deno.test('traverse: a failed result makes the whole traversal fail', () => {
  const wary = (n: number) =>
    n > 0 ? right<string, number>(n) : left<string, number>('err' + n)

  assertEquals(
    just(1).traverse(Identity, (n: number) => identity(n)),
    identity(just(1)),
  )
  assertEquals(
    just(1).traverse(
      Maybe,
      (n: number) => n > 0 ? just(n) : nothing<number>(),
    ),
    just(just(1)),
  )
  assertEquals(
    just(-1).traverse(
      Maybe,
      (n: number) => n > 0 ? just(n) : nothing<number>(),
    ),
    nothing<Maybe<number>>(),
  )
  assertEquals(
    just(-1).traverse(Either, wary),
    left<string, Maybe<number>>('err-1'),
  )

  assertEquals(
    nothing<number>().traverse(Either, wary),
    right<string, Maybe<number>>(nothing<number>()),
  )
})

Deno.test('Maybe: rejects extract and bimap', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => extract(just(1) as never),
    TypeError,
    'extract: Maybe has no Comonad',
  )
  assertThrows(
    () => bimap((e: string) => e)(increment)(just(1) as never),
    TypeError,
    'bimap: Maybe has no Bifunctor',
  )
})

Deno.test('maybe_: absent branch receives no arguments', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  function returnValue(value: number): number {
    return value
  }

  maybe_(recordArguments)(returnValue)(nothing<number>())

  assertEquals(calls, [[]])
})

Deno.test('maybe_: present branch receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  function defaultValue(): number {
    return 0
  }

  maybe_(defaultValue)(recordArguments)(just(1))

  assertEquals(calls, [[1]])
})

Deno.test('maybe: present branch receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  maybe(0)(recordArguments)(just(1))

  assertEquals(calls, [[1]])
})

Deno.test('fromMaybe_: fallback receives no arguments', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  fromMaybe_(recordArguments)(nothing<number>())

  assertEquals(calls, [[]])
})

Deno.test('fromPredicate: predicate receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  fromPredicate(recordArguments)(1)

  assertEquals(calls, [[1]])
})

Deno.test('safeLift: predicate receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  function returnValue(value: number): number {
    return value
  }

  safeLift(recordArguments, returnValue)(1)

  assertEquals(calls, [[1]])
})

Deno.test('safeLift: transformation receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  safeLift(isPositive, recordArguments)(1)

  assertEquals(calls, [[1]])
})

Deno.test('safeAfter: predicate receives only the result', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  function returnValue(value: number): number {
    return value
  }

  safeAfter(recordArguments, returnValue)(1)

  assertEquals(calls, [[1]])
})

Deno.test('safeAfter: transformation receives only the input', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  safeAfter(isPositive, recordArguments)(1)

  assertEquals(calls, [[1]])
})

Deno.test('maybeToEither_: error factory receives no arguments', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  maybeToEither_(recordArguments)(nothing<number>())

  assertEquals(calls, [[]])
})

Deno.test('match: present branch receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  function defaultValue(): number {
    return 0
  }

  just(1).match(defaultValue, recordArguments)

  assertEquals(calls, [[1]])
})

Deno.test('match: absent branch receives no arguments', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  function returnValue(value: number): number {
    return value
  }

  nothing<number>().match(recordArguments, returnValue)

  assertEquals(calls, [[]])
})

Deno.test('map: callback receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  just(1).map(recordArguments)

  assertEquals(calls, [[1]])
})

Deno.test('filter: predicate receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  just(1).filter(recordArguments)

  assertEquals(calls, [[1]])
})

Deno.test('chain: callback receives only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return just(1)
  }

  just(1).chain(recordArguments)

  assertEquals(calls, [[1]])
})

Deno.test('reduce: callback receives only accumulator and value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  just(1).reduce(recordArguments, 0)

  assertEquals(calls, [[0, 1]])
})

// Type checking

Deno.test('fromPredicate: a type guard narrows the wrapped value to string', () => {
  const isString = (value: unknown): value is string =>
    typeof value === 'string'
  const input: unknown = 'abc'
  const result = fromPredicate(isString)(input)
  const text: Maybe<string> = result

  assertEquals(text, just('abc'))
  assertEquals(fromPredicate(isString)(1 as unknown), nothing())
})

Deno.test('isJust: checks for Just and narrows the type so its value can be read', () => {
  assertEquals(isJust(just(42)), true)
  assertEquals(isJust(nothing<number>()), false)
})

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a

const isPositive = (n: number) => n > 0

const even = (n: number) => n % 2 === 0

const samples = (): Maybe<number>[] => [just(1), just(2), nothing<number>()]
