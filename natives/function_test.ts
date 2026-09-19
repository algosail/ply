import { assertEquals, assertThrows } from '@std/assert'
import {
  curry2,
  curry3,
  curry4,
  curry5,
  Fn,
  I,
  K,
  on,
  pipe,
  pipeK,
  T,
} from './function.ts'
import { add, sub } from './number.ts'
import type { Maybe } from '../data/maybe.ts'
import { just, nothing } from '../data/maybe.ts'
import { concat } from '../classes/semigroup.ts'
import { reverse, tail } from '../classes/_rebuild.ts'
import { head, toArray } from '../classes/foldable.ts'
import { map } from '../classes/functor.ts'
import { of } from '../classes/applicative.ts'
import { ap } from '../classes/apply.ts'
import { chain } from '../classes/chain.ts'
import { contramap } from '../classes/contravariant.ts'
import { promap } from '../classes/profunctor.ts'
import { compose } from '../classes/semigroupoid.ts'
import { id } from '../classes/category.ts'
import { show } from '../classes/show.ts'

// Examples

Deno.test('K: creates a function that always returns the supplied value', () => {
  assertEquals(K('foo')('bar'), 'foo')
  assertEquals(map(K(42))([0, 1, 2, 3, 4]), [42, 42, 42, 42, 42])
})

Deno.test('K: the second argument is not looked at at all', () => {
  const k = K(1)

  assertEquals([k('x'), k(undefined), k(null)], [1, 1, 1])
})

Deno.test('T: passes a value to a function supplied afterward', () => {
  assertEquals(T(42)(add(1)), 43)
  assertEquals(map(T(100) as never)([add(1), Math.sqrt] as never), [101, 10])
})

Deno.test('T: this is application the other way round', () => {
  assertEquals(T('abc')((s: string) => s.length), 3)
  for (const n of envs) assertEquals(T(n)(increment), increment(n))
})

Deno.test('on: transforms both inputs before applying a curried two-argument function', () => {
  assertEquals(
    on(concat)(reverse)([1, 2, 3])([4, 5, 6]),
    [3, 2, 1, 6, 5, 4],
  )
})

Deno.test('on: both sides go through one and the same preparation', () => {
  function subtractFrom(a: number) {
    return (b: number) => a - b
  }

  const byLength = on(subtractFrom)((s: string) => s.length)

  assertEquals(byLength('abcd')('ab'), 2)
  assertEquals(byLength('ab')('abcd'), -2)
  assertEquals(byLength('')(''), 0)
})

Deno.test('pipe: runs functions from left to right', () => {
  assertEquals(pipe([add(1), Math.sqrt, sub(1)])(99), 9)
})

Deno.test('pipe: the links go left to right', () => {
  const trail = pipe([
    (s: unknown) => `${s}a`,
    (s: unknown) => `${s}b`,
    (s: unknown) => `${s}c`,
  ])('')

  assertEquals(trail, 'abc')
})

Deno.test('pipe: an empty pipeline is the identity', () => {
  assertEquals(pipe([])(7), 7)
  assertEquals(pipe([])('string'), 'string')
})

Deno.test('pipe: any Foldable will do, not only an array', () => {
  assertEquals(pipe({ '1': add(1), '2': doubleNumber })(10), 22)
})

Deno.test('pipeK: chains wrapped computations from left to right', () => {
  assertEquals(pipeK([tail, tail, head])(just([1, 2, 3, 4])), just(3))
})

Deno.test('pipeK: an empty pipeline is the identity', () => {
  assertEquals(pipeK([])(just(7)), just(7))
  assertEquals(pipeK([])([1, 2]), [1, 2])
})

Deno.test('pipeK: works in any monad, not only in Maybe', () => {
  function repeatNumber(n: number) {
    return [n, n]
  }

  assertEquals(pipeK([(n: number) => [n, n + 1]])([1, 10]), [1, 2, 10, 11])
  assertEquals(
    pipeK([repeatNumber, (n: number) => [n + 1]])([1]),
    [2, 2],
  )
})

Deno.test('curry2: converts a two-argument function into consecutive one-argument calls', () => {
  assertEquals(curry2((a: number, b: number) => a + b)(1)(2), 3)
  assertEquals(curry2((a: string, b: string) => a + b)('a')('b'), 'ab')
})

Deno.test('curry3: converts a three-argument function into consecutive one-argument calls', () => {
  assertEquals(
    curry3((a: number, b: number, c: number) => a + b + c)(1)(2)(3),
    6,
  )
})

