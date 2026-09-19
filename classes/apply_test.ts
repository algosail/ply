import { assertEquals, assertThrows } from '@std/assert'
import { ap, apFirst, applyNatives, apSecond, lift2, lift3 } from './apply.ts'
import { map } from './functor.ts'
import { foldMap } from './foldable.ts'
import { sequence, traverse } from './traversable.ts'
import { identity } from '../data/identity.ts'
import { just, nothing } from '../data/maybe.ts'
import { Either, either, left, right } from '../data/either.ts'
import { pair } from '../data/pair.ts'
import { show } from './show.ts'
import { Concat } from '../data/monoid.ts'
import { Arr } from '../natives/array.ts'

// Examples

Deno.test('ap: applies wrapped functions to wrapped values', () => {
  assertEquals(ap([increment])([1, 2]), [2, 3])
  assertEquals(
    ap(new Set([increment]))(new Set([1, 2])),
    new Set([2, 3]),
  )
  assertEquals(ap(just(increment))(just(1)), just(2))
  assertEquals(
    ap(just(increment))(nothing<number>()),
    nothing<number>(),
  )
  assertEquals(
    ap(nothing<(a: number) => number>())(just(1)),
    nothing<number>(),
  )
  assertEquals(
    ap(right<string, (a: number) => number>(increment))(
      right<string, number>(1),
    ),
    right<string, number>(2),
  )
  assertEquals(ap(identity(increment))(identity(1)), identity(2))
  assertEquals(
    ap(pair('l', increment))(pair('r', 1)),
    pair('lr', 2),
  )
})

Deno.test('ap: an empty function or value array produces no results', () => {
  assertEquals(ap([])([1, 2]), [])
  assertEquals(ap([increment])([]), [])
  assertEquals(ap([])([]), [])
})

Deno.test('ap: processes the functions before the values', () => {
  const witness = ap(logged('F', increment) as never)(logged('A', 1) as never)

  assertEquals(logOf(witness), 'FA')
  assertEquals(valueOf_(witness), 2)

  assertEquals(
    either((e: string) => e)(String)(
      ap(left<string, (n: number) => number>('first') as never)(
        left<string, number>('second') as never,
      ) as never,
    ),
    'first',
  )
  assertEquals(
    either((e: string) => e)(String)(
      ap(right<string, (n: number) => number>(increment) as never)(
        left<string, number>('second') as never,
      ) as never,
    ),
    'second',
  )
  assertEquals(ap([increment, (n: number) => -n] as never)([1, 2] as never), [
    2,
    3,
    -1,
    -2,
  ])
  assertEquals(
    ap(pair('a', increment) as never)(pair('b', 1) as never),
    pair('ab', 2),
  )
})

Deno.test('ap: gives both functions the same input', () => {
  const h = (i: number) => (a: number) => a + i
  const g = (i: number) => i * 2

  assertEquals((ap(h)(g) as (i: number) => number)(3), 9)
})

Deno.test('ap: changing function order changes result order', () => {
  const u = [increment, doubleNumber]
  const v = [decrement]
  const w = [1, 2]

  assertEquals(ap(u)(ap(v)(w)), [
    1,
    2,
    0,
    2,
  ])
  assertEquals(ap(v)(ap(u)(w)), [
    1,
    2,
    1,
    3,
  ])
})

Deno.test('traverse: preserves the order of accumulated logs', () => {
  const tag = (n: number) => logged(String(n), n)

  assertEquals(
    logOf(traverse(Logged as never)(tag as never)([1, 2, 3] as never)),
    '123',
  )
  assertEquals(foldMap(Concat)(String)([1, 2, 3] as never), '123')
})

Deno.test('traverse: preserves the first Left error', () => {
  const boom = (n: number) =>
    n < 0 ? left<string, number>('err' + n) : right<string, number>(n)
  const cases: readonly (readonly [string, number[], string])[] = [
    ['refusal first', [-1, 2, -3], 'err-1'],
    ['refusal in the middle', [1, -2, -3], 'err-2'],
    ['refusal last', [1, 2, -3], 'err-3'],
  ]
  for (const [label, values, want] of cases) {
    assertEquals(
      either((e: string) => e)(() => 'no refusal')(
        traverse(Either)(boom)(values),
      ),
      want,
      label,
    )
  }
})

