import { assertEquals, assertThrows } from '@std/assert'
import type { SetoidDict, SetoidShapes } from '../classes/setoid.ts'
import type { NativeTable, OpsOf } from './instance.ts'
import type { Instances } from './named.ts'
import type { Shape } from './shape.ts'
import { functorNatives } from '../classes/functor.ts'
import { foldableNatives } from '../classes/foldable.ts'
import { setoidNatives } from '../classes/setoid.ts'
import { applicativeNatives } from '../classes/applicative.ts'
import { monoidNatives } from '../classes/monoid.ts'
import { Arr } from '../natives/array.ts'
import { StrMap } from '../natives/strmap.ts'
import { just, Maybe, nothing } from '../data/maybe.ts'
import { Either, left, right } from '../data/either.ts'
import { Pair, pair } from '../data/pair.ts'
import { Identity, identity } from '../data/identity.ts'
import {
  dispatch,
  emptyIn,
  hasMethod,
  lazily,
  nameOf,
  ofIn,
  opIn,
  typeRepIn,
} from './instance.ts'

// Examples

Deno.test('nameOf: recognizes native and named custom values', () => {
  assertEquals(
    [nameOf([1]), nameOf(new Set()), nameOf(just(1)), nameOf({}), nameOf(null)],
    ['Array', 'Set', 'Maybe', 'StrMap', 'Null'],
  )
})

Deno.test('nameOf: every native is recognized by value', () => {
  const pairs: ReadonlyArray<readonly [unknown, string]> = [
    [[1, 2], 'Array'],
    [new Set([1]), 'Set'],
    [new Map([['a', 1]]), 'Map'],
    [{ a: 1 }, 'StrMap'],
    [(n: number) => n, 'Fn'],
    ['text', 'String'],
    [42, 'Number'],
    [Number.NaN, 'Number'],
    [true, 'Boolean'],
    [10n, 'BigInt'],
    [new Date(0), 'Date'],
    [/a/g, 'RegExp'],
  ]
  for (const [x, name] of pairs) assertEquals(nameOf(x), name, name)
})

Deno.test('nameOf: an unfamiliar value is Unknown', () => {
  assertEquals(nameOf(Symbol('s')), 'Unknown')
  assertEquals(nameOf(new WeakMap()), 'Unknown')
  assertEquals(nameOf(Promise.resolve(1)), 'Unknown')
  assertEquals(nameOf(new Boolean(true)), 'Unknown')
  assertEquals(nameOf(new Number(1)), 'Unknown')
})

Deno.test('nameOf: uses the custom @@type name', () => {
  assertEquals(nameOf(just(1)), 'Maybe')
  assertEquals(nameOf(nothing<number>()), 'Maybe')
  assertEquals(nameOf(left<string, number>('err')), 'Either')
  assertEquals(nameOf(right<string, number>(1)), 'Either')
  assertEquals(nameOf(pair('x', 1)), 'Pair')
  assertEquals(nameOf(identity(1)), 'Identity')
  assertEquals(nameOf(Maybe), 'Maybe')
  assertEquals(nameOf(Either), 'Either')
  assertEquals(nameOf(Pair), 'Pair')
  assertEquals(nameOf(Identity), 'Identity')
})

Deno.test('nameOf: gives @@type precedence over structural recognition', () => {
  assertEquals(nameOf({ '@@type': 'Fiction' }), 'Fiction')
  assertEquals(nameOf(Object.assign([1], { '@@type': 'Forgery' })), 'Forgery')
})

Deno.test('nameOf: distinguishes Date, RegExp, Map, and plain records', () => {
  assertEquals(StrMap.is(new Date(0)), false)
  assertEquals(nameOf(new Date(0)), 'Date')
  assertEquals(nameOf(/a/), 'RegExp')
  assertEquals(nameOf(new Map()), 'Map')
  assertEquals(nameOf(new Set()), 'Set')
  assertEquals(nameOf(Object.create(null)), 'StrMap')
  assertEquals(nameOf(class {}), 'Fn')
})

Deno.test('hasMethod: recognizes callable properties', () => {
  assertEquals(hasMethod(just(1), 'map'), true)
  assertEquals(hasMethod([1], 'map'), true)
  assertEquals(hasMethod((n: number) => n, 'call'), true)
  assertEquals(hasMethod({ map: 1 }, 'map'), false)
  assertEquals(hasMethod({}, 'map'), false)
  assertEquals(hasMethod(null, 'map'), false)
  assertEquals(hasMethod(undefined, 'map'), false)
})

Deno.test('hasMethod: a primitive does not count as having a method', () => {
  assertEquals(hasMethod('text', 'toUpperCase'), false)
  assertEquals(hasMethod(42, 'toFixed'), false)
  assertEquals(hasMethod(10n, 'toString'), false)
})

Deno.test('hasMethod: an inherited method is a method too', () => {
  assertEquals(hasMethod({}, 'toString'), true)
  assertEquals(hasMethod(Object.create({ step: () => 1 }), 'step'), true)
})

