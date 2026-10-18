import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Do } from '../../src/classes/monad.ts'
import type { MaybeShape } from '../../src/data/maybe.ts'
import type { ArrayShape } from '../../src/natives/array.ts'
import { fgo, go } from '../../src/classes/monad.ts'
import { Either, left, right } from '../../src/data/either.ts'
import { just, Maybe, nothing } from '../../src/data/maybe.ts'
import { Arr } from '../../src/natives/array.ts'
import { Fn } from '../../src/natives/function.ts'
import { Sets } from '../../src/natives/set.ts'

test ('go: passes each unwrapped value to the next computation', () => {
  function* total() {
    const first: number = yield half (8)
    const second: number = yield half (first)
    return first + second
  }

  assert.deepStrictEqual (go (Maybe) (total), just (6))
})

test ('go: combines successful Either values', () => {
  function* total() {
    const first: number = yield parseNumber ('2')
    const second: number = yield parseNumber ('40')
    return first + second
  }

  assert.deepStrictEqual (go (Either) (total), right (42))
})

test ('go: arrays produce every combination in order', () => {
  function* sums() {
    const first: number = yield [1, 2]
    const second: number = yield [10, 20]
    return first + second
  }

  assert.deepStrictEqual (go (Arr) (sums), [11, 21, 12, 22])
})

test ('go: transforms every value from a single array', () => {
  function* scale() {
    const value: number = yield [1, 2, 3]
    return value * 10
  }

  assert.deepStrictEqual (go (Arr) (scale), [10, 20, 30])
})

test ('go: sets produce every combination', () => {
  function* sums() {
    const first: number = yield new Set ([1, 2])
    const second: number = yield new Set ([10, 20])
    return first + second
  }

  assert.deepStrictEqual (go (Sets) (sums), new Set ([11, 21, 12, 22]))
})

test ('go: sets remove duplicate results', () => {
  function* sums() {
    const first: number = yield new Set ([1, 2])
    const second: number = yield new Set ([0, 1])
    return first + second
  }

  assert.deepStrictEqual (go (Sets) (sums), new Set ([1, 2, 3]))
})

test ('fgo: forwards arguments to the generator', () => {
  function* sums(firstValues: number[], secondValues: number[]) {
    const first: number = yield firstValues
    const second: number = yield secondValues
    return first + second
  }

  const sumPairs = fgo (Arr) (sums)

  assert.deepStrictEqual (sumPairs ([1, 2], [10, 20]), [11, 21, 12, 22])
  assert.deepStrictEqual (sumPairs ([0], [7]), [7])
})

test ('fgo: a body can recurse into itself with yield*', () => {
  assert.deepStrictEqual (halfRepeatedly (3, 8), just (1))
})

test ('go: Maybe runs the body once when every yield succeeds', () => {
  let starts = 0
  function* total() {
    starts += 1
    const first: number = yield half (8)
    const second: number = yield half (first)
    return first + second
  }

  assert.deepStrictEqual (go (Maybe) (total), just (6))
  assert.deepStrictEqual (starts, 1)
})

test ('go: array branching can repeat statements before a yield', () => {
  const visits: string[] = []
  function* sums() {
    visits.push ('start')
    const first: number = yield [1, 2]
    visits.push (`first: ${first}`)
    const second: number = yield [10, 20]
    return first + second
  }

  assert.deepStrictEqual (go (Arr) (sums), [11, 21, 12, 22])
  assert.deepStrictEqual (visits, [
    'start',
    'first: 1',
    'start',
    'first: 1',
    'start',
    'first: 2',
    'start',
    'first: 2',
    'start',
    'first: 2',
  ])
})

test ('go: functions share the input and can be called repeatedly', () => {
  function increment(value: number): number {
    return value + 1
  }
  function double(value: number): number {
    return value * 2
  }
  function* total() {
    const first: number = yield increment
    const second: number = yield double
    return first + second
  }

  const calculate = go (Fn) (total)

  assert.deepStrictEqual (calculate (10), 31)
  assert.deepStrictEqual (calculate (3), 10)
  assert.deepStrictEqual (calculate (10), 31)
})

test ('fgo: creates a fresh body for each call', () => {
  const inputs: number[] = []
  function* recordHalf(value: number) {
    inputs.push (value)
    const result: number = yield half (value)
    return result
  }

  const run = fgo (Maybe) (recordHalf)
  assert.deepStrictEqual (inputs, [])
  assert.deepStrictEqual (run (8), just (4))
  assert.deepStrictEqual (run (6), just (3))
  assert.deepStrictEqual (inputs, [8, 6])
})

