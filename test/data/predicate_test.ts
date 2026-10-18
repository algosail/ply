import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contramap } from '../../src/classes/contravariant.ts'
import { empty } from '../../src/classes/monoid.ts'
import { concat } from '../../src/classes/semigroup.ts'
import {
  allPass,
  anyPass,
  Predicate,
  predicate,
  predicateNot,
  predicateOr,
} from '../../src/data/predicate.ts'

test ('Predicate: uses its public name and supports detached static functions', () => {
  const { is, empty, conquer } = Predicate
  const rule = new Predicate<number> (Number.isFinite)

  assert.deepStrictEqual (Object.getPrototypeOf (rule).constructor.name, 'Predicate')
  assert.deepStrictEqual (rule (42), true)
  assert.deepStrictEqual (is (rule), true)
  assert.deepStrictEqual (is (Number.isFinite), false)
  assert.deepStrictEqual (empty () ('anything'), true)
  assert.deepStrictEqual (conquer () ('anything'), true)
})

test ('Predicate: preserves call, apply, and bind', () => {
  function positive(value: number): boolean {
    return value > 0
  }
  const rule = predicate (positive)
  const bound = rule.bind (null)

  assert.deepStrictEqual (rule instanceof Function, true)
  assert.deepStrictEqual (rule.call (null, 1), true)
  assert.deepStrictEqual (rule.apply (null, [-1]), false)
  assert.deepStrictEqual (bound (2), true)
  assert.deepStrictEqual (Object.keys (rule), [])
  assert.deepStrictEqual (rule.contramap === predicate (positive).contramap, true)
})

test ('predicate: creates a callable rule with the Predicate representative', () => {
  assert.deepStrictEqual (isLong ('abcd'), true)
  assert.deepStrictEqual (isLong ('ab'), false)
  assert.deepStrictEqual (isLong.constructor, Predicate)
  assert.deepStrictEqual (isLong.constructor['@@type'], 'Predicate')
})

test ('contramap fits the adapter onto the input', () => {
  const byName = contramap ((u: User) => u.name) (isLong)

  assert.deepStrictEqual (byName ({ name: 'abcd', age: 1 }), true)
  assert.deepStrictEqual (byName ({ name: 'ab', age: 1 }), false)
  for (const s of probes) {
    assert.deepStrictEqual (contramap ((x: string) => x) (isLong) (s), isLong (s))
    assert.deepStrictEqual (
      contramap ((n: number) => 'x'.repeat (n)) (
        contramap ((s: string) => s) (isLong),
      ) (s.length),
      contramap ((n: number) => 'x'.repeat (n)) (isLong) (s.length),
    )
  }
})

test ('the monoid laws: associativity and the neutral element', () => {
  const neutral = empty (Predicate)
  const third = predicate<string> ((s) => s.length < 5)
  for (const s of probes) {
    assert.deepStrictEqual (
      concat (concat (isLong) (startsA)) (third) (s),
      concat (isLong) (concat (startsA) (third)) (s),
    )
    assert.deepStrictEqual (concat (isLong) (neutral) (s), isLong (s))
    assert.deepStrictEqual (concat (neutral as Predicate<string>) (isLong) (s), isLong (s))
  }

  assert.deepStrictEqual (neutral ('anything'), true)
  assert.deepStrictEqual (neutral (42), true)
})

test ('predicateNot is !, predicateOr is ||, not twice is the identity', () => {
  for (const s of probes) {
    assert.deepStrictEqual (predicateNot (isLong) (s), !isLong (s))
    assert.deepStrictEqual (predicateOr (isLong) (startsA) (s), isLong (s) || startsA (s))
  }
  for (const s of probes) {
    assert.deepStrictEqual (predicateNot (predicateNot (isLong)) (s), isLong (s))
  }
})

test ('concat is conjunction, and short-circuits from the left', () => {
  const both = concat (isLong) (startsA)
  for (const s of probes) assert.deepStrictEqual (both (s), isLong (s) && startsA (s))

  let asked = 0

  function recordPredicateCall() {
    asked += 1
    return true
  }

  const counted = predicate<string> (recordPredicateCall)
  concat (isLong) (counted) ('ab')

  assert.deepStrictEqual (asked, 0)
  concat (isLong) (counted) ('abcd')

  assert.deepStrictEqual (asked, 1)
})

test ('Predicate types: a rule that reads only name accepts a full User', () => {
  const byName: Predicate<{ readonly name: string }> = contramap ((
    u: { readonly name: string },
  ) => u.name) (isLong)
  const onUsers: Predicate<User> = byName

  assert.deepStrictEqual (onUsers ({ name: 'abcd', age: 7 }), true)

  const onUser = predicate<User> ((u) => u.age > 3)
  // @ts-expect-error a test on User does not fit where { name } is all there is
  const _bad: Predicate<{ readonly name: string }> = onUser
})

type User = { readonly name: string; readonly age: number }

const isLong = predicate<string> ((s) => s.length > 3)

const startsA = predicate<string> ((s) => s.startsWith ('a'))

const probes = ['', 'a', 'abcd', 'zzzz', 'abcdef']

test ('allPass: every rule, and an empty list passes', () => {
  const short = predicate ((s: string) => s.length < 4)
  const startsA = predicate ((s: string) => s.startsWith ('a'))

  assert.deepStrictEqual (allPass ([short, startsA]) ('abc'), true)
  assert.deepStrictEqual (allPass ([short, startsA]) ('bcd'), false)
  assert.deepStrictEqual (allPass<string> ([]) ('anything'), true)
})

test ('anyPass: one rule is enough, and an empty list fails', () => {
  const short = predicate ((s: string) => s.length < 4)
  const startsA = predicate ((s: string) => s.startsWith ('a'))

  assert.deepStrictEqual (anyPass ([short, startsA]) ('abcde'), true)
  assert.deepStrictEqual (anyPass ([short, startsA]) ('bcdef'), false)
  assert.deepStrictEqual (anyPass<string> ([]) ('anything'), false)
})

test ('allPass and anyPass give back a Predicate, not a bare function', () => {
  const any = anyPass ([predicate ((n: number) => n > 0)])
  assert.deepStrictEqual (any.constructor, Predicate)
  assert.deepStrictEqual (any.constructor['@@type'], 'Predicate')
})
