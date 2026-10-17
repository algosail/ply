import { test } from 'node:test'
import { assertEquals, assertThrows } from '../assert.ts'
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
  assertEquals (and (true) (true), true)
  assertEquals (and (true) (false), false)
  assertEquals (and (false) (true), false)
  assertEquals (and (false) (false), false)
})

test ('or: returns true when at least one supplied boolean is true', () => {
  assertEquals (or (true) (true), true)
  assertEquals (or (true) (false), true)
  assertEquals (or (false) (true), true)
  assertEquals (or (false) (false), false)
})

test ('not: negates a boolean', () => {
  assertEquals (not (true), false)
  assertEquals (not (false), true)
})

test ('boolean: chooses between two values: supply the false case first, then the true case', () => {
  assertEquals (boolean ('no') ('yes') (true), 'yes')
  assertEquals (boolean ('no') ('yes') (false), 'no')
})

test ('ifElse: applies one of two functions to the input depending on a predicate', () => {
  const big = (n: number) => n > 10
  const f = ifElse (big) ((n: number) => `${n} big`) ((n) => `${n} small`)

  assertEquals (f (42), '42 big')
  assertEquals (f (1), '1 small')
})

test ('Bool: recognizes values and provides the declared operations', () => {
  assertEquals (Bool['@@type'], 'Boolean')
  assertEquals (Bool.is (true), true)
  assertEquals (Bool.is (0), false)
  assertEquals (Bool.is (new Boolean (true)), false)
  assertEquals (Bool.equals (true, true), true)
  assertEquals (Bool.equals (true, false), false)
  assertEquals (Bool.show (true), 'true')
  assertEquals (Bool.show (false), 'false')
})

test ('Bool: the order false < true', () => {
  assertEquals (Bool.lte (false, true), true)
  assertEquals (Bool.lte (true, false), false)
  assertEquals (Bool.lte (true, true), true)
  assertEquals (Bool.lte (false, false), true)
})

test ('complement: creates a predicate that returns the opposite of the supplied predicate', () => {
  const even = (n: number) => n % 2 === 0

  assertEquals (complement (even) (2), false)
  assertEquals (complement (even) (3), true)
  assertEquals (complement (complement (even)) (4), even (4))
})

test ('when and unless complement each other', () => {
  const p = (n: number) => n % 2 === 0
  const f = (n: number) => n + 100
  for (const n of [0, 1, 2, 3, -4, 7]) {
    assertEquals (when (p) (f) (n), unless (complement (p)) (f) (n))
  }
})

test ('when: transforms the input when the predicate passes; otherwise returns it unchanged', () => {
  const double = when ((n: number) => n > 0) ((n) => n * 2)

  assertEquals (double (3), 6)
  assertEquals (double (-3), -3)
})

test ('unless: transforms the input when the predicate fails; otherwise returns it unchanged', () => {
  const double = unless ((n: number) => n > 0) ((n) => n * 2)

  assertEquals (double (3), 3)
  assertEquals (double (-3), -6)
})

test ('complement: passes only the input to the predicate', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  complement (recordArguments) (1)

  assertEquals (calls, [[1]])
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

  assertEquals (calls, [[1]])
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

  assertEquals (calls, [[1]])
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

  assertEquals (calls, [[1]])
})

test ('the ifElse branches are not evaluated up front', () => {
  const boom = (): number => {
    throw new Error ('should not have been called')
  }

  assertEquals (ifElse ((n: number) => n > 0) ((n) => n) (boom) (1), 1)
  assertThrows (() => ifElse ((n: number) => n > 0) (boom) ((n) => n) (1))
})

test ('isTrue and isFalse ask about the value, not its truthiness', () => {
  assertEquals ([isTrue (true), isTrue (1), isTrue ('yes')], [true, false, false])
  assertEquals ([isFalse (false), isFalse (0), isFalse ('')], [true, false, false])
})
