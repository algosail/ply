import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Maybe } from '../../src/data/maybe.ts'
import { reverse, tail } from '../../src/classes/_rebuild.ts'
import { of } from '../../src/classes/applicative.ts'
import { ap } from '../../src/classes/apply.ts'
import { id } from '../../src/classes/category.ts'
import { chain } from '../../src/classes/chain.ts'
import { contramap } from '../../src/classes/contravariant.ts'
import { head, toArray } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { promap } from '../../src/classes/profunctor.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { compose } from '../../src/classes/semigroupoid.ts'
import { show } from '../../src/classes/show.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import {
  curry2,
  curry3,
  curry4,
  curry5,
  Fn,
  I,
  K,
  on,
  once,
  pipe,
  pipeK,
  T,
  tap,
} from '../../src/natives/function.ts'
import { add, sub } from '../../src/natives/number.ts'

test ('K: creates a function that always returns the supplied value', () => {
  assert.deepStrictEqual (K ('foo') ('bar'), 'foo')
  assert.deepStrictEqual (map (K (42)) ([0, 1, 2, 3, 4]), [42, 42, 42, 42, 42])
})

test ('K: the second argument is not looked at at all', () => {
  const k = K (1)

  assert.deepStrictEqual ([k ('x'), k (undefined), k (null)], [1, 1, 1])
})

test ('T: passes a value to a function supplied afterward', () => {
  assert.deepStrictEqual (T (42) (add (1)), 43)
  assert.deepStrictEqual (map (T (100) as never) ([add (1), Math.sqrt] as never), [101, 10])
})

test ('T: this is application the other way round', () => {
  assert.deepStrictEqual (T ('abc') ((s: string) => s.length), 3)
  for (const n of envs) assert.deepStrictEqual (T (n) (increment), increment (n))
})

test ('on: transforms both inputs before applying a curried two-argument function', () => {
  assert.deepStrictEqual (
    on (concat) (reverse) ([1, 2, 3]) ([4, 5, 6]),
    [3, 2, 1, 6, 5, 4],
  )
})

test ('on: both sides go through one and the same preparation', () => {
  function subtractFrom(a: number) {
    return (b: number) => a - b
  }

  const byLength = on (subtractFrom) ((s: string) => s.length)

  assert.deepStrictEqual (byLength ('abcd') ('ab'), 2)
  assert.deepStrictEqual (byLength ('ab') ('abcd'), -2)
  assert.deepStrictEqual (byLength ('') (''), 0)
})

test ('pipe: runs functions from left to right', () => {
  assert.deepStrictEqual (pipe ([add (1), Math.sqrt, sub (1)]) (99), 9)
})

test ('pipe: the links go left to right', () => {
  const trail = pipe ([
    (s: unknown) => `${s}a`,
    (s: unknown) => `${s}b`,
    (s: unknown) => `${s}c`,
  ]) ('')

  assert.deepStrictEqual (trail, 'abc')
})

test ('pipe: an empty pipeline is the identity', () => {
  assert.deepStrictEqual (pipe ([]) (7), 7)
  assert.deepStrictEqual (pipe ([]) ('string'), 'string')
})

test ('pipe: any Foldable will do, not only an array', () => {
  assert.deepStrictEqual (pipe ({ 1: add (1), 2: doubleNumber }) (10), 22)
})

test ('pipeK: chains wrapped computations from left to right', () => {
  assert.deepStrictEqual (pipeK ([tail, tail, head]) (just ([1, 2, 3, 4])), just (3))
})

test ('pipeK: an empty pipeline is the identity', () => {
  assert.deepStrictEqual (pipeK ([]) (just (7)), just (7))
  assert.deepStrictEqual (pipeK ([]) ([1, 2]), [1, 2])
})

test ('pipeK: works in any monad, not only in Maybe', () => {
  function repeatNumber(n: number) {
    return [n, n]
  }

  assert.deepStrictEqual (pipeK ([(n: number) => [n, n + 1]]) ([1, 10]), [1, 2, 10, 11])
  assert.deepStrictEqual (
    pipeK ([repeatNumber, (n: number) => [n + 1]]) ([1]),
    [2, 2],
  )
})

test ('curry2: converts a two-argument function into consecutive one-argument calls', () => {
  assert.deepStrictEqual (curry2 ((a: number, b: number) => a + b) (1) (2), 3)
  assert.deepStrictEqual (curry2 ((a: string, b: string) => a + b) ('a') ('b'), 'ab')
})

