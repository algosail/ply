import { assertEquals, assertThrows } from '@std/assert'
import { alt, altNatives } from './alt.ts'
import { map } from './functor.ts'
import { just, nothing } from '../data/maybe.ts'
import { left, right } from '../data/either.ts'
import { identity } from '../data/identity.ts'
import { pair } from '../data/pair.ts'

// Shared fixtures

const increment = (n: number) => n + 1

const choose = (wrappedValue: unknown, otherWrappedValue: unknown): unknown =>
  alt(otherWrappedValue as never)(wrappedValue as never) as unknown

const samplesByType: Record<string, readonly unknown[]> = {
  'Array': [[1, 2], [3], [4, 5]],
  'StrMap': [{ x: 1, y: 2 }, { y: 20, z: 3 }, { z: 30, w: 4 }],
  'Maybe.Just': [just(1), just(2), just(3)],
  'Maybe.Nothing': [nothing<number>(), just(2), nothing<number>()],
  'Either.Right': [
    right<string, number>(1),
    left<string, number>('b'),
    right<string, number>(3),
  ],
  'Either.Left': [
    left<string, number>('a'),
    right<string, number>(2),
    left<string, number>('c'),
  ],
}

const withdrawn: readonly [Set<number>, Set<number>, Set<number>] = [
  new Set([1, 2]),
  new Set([2, 3]),
  new Set([3, 4]),
]

const noChoice = (f: () => unknown, msg?: string) =>
  assertThrows(f, TypeError, 'alt: Set has no Alt', msg)

// Examples

Deno.test('alt: swapping alternatives can change the result', () => {
  const pairs: [string, unknown, unknown][] = [
    ['Array', [1, 2], [3]],
    ['StrMap', { a: 1 }, { a: 2 }],
    ['Maybe', just(1), just(2)],
    ['Either', right<string, number>(1), right<string, number>(2)],
  ]
  for (const [name, a, b] of pairs) {
    const forward = JSON.stringify(choose(a, b))
    const backward = JSON.stringify(choose(b, a))
    assertEquals(forward === backward, false, name)
  }
})

Deno.test('alt: in StrMap the left one wins when the keys collide', () => {
  assertEquals(choose({ a: 1 }, { a: 2, b: 3 }), { a: 1, b: 3 })
})

Deno.test('alt: Maybe and Either take the first success', () => {
  assertEquals(choose(just(1), just(2)), just(1))
  assertEquals(choose(nothing<number>(), just(2)), just(2))
  assertEquals(choose(nothing<number>(), nothing<number>()), nothing<number>())
  assertEquals(
    choose(right<string, number>(1), right<string, number>(2)),
    right<string, number>(1),
  )
  assertEquals(
    choose(left<string, number>('e'), right<string, number>(2)),
    right<string, number>(2),
  )
  assertEquals(
    choose(left<string, number>('a'), left<string, number>('b')),
    left<string, number>('b'),
  )
})

// Laws

Deno.test('alt: associativity law across supported types', () => {
  for (const [name, [a, b, c]] of Object.entries(samplesByType)) {
    assertEquals(choose(choose(a, b), c), choose(a, choose(b, c)), name)
  }
})

Deno.test('alt: distributivity law over map across supported types', () => {
  for (const [name, [a, b]] of Object.entries(samplesByType)) {
    assertEquals(
      map(increment)(choose(a, b) as never) as unknown,
      choose(map(increment)(a as never), map(increment)(b as never)),
      name,
    )
  }
})

// Type checking

Deno.test('alt: combines alternatives in argument order', () => {
  assertEquals(alt([3])([1, 2]), [1, 2, 3])
  assertEquals(choose(just(1), just(2)), just(1))
  assertEquals(choose(nothing<number>(), just(2)), just(2))
  // @ts-expect-error alt has no overload for Set
  const _set = () => alt(new Set([2, 3]))(new Set([1, 2]))
  void _set
  noChoice(() => choose(new Set([1, 2]), new Set([2, 3])))
})

Deno.test('alt: rejects Set inputs', () => {
  const [a, b, c] = withdrawn
  // @ts-expect-error alt has no overload for Set
  const _law = () => alt(b)(a)
  void _law

  noChoice(() => choose(choose(a, b), c), 'Set on the left')
  noChoice(() => choose(a, choose(b, c)), 'Set on the right')
  noChoice(() => map(increment)(choose(a, b) as never), 'Set outside')
  noChoice(
    () => choose(map(increment)(a as never), map(increment)(b as never)),
    'Set inside',
  )
  assertEquals(map(increment)(a as never) as unknown, new Set([2, 3]))
})

Deno.test('alt: Array concatenates, and Set is rejected', () => {
  assertEquals(alt([3, 4])([1, 2]), [1, 2, 3, 4])
  assertEquals(alt([2])([1, 2]), [1, 2, 2])
  // @ts-expect-error alt has no overload for Set
  const _set = () => alt(new Set([2, 3]))(new Set([1, 2]))
  void _set
  noChoice(() => choose(new Set([1, 2]), new Set([2, 3])))
})

Deno.test('alt: rejects values without Alt', () => {
  const strangers: [string, unknown, unknown][] = [
    ['Pair', pair('l', 1), pair('r', 2)],
    ['Identity', identity(1), identity(2)],
    ['Map', new Map([['a', 1]]), new Map([['b', 2]])],
    ['String', 'ab', 'cd'],
    ['Set', new Set([1, 2]), new Set([2, 3])],
  ]
  for (const [name, a, b] of strangers) {
    assertThrows(
      () => choose(a, b),
      TypeError,
      'has no Alt',
      name,
    )
  }
  // @ts-expect-error alt has no overload for Set
  const _set = () => alt(new Set([2]))(new Set([1]))
  // @ts-expect-error alt has no overload for Map
  const _dict = () => alt(new Map([['b', 2]]))(new Map([['a', 1]]))
  void _set, _dict
})

// Native operation tables

Deno.test('altNatives: lists native alt implementations', () => {
  assertEquals(Object.keys(altNatives).sort(), ['Array', 'StrMap'])
  for (const [name, dict] of Object.entries(altNatives)) {
    assertEquals(typeof dict.alt, 'function', name)
  }

  // @ts-expect-error altNatives has no Set cell
  const _cell = () => altNatives.Set
  void _cell
  assertEquals('Set' in altNatives, false)
})