Deno.test('traverse: the last array varies fastest in the combinations', () => {
  assertEquals(sequence(Arr)([[1, 2], [3, 4]]), [
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
  ])
  assertEquals(sequence(Arr)([[1, 2], [3, 4], [5, 6]]).length, 8)
  assertEquals(sequence(Arr)([[1, 2], [3, 4], [5, 6]])[1], [1, 3, 6])
})

Deno.test('traverse: collects array results from supported wrappers', () => {
  const both = (n: number) => [n, -n]
  const sources: Record<string, unknown> = {
    'Array': [1, 2],
    'Maybe': just(1),
    'Either': right<string, number>(1),
    'Identity': identity(1),
    'Pair': pair('x', 1),
  }
  for (const [name, source] of Object.entries(sources)) {
    const got = traverse(Arr)(both as never)(source as never) as unknown[]

    assertEquals(Array.isArray(got), true, name)
    assertEquals(got.length >= 1, true, name)
  }
})

Deno.test('lift2: applies a curried two-argument function to two wrapped values', () => {
  function joinNumberAndText(a: number) {
    return (b: string) => `${a}${b}`
  }

  assertEquals(
    lift2<number, string, string>(joinNumberAndText)([1, 2])(['x', 'y']),
    ['1x', '1y', '2x', '2y'],
  )

  function addValues(a: number) {
    return (b: number) => a + b
  }

  assertEquals(
    lift2<number, number, number>(addValues)(just(1))(just(2)),
    just(3),
  )
  assertEquals(
    lift2<number, number, number>(addValues)(just(1))(nothing<number>()),
    nothing<number>(),
  )
  assertEquals(
    lift2<number, number, number>(addValues)(pair('A', 1))(pair('B', 2)),
    pair('AB', 3),
  )
})

Deno.test('lift2: preserves the first Left when both inputs fail', () => {
  function joinValues(a: string) {
    return (b: string) => a + b
  }

  assertEquals(
    either((e: string) => e)(String)(
      lift2<string, string, string>(joinValues)(left<string, string>('first'))(
        left<string, string>('second'),
      ),
    ),
    'first',
  )
})

Deno.test('lift3: applies a curried three-argument function to three wrapped values', () => {
  function joinThreeNumbers(a: number) {
    return (b: number) => (c: number) => `${a}${b}${c}`
  }

  assertEquals(
    lift3<number, number, number, string>(joinThreeNumbers)([1, 2])([3])([
      4,
      5,
    ]),
    ['134', '135', '234', '235'],
  )

  function addThreeValues(a: number) {
    return (b: number) => (c: number) => a + b + c
  }

  assertEquals(
    lift3<number, number, number, number>(addThreeValues)(pair('A', 1))(
      pair('B', 2),
    )(pair('C', 3)),
    pair('ABC', 6),
  )
})

Deno.test('lift3: preserves the first Left when all inputs fail', () => {
  function joinThreeValues(a: string) {
    return (b: string) => (c: string) => a + b + c
  }

  assertEquals(
    either((e: string) => e)(String)(
      lift3<string, string, string, string>(joinThreeValues)(
        left<string, string>('1'),
      )(left<string, string>('2'))(left<string, string>('3')),
    ),
    '1',
  )
})

Deno.test('apFirst: combines both inputs and keeps the first value', () => {
  assertEquals(apFirst([1, 2])([3, 4]), [1, 1, 2, 2])
  assertEquals(apFirst(just(1))(just(2)), just(1))
  assertEquals(
    apFirst(just(1))(nothing<number>()),
    nothing<number>(),
  )
  assertEquals(
    apFirst(nothing<number>())(just(2)),
    nothing<number>(),
  )
  assertEquals(apFirst(identity(1))(identity(2)), identity(1))
  assertEquals(
    apFirst(pair('A', 1))(pair('B', 2)),
    pair('AB', 1),
  )
  assertEquals(
    (apFirst((r: number) => r + 1)((r: number) => r * 2) as (
      r: number,
    ) => number)(10),
    11,
  )
})

