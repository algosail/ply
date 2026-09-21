import type { Do } from './monad.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { MaybeShape } from '../data/maybe.ts'
import { assertEquals, assertThrows } from '@std/assert'
import { Arr } from '../natives/array.ts'
import { Fn } from '../natives/function.ts'
import { Sets } from '../natives/set.ts'
import { Either, left, right } from '../data/either.ts'
import { just, Maybe, nothing } from '../data/maybe.ts'
import { fgo, go } from './monad.ts'

// Examples

Deno.test('go: passes each unwrapped value to the next computation', () => {
  function* total() {
    const first: number = yield half(8)
    const second: number = yield half(first)
    return first + second
  }

  assertEquals(go(Maybe)(total), just(6))
})

Deno.test('go: combines successful Either values', () => {
  function* total() {
    const first: number = yield parseNumber('2')
    const second: number = yield parseNumber('40')
    return first + second
  }

  assertEquals(go(Either)(total), right(42))
})

Deno.test('go: arrays produce every combination in order', () => {
  function* sums() {
    const first: number = yield [1, 2]
    const second: number = yield [10, 20]
    return first + second
  }

  assertEquals(go(Arr)(sums), [11, 21, 12, 22])
})

Deno.test('go: transforms every value from a single array', () => {
  function* scale() {
    const value: number = yield [1, 2, 3]
    return value * 10
  }

  assertEquals(go(Arr)(scale), [10, 20, 30])
})

Deno.test('go: sets produce every combination', () => {
  function* sums() {
    const first: number = yield new Set([1, 2])
    const second: number = yield new Set([10, 20])
    return first + second
  }

  assertEquals(go(Sets)(sums), new Set([11, 21, 12, 22]))
})

Deno.test('go: sets remove duplicate results', () => {
  function* sums() {
    const first: number = yield new Set([1, 2])
    const second: number = yield new Set([0, 1])
    return first + second
  }

  assertEquals(go(Sets)(sums), new Set([1, 2, 3]))
})

Deno.test('fgo: forwards arguments to the generator', () => {
  function* sums(firstValues: number[], secondValues: number[]) {
    const first: number = yield firstValues
    const second: number = yield secondValues
    return first + second
  }

  const sumPairs = fgo(Arr)(sums)

  assertEquals(sumPairs([1, 2], [10, 20]), [11, 21, 12, 22])
  assertEquals(sumPairs([0], [7]), [7])
})

Deno.test('fgo: a body can recurse into itself with yield*', () => {
  assertEquals(halfRepeatedly(3, 8), just(1))
})

// Repeated runs and branching

Deno.test('go: Maybe runs the body once when every yield succeeds', () => {
  let starts = 0
  function* total() {
    starts += 1
    const first: number = yield half(8)
    const second: number = yield half(first)
    return first + second
  }

  assertEquals(go(Maybe)(total), just(6))
  assertEquals(starts, 1)
})