Deno.test('curry4: converts a four-argument function into consecutive one-argument calls', () => {
  assertEquals(
    curry4((a: number, b: number, c: number, d: number) => a + b + c + d)(1)(2)(
      3,
    )(4),
    10,
  )
})

Deno.test('curry5: converts a five-argument function into consecutive one-argument calls', () => {
  assertEquals(
    curry5((a: number, b: number, c: number, d: number, e: number) =>
      a + b + c + d + e
    )(1)(2)(3)(4)(5),
    15,
  )
})

Deno.test('curryN: the argument order is not rearranged', () => {
  const joined = (...values: unknown[]) => values.join('')

  assertEquals(curry2(joined)('a')('b'), 'ab')
  assertEquals(curry3(joined)('a')('b')('c'), 'abc')
  assertEquals(curry4(joined)('a')('b')('c')('d'), 'abcd')
  assertEquals(curry5(joined)('a')('b')('c')('d')('e'), 'abcde')
})

Deno.test('Fn: recognizes values and provides the declared operations', () => {
  assertEquals(Fn['@@type'], 'Fn')
  assertEquals(Fn.is(() => 1), true)
  assertEquals(Fn.is(Math.abs), true)
  assertEquals(Fn.is(class {}), true)
  assertEquals(Fn.is({}), false)
  assertEquals(Fn.is(null), false)
})

Deno.test('Fn.of: a constant that does not read the environment', () => {
  const k = Fn.of(7)
  for (const e of envs) assertEquals(k(e), 7)

  assertEquals((of(Fn)(7) as R<number>)(9), 7)
})

Deno.test('Fn.map: this is post-composition', () => {
  const f = Fn.map(doubleNumber, increment)
  for (const e of envs) assertEquals(f(e), increment(doubleNumber(e)))

  assertEquals((map(increment)(doubleNumber) as R<number>)(5), 11)
})

Deno.test('Fn.ap: the environment goes into both halves', () => {
  const h: R<(a: number) => number> = (e) => (a) => a + e
  const g: R<number> = (e) => e * 2
  const applied = Fn.ap(g, h)
  for (const e of envs) assertEquals(applied(e), e * 2 + e)

  assertEquals((ap(h)(g) as R<number>)(3), 9)
})

Deno.test('Fn.chain: the continuation gets both the result and the environment', () => {
  const g: R<number> = (e) => e * 2
  const f = (a: number): R<number> => (e) => a + e
  const chained = Fn.chain(g, f)
  for (const e of envs) assertEquals(chained(e), e * 2 + e)

  assertEquals((chain(f)(g) as R<number>)(3), 9)
})

Deno.test('Fn.contramap: this is pre-composition', () => {
  const g: R<number> = (e) => e * 2
  const f = Fn.contramap(g, (s: string) => s.length)

  assertEquals(f('abc'), 6)
  assertEquals(
    (contramap((s: string) => s.length)(g) as ((s: string) => number))(
      'abc',
    ),
    6,
  )
})

Deno.test('Fn.promap: before and after in one arrow', () => {
  const g: R<number> = (e) => e * 2
  const f = Fn.promap(g, (s: string) => s.length, (n: number) => `<${n}>`)

  assertEquals(f('abc'), '<6>')
  assertEquals(
    (promap((s: string) => s.length)((n: number) => `<${n}>`)(
      g,
    ) as ((s: string) => string))('abc'),
    '<6>',
  )
})

Deno.test('Fn.promap: this is contramap and map at once', () => {
  const p: R<number> = (e) => e * 2
  const before = (s: string) => s.length
  const after = (n: number) => n + 1
  agree(
    Fn.promap(p, before, after),
    Fn.map(Fn.contramap(p, before), after),
    ['', 'a', 'abcd'],
  )
})

Deno.test('compose: the right arrow first, then the left one', () => {
  assertEquals((compose(doubleNumber)(increment) as R<number>)(2), 6)
  assertEquals((compose((n: number) => n * 10)(increment) as R<number>)(2), 30)
  for (const e of envs) {
    assertEquals(
      Fn.compose(increment, doubleNumber)(e),
      doubleNumber(increment(e)),
    )
  }
})

Deno.test('Fn.map and Fn.compose are one and the same operation', () => {
  const g: R<number> = (e) => e * 2
  agree(Fn.map(g, increment), Fn.compose(g, increment), envs)
})