Deno.test('apSecond: combines both inputs and keeps the second value', () => {
  assertEquals(apSecond([1, 2])([3, 4]), [3, 4, 3, 4])
  assertEquals(apSecond(just(1))(just(2)), just(2))
  assertEquals(
    apSecond(just(1))(nothing<number>()),
    nothing<number>(),
  )
  assertEquals(
    apSecond(nothing<number>())(just(2)),
    nothing<number>(),
  )
  assertEquals(
    apSecond(identity(1))(identity(2)),
    identity(2),
  )
  assertEquals(
    apSecond(pair('A', 1))(pair('B', 2)),
    pair('AB', 2),
  )
  assertEquals(
    (apSecond((r: number) => r + 1)((r: number) => r * 2) as (
      r: number,
    ) => number)(10),
    20,
  )
})

Deno.test('apFirst and apSecond: both effects happen, the log runs left to right', () => {
  const first = apFirst(logged('A', 1) as never)(logged('B', 2) as never)

  assertEquals([logOf(first), valueOf_(first)], ['AB', 1])
  const second = apSecond(logged('A', 1) as never)(logged('B', 2) as never)

  assertEquals([logOf(second), valueOf_(second)], ['AB', 2])
  for (const f of [apFirst, apSecond]) {
    assertEquals(
      either((e: string) => e)(String)(
        f(left<string, number>('first') as never)(
          left<string, number>('second') as never,
        ) as never,
      ),
      'first',
    )
  }
})

// Laws

Deno.test('ap: composition law across supported types', () => {
  for (const [name, { u, v, w }] of Object.entries(triples)) {
    assertEquals(
      ap(ap(map(composeFunctions)(u as never) as never)(v as never) as never)(
        w as never,
      ),
      ap(u as never)(ap(v as never)(w as never) as never),
      name,
    )
  }
})

Deno.test('ap: composition law on functions', () => {
  const u = (i: number) => (n: number) => n + i
  const v = (i: number) => (n: number) => n * i
  const w = (i: number) => i + 100
  const lhs = ap(ap(map(composeFunctions)(u))(v))(w) as (
    i: number,
  ) => number
  const rhs = ap(u)(ap(v)(w)) as (
    i: number,
  ) => number
  for (const i of [0, 1, 2, 7]) assertEquals(lhs(i), rhs(i), `at i=${i}`)
})

// Edge cases

Deno.test('ap: rejects values without Apply', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => ap([increment] as never)(new Map([['a', 1]]) as never),
    TypeError,
    'ap: Map has no Apply',
  )
  assertThrows(
    () => ap([increment] as never)({ a: 1 } as never),
    TypeError,
    'ap: StrMap has no Apply',
  )
  assertThrows(
    () => ap([increment] as never)('string' as never),
    TypeError,
    'ap: String has no Apply',
  )
})

Deno.test('ap: parseInt receives no array index as its radix', () => {
  assertEquals(ap([Number.parseInt])(['1', '2', '3']), [1, 2, 3])
})

Deno.test('ap: Array passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  ap([recordArguments])([1, 2])

  assertEquals(calls, [[1], [2]])
})

Deno.test('ap: Set passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  ap(new Set([recordArguments]))(new Set([1, 2]))

  assertEquals(calls, [[1], [2]])
})

Deno.test('ap: Maybe passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  ap(just(recordArguments))(just(1))

  assertEquals(calls, [[1]])
})

Deno.test('ap: Either passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  ap(right<string, typeof recordArguments>(recordArguments))(
    right<string, number>(1),
  )

  assertEquals(calls, [[1]])
})

Deno.test('ap: Identity passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  ap(identity(recordArguments))(identity(1))

  assertEquals(calls, [[1]])
})

Deno.test('ap: Pair passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  ap(pair('l', recordArguments))(pair('l', 1))

  assertEquals(calls, [[1]])
})