Deno.test('go: array branching can repeat statements before a yield', () => {
  const visits: string[] = []
  function* sums() {
    visits.push('start')
    const first: number = yield [1, 2]
    visits.push(`first: ${first}`)
    const second: number = yield [10, 20]
    return first + second
  }

  assertEquals(go(Arr)(sums), [11, 21, 12, 22])
  assertEquals(visits, [
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

Deno.test('go: functions share the input and can be called repeatedly', () => {
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

  const calculate = go(Fn)(total)

  assertEquals(calculate(10), 31)
  assertEquals(calculate(3), 10)
  assertEquals(calculate(10), 31)
})

Deno.test('fgo: creates a fresh body for each call', () => {
  const inputs: number[] = []
  function* recordHalf(value: number) {
    inputs.push(value)
    const result: number = yield half(value)
    return result
  }

  const run = fgo(Maybe)(recordHalf)
  assertEquals(inputs, [])
  assertEquals(run(8), just(4))
  assertEquals(run(6), just(3))
  assertEquals(inputs, [8, 6])
})

// Empty results and early termination

Deno.test('go: Nothing stops the body before the next statement', () => {
  let continued = false
  function* total() {
    const first: number = yield half(8)
    const second: number = yield half(3)
    continued = true
    return first + second
  }

  assertEquals(go(Maybe)(total), nothing())
  assertEquals(continued, false)
})

Deno.test('go: Left preserves the error and stops the body', () => {
  let continued = false
  function* total() {
    const first: number = yield parseNumber('2')
    const second: number = yield parseNumber('invalid')
    continued = true
    return first + second
  }

  assertEquals(go(Either)(total), left('invalid'))
  assertEquals(continued, false)
})

Deno.test('go: an empty array removes every branch that reaches it', () => {
  const noValues: number[] = []
  function* sums() {
    const first: number = yield [1, 2]
    const second: number = yield noValues
    return first + second
  }

  assertEquals(go(Arr)(sums), [])
})

Deno.test('go: wraps a return value in Maybe without any yields', () => {
  // deno-lint-ignore require-yield
  function* answer() {
    return 42
  }

  assertEquals(go(Maybe)(answer), just(42))
})

Deno.test('go: wraps a return value in an array without any yields', () => {
  // deno-lint-ignore require-yield
  function* answer() {
    return 42
  }

  assertEquals(go(Arr)(answer), [42])
})

Deno.test('fgo: recursive failure returns Nothing', () => {
  assertEquals(halfRepeatedly(4, 8), nothing())
})

Deno.test('fgo: the recursive base case wraps the result without yielding', () => {
  assertEquals(halfRepeatedly(0, 5), just(5))
})

Deno.test('fgo: yield* recursion survives the replay of a branching body', () => {
  function* countdown(n: number): Do<ArrayShape, number> {
    if (n === 0) return 0
    const step: number = yield [1, 2]
    return step + (yield* countdown(n - 1))
  }

  const walk = fgo(Arr)(countdown)
  assertEquals(walk(0), [0])
  assertEquals(walk(1), [1, 2])
  assertEquals(walk(2), [2, 3, 3, 4])
})

// Runtime guards

Deno.test('go: rejects Maybe inside an Either body', () => {
  function* mixed() {
    const first: number = yield right<string, number>(2)
    // Bypass the type checker to exercise the runtime guard.
    const second: number = yield nothing<number>() as unknown as Either<
      string,
      number
    >
    return first + second
  }
  function run(): unknown {
    return go(Either)(mixed)
  }

  assertThrows(run, TypeError, 'the body runs in Either but yielded Maybe')
})

Deno.test('go: rejects Maybe inside an array body', () => {
  function* mixed() {
    const first: number = yield [1, 2]
    // Bypass the type checker to exercise the runtime guard.
    const second: number = yield just(3) as unknown as number[]
    return first + second
  }
  function run(): unknown {
    return go(Arr)(mixed)
  }

  assertThrows(run, TypeError, 'the body runs in Array but yielded Maybe')
})

Deno.test('fgo: identifies itself in the mismatched wrapper error', () => {
  function* mixed() {
    const first: number = yield just(1)
    // Bypass the type checker to exercise the runtime guard.
    const second: number = yield [2] as unknown as Maybe<number>
    return first + second
  }

  const run = fgo(Maybe)(mixed)
  assertThrows(run, TypeError, 'fgo: the body runs in Maybe but yielded Array')
})

// Equivalence and type annotations

Deno.test('fgo: a function without arguments returns the same result as go', () => {
  function* total() {
    const first: number = yield half(8)
    const second: number = yield half(first)
    return first + second
  }

  const run = fgo(Maybe)(total)
  assertEquals(run(), just(6))
  assertEquals(run(), go(Maybe)(total))
})

Deno.test('Do: describes the yielded wrapper and the returned value', () => {
  function* sums(): Do<ArrayShape, number> {
    const first: number = yield [1, 2]
    const second: number = yield [10, 20]
    return first + second
  }

  const result = go(Arr)(sums)
  assertEquals(result, [11, 21, 12, 22])
})

// Test support

function half(value: number): Maybe<number> {
  return value % 2 === 0 ? just(value / 2) : nothing()
}

function parseNumber(text: string): Either<string, number> {
  const value = Number(text)
  return Number.isNaN(value) ? left(text) : right(value)
}

function* halfBody(
  times: number,
  value: number,
): Do<MaybeShape, number> {
  if (times === 0) return value
  const result: number = yield half(value)
  return yield* halfBody(times - 1, result)
}

const halfRepeatedly: (times: number, value: number) => Maybe<number> = fgo(
  Maybe,
)(halfBody)