test ('go: Nothing stops the body before the next statement', () => {
  let continued = false
  function* total() {
    const first: number = yield half (8)
    const second: number = yield half (3)
    continued = true
    return first + second
  }

  assert.deepStrictEqual (go (Maybe) (total), nothing ())
  assert.deepStrictEqual (continued, false)
})

test ('go: Left preserves the error and stops the body', () => {
  let continued = false
  function* total() {
    const first: number = yield parseNumber ('2')
    const second: number = yield parseNumber ('invalid')
    continued = true
    return first + second
  }

  assert.deepStrictEqual (go (Either) (total), left ('invalid'))
  assert.deepStrictEqual (continued, false)
})

test ('go: an empty array removes every branch that reaches it', () => {
  const noValues: number[] = []
  function* sums() {
    const first: number = yield [1, 2]
    const second: number = yield noValues
    return first + second
  }

  assert.deepStrictEqual (go (Arr) (sums), [])
})

test ('go: wraps a return value in Maybe without any yields', () => {
  function* answer() {
    return 42
  }

  assert.deepStrictEqual (go (Maybe) (answer), just (42))
})

test ('go: wraps a return value in an array without any yields', () => {
  function* answer() {
    return 42
  }

  assert.deepStrictEqual (go (Arr) (answer), [42])
})

test ('fgo: recursive failure returns Nothing', () => {
  assert.deepStrictEqual (halfRepeatedly (4, 8), nothing ())
})

test ('fgo: the recursive base case wraps the result without yielding', () => {
  assert.deepStrictEqual (halfRepeatedly (0, 5), just (5))
})

test ('fgo: yield* recursion survives the replay of a branching body', () => {
  function* countdown(n: number): Do<ArrayShape, number> {
    if (n === 0) return 0
    const step: number = yield [1, 2]
    return step + (yield* countdown (n - 1))
  }

  const walk = fgo (Arr) (countdown)
  assert.deepStrictEqual (walk (0), [0])
  assert.deepStrictEqual (walk (1), [1, 2])
  assert.deepStrictEqual (walk (2), [2, 3, 3, 4])
})

test ('go: rejects Maybe inside an Either body', () => {
  function* mixed() {
    const first: number = yield right<string, number> (2)
    const second: number = yield nothing<number> () as unknown as Either<
      string,
      number
    >
    return first + second
  }
  function run(): unknown {
    return go (Either) (mixed)
  }

  assert.throws (
    run,
    (error: unknown) => error instanceof TypeError && error.message.includes ('the body runs in Either but yielded Maybe'),
  )
})

test ('go: rejects Maybe inside an array body', () => {
  function* mixed() {
    const first: number = yield [1, 2]
    const second: number = yield just (3) as unknown as number[]
    return first + second
  }
  function run(): unknown {
    return go (Arr) (mixed)
  }

  assert.throws (
    run,
    (error: unknown) => error instanceof TypeError && error.message.includes ('the body runs in Array but yielded Maybe'),
  )
})

test ('fgo: identifies itself in the mismatched wrapper error', () => {
  function* mixed() {
    const first: number = yield just (1)
    const second: number = yield [2] as unknown as Maybe<number>
    return first + second
  }

  const run = fgo (Maybe) (mixed)
  assert.throws (
    run,
    (error: unknown) => error instanceof TypeError && error.message.includes ('fgo: the body runs in Maybe but yielded Array'),
  )
})

test ('fgo: a function without arguments returns the same result as go', () => {
  function* total() {
    const first: number = yield half (8)
    const second: number = yield half (first)
    return first + second
  }

  const run = fgo (Maybe) (total)
  assert.deepStrictEqual (run (), just (6))
  assert.deepStrictEqual (run (), go (Maybe) (total))
})

test ('Do: describes the yielded wrapper and the returned value', () => {
  function* sums(): Do<ArrayShape, number> {
    const first: number = yield [1, 2]
    const second: number = yield [10, 20]
    return first + second
  }

  const result = go (Arr) (sums)
  assert.deepStrictEqual (result, [11, 21, 12, 22])
})

function half(value: number): Maybe<number> {
  return value % 2 === 0 ? just (value / 2) : nothing ()
}

function parseNumber(text: string): Either<string, number> {
  const value = Number (text)
  return Number.isNaN (value) ? left (text) : right (value)
}

function* halfBody(
  times: number,
  value: number,
): Do<MaybeShape, number> {
  if (times === 0) return value
  const result: number = yield half (value)
  return yield* halfBody (times - 1, result)
}

const halfRepeatedly: (times: number, value: number) => Maybe<number> = fgo (
  Maybe,
) (halfBody)