Deno.test('Fn.show: formats values as readable strings', () => {
  function inc2(n: number) {
    return n + 1
  }

  assertEquals(Fn.show(inc2).startsWith('function inc2'), true)
  assertEquals(Fn.show(Math.abs).includes('native code'), true)
  assertEquals(show(inc2), Fn.show(inc2))
})

Deno.test('pipe: passes only the value to Number.parseInt', () => {
  assertEquals(pipe([Number.parseInt])('11'), 11)
  assertEquals(map(T('11') as never)([Number.parseInt] as never), [11])
})

// Laws

Deno.test('Fn.map: Functor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment(doubleNumber(n))
  }

  const g: R<number> = (e) => e * 2
  agree(Fn.map(g, (a: number) => a), g, envs)
  agree(
    Fn.map(g, doubleThenIncrement),
    Fn.map(Fn.map(g, doubleNumber), increment),
    envs,
  )
})

Deno.test('Fn.ap: Apply and Applicative laws', () => {
  const u: R<(a: number) => number> = (e) => (a) => a + e
  const v: R<(a: number) => number> = (e) => (a) => a * e
  const w: R<number> = (e) => e + 100
  const comp =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f(g(a))

  agree(Fn.ap(w, Fn.of((a: number) => a)), w, envs)
  agree(Fn.ap(Fn.of(1), Fn.of(increment)), Fn.of(increment(1)), envs)
  agree(
    Fn.ap(Fn.of(1), u),
    Fn.ap(u, Fn.of((f: (a: number) => number) => f(1))),
    envs,
  )
  agree(
    Fn.ap(w, Fn.ap(v, Fn.map(u, comp))),
    Fn.ap(Fn.ap(w, v), u),
    envs,
  )
})

Deno.test('Fn.chain: Monad laws', () => {
  const m: R<number> = (e) => e * 2
  const f = (a: number): R<number> => (e) => a + e
  const g = (a: number): R<number> => (e) => a * (e + 1)
  agree(
    Fn.chain(Fn.chain(m, f), g),
    Fn.chain(m, (a: number) => Fn.chain(f(a), g)),
    envs,
  )
  agree(Fn.chain(Fn.of(5), f), f(5), envs)
  agree(Fn.chain(m, (a: number) => Fn.of(a)), m, envs)
})

Deno.test('Fn.contramap: Contravariant laws', () => {
  const g: R<number> = (e) => e * 2
  const f1 = (s: string) => s.length
  const f2 = (values: readonly string[]) => values.join('')
  agree(Fn.contramap(g, (e: number) => e), g, envs)
  agree(
    Fn.contramap(g, (values: readonly string[]) => f1(f2(values))),
    Fn.contramap(Fn.contramap(g, f1), f2),
    [[], ['ab'], ['a', 'b', 'c']],
  )
})

Deno.test('Fn.promap: Profunctor laws', () => {
  const p: R<number> = (e) => e * 2
  const before1 = (s: string) => s.length
  const before2 = (values: readonly string[]) => values.join('')
  const after1 = (n: number) => n + 1
  const after2 = (n: number) => `<${n}>`
  agree(
    Fn.promap(p, (e: number) => e, (a: number) => a),
    p,
    envs,
  )
  agree(
    Fn.promap(Fn.promap(p, before1, after1), before2, after2),
    Fn.promap(
      p,
      (values: readonly string[]) => before1(before2(values)),
      (n: number) => after2(after1(n)),
    ),
    [[], ['ab'], ['a', 'b', 'c']],
  )
})

Deno.test('Fn.id and Fn.compose: Category laws', () => {
  const f: R<number> = (e) => e * 2
  const g = (n: number) => n + 3
  const h = (n: number) => n * n

  assertEquals((id(Fn) as R<number>)(9), 9)
  agree(Fn.compose(Fn.id<number>(), f), f, envs)
  agree(Fn.compose(f, Fn.id<number>()), f, envs)
  agree(
    Fn.compose(Fn.compose(f, g), h),
    Fn.compose(f, Fn.compose(g, h)),
    envs,
  )
})

// Edge cases

Deno.test('I: returns its argument unchanged', () => {
  assertEquals(I('foo'), 'foo')
  assertEquals(I(42), 42)
  const o = { a: 1 }

  assertEquals(I(o) === o, true)
})

