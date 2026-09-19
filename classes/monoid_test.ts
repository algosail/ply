import { assertEquals, assertThrows } from '@std/assert'
import type { Nullary } from '../core/shape.ts'
import { empty, mconcat, type MonoidDict, monoidNatives } from './monoid.ts'
import { concat } from './semigroup.ts'
import { Arr } from '../natives/array.ts'
import { Sets } from '../natives/set.ts'
import { Maps } from '../natives/map.ts'
import { StrMap } from '../natives/strmap.ts'
import { Str } from '../natives/string.ts'
import { Num } from '../natives/number.ts'
import { just, Maybe, nothing } from '../data/maybe.ts'
import {
  All,
  Any,
  Concat,
  Endo,
  First,
  Last,
  Max,
  Min,
  Product,
  RightUnion,
  Sum,
} from '../data/monoid.ts'

// Examples

Deno.test('empty: every call gives a fresh value', () => {
  const a = mt(Arr) as number[]
  const b = mt(Arr) as number[]

  assertEquals(a === b, false)
  a.push(1)

  assertEquals(mt(Arr), [])
})

Deno.test('mconcat: combines an array using a chosen monoid', () => {
  assertEquals(mconcat(Sum)([1, 2, 3]), 6)
  assertEquals(mconcat(Product)([2, 3, 4]), 24)
  assertEquals(mconcat(Concat)(['a', 'b', 'c']), 'abc')
  assertEquals(mconcat(Min)([3, 1, 2]), 1)
  assertEquals(mconcat(Max)([3, 1, 2]), 3)
  assertEquals(mconcat(All)([true, false]), false)
  assertEquals(mconcat(All)([true, true]), true)
  assertEquals(mconcat(Any)([false, true]), true)
  assertEquals(mconcat(Any)([false, false]), false)
  assertEquals(mconcat(First<number>())([nothing(), just(1), just(2)]), just(1))
  assertEquals(mconcat(Last<number>())([just(1), just(2), nothing()]), just(2))
  assertEquals(mconcat(Endo<number>())([(n) => n + 1, (n) => n * 10])(2), 21)
})

Deno.test('mconcat: a single element comes back as it is', () => {
  assertEquals(mconcat(Sum)([5]), 5)
  assertEquals(mconcat(Concat)(['x']), 'x')
  assertEquals(mconcat(RightUnion<number>())([{ a: 1 }]), { a: 1 })
})

Deno.test('mconcat: the fold goes left to right', () => {
  assertEquals(mconcat(RightUnion<number>())([{ a: 1 }, { a: 2 }]), { a: 2 })
  assertEquals(mconcat(RightUnion<number>())([{ a: 2 }, { a: 1 }]), { a: 1 })
  const trace: string[] = []
  const Trace: MonoidDict<Nullary<string>> = {
    empty: () => 'ε',
    concat: (a, b) => {
      trace.push(`${a}+${b}`)
      return `${a}${b}`
    },
  }

  assertEquals(mconcat(Trace)(['a', 'b', 'c']), 'εabc')
  assertEquals(trace, ['ε+a', 'εa+b', 'εab+c'])
})

// Laws

Deno.test('empty: the neutral element law across supported types', () => {
  for (const [name, [T, values]] of Object.entries(samplesByType)) {
    for (const x of values) {
      assertEquals(cat(mt(T), x), x, `left ${name}`)
      assertEquals(cat(x, mt(T)), x, `right ${name}`)
    }
  }
})

Deno.test('empty: the neutral element is taken from the instance table too', () => {
  assertEquals(mt({ '@@type': 'Array' }), [])
  assertEquals(mt({ '@@type': 'String' }), '')
})

Deno.test('mconcat: an empty list folds into the neutral element', () => {
  assertEquals(mconcat(Sum)([]), 0)
  assertEquals(mconcat(Product)([]), 1)
  assertEquals(mconcat(Concat)([]), '')
  assertEquals(mconcat(All)([]), true)
  assertEquals(mconcat(Any)([]), false)
  assertEquals(mconcat(Min)([]), Infinity)
  assertEquals(mconcat(Max)([]), -Infinity)
  assertEquals(mconcat(First<number>())([]), nothing())
  assertEquals(mconcat(Endo<number>())([])(7), 7)
})