Deno.test('ap: Function passes only the computed value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  function returnInput(value: number) {
    return value
  }

  function provideFunction(_input: number) {
    return recordArguments
  }

  const applied = ap(provideFunction)(returnInput)
  applied(1)

  assertEquals(calls, [[1]])
})

Deno.test('lift2: Array passes one value to each stage', () => {
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []

  function first(...args: unknown[]) {
    firstCalls.push(args)
    return second
  }

  function second(...args: unknown[]) {
    secondCalls.push(args)
    return 2
  }

  lift2(first)([1])([2])

  assertEquals(firstCalls, [[1]])
  assertEquals(secondCalls, [[2]])
})

Deno.test('lift2: Maybe passes one value to each stage', () => {
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []

  function first(...args: unknown[]) {
    firstCalls.push(args)
    return second
  }

  function second(...args: unknown[]) {
    secondCalls.push(args)
    return 2
  }

  lift2(first)(just(1))(just(2))

  assertEquals(firstCalls, [[1]])
  assertEquals(secondCalls, [[2]])
})

Deno.test('lift3: Array passes one value to each stage', () => {
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []
  const thirdCalls: unknown[][] = []

  function first(...args: unknown[]) {
    firstCalls.push(args)
    return second
  }

  function second(...args: unknown[]) {
    secondCalls.push(args)
    return third
  }

  function third(...args: unknown[]) {
    thirdCalls.push(args)
    return 3
  }

  lift3(first)([1])([2])([3])

  assertEquals(firstCalls, [[1]])
  assertEquals(secondCalls, [[2]])
  assertEquals(thirdCalls, [[3]])
})

// Type checking

Deno.test('ap and lift types: reject mixed Array and Set wrappers', () => {
  const arrOfFns = [increment]
  const setOfFns = new Set([increment])
  const arr = [1, 2]
  const set = new Set([3])

  // @ts-expect-error functions from an Array, a value from a Set
  const _apMixed = () => ap(arrOfFns)(set)
  // @ts-expect-error and the same the other way round
  const _apMixedBack = () => ap(setOfFns)(arr)
  // @ts-expect-error lift2 anchors on its first operand
  const _lift2Mixed = () => lift2(add)(arr)(set)
  // @ts-expect-error lift3 checks the second operand against the first
  const _lift3MixedB = () => lift3(add3)(arr)(set)(arr)
  // @ts-expect-error ...and the third against the first as well
  const _lift3MixedC = () => lift3(add3)(arr)(arr)(set)
  // @ts-expect-error apFirst keeps the value of the first operand
  const _apFirstMixed = () => apFirst(arr)(set)
  // @ts-expect-error apSecond keeps the value of the second
  const _apSecondMixed = () => apSecond(arr)(set)

  assertEquals(typeof _apMixed, 'function')
})

Deno.test('ap and lift types: require matching Pair accumulator types', () => {
  const glue = pair<string, (n: number) => number>('l', increment)
  const byArray = pair<number[], number>([1], 1)
  const byString = pair<string, number>('r', 1)
  const wider = pair<string | number[], (n: number) => number>('w', increment)
  const narrow = pair<'r', number>('r', 1)

  // @ts-expect-error a string accumulator against an array of numbers
  const _apAcc = () => ap(glue)(byArray)
  // @ts-expect-error lift2 glues its accumulators the same way
  const _lift2Acc = () => lift2(add)(byString)(byArray)
  // @ts-expect-error and so do the second and third operands of lift3
  const _lift3Acc = () => lift3(add3)(byString)(byArray)(byString)
  // @ts-expect-error apFirst glues even though it keeps only one value
  const _apFirstAcc = () => apFirst(byString)(byArray)
  // @ts-expect-error and apSecond likewise
  const _apSecondAcc = () => apSecond(byString)(byArray)

  // @ts-expect-error the anchor is a union, and a union is not one semigroup
  const _apUnionAnchor = () => ap(wider)(byArray)
  // @ts-expect-error nor does a narrower literal fit a wider accumulator
  const _apNarrow = () => ap(glue)(narrow)

  assertEquals(show(ap(glue)(byString)), 'Pair ("lr") (2)')
})