Deno.test('pipe: a set of links is refused', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => pipe(new Set([add(1), sub(1)]) as never)(10),
    TypeError,
    'reduce: Set has no Foldable',
  )
  assertThrows(
    () => pipe(new Set([add(1), doubleNumber]) as never)(10),
    TypeError,
    'reduce: Set has no Foldable',
  )
  assertThrows(
    () => pipeK(new Set([tail, head]) as never)(just([1, 2])),
    TypeError,
    'reduce: Set has no Foldable',
  )
  assertEquals(pipe([...new Set([add(1), doubleNumber])])(10), 22)
})

Deno.test('counterexample: a Set pipeline would expose insertion order', () => {
  // Bypass the type checker to verify the runtime error.
  const f = add(1)
  const g = doubleNumber
  const forward = new Set([f, g])
  const reversed = new Set([g, f])

  assertEquals(forward, reversed)
  assertEquals([...forward], [f, g])
  assertEquals([...reversed], [g, f])
  assertEquals([...forward].reduce((x, h) => h(x), 10), 22)
  assertEquals([...reversed].reduce((x, h) => h(x), 10), 21)
  for (const fs of [forward, reversed]) {
    assertThrows(
      () => pipe(fs as never)(10),
      TypeError,
      'reduce: Set has no Foldable',
    )
  }
})

Deno.test('pipeK: skips later callbacks after Nothing', () => {
  assertEquals(pipeK([tail, head])(just([1])), nothing())
  assertEquals(pipeK([tail, tail, head])(nothing<number[]>()), nothing())
})

Deno.test('Fn as Reader: one environment for the whole computation', () => {
  type Cfg = { host: string; port: number }
  const host = (c: Cfg) => c.host
  const port = (c: Cfg) => c.port

  function formatAddress(h: string) {
    return (p: number) => `${h}:${p}`
  }

  const url = Fn.ap(
    port,
    Fn.map(host, formatAddress),
  )

  assertEquals(url({ host: 'localhost', port: 80 }), 'localhost:80')
})

Deno.test('Fn does not support Foldable', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => toArray(increment as never),
    TypeError,
    'reduce: Fn has no Foldable',
  )
})

Deno.test('pipe and pipeK demand from the type exactly what was promised', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => pipe(42 as never)(1),
    TypeError,
    'reduce: Number has no Foldable',
  )
  assertThrows(
    () => pipeK([increment])(42 as never),
    TypeError,
    'chain: Number has no Chain',
  )
})

Deno.test('on: transforms both inputs and passes each result to its own comparison stage', () => {
  const transformCalls: unknown[][] = []
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []

  function transform(...args: [number]) {
    transformCalls.push(args)
    return args[0] * 10
  }

  function first(...args: [number]) {
    firstCalls.push(args)
    return second
  }

  function second(...args: [number]) {
    secondCalls.push(args)
    return args[0]
  }

  on(first)(transform)(1)(2)

  assertEquals(transformCalls, [[1], [2]])
  assertEquals(firstCalls, [[10]])
  assertEquals(secondCalls, [[20]])
})

Deno.test('pipe: each function receives only the previous result', () => {
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []

  function first(...args: unknown[]) {
    firstCalls.push(args)
    return 1
  }

  function second(...args: unknown[]) {
    secondCalls.push(args)
    return 2
  }

  pipe([first, second])(1)

  assertEquals(firstCalls, [[1]])
  assertEquals(secondCalls, [[1]])
})

Deno.test('pipeK: each function receives only the previous result', () => {
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []

  function first(...args: unknown[]) {
    firstCalls.push(args)
    return just(1)
  }

  function second(...args: unknown[]) {
    secondCalls.push(args)
    return just(2)
  }

  pipeK([first, second])(just(0))

  assertEquals(firstCalls, [[0]])
  assertEquals(secondCalls, [[1]])
})

Deno.test('T: passes only the supplied value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  T(42)(recordArguments)

  assertEquals(calls, [[42]])
})

Deno.test('curry2: passes all 2 arguments in one call', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  curry2(recordArguments)(1)(2)

  assertEquals(calls, [[1, 2]])
})

Deno.test('curry3: passes all 3 arguments in one call', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  curry3(recordArguments)(1)(2)(3)

  assertEquals(calls, [[1, 2, 3]])
})

Deno.test('curry4: passes all 4 arguments in one call', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  curry4(recordArguments)(1)(2)(3)(4)

  assertEquals(calls, [[1, 2, 3, 4]])
})

Deno.test('curry5: passes all 5 arguments in one call', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  curry5(recordArguments)(1)(2)(3)(4)(5)

  assertEquals(calls, [[1, 2, 3, 4, 5]])
})

