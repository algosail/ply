import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SetoidDict, SetoidShapes } from '../../src/classes/setoid.ts'
import type { NativeTable, OpsOf } from '../../src/core/instance.ts'
import type { Instances } from '../../src/core/named.ts'
import type { Shape } from '../../src/core/shape.ts'
import { applicativeNatives } from '../../src/classes/applicative.ts'
import { foldableNatives } from '../../src/classes/foldable.ts'
import { functorNatives } from '../../src/classes/functor.ts'
import { monoidNatives } from '../../src/classes/monoid.ts'
import { setoidNatives } from '../../src/classes/setoid.ts'
import {
  dispatch,
  emptyIn,
  hasMethod,
  lazily,
  nameOf,
  ofIn,
  opIn,
  typeRepIn,
} from '../../src/core/instance.ts'
import { Either, left, right } from '../../src/data/either.ts'
import { equivalence } from '../../src/data/equivalence.ts'
import { Identity, identity } from '../../src/data/identity.ts'
import { just, Maybe, nothing } from '../../src/data/maybe.ts'
import { Pair, pair } from '../../src/data/pair.ts'
import { predicate } from '../../src/data/predicate.ts'
import { Arr } from '../../src/natives/array.ts'
import { StrMap } from '../../src/natives/strmap.ts'

test ('nameOf: recognizes native and named custom values', () => {
  assert.deepStrictEqual (
    [nameOf ([1]), nameOf (new Set ()), nameOf (just (1)), nameOf ({}), nameOf (null)],
    ['Array', 'Set', 'Maybe', 'StrMap', 'Null'],
  )
})

test ('nameOf: every native is recognized by value', () => {
  const pairs: ReadonlyArray<readonly [unknown, string]> = [
    [[1, 2], 'Array'],
    [new Set ([1]), 'Set'],
    [new Map ([['a', 1]]), 'Map'],
    [{ a: 1 }, 'StrMap'],
    [(n: number) => n, 'Fn'],
    ['text', 'String'],
    [42, 'Number'],
    [Number.NaN, 'Number'],
    [true, 'Boolean'],
    [10n, 'BigInt'],
    [new Date (0), 'Date'],
    [/a/g, 'RegExp'],
  ]
  for (const [x, name] of pairs) assert.deepStrictEqual (nameOf (x), name, name)
})

test ('nameOf: reads a name once, and never one a proxy lacks', () => {
  let reads = 0
  const counting: ProxyHandler<object> = {
    get(target, key) {
      if (key === '@@type') reads++
      return Reflect.get (target, key)
    },
  }
  assert.deepStrictEqual (nameOf (new Proxy ({ a: 1 }, counting)), 'StrMap')
  assert.deepStrictEqual (reads, 0)
  assert.deepStrictEqual (nameOf (new Proxy (just (1), counting)), 'Maybe')
  assert.deepStrictEqual (reads, 0)
  assert.deepStrictEqual (nameOf (new Proxy ({ '@@type': 'Mine' }, counting)), 'Mine')
  assert.deepStrictEqual (reads, 1)
})

test ('nameOf: an unfamiliar value is Unknown', () => {
  assert.deepStrictEqual (nameOf (Symbol ('s')), 'Unknown')
  assert.deepStrictEqual (nameOf (new WeakMap ()), 'Unknown')
  assert.deepStrictEqual (nameOf (Promise.resolve (1)), 'Unknown')
  assert.deepStrictEqual (nameOf (new Boolean (true)), 'Unknown')
  assert.deepStrictEqual (nameOf (new Number (1)), 'Unknown')
})

test ('nameOf: uses the custom @@type name', () => {
  assert.deepStrictEqual (nameOf (just (1)), 'Maybe')
  assert.deepStrictEqual (nameOf (nothing<number> ()), 'Maybe')
  assert.deepStrictEqual (nameOf (left<string, number> ('err')), 'Either')
  assert.deepStrictEqual (nameOf (right<string, number> (1)), 'Either')
  assert.deepStrictEqual (nameOf (pair ('x', 1)), 'Pair')
  assert.deepStrictEqual (nameOf (identity (1)), 'Identity')
  assert.deepStrictEqual (nameOf (Maybe), 'Maybe')
  assert.deepStrictEqual (nameOf (Either), 'Either')
  assert.deepStrictEqual (nameOf (Pair), 'Pair')
  assert.deepStrictEqual (nameOf (Identity), 'Identity')
  assert.deepStrictEqual (nameOf (predicate (() => true)), 'Predicate')
  assert.deepStrictEqual (nameOf (equivalence (() => true)), 'Equivalence')
  assert.deepStrictEqual (nameOf ({ constructor: { '@@type': 'Own' } }), 'Own')
})

