import assert from 'node:assert/strict'
import { test } from 'node:test'
import { append, prepend } from '../../src/classes/_append.ts'
import { toArray } from '../../src/classes/foldable.ts'
import { right } from '../../src/data/either.ts'
import { identity } from '../../src/data/identity.ts'
import { just } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'

const withoutSemigroup = (name: string) => (f: () => unknown) =>
  assert.throws (
    f,
    (error: unknown) => error instanceof TypeError && error.message.includes (`concat: ${name} has no Semigroup`),
    name,
  )

test ('prepend: adds a value to the start of an array', () => {
  assert.deepStrictEqual (prepend (0) ([1, 2]), [0, 1, 2])
})

test ('append: adds a value to the end of an array', () => {
  assert.deepStrictEqual (append (3) ([1, 2]), [1, 2, 3])
})

test ('append: the element lands at the end of the traversal across supported types', () => {
  assert.deepStrictEqual (
    toArray (append (9) ([1, 2])),
    [...(toArray ([1, 2]) as number[]), 9],
    'Array',
  )
  assert.deepStrictEqual (
    toArray (prepend (9) ([1, 2])),
    [9, ...(toArray ([1, 2]) as number[])],
    'Array',
  )
})

test ('append: changing the order changes the result', () => {
  assert.deepStrictEqual (append (9) ([1, 2]), [1, 2, 9])
  assert.deepStrictEqual (prepend (9) ([1, 2]), [9, 1, 2])
})

test ('append: rejects values without of', () => {
  const withoutOf = {
    StrMap: { a: 1 },
    Map: new Map ([['a', 1]]),
  }
  for (const [name, wrappedValue] of Object.entries (withoutOf)) {
    assert.throws (
      () => append (9) (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Applicative'),
      name,
    )
    assert.throws (
      () => prepend (9) (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Applicative'),
      name,
    )
  }
})

test ('append: rejects values without concat', () => {
  const withoutConcat = {
    Maybe: just (1),
    Either: right<string, number> (1),
    Identity: identity (1),
    Set: new Set ([1, 2]),
  }
  for (const [name, wrappedValue] of Object.entries (withoutConcat)) {
    assert.throws (
      () => append (9) (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Semigroup'),
      name,
    )
    assert.throws (
      () => prepend (9) (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Semigroup'),
      name,
    )
  }
})

test ('append: Set fails the type check and throws at runtime', () => {
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _set = () => append (3) (new Set ([1, 2]))
  void _set
  withoutSemigroup ('Set') (() => append (3) (new Set ([1, 2]) as never))
})

test ('prepend: Set fails the type check and throws at runtime', () => {
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _set = () => prepend (0) (new Set ([1, 2]))
  void _set
  withoutSemigroup ('Set') (() => prepend (0) (new Set ([1, 2]) as never))
})

test ('append: on an empty value it gives a one-element one', () => {
  assert.deepStrictEqual (append (1) ([] as number[] as never), [1])
  assert.deepStrictEqual (prepend (1) ([] as number[] as never), [1])

  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _set = () => append (1) (new Set<number> ())
  void _set
  withoutSemigroup ('Set') (() => append (1) (new Set<number> () as never))
})

test ('append: rejects Set because it has no concat operation', () => {
  const s = new Set ([1, 2])
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _append = () => append (9) (s)
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _prepend = () => prepend (9) (s)
  // @ts-expect-error Set is no longer Foldable: nothing walks it
  const _traversal = () => toArray (s)
  void _append, _prepend, _traversal

  withoutSemigroup ('Set') (() => append (9) (s as never))
  withoutSemigroup ('Set') (() => prepend (9) (s as never))
  assert.throws (
    () => toArray (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
})

test ('append: the original value does not change', () => {
  const values = [1, 2]
  append (3) (values as never)
  prepend (0) (values as never)
  assert.deepStrictEqual (values, [1, 2])

  const s = new Set ([1, 2])
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _set = () => append (3) (s)
  void _set
  withoutSemigroup ('Set') (() => append (3) (s as never))
  assert.deepStrictEqual (s, new Set ([1, 2]))
})

test ('append: rejects Set even when the value is already present', () => {
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _duplicate = () => append (2) (new Set ([1, 2]))
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _atFront = () => prepend (2) (new Set ([1, 2]))
  // @ts-expect-error Set is no longer an ApplicativeSemigroup: it has no concat
  const _fresh = () => append (3) (new Set ([1, 2]))
  void _duplicate, _atFront, _fresh

  withoutSemigroup ('Set') (() => append (2) (new Set ([1, 2]) as never))
  withoutSemigroup ('Set') (() => prepend (2) (new Set ([1, 2]) as never))
  withoutSemigroup ('Set') (() => append (3) (new Set ([1, 2]) as never))
  assert.deepStrictEqual (append (2) ([1, 2] as never), [1, 2, 2])
})

test ('append: Pair is rejected by the type check', () => {
  // @ts-expect-error the Pair type representative has no of
  const _a = () => append (9) (pair ('log', 1))
  // @ts-expect-error the Pair type representative has no of
  const _b = () => prepend (9) (pair ('log', 1))
  void _a, _b

  assert.throws (
    () => append (9) (pair ('log', 1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('Pair has no Applicative'),
  )
})
