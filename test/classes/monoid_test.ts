import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Nullary } from '../../src/core/shape.ts'
import { empty, mconcat, type MonoidDict, monoidNatives } from '../../src/classes/monoid.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { just, Maybe, nothing } from '../../src/data/maybe.ts'
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
} from '../../src/data/monoid.ts'
import { Arr } from '../../src/natives/array.ts'
import { Maps } from '../../src/natives/map.ts'
import { Num } from '../../src/natives/number.ts'
import { Sets } from '../../src/natives/set.ts'
import { Str } from '../../src/natives/string.ts'
import { StrMap } from '../../src/natives/strmap.ts'

test ('empty: every call gives a fresh value', () => {
  const a = mt (Arr) as number[]
  const b = mt (Arr) as number[]

  assert.deepStrictEqual (a === b, false)
  a.push (1)

  assert.deepStrictEqual (mt (Arr), [])
})

test ('mconcat: combines an array using a chosen monoid', () => {
  assert.deepStrictEqual (mconcat (Sum) ([1, 2, 3]), 6)
  assert.deepStrictEqual (mconcat (Product) ([2, 3, 4]), 24)
  assert.deepStrictEqual (mconcat (Concat) (['a', 'b', 'c']), 'abc')
  assert.deepStrictEqual (mconcat (Min) ([3, 1, 2]), 1)
  assert.deepStrictEqual (mconcat (Max) ([3, 1, 2]), 3)
  assert.deepStrictEqual (mconcat (All) ([true, false]), false)
  assert.deepStrictEqual (mconcat (All) ([true, true]), true)
  assert.deepStrictEqual (mconcat (Any) ([false, true]), true)
  assert.deepStrictEqual (mconcat (Any) ([false, false]), false)
  assert.deepStrictEqual (mconcat (First<number> ()) ([nothing (), just (1), just (2)]), just (1))
  assert.deepStrictEqual (mconcat (Last<number> ()) ([just (1), just (2), nothing ()]), just (2))
  assert.deepStrictEqual (mconcat (Endo<number> ()) ([(n) => n + 1, (n) => n * 10]) (2), 21)
})

test ('mconcat: a single element comes back as it is', () => {
  assert.deepStrictEqual (mconcat (Sum) ([5]), 5)
  assert.deepStrictEqual (mconcat (Concat) (['x']), 'x')
  assert.deepStrictEqual (mconcat (RightUnion<number> ()) ([{ a: 1 }]), { a: 1 })
})

test ('mconcat: the fold goes left to right', () => {
  assert.deepStrictEqual (mconcat (RightUnion<number> ()) ([{ a: 1 }, { a: 2 }]), { a: 2 })
  assert.deepStrictEqual (mconcat (RightUnion<number> ()) ([{ a: 2 }, { a: 1 }]), { a: 1 })
  const trace: string[] = []
  const Trace: MonoidDict<Nullary<string>> = {
    empty: () => 'ε',
    concat: (a, b) => {
      trace.push (`${a}+${b}`)
      return `${a}${b}`
    },
  }

  assert.deepStrictEqual (mconcat (Trace) (['a', 'b', 'c']), 'εabc')
  assert.deepStrictEqual (trace, ['ε+a', 'εa+b', 'εab+c'])
})

test ('empty: the neutral element law across supported types', () => {
  for (const [name, [T, values]] of Object.entries (samplesByType)) {
    for (const x of values) {
      assert.deepStrictEqual (cat (mt (T), x), x, `left ${name}`)
      assert.deepStrictEqual (cat (x, mt (T)), x, `right ${name}`)
    }
  }
})

test ('empty: the neutral element is taken from the instance table too', () => {
  assert.deepStrictEqual (mt ({ '@@type': 'Array' }), [])
  assert.deepStrictEqual (mt ({ '@@type': 'String' }), '')
})

test ('mconcat: an empty list folds into the neutral element', () => {
  assert.deepStrictEqual (mconcat (Sum) ([]), 0)
  assert.deepStrictEqual (mconcat (Product) ([]), 1)
  assert.deepStrictEqual (mconcat (Concat) ([]), '')
  assert.deepStrictEqual (mconcat (All) ([]), true)
  assert.deepStrictEqual (mconcat (Any) ([]), false)
  assert.deepStrictEqual (mconcat (Min) ([]), Infinity)
  assert.deepStrictEqual (mconcat (Max) ([]), -Infinity)
  assert.deepStrictEqual (mconcat (First<number> ()) ([]), nothing ())
  assert.deepStrictEqual (mconcat (Endo<number> ()) ([]) (7), 7)
})

