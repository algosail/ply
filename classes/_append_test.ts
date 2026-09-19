import { assertEquals, assertThrows } from '@std/assert'
import { append, prepend } from './_append.ts'
import { toArray } from './foldable.ts'
import { identity } from '../data/identity.ts'
import { pair } from '../data/pair.ts'
import { just } from '../data/maybe.ts'
import { right } from '../data/either.ts'

// Shared fixtures

const withoutSemigroup = (name: string) => (f: () => unknown) =>
  assertThrows(f, TypeError, `concat: ${name} has no Semigroup`, name)

// Examples

Deno.test('prepend: adds a value to the start of an array', () => {
  assertEquals(prepend(0)([1, 2]), [0, 1, 2])
})

Deno.test('append: adds a value to the end of an array', () => {
  assertEquals(append(3)([1, 2]), [1, 2, 3])
})

Deno.test('append: the element lands at the end of the traversal across supported types', () => {
  assertEquals(
    toArray(append(9)([1, 2])),
    [...(toArray([1, 2]) as number[]), 9],
    'Array',
  )
  assertEquals(
    toArray(prepend(9)([1, 2])),
    [9, ...(toArray([1, 2]) as number[])],
    'Array',
  )
})

Deno.test('append: changing the order changes the result', () => {
  assertEquals(append(9)([1, 2]), [1, 2, 9])
  assertEquals(prepend(9)([1, 2]), [9, 1, 2])
})

// Edge cases

Deno.test('append: rejects values without of', () => {
  // Bypass the type checker to verify the runtime error.
  const withoutOf = {
    'StrMap': { a: 1 },
    'Map': new Map([['a', 1]]),
  }
  for (const [name, wrappedValue] of Object.entries(withoutOf)) {
    assertThrows(
      () => append(9)(wrappedValue as never),
      TypeError,
      'has no Applicative',
      name,
    )
    assertThrows(
      () => prepend(9)(wrappedValue as never),
      TypeError,
      'has no Applicative',
      name,
    )
  }
})

Deno.test('append: rejects values without concat', () => {
  // Bypass the type checker to verify the runtime error.
  const withoutConcat = {
    'Maybe': just(1),
    'Either': right<string, number>(1),
    'Identity': identity(1),
    'Set': new Set([1, 2]),
  }
  for (const [name, wrappedValue] of Object.entries(withoutConcat)) {
    assertThrows(
      () => append(9)(wrappedValue as never),
      TypeError,
      'has no Semigroup',
      name,
    )
    assertThrows(
      () => prepend(9)(wrappedValue as never),
      TypeError,
      'has no Semigroup',
      name,
    )
  }
})

// Type checking

Deno.test('append: Set fails the type check and throws at runtime', () => {
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _set = () => append(3)(new Set([1, 2]))
  void _set
  // And through a cast, at the call.
  withoutSemigroup('Set')(() => append(3)(new Set([1, 2]) as never))
})

Deno.test('prepend: Set fails the type check and throws at runtime', () => {
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _set = () => prepend(0)(new Set([1, 2]))
  void _set
  withoutSemigroup('Set')(() => prepend(0)(new Set([1, 2]) as never))
})

Deno.test('append: on an empty value it gives a one-element one', () => {
  assertEquals(append(1)([] as number[] as never), [1])
  assertEquals(prepend(1)([] as number[] as never), [1])

  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _set = () => append(1)(new Set<number>())
  void _set
  withoutSemigroup('Set')(() => append(1)(new Set<number>() as never))
})

Deno.test('append: rejects Set because it has no concat operation', () => {
  const s = new Set([1, 2])
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _append = () => append(9)(s)
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _prepend = () => prepend(9)(s)
  // @ts-expect-error Set is no longer Foldable: nothing walks it
  const _traversal = () => toArray(s)
  void _append, _prepend, _traversal

  withoutSemigroup('Set')(() => append(9)(s as never))
  withoutSemigroup('Set')(() => prepend(9)(s as never))
  assertThrows(
    () => toArray(s as never),
    TypeError,
    'reduce: Set has no Foldable',
  )
})

Deno.test('append: the original value does not change', () => {
  const values = [1, 2]
  append(3)(values as never)
  prepend(0)(values as never)
  assertEquals(values, [1, 2])

  const s = new Set([1, 2])
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _set = () => append(3)(s)
  void _set
  withoutSemigroup('Set')(() => append(3)(s as never))
  assertEquals(s, new Set([1, 2]))
})

Deno.test('append: rejects Set even when the value is already present', () => {
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _duplicate = () => append(2)(new Set([1, 2]))
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _atFront = () => prepend(2)(new Set([1, 2]))
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _fresh = () => append(3)(new Set([1, 2]))
  void _duplicate, _atFront, _fresh

  withoutSemigroup('Set')(() => append(2)(new Set([1, 2]) as never))
  withoutSemigroup('Set')(() => prepend(2)(new Set([1, 2]) as never))
  withoutSemigroup('Set')(() => append(3)(new Set([1, 2]) as never))
  assertEquals(append(2)([1, 2] as never), [1, 2, 2])
})

Deno.test('append: Pair is rejected by the type check', () => {
  // @ts-expect-error the Pair type representative has no of
  const _a = () => append(9)(pair('log', 1))
  // @ts-expect-error the Pair type representative has no of
  const _b = () => prepend(9)(pair('log', 1))
  void _a, _b

  assertThrows(
    () => append(9)(pair('log', 1) as never),
    TypeError,
    'Pair has no Applicative',
  )
})
