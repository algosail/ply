import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  and,
  Bool,
  boolean,
  complement,
  ifElse,
  isFalse,
  isTrue,
  not,
  or,
  unless,
  when,
} from '../../src/natives/boolean.ts'

test ('and: returns true when both supplied booleans are true', () => {
  assert.deepStrictEqual (and (true) (true), true)
  assert.deepStrictEqual (and (true) (false), false)
  assert.deepStrictEqual (and (false) (true), false)
  assert.deepStrictEqual (and (false) (false), false)
})

test ('or: returns true when at least one supplied boolean is true', () => {
  assert.deepStrictEqual (or (true) (true), true)
  assert.deepStrictEqual (or (true) (false), true)
  assert.deepStrictEqual (or (false) (true), true)
  assert.deepStrictEqual (or (false) (false), false)
})

test ('not: negates a boolean', () => {
  assert.deepStrictEqual (not (true), false)
  assert.deepStrictEqual (not (false), true)
})

test ('boolean: chooses between two values: supply the false case first, then the true case', () => {
  assert.deepStrictEqual (boolean ('no') ('yes') (true), 'yes')
  assert.deepStrictEqual (boolean ('no') ('yes') (false), 'no')
})

test ('ifElse: applies one of two functions to the input depending on a predicate', () => {
  const big = (n: number) => n > 10
  const f = ifElse (big) ((n: number) => `${n} big`) ((n) => `${n} small`)

  assert.deepStrictEqual (f (42), '42 big')
  assert.deepStrictEqual (f (1), '1 small')
})

test ('Bool: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (Bool['@@type'], 'Boolean')
  assert.deepStrictEqual (Bool.is (true), true)
  assert.deepStrictEqual (Bool.is (0), false)
  assert.deepStrictEqual (Bool.is (new Boolean (true)), false)
  assert.deepStrictEqual (Bool.equals (true, true), true)
  assert.deepStrictEqual (Bool.equals (true, false), false)
  assert.deepStrictEqual (Bool.show (true), 'true')
  assert.deepStrictEqual (Bool.show (false), 'false')
})

test ('Bool: the order false < true', () => {
  assert.deepStrictEqual (Bool.lte (false, true), true)
  assert.deepStrictEqual (Bool.lte (true, false), false)
  assert.deepStrictEqual (Bool.lte (true, true), true)
  assert.deepStrictEqual (Bool.lte (false, false), true)
})

test ('complement: creates a predicate that returns the opposite of the supplied predicate', () => {
  const even = (n: number) => n % 2 === 0

  assert.deepStrictEqual (complement (even) (2), false)
  assert.deepStrictEqual (complement (even) (3), true)
  assert.deepStrictEqual (complement (complement (even)) (4), even (4))
})

test ('when and unless complement each other', () => {
  const p = (n: number) => n % 2 === 0
  const f = (n: number) => n + 100
  for (const n of [0, 1, 2, 3, -4, 7]) {
    assert.deepStrictEqual (when (p) (f) (n), unless (complement (p)) (f) (n))
  }
})

test ('when: transforms the input when the predicate passes; otherwise returns it unchanged', () => {
  const double = when ((n: number) => n > 0) ((n) => n * 2)

  assert.deepStrictEqual (double (3), 6)
  assert.deepStrictEqual (double (-3), -3)
})

test ('unless: transforms the input when the predicate fails; otherwise returns it unchanged', () => {
  const double = unless ((n: number) => n > 0) ((n) => n * 2)

  assert.deepStrictEqual (double (3), 3)
  assert.deepStrictEqual (double (-3), -6)
})

test ('complement: passes only the input to the predicate', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  complement (recordArguments) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('ifElse: passes only the input to the predicate', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  function returnOne() {
    return 1
  }

  function returnTwo() {
    return 2
  }

  ifElse (recordArguments) (returnOne) (returnTwo) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('when: passes only the input to the predicate', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  function returnInput(value: number) {
    return value
  }

  when<number> (recordArguments) (returnInput) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('unless: passes only the input to the predicate', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  function returnInput(value: number) {
    return value
  }

  unless<number> (recordArguments) (returnInput) (1)

  assert.deepStrictEqual (calls, [[1]])
})

test ('the ifElse branches are not evaluated up front', () => {
  const boom = (): number => {
    throw new Error ('should not have been called')
  }

  assert.deepStrictEqual (ifElse ((n: number) => n > 0) ((n) => n) (boom) (1), 1)
  assert.throws (() => ifElse ((n: number) => n > 0) (boom) ((n) => n) (1))
})

test ('isTrue and isFalse ask about the value, not its truthiness', () => {
  assert.deepStrictEqual ([isTrue (true), isTrue (1), isTrue ('yes')], [true, false, false])
  assert.deepStrictEqual ([isFalse (false), isFalse (0), isFalse ('')], [true, false, false])
})