test ('mconcat: the monoid laws on the dictionaries covered', () => {
  const check = <A>(
    name: string,
    M: MonoidDict<Nullary<A>>,
    values: readonly A[],
  ) => {
    for (const x of values) {
      assert.deepStrictEqual (M.concat (M.empty (), x), x, `left ${name}`)
      assert.deepStrictEqual (M.concat (x, M.empty ()), x, `right ${name}`)
      assert.deepStrictEqual (mconcat (M) ([x]), x, `single element ${name}`)
    }
    for (const a of values) {
      for (const b of values) {
        for (const c of values) {
          assert.deepStrictEqual (
            M.concat (M.concat (a, b), c),
            M.concat (a, M.concat (b, c)),
            `associativity ${name}`,
          )
          assert.deepStrictEqual (
            mconcat (M) ([a, b, c]),
            M.concat (M.concat (M.concat (M.empty (), a), b), c),
            `mconcat ${name}`,
          )
        }
      }
    }
  }
  check ('Sum', Sum, [0, 1, -3, 2.5])
  check ('Product', Product, [1, 2, -3])
  check ('Min', Min, [0, 1, -3, Infinity])
  check ('Max', Max, [0, 1, -3, -Infinity])
  check ('Concat', Concat, ['', 'a', 'bc'])
  check ('All', All, [true, false])
  check ('Any', Any, [true, false])
  check ('First', First<number> (), [nothing (), just (1), just (2)])
  check ('Last', Last<number> (), [nothing (), just (1), just (2)])
  check ('RightUnion', RightUnion<number> (), [{}, { a: 1 }, { a: 2, b: 3 }])
})

test ('empty: a type without a neutral element throws a descriptive TypeError', () => {
  assert.throws (
    () => empty (Maybe as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('empty: Maybe has no Monoid'),
  )
  assert.throws (
    () => empty (Num as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('empty: Number has no Monoid'),
  )
  assert.throws (
    () => empty (null as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('empty: Null has no Monoid'),
  )
  assert.throws (
    () => empty ({} as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('empty: StrMap has no Monoid'),
  )
})

test ('mconcat: concat receives only the accumulated result and the next value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  function emptyValue() {
    return 0
  }

  const monoid: MonoidDict<Nullary<number>> = {
    empty: emptyValue,
    concat: recordArguments,
  }
  mconcat (monoid) ([1, 2, 3])

  assert.deepStrictEqual (calls, [[0, 1], [0, 2], [0, 3]])
})

test ('empty: returns the empty value for the chosen type, such as [] for Arr', () => {
  assert.deepStrictEqual (mt (Arr), [])
  assert.deepStrictEqual (mt (StrMap), {})
  assert.deepStrictEqual (mt (Str), '')
  // @ts-expect-error the Set type representative no longer has empty
  const _setCase = () => empty (Sets)
  // @ts-expect-error the Map type representative no longer has empty
  const _mapCase = () => empty (Maps)
  void _setCase, _mapCase
  for (const [name, T] of dropped) {
    assert.throws (
      () => mt (T),
      (error: unknown) => error instanceof TypeError && error.message.includes (`${name} has no Monoid`),
      name,
    )
  }
})

test ('empty: rejects Set and Map representatives', () => {
  // @ts-expect-error the Set type representative no longer has empty
  const _emptySet = () => empty (Sets)
  // @ts-expect-error the Map type representative no longer has empty
  const _emptyMap = () => empty (Maps)
  // @ts-expect-error concat has no overload for Set
  const _catSet = () => concat (new Set ([1])) (new Set ([2]))
  // @ts-expect-error concat has no overload for Map
  const _catMap = () => concat (new Map ([['a', 1]])) (new Map ([['b', 2]]))
  void _emptySet, _emptyMap, _catSet, _catMap

  for (const [name, T, e, values] of dropped) {
    assert.throws (
      () => mt (T),
      (error: unknown) => error instanceof TypeError && error.message.includes (`${name} has no Monoid`),
      name,
    )
    const message = `concat: ${name} has no Semigroup`
    for (const x of values) {
      assert.throws (
        () => cat (e, x),
        (error: unknown) => error instanceof TypeError && error.message.includes (message),
        `left ${name}`,
      )
      assert.throws (
        () => cat (x, e),
        (error: unknown) => error instanceof TypeError && error.message.includes (message),
        `right ${name}`,
      )
    }
  }
})

test ('monoidNatives: lists the supported native implementations', () => {
  assert.deepStrictEqual (Object.keys (monoidNatives), [
    'Array',
    'StrMap',
    'String',
  ])
  assert.deepStrictEqual (monoidNatives.String.empty (), '')
  assert.deepStrictEqual (monoidNatives.Array.empty (), [])
  // @ts-expect-error monoidNatives has no Set cell
  const _setCase = () => monoidNatives.Set
  // @ts-expect-error monoidNatives has no Map cell
  const _mapCase = () => monoidNatives.Map
  void _setCase, _mapCase
  for (const droppedName of ['Set', 'Map']) {
    assert.deepStrictEqual (droppedName in monoidNatives, false, droppedName)
  }
})

const cat = (a: unknown, b: unknown): unknown => concat (a as never) (b as never)

const mt = (T: unknown): unknown => empty (T as never)

const samplesByType: Record<string, readonly [unknown, readonly unknown[]]> = {
  Array: [Arr, [[], [1], [1, 2]]],
  StrMap: [StrMap, [{}, { a: 1 }, { a: 1, b: 2 }]],
  String: [Str, ['', 'a', 'abc']],
}

const dropped: [string, unknown, unknown, readonly unknown[]][] = [
  ['Set', Sets, new Set (), [new Set (), new Set ([1]), new Set ([1, 2])]],
  ['Map', Maps, new Map (), [
    new Map (),
    new Map ([['a', 1]]),
    new Map ([['a', 1], ['b', 2]]),
  ]],
]