test ('curry3: converts a three-argument function into consecutive one-argument calls', () => {
  assert.deepStrictEqual (
    curry3 ((a: number, b: number, c: number) => a + b + c) (1) (2) (3),
    6,
  )
})

test ('curry4: converts a four-argument function into consecutive one-argument calls', () => {
  assert.deepStrictEqual (
    curry4 ((a: number, b: number, c: number, d: number) => a + b + c + d) (1) (2) (
      3,
    ) (4),
    10,
  )
})

test ('curry5: converts a five-argument function into consecutive one-argument calls', () => {
  assert.deepStrictEqual (
    curry5 ((a: number, b: number, c: number, d: number, e: number) =>
      a + b + c + d + e,
    ) (1) (2) (3) (4) (5),
    15,
  )
})

test ('curryN: the argument order is not rearranged', () => {
  const joined = (...values: unknown[]) => values.join ('')

  assert.deepStrictEqual (curry2 (joined) ('a') ('b'), 'ab')
  assert.deepStrictEqual (curry3 (joined) ('a') ('b') ('c'), 'abc')
  assert.deepStrictEqual (curry4 (joined) ('a') ('b') ('c') ('d'), 'abcd')
  assert.deepStrictEqual (curry5 (joined) ('a') ('b') ('c') ('d') ('e'), 'abcde')
})

test ('Fn: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (Fn['@@type'], 'Fn')
  assert.deepStrictEqual (Fn.is (() => 1), true)
  assert.deepStrictEqual (Fn.is (Math.abs), true)
  assert.deepStrictEqual (Fn.is (class {}), true)
  assert.deepStrictEqual (Fn.is ({}), false)
  assert.deepStrictEqual (Fn.is (null), false)
})

test ('Fn.of: a constant that does not read the environment', () => {
  const k = Fn.of (7)
  for (const e of envs) assert.deepStrictEqual (k (e), 7)

  assert.deepStrictEqual ((of (Fn) (7) as R<number>) (9), 7)
})

test ('Fn.map: this is post-composition', () => {
  const f = Fn.map (doubleNumber, increment)
  for (const e of envs) assert.deepStrictEqual (f (e), increment (doubleNumber (e)))

  assert.deepStrictEqual ((map (increment) (doubleNumber) as R<number>) (5), 11)
})

test ('Fn.ap: the environment goes into both halves', () => {
  const h: R<(a: number) => number> = (e) => (a) => a + e
  const g: R<number> = (e) => e * 2
  const applied = Fn.ap (g, h)
  for (const e of envs) assert.deepStrictEqual (applied (e), e * 2 + e)

  assert.deepStrictEqual ((ap (h) (g) as R<number>) (3), 9)
})

test ('Fn.chain: the continuation gets both the result and the environment', () => {
  const g: R<number> = (e) => e * 2
  const f = (a: number): R<number> => (e) => a + e
  const chained = Fn.chain (g, f)
  for (const e of envs) assert.deepStrictEqual (chained (e), e * 2 + e)

  assert.deepStrictEqual ((chain (f) (g) as R<number>) (3), 9)
})

test ('Fn.contramap: this is pre-composition', () => {
  const g: R<number> = (e) => e * 2
  const f = Fn.contramap (g, (s: string) => s.length)

  assert.deepStrictEqual (f ('abc'), 6)
  assert.deepStrictEqual (
    (contramap ((s: string) => s.length) (g) as ((s: string) => number)) (
      'abc',
    ),
    6,
  )
})

test ('Fn.promap: before and after in one arrow', () => {
  const g: R<number> = (e) => e * 2
  const f = Fn.promap (g, (s: string) => s.length, (n: number) => `<${n}>`)

  assert.deepStrictEqual (f ('abc'), '<6>')
  assert.deepStrictEqual (
    (promap ((s: string) => s.length) ((n: number) => `<${n}>`) (
      g,
    ) as ((s: string) => string)) ('abc'),
    '<6>',
  )
})

test ('Fn.promap: this is contramap and map at once', () => {
  const p: R<number> = (e) => e * 2
  const before = (s: string) => s.length
  const after = (n: number) => n + 1
  agree (
    Fn.promap (p, before, after),
    Fn.map (Fn.contramap (p, before), after),
    ['', 'a', 'abcd'],
  )
})

test ('compose: the right arrow first, then the left one', () => {
  assert.deepStrictEqual ((compose (doubleNumber) (increment) as R<number>) (2), 6)
  assert.deepStrictEqual ((compose ((n: number) => n * 10) (increment) as R<number>) (2), 30)
  for (const e of envs) {
    assert.deepStrictEqual (
      Fn.compose (increment, doubleNumber) (e),
      doubleNumber (increment (e)),
    )
  }
})

