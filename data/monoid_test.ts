import { assertEquals } from '@std/assert'
import type { Nullary } from '../core/shape.ts'
import type { MonoidDict } from '../classes/monoid.ts'
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
} from './monoid.ts'
import { just, type Maybe, nothing } from './maybe.ts'
import { foldMap } from '../classes/foldable.ts'

// Examples

Deno.test('Sum: adds numbers with zero as the identity', () => {
  assertEquals(Sum.empty(), 0)
  assertEquals(Sum.concat(2, 3), 5)
  assertEquals(Sum.concat(-1, 1), 0)
})

Deno.test('Product: multiplies numbers with one as the identity', () => {
  assertEquals(Product.empty(), 1)
  assertEquals(Product.concat(3, 4), 12)
  assertEquals(Product.concat(0, 5), 0)
})

Deno.test('Min: selects the minimum with Infinity as the identity', () => {
  assertEquals(Min.empty(), Infinity)
  assertEquals(Min.concat(3, 1), 1)
  assertEquals(Min.concat(1, 3), 1)
  assertEquals(Min.concat(-Infinity, 0), -Infinity)
})

Deno.test('Max: selects the maximum with -Infinity as the identity', () => {
  assertEquals(Max.empty(), -Infinity)
  assertEquals(Max.concat(3, 1), 3)
  assertEquals(Max.concat(1, 3), 3)
  assertEquals(Max.concat(Infinity, 0), Infinity)
})

Deno.test('Concat: joins strings with an empty string as the identity', () => {
  assertEquals(Concat.empty(), '')
  assertEquals(Concat.concat('abc', 'def'), 'abcdef')
  assertEquals(Concat.concat('def', 'abc'), 'defabc')
})

Deno.test('All: combines booleans with AND', () => {
  assertEquals(All.empty(), true)
  assertEquals(All.concat(true, true), true)
  assertEquals(All.concat(true, false), false)
  assertEquals(All.concat(false, true), false)
  assertEquals(All.concat(false, false), false)
})

Deno.test('Any: combines booleans with OR', () => {
  assertEquals(Any.empty(), false)
  assertEquals(Any.concat(true, true), true)
  assertEquals(Any.concat(true, false), true)
  assertEquals(Any.concat(false, true), true)
  assertEquals(Any.concat(false, false), false)
})

Deno.test('First: keeps the first Just', () => {
  assertEquals(First<number>().empty(), nothing<number>())
  assertEquals(First<number>().concat(just(1), just(2)), just(1))
  assertEquals(First<number>().concat(nothing<number>(), just(2)), just(2))
  assertEquals(First<number>().concat(just(1), nothing<number>()), just(1))
  assertEquals(
    First<number>().concat(nothing<number>(), nothing<number>()),
    nothing<number>(),
  )
})

Deno.test('Last: keeps the last Just', () => {
  assertEquals(Last<number>().empty(), nothing<number>())
  assertEquals(Last<number>().concat(just(1), just(2)), just(2))
  assertEquals(Last<number>().concat(nothing<number>(), just(2)), just(2))
  assertEquals(Last<number>().concat(just(1), nothing<number>()), just(1))
  assertEquals(
    Last<number>().concat(nothing<number>(), nothing<number>()),
    nothing<number>(),
  )
})

Deno.test('RightUnion: merges records with later values winning', () => {
  assertEquals(RightUnion<number>().empty(), {})
  assertEquals(RightUnion<number>().concat({ a: 1 }, { a: 2 }), { a: 2 })
  assertEquals(RightUnion<number>().concat({ a: 2 }, { a: 1 }), { a: 1 })
  assertEquals(RightUnion<number>().concat({ a: 1 }, { b: 2 }), { a: 1, b: 2 })
})

Deno.test('Endo: composes functions from right to left', () => {
  assertEquals(Endo<number>().concat((n) => n + 1, (n) => n * 10)(2), 21)
  assertEquals(Endo<number>().concat((n) => n * 10, (n) => n + 1)(2), 30)
  assertEquals(Endo<number>().empty()(7), 7)
})

