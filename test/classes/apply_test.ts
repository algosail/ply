import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ap, apFirst, applyNatives, apSecond, lift2, lift3 } from '../../src/classes/apply.ts'
import { foldMap } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { show } from '../../src/classes/show.ts'
import { sequence, traverse } from '../../src/classes/traversable.ts'
import { Either, either, left, right } from '../../src/data/either.ts'
import { identity } from '../../src/data/identity.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { Concat } from '../../src/data/monoid.ts'
import { pair } from '../../src/data/pair.ts'
import { Arr } from '../../src/natives/array.ts'

test ('ap: applies wrapped functions to wrapped values', () => {
  assert.deepStrictEqual (ap ([increment]) ([1, 2]), [2, 3])
  assert.deepStrictEqual (
    ap (new Set ([increment])) (new Set ([1, 2])),
    new Set ([2, 3]),
  )
  assert.deepStrictEqual (ap (just (increment)) (just (1)), just (2))
  assert.deepStrictEqual (
    ap (just (increment)) (nothing<number> ()),
    nothing<number> (),
  )
  assert.deepStrictEqual (
    ap (nothing<(a: number) => number> ()) (just (1)),
    nothing<number> (),
  )
  assert.deepStrictEqual (
    ap (right<string, (a: number) => number> (increment)) (
      right<string, number> (1),
    ),
    right<string, number> (2),
  )
  assert.deepStrictEqual (ap (identity (increment)) (identity (1)), identity (2))
  assert.deepStrictEqual (
    ap (pair ('l', increment)) (pair ('r', 1)),
    pair ('lr', 2),
  )
})

test ('ap: an empty function or value array produces no results', () => {
  assert.deepStrictEqual (ap ([]) ([1, 2]), [])
  assert.deepStrictEqual (ap ([increment]) ([]), [])
  assert.deepStrictEqual (ap ([]) ([]), [])
})

test ('ap: processes the functions before the values', () => {
  const witness = ap (logged ('F', increment) as never) (logged ('A', 1) as never)

  assert.deepStrictEqual (logOf (witness), 'FA')
  assert.deepStrictEqual (valueOf_ (witness), 2)

  assert.deepStrictEqual (
    either ((e: string) => e) (String) (
      ap (left<string, (n: number) => number> ('first') as never) (
        left<string, number> ('second') as never,
      ) as never,
    ),
    'first',
  )
  assert.deepStrictEqual (
    either ((e: string) => e) (String) (
      ap (right<string, (n: number) => number> (increment) as never) (
        left<string, number> ('second') as never,
      ) as never,
    ),
    'second',
  )
  assert.deepStrictEqual (ap ([increment, (n: number) => -n] as never) ([1, 2] as never), [
    2,
    3,
    -1,
    -2,
  ])
  assert.deepStrictEqual (
    ap (pair ('a', increment) as never) (pair ('b', 1) as never),
    pair ('ab', 2),
  )
})

test ('ap: gives both functions the same input', () => {
  const h = (i: number) => (a: number) => a + i
  const g = (i: number) => i * 2

  assert.deepStrictEqual ((ap (h) (g) as (i: number) => number) (3), 9)
})

test ('ap: changing function order changes result order', () => {
  const u = [increment, doubleNumber]
  const v = [decrement]
  const w = [1, 2]

  assert.deepStrictEqual (ap (u) (ap (v) (w)), [
    1,
    2,
    0,
    2,
  ])
  assert.deepStrictEqual (ap (v) (ap (u) (w)), [
    1,
    2,
    1,
    3,
  ])
})

test ('traverse: preserves the order of accumulated logs', () => {
  const tag = (n: number) => logged (String (n), n)

  assert.deepStrictEqual (
    logOf (traverse (Logged as never) (tag as never) ([1, 2, 3] as never)),
    '123',
  )
  assert.deepStrictEqual (foldMap (Concat) (String) ([1, 2, 3] as never), '123')
})