Deno.test('opIn: gives a native table entry precedence over a value method', () => {
  const f = opIn(functorNatives, [1, 2, 3], 'map')

  assertEquals(typeof f, 'function')
  assertEquals(f?.([1, 2, 3] as never, increment as never), [2, 3, 4])
})

Deno.test('opIn: does not fall back to a value method when its native entry exists', () => {
  assertEquals(typeof [1].join, 'function')
  assertEquals(opIn(functorNatives, [1], 'join'), undefined)
  assertEquals(typeof [1].at, 'function')
  assertEquals(opIn(setoidNatives, [1], 'at'), undefined)
})

Deno.test('opIn: uses a value method when no native entry exists', () => {
  const f = opIn(functorNatives, just(1), 'map')

  assertEquals(typeof f, 'function')
  assertEquals(f?.(just(1) as never, increment as never), just(2))
  assertEquals(opIn(functorNatives, 'text', 'map'), undefined)
  assertEquals(opIn(functorNatives, null, 'map'), undefined)
  assertEquals(opIn(functorNatives, undefined, 'map'), undefined)
})

Deno.test('typeRepIn: gives a representative method precedence over the native table', () => {
  const own = { '@@type': 'Array', of: (a: unknown) => ['own', a] }
  const f = typeRepIn(applicativeNatives, own, 'of')
  const byName = typeRepIn(applicativeNatives, { '@@type': 'Array' }, 'of')

  assertEquals(f?.(1 as never), ['own', 1])
  assertEquals(byName?.(1 as never), [1])
})

Deno.test('typeRepIn: a field that is not callable is not the operation', () => {
  const f = typeRepIn(applicativeNatives, { '@@type': 'Array', of: 5 }, 'of')

  assertEquals(f?.(1 as never), [1])
  assertEquals(typeRepIn(applicativeNatives, { of: 5 }, 'of'), undefined)
})

Deno.test('ofIn: lifts a single value into the type of the sample', () => {
  assertEquals(ofIn(applicativeNatives, [1, 2])(9), [9])
  assertEquals(ofIn(applicativeNatives, just(1))(9), just(9))
})

Deno.test("ofIn and emptyIn: use a custom value's constructor representative", () => {
  const own = {
    '@@type': 'Own',
    constructor: {
      '@@type': 'Own',
      of: (a: unknown) => ({ '@@type': 'Own', value: a }),
      empty: () => ({ '@@type': 'Own', value: null }),
    },
  }

  assertEquals(ofIn({}, own)(7), { '@@type': 'Own', value: 7 })
  assertEquals(emptyIn({}, own)(), { '@@type': 'Own', value: null })
})

Deno.test('lazily: defers each entry until it is accessed', () => {
  let calls = 0
  const table = lazily<(s: never) => unknown, { readonly One: never }>({
    One: (() => {
      calls++
      return { value: 1 }
    }) as never,
  })

  assertEquals(calls, 0)
  assertEquals(table.One, { value: 1 } as never)
  assertEquals(calls, 1)
})

Deno.test('lazily: calls the getter on every access', () => {
  let calls = 0
  const table = lazily<(s: never) => unknown, { readonly One: never }>({
    One: (() => {
      calls++
      return Arr
    }) as never,
  })

  assertEquals(table.One, Arr as never)
  assertEquals(table.One, Arr as never)
  assertEquals(calls, 2)
})

Deno.test('lazily: the table is enumerable and holds exactly the declared cells', () => {
  type Dicts = <S extends Shape>(s: S) => SetoidDict<S>
  const table: Instances<Dicts, SetoidShapes> = lazily<Dicts, SetoidShapes>({
    Array: () => Arr,
    StrMap: () => StrMap,
  })

  assertEquals(Object.keys(table), ['Array', 'StrMap'])
  assertEquals(table.Array, Arr)
  assertEquals(table.StrMap, StrMap)
})

// Edge cases

Deno.test('nameOf: null and undefined are named, not dumped into Unknown', () => {
  assertEquals(nameOf(null), 'Null')
  assertEquals(nameOf(undefined), 'Undefined')
})

Deno.test('opIn: preserves this and forwards only the operation arguments', () => {
  const received: unknown[][] = []
  const value = {
    '@@type': 'Probe',
    collect(...values: unknown[]) {
      received.push([this === value, ...values])
      return values
    },
  }
  const f = opIn({}, value, 'collect')

  assertEquals(f?.(value as never, 1 as never, 2 as never), [1, 2])
  assertEquals(received, [[true, 1, 2]])
})

