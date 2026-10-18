import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bifunctorNatives, bimap, mapLeft } from '../../src/classes/bifunctor.ts'
import { map } from '../../src/classes/functor.ts'
import { left, right } from '../../src/data/either.ts'
import { identity } from '../../src/data/identity.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'

test ('bimap: transforms both sides of a Pair, or the active branch of an Either', () => {
  assert.deepStrictEqual (
    bimap (bang) (doubleNumber) (left<string, number> ('oops')),
    left ('oops!'),
  )
  assert.deepStrictEqual (bimap (bang) (doubleNumber) (right<string, number> (2)), right (4))
  assert.deepStrictEqual (bimap (bang) (doubleNumber) (pair ('log', 2)), pair ('log!', 4))
})

test ('mapLeft: transforms a Left value or the first value of a Pair', () => {
  assert.deepStrictEqual (mapLeft (bang) (left<string, number> ('oops')), left ('oops!'))
  assert.deepStrictEqual (mapLeft (bang) (right<string, number> (1)), right (1))
  assert.deepStrictEqual (mapLeft (bang) (pair ('log', 1)), pair ('log!', 1))
})

test ('mapLeft: the same as bimap with an identity on the right', () => {
  for (const [name, wrappedValue] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (
      mapLeft (bang) (wrappedValue),
      bimap (bang) (idf) (wrappedValue),
      name,
    )
  }
})

test ('bimap: identity law across supported types', () => {
  for (const [name, wrappedValue] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (bimap (idf) (idf) (wrappedValue), wrappedValue, name)
  }
})

test ('bimap: composition law across supported types', () => {
  function doubleThenIncrement(n: number) {
    return increment (doubleNumber (n))
  }

  function lengthAfterBang(s: string) {
    return size (bang (s))
  }

  for (const [name, wrappedValue] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (
      bimap (lengthAfterBang) (doubleThenIncrement) (wrappedValue),
      bimap (size) (increment) (bimap (bang) (doubleNumber) (wrappedValue)),
      name,
    )
  }
})

test ('bimap: agrees with map on the value channel', () => {
  for (const [name, wrappedValue] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (
      bimap (idf) (doubleNumber) (wrappedValue),
      map (doubleNumber) (wrappedValue),
      name,
    )
  }
})

test ('bimap: Either.Left calls only its active branch', () => {
  let leftCalls = 0
  let rightCalls = 0

  function transformLeft(error: string) {
    leftCalls++
    return error
  }

  function transformRight(value: number) {
    rightCalls++
    return value
  }

  bimap (transformLeft) (transformRight) (left<string, number> ('oops'))

  assert.deepStrictEqual (leftCalls, 1)
  assert.deepStrictEqual (rightCalls, 0)
})

test ('bimap: Either.Right calls only its active branch', () => {
  let leftCalls = 0
  let rightCalls = 0

  function transformLeft(error: string) {
    leftCalls++
    return error
  }

  function transformRight(value: number) {
    rightCalls++
    return value
  }

  bimap (transformLeft) (transformRight) (right<string, number> (2))

  assert.deepStrictEqual (leftCalls, 0)
  assert.deepStrictEqual (rightCalls, 1)
})

test ('bimap: Pair calls both transformations', () => {
  let leftCalls = 0
  let rightCalls = 0

  function transformLeft(error: string) {
    leftCalls++
    return error
  }

  function transformRight(value: number) {
    rightCalls++
    return value
  }

  bimap (transformLeft) (transformRight) (pair ('log', 1))

  assert.deepStrictEqual (leftCalls, 1)
  assert.deepStrictEqual (rightCalls, 1)
})

test ('bimap: Either.Left passes only the left value to its first callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  bimap (recordArguments) (idf) (left<string, number> ('oops'))

  assert.deepStrictEqual (calls, [['oops']])
})

test ('bimap: Either.Left passes only the right value to its second callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  bimap (idf) (recordArguments) (left<string, number> ('oops'))

  assert.deepStrictEqual (calls, [])
})

test ('mapLeft: Either.Left passes only the left value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  mapLeft (recordArguments) (left<string, number> ('oops'))

  assert.deepStrictEqual (calls, [['oops']])
})

test ('bimap: Either.Right passes only the left value to its first callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  bimap (recordArguments) (idf) (right<string, number> (1))

  assert.deepStrictEqual (calls, [])
})

test ('bimap: Either.Right passes only the right value to its second callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  bimap (idf) (recordArguments) (right<string, number> (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('mapLeft: Either.Right passes only the left value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  mapLeft (recordArguments) (right<string, number> (1))

  assert.deepStrictEqual (calls, [])
})

test ('bimap: Pair passes only the left value to its first callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  bimap (recordArguments) (idf) (pair ('log', 1))

  assert.deepStrictEqual (calls, [['log']])
})

test ('bimap: Pair passes only the right value to its second callback', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  bimap (idf) (recordArguments) (pair ('log', 1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('mapLeft: Pair passes only the left value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 1
  }

  mapLeft (recordArguments) (pair ('log', 1))

  assert.deepStrictEqual (calls, [['log']])
})

test ('bimap: rejects values without Bifunctor', () => {
  for (
    const [name, wrappedValue] of [
      ['Array', [1, 2, 3]],
      ['StrMap', { a: 1 }],
      ['Maybe', just (1)],
      ['Maybe', nothing<number> ()],
      ['Identity', identity (1)],
    ] as const
  ) {
    assert.throws (
      () => bimap (bang) (doubleNumber) (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes (`bimap: ${name} has no Bifunctor`),
    )
    assert.throws (
      () => mapLeft (bang) (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes (`bimap: ${name} has no Bifunctor`),
    )
  }
})

test ('bifunctorNatives: has no native implementations', () => {
  assert.deepStrictEqual (Object.keys (bifunctorNatives), [])
})

const bang = (s: string) => s + '!'

const size = (s: string) => s.length

const doubleNumber = (n: number) => n * 2

const increment = (n: number) => n + 1

const idf = <A>(a: A): A => a

const samplesByType = {
  'Either.Left': left<string, number> ('oops'),
  'Either.Right': right<string, number> (1),
  Pair: pair ('log', 1),
}