test ('traverse: preserves the first Left error', () => {
  const boom = (n: number) =>
    n < 0 ? left<string, number> ('err' + n) : right<string, number> (n)
  const cases: readonly (readonly [string, number[], string])[] = [
    ['refusal first', [-1, 2, -3], 'err-1'],
    ['refusal in the middle', [1, -2, -3], 'err-2'],
    ['refusal last', [1, 2, -3], 'err-3'],
  ]
  for (const [label, values, want] of cases) {
    assert.deepStrictEqual (
      either ((e: string) => e) (() => 'no refusal') (
        traverse (Either) (boom) (values),
      ),
      want,
      label,
    )
  }
})

test ('traverse: the last array varies fastest in the combinations', () => {
  assert.deepStrictEqual (sequence (Arr) ([[1, 2], [3, 4]]), [
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
  ])
  assert.deepStrictEqual (sequence (Arr) ([[1, 2], [3, 4], [5, 6]]).length, 8)
  assert.deepStrictEqual (sequence (Arr) ([[1, 2], [3, 4], [5, 6]])[1], [1, 3, 6])
})

test ('traverse: collects array results from supported wrappers', () => {
  const both = (n: number) => [n, -n]
  const sources: Record<string, unknown> = {
    Array: [1, 2],
    Maybe: just (1),
    Either: right<string, number> (1),
    Identity: identity (1),
    Pair: pair ('x', 1),
  }
  for (const [name, source] of Object.entries (sources)) {
    const got = traverse (Arr) (both as never) (source as never) as unknown[]

    assert.deepStrictEqual (Array.isArray (got), true, name)
    assert.deepStrictEqual (got.length >= 1, true, name)
  }
})

test ('lift2: applies a curried two-argument function to two wrapped values', () => {
  function joinNumberAndText(a: number) {
    return (b: string) => `${a}${b}`
  }

  assert.deepStrictEqual (
    lift2<number, string, string> (joinNumberAndText) ([1, 2]) (['x', 'y']),
    ['1x', '1y', '2x', '2y'],
  )

  function addValues(a: number) {
    return (b: number) => a + b
  }

  assert.deepStrictEqual (
    lift2<number, number, number> (addValues) (just (1)) (just (2)),
    just (3),
  )
  assert.deepStrictEqual (
    lift2<number, number, number> (addValues) (just (1)) (nothing<number> ()),
    nothing<number> (),
  )
  assert.deepStrictEqual (
    lift2<number, number, number> (addValues) (pair ('A', 1)) (pair ('B', 2)),
    pair ('AB', 3),
  )
})

test ('lift2: preserves the first Left when both inputs fail', () => {
  function joinValues(a: string) {
    return (b: string) => a + b
  }

  assert.deepStrictEqual (
    either ((e: string) => e) (String) (
      lift2<string, string, string> (joinValues) (left<string, string> ('first')) (
        left<string, string> ('second'),
      ),
    ),
    'first',
  )
})

test ('lift3: applies a curried three-argument function to three wrapped values', () => {
  function joinThreeNumbers(a: number) {
    return (b: number) => (c: number) => `${a}${b}${c}`
  }

  assert.deepStrictEqual (
    lift3<number, number, number, string> (joinThreeNumbers) ([1, 2]) ([3]) ([
      4,
      5,
    ]),
    ['134', '135', '234', '235'],
  )

  function addThreeValues(a: number) {
    return (b: number) => (c: number) => a + b + c
  }

  assert.deepStrictEqual (
    lift3<number, number, number, number> (addThreeValues) (pair ('A', 1)) (
      pair ('B', 2),
    ) (pair ('C', 3)),
    pair ('ABC', 6),
  )
})

test ('lift3: preserves the first Left when all inputs fail', () => {
  function joinThreeValues(a: string) {
    return (b: string) => (c: string) => a + b + c
  }

  assert.deepStrictEqual (
    either ((e: string) => e) (String) (
      lift3<string, string, string, string> (joinThreeValues) (
        left<string, string> ('1'),
      ) (left<string, string> ('2')) (left<string, string> ('3')),
    ),
    '1',
  )
})