Deno.test('dispatch: calls the native operation with the value and remaining arguments', () => {
  assertEquals(dispatch('map', 'Functor', functorNatives, [1, 2], increment), [
    2,
    3,
  ])
  assertEquals(
    dispatch('map', 'Functor', functorNatives, new Set([1, 2]), increment),
    new Set([2, 3]),
  )
  assertEquals(
    dispatch('map', 'Functor', functorNatives, new Map([['a', 1]]), increment),
    new Map([['a', 2]]),
  )
  assertEquals(
    dispatch('map', 'Functor', functorNatives, { a: 1 }, increment),
    {
      a: 2,
    },
  )
  assertEquals(
    dispatch(
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

Deno.test('dispatch: calls custom value methods with the operation arguments', () => {
  assertEquals(
    dispatch('map', 'Functor', functorNatives, just(1), increment),
    just(2),
  )
  assertEquals(
    dispatch('map', 'Functor', functorNatives, nothing<number>(), increment),
    nothing<number>(),
  )
  assertEquals(
    dispatch('map', 'Functor', functorNatives, pair('x', 1), increment),
    pair('x', 2),
  )
})

Deno.test('dispatch: a value without the operation throws a descriptive TypeError', () => {
  assertThrows(
    () => dispatch('map', 'Functor', functorNatives, 'text', increment),
    TypeError,
    'map: String has no Functor',
  )
  assertThrows(
    () => dispatch('map', 'Functor', functorNatives, null, increment),
    TypeError,
    'map: Null has no Functor',
  )
  assertThrows(
    () => dispatch('map', 'Functor', functorNatives, undefined, increment),
    TypeError,
    'map: Undefined has no Functor',
  )
  assertThrows(
    () => dispatch('map', 'Functor', functorNatives, 42, increment),
    TypeError,
    'map: Number has no Functor',
  )
  assertThrows(
    () => dispatch('map', 'Functor', functorNatives, Symbol('s'), increment),
    TypeError,
    'map: Unknown has no Functor',
  )
})

Deno.test('dispatch: forwards the supplied argument list unchanged', () => {
  const calls: unknown[][] = []
  const value = {
    '@@type': 'Counter',
    op(...args: unknown[]) {
      calls.push(args)
      return args.length
    },
  }
  const table = {} as { readonly Counter: { op(): number } }

  assertEquals(dispatch('op', 'Probing', table, value), 0)
  assertEquals(dispatch('op', 'Probing', table, value, 'a'), 1)
  assertEquals(dispatch('op', 'Probing', table, value, 'a', 'b'), 2)
  assertEquals(calls, [[], ['a'], ['a', 'b']])
})

Deno.test('typeRepIn: returns undefined when no representative operation exists', () => {
  assertEquals(typeRepIn(applicativeNatives, null, 'of'), undefined)
  assertEquals(typeRepIn(applicativeNatives, undefined, 'of'), undefined)
  assertEquals(typeRepIn(applicativeNatives, Pair, 'of'), undefined)
  assertEquals(
    typeof typeRepIn(monoidNatives, { '@@type': 'String' }, 'empty'),
    'function',
  )
})

Deno.test('ofIn: a value without Applicative throws a descriptive TypeError', () => {
  assertThrows(
    () => ofIn(applicativeNatives, 'text'),
    TypeError,
    'String has no Applicative',
  )
  assertThrows(
    () => ofIn(applicativeNatives, pair('x', 1)),
    TypeError,
    'Pair has no Applicative',
  )
  assertThrows(
    () => ofIn(applicativeNatives, null),
    TypeError,
    'Null has no Applicative',
  )
})

Deno.test('emptyIn: the neutral element by a sample of a value', () => {
  assertEquals(emptyIn(monoidNatives, [1, 2])(), [])
  assertEquals(emptyIn(monoidNatives, 'text')(), '')

  assertThrows(
    () => emptyIn(monoidNatives, new Set([1])),
    TypeError,
    'Set has no Monoid',
  )
})

Deno.test('emptyIn: a value without Monoid throws a descriptive TypeError', () => {
  assertThrows(
    () => emptyIn(monoidNatives, 42),
    TypeError,
    'Number has no Monoid',
  )
  assertThrows(
    () => emptyIn(monoidNatives, just(1)),
    TypeError,
    'Maybe has no Monoid',
  )
  assertThrows(
    () => emptyIn(monoidNatives, new Map([['a', 1]])),
    TypeError,
    'Map has no Monoid',
  )
  for (const dropped of ['Set', 'Map']) {
    assertEquals(dropped in monoidNatives, false, dropped)
  }
})

Deno.test('ofIn: foreign statics are not accepted', () => {
  const trickster = {
    '@@type': 'Trickster',
    constructor: { '@@type': 'Own', of: (a: unknown) => a },
  }

  assertThrows(
    () => ofIn({}, trickster),
    TypeError,
    'Trickster has no Applicative',
  )
})

// Fixtures and compile-time assertions

type Exact<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false

// Each Assert<Exact<Actual, Expected>> checks a type at compile time.
// A changed inference makes this file fail deno check.
type Assert<T extends true> = T

export type _OpsOf = [
  Assert<
    Exact<OpsOf<typeof functorNatives>, 'map' | '_shape' | '@@type' | 'is'>
  >,
  Assert<Exact<NativeTable, object>>,
]

export const _foreignOp = () =>
  dispatch(
    // @ts-expect-error Functor has no reduce operation
    'reduce',
    'Functor',
    functorNatives,
    [1],
    increment,
  )

const increment = (n: number) => n + 1