test ('nameOf: gives @@type precedence over structural recognition', () => {
  assert.deepStrictEqual (nameOf ({ '@@type': 'Fiction' }), 'Fiction')
  assert.deepStrictEqual (nameOf (Object.assign ([1], { '@@type': 'Forgery' })), 'Forgery')
})

test ('nameOf: distinguishes Date, RegExp, Map, and plain records', () => {
  assert.deepStrictEqual (StrMap.is (new Date (0)), false)
  assert.deepStrictEqual (nameOf (new Date (0)), 'Date')
  assert.deepStrictEqual (nameOf (/a/), 'RegExp')
  assert.deepStrictEqual (nameOf (new Map ()), 'Map')
  assert.deepStrictEqual (nameOf (new Set ()), 'Set')
  assert.deepStrictEqual (nameOf (Object.create (null)), 'StrMap')
  assert.deepStrictEqual (nameOf (class {}), 'Fn')
})

test ('hasMethod: recognizes callable properties', () => {
  assert.deepStrictEqual (hasMethod (just (1), 'map'), true)
  assert.deepStrictEqual (hasMethod ([1], 'map'), true)
  assert.deepStrictEqual (hasMethod ((n: number) => n, 'call'), true)
  assert.deepStrictEqual (hasMethod ({ map: 1 }, 'map'), false)
  assert.deepStrictEqual (hasMethod ({}, 'map'), false)
  assert.deepStrictEqual (hasMethod (null, 'map'), false)
  assert.deepStrictEqual (hasMethod (undefined, 'map'), false)
})

test ('hasMethod: a primitive does not count as having a method', () => {
  assert.deepStrictEqual (hasMethod ('text', 'toUpperCase'), false)
  assert.deepStrictEqual (hasMethod (42, 'toFixed'), false)
  assert.deepStrictEqual (hasMethod (10n, 'toString'), false)
})

test ('hasMethod: an inherited method is a method too', () => {
  assert.deepStrictEqual (hasMethod ({}, 'toString'), true)
  assert.deepStrictEqual (hasMethod (Object.create ({ step: () => 1 }), 'step'), true)
})

test ('opIn: gives a native table entry precedence over a value method', () => {
  const f = opIn (functorNatives, [1, 2, 3], 'map')

  assert.deepStrictEqual (typeof f, 'function')
  assert.deepStrictEqual (f?. ([1, 2, 3] as never, increment as never), [2, 3, 4])
})

test ('opIn: does not fall back to a value method when its native entry exists', () => {
  assert.deepStrictEqual (typeof [1].join, 'function')
  assert.deepStrictEqual (opIn (functorNatives, [1], 'join'), undefined)
  assert.deepStrictEqual (typeof [1].at, 'function')
  assert.deepStrictEqual (opIn (setoidNatives, [1], 'at'), undefined)
})

test ('opIn: uses a value method when no native entry exists', () => {
  const f = opIn (functorNatives, just (1), 'map')

  assert.deepStrictEqual (typeof f, 'function')
  assert.deepStrictEqual (f?. (just (1) as never, increment as never), just (2))
  assert.deepStrictEqual (opIn (functorNatives, 'text', 'map'), undefined)
  assert.deepStrictEqual (opIn (functorNatives, null, 'map'), undefined)
  assert.deepStrictEqual (opIn (functorNatives, undefined, 'map'), undefined)
})

test ('typeRepIn: gives a representative method precedence over the native table', () => {
  const own = { '@@type': 'Array', of: (a: unknown) => ['own', a] }
  const f = typeRepIn (applicativeNatives, own, 'of')
  const byName = typeRepIn (applicativeNatives, { '@@type': 'Array' }, 'of')

  assert.deepStrictEqual (f?. (1 as never), ['own', 1])
  assert.deepStrictEqual (byName?. (1 as never), [1])
})

test ('typeRepIn: a field that is not callable is not the operation', () => {
  const f = typeRepIn (applicativeNatives, { '@@type': 'Array', of: 5 }, 'of')

  assert.deepStrictEqual (f?. (1 as never), [1])
  assert.deepStrictEqual (typeRepIn (applicativeNatives, { of: 5 }, 'of'), undefined)
})