Deno.test('mconcat: the monoid laws on the dictionaries covered', () => {
  const check = <A>(
    name: string,
    M: MonoidDict<Nullary<A>>,
    values: readonly A[],
  ) => {
    for (const x of values) {
      assertEquals(M.concat(M.empty(), x), x, `left ${name}`)
      assertEquals(M.concat(x, M.empty()), x, `right ${name}`)
      assertEquals(mconcat(M)([x]), x, `single element ${name}`)
    }
    for (const a of values) {
      for (const b of values) {
        for (const c of values) {
          assertEquals(
            M.concat(M.concat(a, b), c),
            M.concat(a, M.concat(b, c)),
            `associativity ${name}`,
          )
          assertEquals(
            mconcat(M)([a, b, c]),
            M.concat(M.concat(M.concat(M.empty(), a), b), c),
            `mconcat ${name}`,
          )
        }
      }
    }
  }
  check('Sum', Sum, [0, 1, -3, 2.5])
  check('Product', Product, [1, 2, -3])
  check('Min', Min, [0, 1, -3, Infinity])
  check('Max', Max, [0, 1, -3, -Infinity])
  check('Concat', Concat, ['', 'a', 'bc'])
  check('All', All, [true, false])
  check('Any', Any, [true, false])
  check('First', First<number>(), [nothing(), just(1), just(2)])
  check('Last', Last<number>(), [nothing(), just(1), just(2)])
  check('RightUnion', RightUnion<number>(), [{}, { a: 1 }, { a: 2, b: 3 }])
})

// Edge cases

Deno.test('empty: a type without a neutral element throws a descriptive TypeError', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => empty(Maybe as never),
    TypeError,
    'empty: Maybe has no Monoid',
  )
  assertThrows(
    () => empty(Num as never),
    TypeError,
    'empty: Number has no Monoid',
  )
  assertThrows(
    () => empty(null as never),
    TypeError,
    'empty: Null has no Monoid',
  )
  assertThrows(
    () => empty({} as never),
    TypeError,
    'empty: StrMap has no Monoid',
  )
})

Deno.test('mconcat: concat receives only the accumulated result and the next value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  function emptyValue() {
    return 0
  }

  const monoid: MonoidDict<Nullary<number>> = {
    empty: emptyValue,
    concat: recordArguments,
  }
  mconcat(monoid)([1, 2, 3])

  assertEquals(calls, [[0, 1], [0, 2], [0, 3]])
})

// Type checking

Deno.test('empty: returns the empty value for the chosen type, such as [] for Arr', () => {
  assertEquals(mt(Arr), [])
  assertEquals(mt(StrMap), {})
  assertEquals(mt(Str), '')
  // @ts-expect-error the Set type representative no longer has empty
  const _setCase = () => empty(Sets)
  // @ts-expect-error the Map type representative no longer has empty
  const _mapCase = () => empty(Maps)
  void _setCase, _mapCase
  // And through a cast, at the call.
  for (const [name, T] of dropped) {
    assertThrows(
      () => mt(T),
      TypeError,
      `${name} has no Monoid`,
      name,
    )
  }
})

Deno.test('empty: rejects Set and Map representatives', () => {
  // @ts-expect-error the Set type representative no longer has empty
  const _emptySet = () => empty(Sets)
  // @ts-expect-error the Map type representative no longer has empty
  const _emptyMap = () => empty(Maps)
  // @ts-expect-error concat has no overload for Set
  const _catSet = () => concat(new Set([1]))(new Set([2]))
  // @ts-expect-error concat has no overload for Map
  const _catMap = () => concat(new Map([['a', 1]]))(new Map([['b', 2]]))
  void _emptySet, _emptyMap, _catSet, _catMap

  for (const [name, T, e, values] of dropped) {
    assertThrows(() => mt(T), TypeError, `${name} has no Monoid`, name)
    const message = `concat: ${name} has no Semigroup`
    for (const x of values) {
      assertThrows(() => cat(e, x), TypeError, message, `left ${name}`)
      assertThrows(() => cat(x, e), TypeError, message, `right ${name}`)
    }
  }
})

// Native operation tables

Deno.test('monoidNatives: lists the supported native implementations', () => {
  assertEquals(Object.keys(monoidNatives), [
    'Array',
    'StrMap',
    'String',
  ])
  assertEquals(monoidNatives.String.empty(), '')
  assertEquals(monoidNatives.Array.empty(), [])
  // @ts-expect-error monoidNatives has no Set cell
  const _setCase = () => monoidNatives.Set
  // @ts-expect-error monoidNatives has no Map cell
  const _mapCase = () => monoidNatives.Map
  void _setCase, _mapCase
  for (const droppedName of ['Set', 'Map']) {
    assertEquals(droppedName in monoidNatives, false, droppedName)
  }
})

// Shared fixtures

const cat = (a: unknown, b: unknown): unknown => concat(a as never)(b as never)

const mt = (T: unknown): unknown => empty(T as never)

const samplesByType: Record<string, readonly [unknown, readonly unknown[]]> = {
  'Array': [Arr, [[], [1], [1, 2]]],
  'StrMap': [StrMap, [{}, { a: 1 }, { a: 1, b: 2 }]],
  'String': [Str, ['', 'a', 'abc']],
}

const dropped: [string, unknown, unknown, readonly unknown[]][] = [
  ['Set', Sets, new Set(), [new Set(), new Set([1]), new Set([1, 2])]],
  ['Map', Maps, new Map(), [
    new Map(),
    new Map([['a', 1]]),
    new Map([['a', 1], ['b', 2]]),
  ]],
]