test ('Fn.map and Fn.compose are one and the same operation', () => {
  const g: R<number> = (e) => e * 2
  agree (Fn.map (g, increment), Fn.compose (g, increment), envs)
})

test ('Fn.show: formats values as readable strings', () => {
  function inc2(n: number) {
    return n + 1
  }

  assert.deepStrictEqual (Fn.show (inc2).startsWith ('function inc2'), true)
  assert.deepStrictEqual (Fn.show (Math.abs).includes ('native code'), true)
  assert.deepStrictEqual (show (inc2), Fn.show (inc2))
})

test ('pipe: passes only the value to Number.parseInt', () => {
  assert.deepStrictEqual (pipe ([Number.parseInt]) ('11'), 11)
  assert.deepStrictEqual (map (T ('11') as never) ([Number.parseInt] as never), [11])
})

test ('Fn.map: Functor laws', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  const g: R<number> = (e) => e * 2
  agree (Fn.map (g, (a: number) => a), g, envs)
  agree (
    Fn.map (g, doubleThenIncrement),
    Fn.map (Fn.map (g, doubleNumber), increment),
    envs,
  )
})

test ('Fn.ap: Apply and Applicative laws', () => {
  const u: R<(a: number) => number> = (e) => (a) => a + e
  const v: R<(a: number) => number> = (e) => (a) => a * e
  const w: R<number> = (e) => e + 100
  const comp =
    (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
      f (g (a))

  agree (Fn.ap (w, Fn.of ((a: number) => a)), w, envs)
  agree (Fn.ap (Fn.of (1), Fn.of (increment)), Fn.of (increment (1)), envs)
  agree (
    Fn.ap (Fn.of (1), u),
    Fn.ap (u, Fn.of ((f: (a: number) => number) => f (1))),
    envs,
  )
  agree (
    Fn.ap (w, Fn.ap (v, Fn.map (u, comp))),
    Fn.ap (Fn.ap (w, v), u),
    envs,
  )
})

test ('Fn.chain: Monad laws', () => {
  const m: R<number> = (e) => e * 2
  const f = (a: number): R<number> => (e) => a + e
  const g = (a: number): R<number> => (e) => a * (e + 1)
  agree (
    Fn.chain (Fn.chain (m, f), g),
    Fn.chain (m, (a: number) => Fn.chain (f (a), g)),
    envs,
  )
  agree (Fn.chain (Fn.of (5), f), f (5), envs)
  agree (Fn.chain (m, (a: number) => Fn.of (a)), m, envs)
})

test ('Fn.contramap: Contravariant laws', () => {
  const g: R<number> = (e) => e * 2
  const f1 = (s: string) => s.length
  const f2 = (values: readonly string[]) => values.join ('')
  agree (Fn.contramap (g, (e: number) => e), g, envs)
  agree (
    Fn.contramap (g, (values: readonly string[]) => f1 (f2 (values))),
    Fn.contramap (Fn.contramap (g, f1), f2),
    [[], ['ab'], ['a', 'b', 'c']],
  )
})

test ('Fn.promap: Profunctor laws', () => {
  const p: R<number> = (e) => e * 2
  const before1 = (s: string) => s.length
  const before2 = (values: readonly string[]) => values.join ('')
  const after1 = (n: number) => n + 1
  const after2 = (n: number) => `<${n}>`
  agree (
    Fn.promap (p, (e: number) => e, (a: number) => a),
    p,
    envs,
  )
  agree (
    Fn.promap (Fn.promap (p, before1, after1), before2, after2),
    Fn.promap (
      p,
      (values: readonly string[]) => before1 (before2 (values)),
      (n: number) => after2 (after1 (n)),
    ),
    [[], ['ab'], ['a', 'b', 'c']],
  )
})

test ('Fn.id and Fn.compose: Category laws', () => {
  const f: R<number> = (e) => e * 2
  const g = (n: number) => n + 3
  const h = (n: number) => n * n

  assert.deepStrictEqual ((id (Fn) as R<number>) (9), 9)
  agree (Fn.compose (Fn.id<number> (), f), f, envs)
  agree (Fn.compose (f, Fn.id<number> ()), f, envs)
  agree (
    Fn.compose (Fn.compose (f, g), h),
    Fn.compose (f, Fn.compose (g, h)),
    envs,
  )
})

test ('I: returns its argument unchanged', () => {
  assert.deepStrictEqual (I ('foo'), 'foo')
  assert.deepStrictEqual (I (42), 42)
  const o = { a: 1 }

  assert.deepStrictEqual (I (o) === o, true)
})

test ('pipe: a set of links is refused', () => {
  assert.throws (
    () => pipe (new Set ([add (1), sub (1)]) as never) (10),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
  assert.throws (
    () => pipe (new Set ([add (1), doubleNumber]) as never) (10),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
  assert.throws (
    () => pipeK (new Set ([tail, head]) as never) (just ([1, 2])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
  assert.deepStrictEqual (pipe ([...new Set ([add (1), doubleNumber])]) (10), 22)
})

test ('counterexample: a Set pipeline would expose insertion order', () => {
  const f = add (1)
  const g = doubleNumber
  const forward = new Set ([f, g])
  const reversed = new Set ([g, f])

  assert.deepStrictEqual (forward, reversed)
  assert.deepStrictEqual ([...forward], [f, g])
  assert.deepStrictEqual ([...reversed], [g, f])
  assert.deepStrictEqual ([...forward].reduce ((x, h) => h (x), 10), 22)
  assert.deepStrictEqual ([...reversed].reduce ((x, h) => h (x), 10), 21)
  for (const fs of [forward, reversed]) {
    assert.throws (
      () => pipe (fs as never) (10),
      (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    )
  }
})

test ('pipeK: skips later callbacks after Nothing', () => {
  assert.deepStrictEqual (pipeK ([tail, head]) (just ([1])), nothing ())
  assert.deepStrictEqual (pipeK ([tail, tail, head]) (nothing<number[]> ()), nothing ())
})

test ('Fn as Reader: one environment for the whole computation', () => {
  type Cfg = { host: string; port: number }
  const host = (c: Cfg) => c.host
  const port = (c: Cfg) => c.port

  function formatAddress(h: string) {
    return (p: number) => `${h}:${p}`
  }

  const url = Fn.ap (
    port,
    Fn.map (host, formatAddress),
  )

  assert.deepStrictEqual (url ({ host: 'localhost', port: 80 }), 'localhost:80')
})

test ('Fn does not support Foldable', () => {
  assert.throws (
    () => toArray (increment as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Fn has no Foldable'),
  )
})

test ('pipe and pipeK demand from the type exactly what was promised', () => {
  assert.throws (
    () => pipe (42 as never) (1),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Number has no Foldable'),
  )
  assert.throws (
    () => pipeK ([increment]) (42 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('chain: Number has no Chain'),
  )
})

test ('on: transforms both inputs and passes each result to its own comparison stage', () => {
  const transformCalls: unknown[][] = []
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []

  function transform(...args: [number]) {
    transformCalls.push (args)
    return args[0] * 10
  }

  function first(...args: [number]) {
    firstCalls.push (args)
    return second
  }

  function second(...args: [number]) {
    secondCalls.push (args)
    return args[0]
  }

  on (first) (transform) (1) (2)

  assert.deepStrictEqual (transformCalls, [[1], [2]])
  assert.deepStrictEqual (firstCalls, [[10]])
  assert.deepStrictEqual (secondCalls, [[20]])
})

test ('pipe: each function receives only the previous result', () => {
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []

  function first(...args: unknown[]) {
    firstCalls.push (args)
    return 1
  }

  function second(...args: unknown[]) {
    secondCalls.push (args)
    return 2
  }

  pipe ([first, second]) (1)

  assert.deepStrictEqual (firstCalls, [[1]])
  assert.deepStrictEqual (secondCalls, [[1]])
})

test ('pipeK: each function receives only the previous result', () => {
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []

  function first(...args: unknown[]) {
    firstCalls.push (args)
    return just (1)
  }

  function second(...args: unknown[]) {
    secondCalls.push (args)
    return just (2)
  }

  pipeK ([first, second]) (just (0))

  assert.deepStrictEqual (firstCalls, [[0]])
  assert.deepStrictEqual (secondCalls, [[1]])
})

test ('T: passes only the supplied value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  T (42) (recordArguments)

  assert.deepStrictEqual (calls, [[42]])
})

test ('curry2: passes all 2 arguments in one call', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  curry2 (recordArguments) (1) (2)

  assert.deepStrictEqual (calls, [[1, 2]])
})

test ('curry3: passes all 3 arguments in one call', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  curry3 (recordArguments) (1) (2) (3)

  assert.deepStrictEqual (calls, [[1, 2, 3]])
})

test ('curry4: passes all 4 arguments in one call', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  curry4 (recordArguments) (1) (2) (3) (4)

  assert.deepStrictEqual (calls, [[1, 2, 3, 4]])
})

test ('curry5: passes all 5 arguments in one call', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  curry5 (recordArguments) (1) (2) (3) (4) (5)

  assert.deepStrictEqual (calls, [[1, 2, 3, 4, 5]])
})

test ('Fn.map: passes only the function result', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Fn.map (increment, recordArguments) (1)

  assert.deepStrictEqual (calls, [[2]])
})

test ('Fn.contramap: passes only the input to the adapter', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Fn.contramap (increment, recordArguments) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('Fn.promap: adapters receive only the input and the computed result', () => {
  const beforeCalls: unknown[][] = []
  const afterCalls: unknown[][] = []

  function before(...args: unknown[]) {
    beforeCalls.push (args)
    return 0
  }

  function after(...args: unknown[]) {
    afterCalls.push (args)
    return 0
  }

  Fn.promap (increment, before, after) (1)

  assert.deepStrictEqual (beforeCalls, [[1]])
  assert.deepStrictEqual (afterCalls, [[1]])
})

test ('Fn.compose: passes only the preceding function’s result', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  Fn.compose (increment, recordArguments) (1)

  assert.deepStrictEqual (calls, [[2]])
})

test ('pipe: the input must fit the first step', () => {
  // @ts-expect-error the pipeline starts at a number
  const _text = () => pipe ([add (1), Math.sqrt]) ('99')

  assert.deepStrictEqual (typeof _text, 'function')
})

test ('pipeK: the steps must all use one and the same wrapper', () => {
  const mixed = [(n: number) => just (n), (n: number) => [n]] as const
  // @ts-expect-error the second step leaves Maybe for Array
  const _mixed = () => pipeK (mixed) (just (1))

  assert.deepStrictEqual (typeof _mixed, 'function')
})

test ('pipeK: the input must use the wrapper of the steps', () => {
  const steps = [(n: number) => just (n + 1)] as const
  // @ts-expect-error an array is not a Maybe
  const _array = () => pipeK (steps) ([1, 2])

  assert.deepStrictEqual (typeof _array, 'function')
})

test ('tap: runs the effect and hands the value on unchanged', () => {
  const seen: number[] = []
  assert.deepStrictEqual (map (tap ((n: number) => seen.push (n))) ([1, 2, 3]), [1, 2, 3])
  assert.deepStrictEqual (seen, [1, 2, 3])
})

test ('tap: what the effect returns is thrown away', () => {
  assert.deepStrictEqual (tap ((n: number) => n * 2) (3), 3)
})

test ('once: runs at most once and keeps that answer', () => {
  let calls = 0
  const next = once ((n: number) => (calls += 1, n + 1))

  assert.deepStrictEqual (next (1), 2)
  assert.deepStrictEqual (next (9), 2, 'the later arguments are not looked at')
  assert.deepStrictEqual (calls, 1)
})

test ('once: an answer of undefined is still an answer', () => {
  let calls = 0
  const nothing = once (() => {
    calls += 1
  })

  nothing ()
  nothing ()
  assert.deepStrictEqual (calls, 1)
})

type Exact<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false

type Assert<T extends true> = T

const unchanged = pipe ([]) (7)

const counted = pipe ([(s: string) => s.length, add (1)])

const tenSteps = pipe ([
  add (1),
  (n: number) => `${n}`,
  (s: string) => s.length,
  (n: number) => [n],
  (xs: number[]) => xs.length,
  (n: number) => n > 1,
  (b: boolean) => (b ? 'yes' : 'no'),
  (s: string) => s.length,
  sub (1),
  (n: number) => `${n}`,
])

const elevenSteps = pipe ([
  add (1),
  (n: number) => `${n}`,
  (s: string) => s.length,
  (n: number) => [n],
  (xs: number[]) => xs.length,
  (n: number) => n > 1,
  (b: boolean) => (b ? 'yes' : 'no'),
  (s: string) => s.length,
  sub (1),
  add (1),
  (n: number) => `${n}`,
])

const shown = pipeK ([
  (n: number) => just (n + 1),
  (n: number) => just (`${n}`),
]) (just (1))

const spread = pipeK ([(n: number) => [n, n + 1]]) ([1, 10])

const configured = pipeK ([
  (n: number) => (cfg: { a: number }) => n + cfg.a,
  (n: number) => (cfg: { b: number }) => n * cfg.b,
]) ((cfg: { c: number }) => cfg.c)

const untracked = pipeK ([tail, tail, head]) (just ([1, 2, 3, 4]))

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
  for (const x of probes) assert.deepStrictEqual (f (x), g (x), msg)
}