test ('ofIn: lifts a single value into the type of the sample', () => {
  assert.deepStrictEqual (ofIn (applicativeNatives, [1, 2]) (9), [9])
  assert.deepStrictEqual (ofIn (applicativeNatives, just (1)) (9), just (9))
})

test ("ofIn and emptyIn: use a custom value's constructor representative", () => {
  const own = {
    '@@type': 'Own',
    constructor: {
      '@@type': 'Own',
      of: (a: unknown) => ({ '@@type': 'Own', value: a }),
      empty: () => ({ '@@type': 'Own', value: null }),
    },
  }

  assert.deepStrictEqual (ofIn ({}, own) (7), { '@@type': 'Own', value: 7 })
  assert.deepStrictEqual (emptyIn ({}, own) (), { '@@type': 'Own', value: null })
})

test ('lazily: defers each entry until it is accessed', () => {
  let calls = 0
  const table = lazily<(s: never) => unknown, { readonly One: never }> ({
    One: (() => {
      calls++
      return { value: 1 }
    }) as never,
  })

  assert.deepStrictEqual (calls, 0)
  assert.deepStrictEqual (table.One, { value: 1 } as never)
  assert.deepStrictEqual (calls, 1)
})

test ('lazily: calls the getter on every access', () => {
  let calls = 0
  const table = lazily<(s: never) => unknown, { readonly One: never }> ({
    One: (() => {
      calls++
      return Arr
    }) as never,
  })

  assert.deepStrictEqual (table.One, Arr as never)
  assert.deepStrictEqual (table.One, Arr as never)
  assert.deepStrictEqual (calls, 2)
})

test ('lazily: the table is enumerable and holds exactly the declared cells', () => {
  type Dicts = <S extends Shape>(s: S) => SetoidDict<S>
  const table: Instances<Dicts, SetoidShapes> = lazily<Dicts, SetoidShapes> ({
    Array: () => Arr,
    StrMap: () => StrMap,
  })

  assert.deepStrictEqual (Object.keys (table), ['Array', 'StrMap'])
  assert.deepStrictEqual (table.Array, Arr)
  assert.deepStrictEqual (table.StrMap, StrMap)
})

test ('nameOf: null and undefined are named, not dumped into Unknown', () => {
  assert.deepStrictEqual (nameOf (null), 'Null')
  assert.deepStrictEqual (nameOf (undefined), 'Undefined')
})

test ('opIn: preserves this and forwards only the operation arguments', () => {
  const received: unknown[][] = []
  const value = {
    '@@type': 'Probe',
    collect(...values: unknown[]) {
      received.push ([this === value, ...values])
      return values
    },
  }
  const f = opIn ({}, value, 'collect')

  assert.deepStrictEqual (f?. (value as never, 1 as never, 2 as never), [1, 2])
  assert.deepStrictEqual (received, [[true, 1, 2]])
})

test ('dispatch: calls the native operation with the value and remaining arguments', () => {
  assert.deepStrictEqual (dispatch ('map', 'Functor', functorNatives, [1, 2], increment), [
    2,
    3,
  ])
  assert.deepStrictEqual (
    dispatch ('map', 'Functor', functorNatives, new Set ([1, 2]), increment),
    new Set ([2, 3]),
  )
  assert.deepStrictEqual (
    dispatch ('map', 'Functor', functorNatives, new Map ([['a', 1]]), increment),
    new Map ([['a', 2]]),
  )
  assert.deepStrictEqual (
    dispatch ('map', 'Functor', functorNatives, { a: 1 }, increment),
    {
      a: 2,
    },
  )
  assert.deepStrictEqual (
    dispatch (
      'reduce',
      'Foldable',
      foldableNatives,
      [1, 2, 3],
      (a: number, b: number) => a + b,
      100,
    ),
    106,
  )
})

test ('dispatch: calls custom value methods with the operation arguments', () => {
  assert.deepStrictEqual (
    dispatch ('map', 'Functor', functorNatives, just (1), increment),
    just (2),
  )
  assert.deepStrictEqual (
    dispatch ('map', 'Functor', functorNatives, nothing<number> (), increment),
    nothing<number> (),
  )
  assert.deepStrictEqual (
    dispatch ('map', 'Functor', functorNatives, pair ('x', 1), increment),
    pair ('x', 2),
  )
})