Deno.test('the dictionaries fit where a MonoidDict is expected', () => {
  assertEquals(foldMap(Concat)((n: number) => `${n}`)([1, 2]), '12')
  assertEquals(foldMap(Sum)((n: number) => n)([1, 2, 3]), 6)
  assertEquals(foldMap(Any)((n: number) => n > 2)([1, 2, 3]), true)
  assertEquals(foldMap(All)((n: number) => n > 2)([1, 2, 3]), false)
  assertEquals(foldMap(Sum)((n: number) => n)([]), 0)
})

// Laws

Deno.test(
  'First and Last: Nothing is neutral on the left and on the right',
  () => {
    const F = First<number>()
    const L = Last<number>()
    for (const m of [just(1), nothing<number>()] as Maybe<number>[]) {
      assertEquals(F.concat(F.empty(), m), m)
      assertEquals(F.concat(m, F.empty()), m)
      assertEquals(L.concat(L.empty(), m), m)
      assertEquals(L.concat(m, L.empty()), m)
    }
  },
)

Deno.test('Sum: identity and associativity laws', () => {
  assertMonoidLaws(Sum, [0, 1, -3, 2.5, 100])
})

Deno.test('Product: identity and associativity laws', () => {
  assertMonoidLaws(Product, [1, 0, 2, -3, 0.5])
})

Deno.test('Min: identity and associativity laws', () => {
  assertMonoidLaws(Min, [0, 1, -3, Infinity, -Infinity])
})

Deno.test('Max: identity and associativity laws', () => {
  assertMonoidLaws(Max, [0, 1, -3, Infinity, -Infinity])
})

Deno.test('Concat: identity and associativity laws', () => {
  assertMonoidLaws(Concat, ['', 'a', 'bc', 'a long string'])
})

Deno.test('All: identity and associativity laws', () => {
  assertMonoidLaws(All, [true, false])
})

Deno.test('Any: identity and associativity laws', () => {
  assertMonoidLaws(Any, [true, false])
})

Deno.test('First: identity and associativity laws', () => {
  assertMonoidLaws(First<number>(), [nothing<number>(), just(1), just(2)])
})

Deno.test('Last: identity and associativity laws', () => {
  assertMonoidLaws(Last<number>(), [nothing<number>(), just(1), just(2)])
})

Deno.test('RightUnion: identity and associativity laws', () => {
  assertMonoidLaws(RightUnion<number>(), [{}, { a: 1 }, { a: 2, b: 3 }, {
    b: 9,
  }])
})

Deno.test('Endo: identity and associativity laws', () => {
  const probes = [0, 1, -3, 7]
  const onProbes = (f: (n: number) => number) => probes.map(f)

  assertMonoidLaws(
    Endo<number>(),
    [(n: number) => n + 1, (n: number) => n * 10, (n: number) => -n],
    onProbes,
  )
})

// Edge cases

Deno.test('Min and Max: on ties the operands do not get mixed up', () => {
  assertEquals(Object.is(Min.concat(-0, 0), -0), true)
  assertEquals(Object.is(Max.concat(-0, 0), 0), true)
  assertEquals(Object.is(Min.concat(0, -0), 0), true)
  assertEquals(Object.is(Max.concat(0, -0), -0), true)
})

Deno.test('RightUnion: the operands survive the merge unmodified', () => {
  const a = { a: 1 }
  const b = { a: 2 }
  const c = RightUnion<number>().concat(a, b)

  assertEquals(a, { a: 1 })
  assertEquals(b, { a: 2 })
  assertEquals(c === a, false)
  assertEquals(c === b, false)
})

Deno.test('Endo: each function receives only the preceding result', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 1
  }

  Endo<number>().concat(recordArguments, recordArguments)(0)

  assertEquals(calls, [[0], [1]])
})

// Shared fixtures

const id = <A>(a: A): A => a

const assertMonoidLaws = <A>(
  M: MonoidDict<Nullary<A>>,
  samples: readonly A[],
  view: (a: A) => unknown = id,
) => {
  for (const a of samples) {
    assertEquals(view(M.concat(M.empty(), a)), view(a), 'left neutral element')
    assertEquals(view(M.concat(a, M.empty())), view(a), 'right neutral element')
    for (const b of samples) {
      for (const c of samples) {
        assertEquals(
          view(M.concat(M.concat(a, b), c)),
          view(M.concat(a, M.concat(b, c))),
          'associativity',
        )
      }
    }
  }
}