test ('apFirst: combines both inputs and keeps the first value', () => {
  assert.deepStrictEqual (apFirst ([1, 2]) ([3, 4]), [1, 1, 2, 2])
  assert.deepStrictEqual (apFirst (just (1)) (just (2)), just (1))
  assert.deepStrictEqual (
    apFirst (just (1)) (nothing<number> ()),
    nothing<number> (),
  )
  assert.deepStrictEqual (
    apFirst (nothing<number> ()) (just (2)),
    nothing<number> (),
  )
  assert.deepStrictEqual (apFirst (identity (1)) (identity (2)), identity (1))
  assert.deepStrictEqual (
    apFirst (pair ('A', 1)) (pair ('B', 2)),
    pair ('AB', 1),
  )
  assert.deepStrictEqual (
    (apFirst ((r: number) => r + 1) ((r: number) => r * 2) as (
      r: number,
    ) => number) (10),
    11,
  )
})

test ('apSecond: combines both inputs and keeps the second value', () => {
  assert.deepStrictEqual (apSecond ([1, 2]) ([3, 4]), [3, 4, 3, 4])
  assert.deepStrictEqual (apSecond (just (1)) (just (2)), just (2))
  assert.deepStrictEqual (
    apSecond (just (1)) (nothing<number> ()),
    nothing<number> (),
  )
  assert.deepStrictEqual (
    apSecond (nothing<number> ()) (just (2)),
    nothing<number> (),
  )
  assert.deepStrictEqual (
    apSecond (identity (1)) (identity (2)),
    identity (2),
  )
  assert.deepStrictEqual (
    apSecond (pair ('A', 1)) (pair ('B', 2)),
    pair ('AB', 2),
  )
  assert.deepStrictEqual (
    (apSecond ((r: number) => r + 1) ((r: number) => r * 2) as (
      r: number,
    ) => number) (10),
    20,
  )
})

test ('apFirst and apSecond: both effects happen, the log runs left to right', () => {
  const first = apFirst (logged ('A', 1) as never) (logged ('B', 2) as never)

  assert.deepStrictEqual ([logOf (first), valueOf_ (first)], ['AB', 1])
  const second = apSecond (logged ('A', 1) as never) (logged ('B', 2) as never)

  assert.deepStrictEqual ([logOf (second), valueOf_ (second)], ['AB', 2])
  for (const f of [apFirst, apSecond]) {
    assert.deepStrictEqual (
      either ((e: string) => e) (String) (
        f (left<string, number> ('first') as never) (
          left<string, number> ('second') as never,
        ) as never,
      ),
      'first',
    )
  }
})

test ('ap: composition law across supported types', () => {
  for (const [name, { u, v, w }] of Object.entries (triples)) {
    assert.deepStrictEqual (
      ap (ap (map (composeFunctions) (u as never) as never) (v as never) as never) (
        w as never,
      ),
      ap (u as never) (ap (v as never) (w as never) as never),
      name,
    )
  }
})

test ('ap: composition law on functions', () => {
  const u = (i: number) => (n: number) => n + i
  const v = (i: number) => (n: number) => n * i
  const w = (i: number) => i + 100
  const lhs = ap (ap (map (composeFunctions) (u)) (v)) (w) as (
    i: number,
  ) => number
  const rhs = ap (u) (ap (v) (w)) as (
    i: number,
  ) => number
  for (const i of [0, 1, 2, 7]) assert.deepStrictEqual (lhs (i), rhs (i), `at i=${i}`)
})