Deno.test('Pair types: annotate a shared accumulator type before combining values', () => {
  const inlineLog = pair({ a: 1 }, 1)
  const otherLog = pair({ b: 2 }, 2)
  // @ts-expect-error two object literals are two different types
  const _bad = () => lift2(add)(inlineLog)(otherLog)

  type Log = Record<string, number>

  assertEquals(
    lift2(add)(pair<Log, number>({ a: 1 }, 1))(pair<Log, number>({ b: 2 }, 2)),
    pair<Log, number>({ a: 1, b: 2 }, 3),
  )

  const pinned = pair<'W', (n: number) => number>('W', increment)
  const alsoPinned = pair<'W', number>('W', 1)

  assertEquals(show(ap(pinned)(alsoPinned)), 'Pair ("WW") (2)')
})

// Native operation tables

Deno.test('applyNatives: lists the supported native implementations', () => {
  assertEquals(
    new Set(Object.keys(applyNatives)),
    new Set(['Array', 'Fn', 'Set']),
  )
  assertEquals(
    [
      applyNatives.Array['@@type'],
      applyNatives.Fn['@@type'],
      applyNatives.Set['@@type'],
    ],
    ['Array', 'Fn', 'Set'],
  )
  assertEquals(applyNatives.Array.ap([1, 2], [increment]), [2, 3])
  assertEquals(
    applyNatives.Set.ap(new Set([1, 2]), new Set([increment])),
    new Set([2, 3]),
  )
})

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const decrement = (n: number) => n - 1

const composeFunctions =
  (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
    f(g(a))

interface Logged<A> {
  readonly '@@type': 'Logged'
  readonly log: string
  readonly value: A
  map<B>(f: (a: A) => B): Logged<B>
  ap<B>(wrappedFunctions: Logged<(a: A) => B>): Logged<B>
}

const logged = <A>(log: string, value: A): Logged<A> => ({
  '@@type': 'Logged',
  log,
  value,
  map<B>(f: (a: A) => B): Logged<B> {
    return logged(log, f(value))
  },

  ap<B>(wrappedFunctions: Logged<(a: A) => B>): Logged<B> {
    return logged(wrappedFunctions.log + log, wrappedFunctions.value(value))
  },
})

const Logged = {
  '@@type': 'Logged' as const,
  _shape: undefined as never,
  of: <A>(a: A): Logged<A> => logged('', a),
}

const logOf = (x: unknown): string => (x as Logged<unknown>).log

const valueOf_ = (x: unknown): unknown => (x as Logged<unknown>).value

interface Triple {
  readonly u: unknown
  readonly v: unknown
  readonly w: unknown
}

const triples: Record<string, Triple> = {
  'Array': {
    u: [increment, doubleNumber],
    v: [decrement, doubleNumber],
    w: [1, 2],
  },
  'Set': {
    u: new Set([increment, doubleNumber]),
    v: new Set([decrement]),
    w: new Set([1, 2]),
  },
  'Maybe.Just': { u: just(increment), v: just(doubleNumber), w: just(1) },
  'Maybe.Nothing': {
    u: just(increment),
    v: nothing<(a: number) => number>(),
    w: just(1),
  },
  'Either.Right': {
    u: right<string, (a: number) => number>(increment),
    v: right<string, (a: number) => number>(doubleNumber),
    w: right<string, number>(1),
  },
  'Either.Left': {
    u: left<string, (a: number) => number>('error'),
    v: right<string, (a: number) => number>(doubleNumber),
    w: right<string, number>(1),
  },
  'Identity': {
    u: identity(increment),
    v: identity(doubleNumber),
    w: identity(1),
  },
  'Pair': {
    u: pair('u', increment),
    v: pair('v', doubleNumber),
    w: pair('w', 1),
  },
}

const add = (a: number) => (b: number) => a + b

const add3 = (a: number) => (b: number) => (c: number) => a + b + c