Deno.test('Fn.map: passes only the function result', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  Fn.map(increment, recordArguments)(1)

  assertEquals(calls, [[2]])
})

Deno.test('Fn.contramap: passes only the input to the adapter', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  Fn.contramap(increment, recordArguments)(1)

  assertEquals(calls, [[1]])
})

Deno.test('Fn.promap: adapters receive only the input and the computed result', () => {
  const beforeCalls: unknown[][] = []
  const afterCalls: unknown[][] = []

  function before(...args: unknown[]) {
    beforeCalls.push(args)
    return 0
  }

  function after(...args: unknown[]) {
    afterCalls.push(args)
    return 0
  }

  Fn.promap(increment, before, after)(1)

  assertEquals(beforeCalls, [[1]])
  assertEquals(afterCalls, [[1]])
})

Deno.test('Fn.compose: passes only the preceding function’s result', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  Fn.compose(increment, recordArguments)(1)

  assertEquals(calls, [[2]])
})

// Type checking

Deno.test('pipe: the input must fit the first step', () => {
  // @ts-expect-error the pipeline starts at a number
  const _text = () => pipe([add(1), Math.sqrt])('99')

  assertEquals(typeof _text, 'function')
})

Deno.test('pipeK: the steps must all use one and the same wrapper', () => {
  const mixed = [(n: number) => just(n), (n: number) => [n]] as const
  // @ts-expect-error the second step leaves Maybe for Array
  const _mixed = () => pipeK(mixed)(just(1))

  assertEquals(typeof _mixed, 'function')
})

Deno.test('pipeK: the input must use the wrapper of the steps', () => {
  const steps = [(n: number) => just(n + 1)] as const
  // @ts-expect-error an array is not a Maybe
  const _array = () => pipeK(steps)([1, 2])

  assertEquals(typeof _array, 'function')
})

type Exact<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false

// Each Assert<Exact<Actual, Expected>> checks a type at compile time.
// A changed inference makes this file fail deno check.
type Assert<T extends true> = T

const unchanged = pipe([])(7)

const counted = pipe([(s: string) => s.length, add(1)])

const tenSteps = pipe([
  add(1),
  (n: number) => `${n}`,
  (s: string) => s.length,
  (n: number) => [n],
  (xs: number[]) => xs.length,
  (n: number) => n > 1,
  (b: boolean) => (b ? 'yes' : 'no'),
  (s: string) => s.length,
  sub(1),
  (n: number) => `${n}`,
])

const elevenSteps = pipe([
  add(1),
  (n: number) => `${n}`,
  (s: string) => s.length,
  (n: number) => [n],
  (xs: number[]) => xs.length,
  (n: number) => n > 1,
  (b: boolean) => (b ? 'yes' : 'no'),
  (s: string) => s.length,
  sub(1),
  add(1),
  (n: number) => `${n}`,
])

const shown = pipeK([
  (n: number) => just(n + 1),
  (n: number) => just(`${n}`),
])(just(1))

const spread = pipeK([(n: number) => [n, n + 1]])([1, 10])

const configured = pipeK([
  (n: number) => (cfg: { a: number }) => n + cfg.a,
  (n: number) => (cfg: { b: number }) => n * cfg.b,
])((cfg: { c: number }) => cfg.c)

// Steps whose own types are too generic to follow, such as ply's own
// combinators, fall back to the Foldable form and give up the result type.
const untracked = pipeK([tail, tail, head])(just([1, 2, 3, 4]))

export type _Pipe = [
  Assert<Exact<typeof unchanged, 7>>,
  Assert<Exact<typeof counted, (x: string) => number>>,
  Assert<Exact<ReturnType<typeof tenSteps>, string>>,
  Assert<Exact<ReturnType<typeof elevenSteps>, unknown>>,
]

export type _PipeK = [
  Assert<Exact<typeof shown, Maybe<string>>>,
  Assert<Exact<typeof spread, number[]>>,
  Assert<
    Exact<
      typeof configured,
      (i: { c: number } & { a: number } & { b: number }) => number
    >
  >,
  Assert<Exact<typeof untracked, unknown>>,
]

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

type R<A> = (env: number) => A

const envs = [0, 1, 7, -3]

const agree = <A, B>(
  f: (a: A) => B,
  g: (a: A) => B,
  probes: readonly A[],
  msg?: string,
) => {
  for (const x of probes) assertEquals(f(x), g(x), msg)
}