test ('ap: rejects values without Apply', () => {
  assert.throws (
    () => ap ([increment] as never) (new Map ([['a', 1]]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('ap: Map has no Apply'),
  )
  assert.throws (
    () => ap ([increment] as never) ({ a: 1 } as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('ap: StrMap has no Apply'),
  )
  assert.throws (
    () => ap ([increment] as never) ('string' as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('ap: String has no Apply'),
  )
})

test ('ap: parseInt receives no array index as its radix', () => {
  assert.deepStrictEqual (ap ([Number.parseInt]) (['1', '2', '3']), [1, 2, 3])
})

test ('ap: Array passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  ap ([recordArguments]) ([1, 2])

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('ap: Set passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  ap (new Set ([recordArguments])) (new Set ([1, 2]))

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('ap: Maybe passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  ap (just (recordArguments)) (just (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('ap: Either passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  ap (right<string, typeof recordArguments> (recordArguments)) (
    right<string, number> (1),
  )

  assert.deepStrictEqual (calls, [[1]])
})

test ('ap: Identity passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  ap (identity (recordArguments)) (identity (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('ap: Pair passes only the value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  ap (pair ('l', recordArguments)) (pair ('l', 1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('ap: Function passes only the computed value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  function returnInput(value: number) {
    return value
  }

  function provideFunction(_input: number) {
    return recordArguments
  }

  const applied = ap (provideFunction) (returnInput)
  applied (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('lift2: Array passes one value to each stage', () => {
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []

  function first(...args: unknown[]) {
    firstCalls.push (args)
    return second
  }

  function second(...args: unknown[]) {
    secondCalls.push (args)
    return 2
  }

  lift2 (first) ([1]) ([2])

  assert.deepStrictEqual (firstCalls, [[1]])
  assert.deepStrictEqual (secondCalls, [[2]])
})

test ('lift2: Maybe passes one value to each stage', () => {
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []

  function first(...args: unknown[]) {
    firstCalls.push (args)
    return second
  }

  function second(...args: unknown[]) {
    secondCalls.push (args)
    return 2
  }

  lift2 (first) (just (1)) (just (2))

  assert.deepStrictEqual (firstCalls, [[1]])
  assert.deepStrictEqual (secondCalls, [[2]])
})

test ('lift3: Array passes one value to each stage', () => {
  const firstCalls: unknown[][] = []
  const secondCalls: unknown[][] = []
  const thirdCalls: unknown[][] = []

  function first(...args: unknown[]) {
    firstCalls.push (args)
    return second
  }

  function second(...args: unknown[]) {
    secondCalls.push (args)
    return third
  }

  function third(...args: unknown[]) {
    thirdCalls.push (args)
    return 3
  }

  lift3 (first) ([1]) ([2]) ([3])

  assert.deepStrictEqual (firstCalls, [[1]])
  assert.deepStrictEqual (secondCalls, [[2]])
  assert.deepStrictEqual (thirdCalls, [[3]])
})

test ('ap and lift types: reject mixed Array and Set wrappers', () => {
  const arrOfFns = [increment]
  const setOfFns = new Set ([increment])
  const arr = [1, 2]
  const set = new Set ([3])

  // @ts-expect-error functions of number against strings
  const _apWrongArg = () => ap ([(a: number) => a + 1]) (['a', 'a'])
  // @ts-expect-error functions from an Array, a value from a Set
  const _apMixed = () => ap (arrOfFns) (set)
  // @ts-expect-error and the same the other way round
  const _apMixedBack = () => ap (setOfFns) (arr)
  // @ts-expect-error lift2 anchors on its first operand
  const _lift2Mixed = () => lift2 (add) (arr) (set)
  // @ts-expect-error lift3 checks the second operand against the first
  const _lift3MixedB = () => lift3 (add3) (arr) (set) (arr)
  // @ts-expect-error ...and the third against the first as well
  const _lift3MixedC = () => lift3 (add3) (arr) (arr) (set)
  // @ts-expect-error apFirst keeps the value of the first operand
  const _apFirstMixed = () => apFirst (arr) (set)
  // @ts-expect-error apSecond keeps the value of the second
  const _apSecondMixed = () => apSecond (arr) (set)

  assert.deepStrictEqual (typeof _apMixed, 'function')
})

test ('ap and lift types: require matching Pair accumulator types', () => {
  const glue = pair<string, (n: number) => number> ('l', increment)
  const byArray = pair<number[], number> ([1], 1)
  const byString = pair<string, number> ('r', 1)
  const wider = pair<string | number[], (n: number) => number> ('w', increment)
  const narrow = pair<'r', number> ('r', 1)

  // @ts-expect-error a string accumulator against an array of numbers
  const _apAcc = () => ap (glue) (byArray)
  // @ts-expect-error lift2 glues its accumulators the same way
  const _lift2Acc = () => lift2 (add) (byString) (byArray)
  // @ts-expect-error and so do the second and third operands of lift3
  const _lift3Acc = () => lift3 (add3) (byString) (byArray) (byString)
  // @ts-expect-error apFirst glues even though it keeps only one value
  const _apFirstAcc = () => apFirst (byString) (byArray)
  // @ts-expect-error and apSecond likewise
  const _apSecondAcc = () => apSecond (byString) (byArray)

  // @ts-expect-error the anchor is a union, and a union is not one semigroup
  const _apUnionAnchor = () => ap (wider) (byArray)
  // @ts-expect-error nor does a narrower literal fit a wider accumulator
  const _apNarrow = () => ap (glue) (narrow)

  assert.deepStrictEqual (show (ap (glue) (byString)), 'Pair ("lr") (2)')
})

test ('Pair types: annotate a shared accumulator type before combining values', () => {
  const inlineLog = pair ({ a: 1 }, 1)
  const otherLog = pair ({ b: 2 }, 2)
  // @ts-expect-error two object literals are two different types
  const _bad = () => lift2 (add) (inlineLog) (otherLog)

  type Log = Record<string, number>

  assert.deepStrictEqual (
    lift2 (add) (pair<Log, number> ({ a: 1 }, 1)) (pair<Log, number> ({ b: 2 }, 2)),
    pair<Log, number> ({ a: 1, b: 2 }, 3),
  )

  const pinned = pair<'W', (n: number) => number> ('W', increment)
  const alsoPinned = pair<'W', number> ('W', 1)

  assert.deepStrictEqual (show (ap (pinned) (alsoPinned)), 'Pair ("WW") (2)')
})

test ('applyNatives: lists the supported native implementations', () => {
  assert.deepStrictEqual (
    new Set (Object.keys (applyNatives)),
    new Set (['Array', 'Fn', 'Set']),
  )
  assert.deepStrictEqual (
    [
      applyNatives.Array['@@type'],
      applyNatives.Fn['@@type'],
      applyNatives.Set['@@type'],
    ],
    ['Array', 'Fn', 'Set'],
  )
  assert.deepStrictEqual (applyNatives.Array.ap ([1, 2], [increment]), [2, 3])
  assert.deepStrictEqual (
    applyNatives.Set.ap (new Set ([1, 2]), new Set ([increment])),
    new Set ([2, 3]),
  )
})

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const decrement = (n: number) => n - 1

const composeFunctions =
  (f: (b: number) => number) => (g: (a: number) => number) => (a: number) =>
    f (g (a))

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
    return logged (log, f (value))
  },

  ap<B>(wrappedFunctions: Logged<(a: A) => B>): Logged<B> {
    return logged (wrappedFunctions.log + log, wrappedFunctions.value (value))
  },
})

const Logged = {
  '@@type': 'Logged' as const,
  _shape: undefined as never,
  of: <A>(a: A): Logged<A> => logged ('', a),
}

const logOf = (x: unknown): string => (x as Logged<unknown>).log

const valueOf_ = (x: unknown): unknown => (x as Logged<unknown>).value

interface Triple {
  readonly u: unknown
  readonly v: unknown
  readonly w: unknown
}

const triples: Record<string, Triple> = {
  Array: {
    u: [increment, doubleNumber],
    v: [decrement, doubleNumber],
    w: [1, 2],
  },
  Set: {
    u: new Set ([increment, doubleNumber]),
    v: new Set ([decrement]),
    w: new Set ([1, 2]),
  },
  'Maybe.Just': { u: just (increment), v: just (doubleNumber), w: just (1) },
  'Maybe.Nothing': {
    u: just (increment),
    v: nothing<(a: number) => number> (),
    w: just (1),
  },
  'Either.Right': {
    u: right<string, (a: number) => number> (increment),
    v: right<string, (a: number) => number> (doubleNumber),
    w: right<string, number> (1),
  },
  'Either.Left': {
    u: left<string, (a: number) => number> ('error'),
    v: right<string, (a: number) => number> (doubleNumber),
    w: right<string, number> (1),
  },
  Identity: {
    u: identity (increment),
    v: identity (doubleNumber),
    w: identity (1),
  },
  Pair: {
    u: pair ('u', increment),
    v: pair ('v', doubleNumber),
    w: pair ('w', 1),
  },
}

const add = (a: number) => (b: number) => a + b

const add3 = (a: number) => (b: number) => (c: number) => a + b + c