test ('dispatch: a value without the operation throws a descriptive TypeError', () => {
  assert.throws (
    () => dispatch ('map', 'Functor', functorNatives, 'text', increment),
    (error: unknown) => error instanceof TypeError && error.message.includes ('map: String has no Functor'),
  )
  assert.throws (
    () => dispatch ('map', 'Functor', functorNatives, null, increment),
    (error: unknown) => error instanceof TypeError && error.message.includes ('map: Null has no Functor'),
  )
  assert.throws (
    () => dispatch ('map', 'Functor', functorNatives, undefined, increment),
    (error: unknown) => error instanceof TypeError && error.message.includes ('map: Undefined has no Functor'),
  )
  assert.throws (
    () => dispatch ('map', 'Functor', functorNatives, 42, increment),
    (error: unknown) => error instanceof TypeError && error.message.includes ('map: Number has no Functor'),
  )
  assert.throws (
    () => dispatch ('map', 'Functor', functorNatives, Symbol ('s'), increment),
    (error: unknown) => error instanceof TypeError && error.message.includes ('map: Unknown has no Functor'),
  )
})

test ('dispatch: forwards the supplied argument list unchanged', () => {
  const calls: unknown[][] = []
  const value = {
    '@@type': 'Counter',
    op(...args: unknown[]) {
      calls.push (args)
      return args.length
    },
  }
  const table = {} as { readonly Counter: { op(): number } }

  assert.deepStrictEqual (dispatch ('op', 'Probing', table, value), 0)
  assert.deepStrictEqual (dispatch ('op', 'Probing', table, value, 'a'), 1)
  assert.deepStrictEqual (dispatch ('op', 'Probing', table, value, 'a', 'b'), 2)
  assert.deepStrictEqual (calls, [[], ['a'], ['a', 'b']])
})

test ('typeRepIn: returns undefined when no representative operation exists', () => {
  assert.deepStrictEqual (typeRepIn (applicativeNatives, null, 'of'), undefined)
  assert.deepStrictEqual (typeRepIn (applicativeNatives, undefined, 'of'), undefined)
  assert.deepStrictEqual (typeRepIn (applicativeNatives, Pair, 'of'), undefined)
  assert.deepStrictEqual (
    typeof typeRepIn (monoidNatives, { '@@type': 'String' }, 'empty'),
    'function',
  )
})

test ('ofIn: a value without Applicative throws a descriptive TypeError', () => {
  assert.throws (
    () => ofIn (applicativeNatives, 'text'),
    (error: unknown) => error instanceof TypeError && error.message.includes ('String has no Applicative'),
  )
  assert.throws (
    () => ofIn (applicativeNatives, pair ('x', 1)),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Pair has no Applicative'),
  )
  assert.throws (
    () => ofIn (applicativeNatives, null),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Null has no Applicative'),
  )
})

test ('emptyIn: the neutral element by a sample of a value', () => {
  assert.deepStrictEqual (emptyIn (monoidNatives, [1, 2]) (), [])
  assert.deepStrictEqual (emptyIn (monoidNatives, 'text') (), '')

  assert.throws (
    () => emptyIn (monoidNatives, new Set ([1])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Set has no Monoid'),
  )
})

test ('emptyIn: a value without Monoid throws a descriptive TypeError', () => {
  assert.throws (
    () => emptyIn (monoidNatives, 42),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Number has no Monoid'),
  )
  assert.throws (
    () => emptyIn (monoidNatives, just (1)),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Maybe has no Monoid'),
  )
  assert.throws (
    () => emptyIn (monoidNatives, new Map ([['a', 1]])),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Map has no Monoid'),
  )
  for (const dropped of ['Set', 'Map']) {
    assert.deepStrictEqual (dropped in monoidNatives, false, dropped)
  }
})

test ('ofIn: foreign statics are not accepted', () => {
  const trickster = {
    '@@type': 'Trickster',
    constructor: { '@@type': 'Own', of: (a: unknown) => a },
  }

  assert.throws (
    () => ofIn ({}, trickster),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Trickster has no Applicative'),
  )
})

type Exact<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false

type Assert<T extends true> = T

export type _OpsOf = [
  Assert<
    Exact<OpsOf<typeof functorNatives>, 'map' | '_shape' | '@@type' | 'is'>
  >,
  Assert<Exact<NativeTable, object>>,
]

export const _foreignOp = () =>
  dispatch (
    // @ts-expect-error Functor has no reduce operation
    'reduce',
    'Functor',
    functorNatives,
    [1],
    increment,
  )

const increment = (n: number) => n + 1
