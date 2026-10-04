import { assertEquals } from '@std/assert'
import {
  allPass,
  anyPass,
  Predicate,
  predicate,
  predicateNot,
  predicateOr,
} from './predicate.ts'
import { contramap } from '../classes/contravariant.ts'
import { concat } from '../classes/semigroup.ts'
import { empty } from '../classes/monoid.ts'

// Examples

Deno.test('Predicate: uses its public name and supports detached static functions', () => {
  const { is, empty, conquer } = Predicate
  const rule = new Predicate<number>(Number.isFinite)

  assertEquals(Object.getPrototypeOf(rule).constructor.name, 'Predicate')
  assertEquals(rule(42), true)
  assertEquals(is(rule), true)
  assertEquals(is(Number.isFinite), false)
  assertEquals(empty()('anything'), true)
  assertEquals(conquer()('anything'), true)
})

Deno.test('Predicate: preserves call, apply, and bind', () => {
  function positive(value: number): boolean {
    return value > 0
  }
  const rule = predicate(positive)
  const bound = rule.bind(null)

  assertEquals(rule instanceof Function, true)
  assertEquals(rule.call(null, 1), true)
  assertEquals(rule.apply(null, [-1]), false)
  assertEquals(bound(2), true)
  assertEquals(Object.keys(rule), [])
  assertEquals(rule.contramap === predicate(positive).contramap, true)
})

Deno.test('predicate: creates a callable rule with the Predicate representative', () => {
  assertEquals(isLong('abcd'), true)
  assertEquals(isLong('ab'), false)
  assertEquals(isLong.constructor, Predicate)
  assertEquals(isLong['@@type'], 'Predicate')
})

Deno.test('contramap fits the adapter onto the input', () => {
  const byName = contramap((u: User) => u.name)(isLong)

  assertEquals(byName({ name: 'abcd', age: 1 }), true)
  assertEquals(byName({ name: 'ab', age: 1 }), false)
  for (const s of probes) {
    assertEquals(contramap((x: string) => x)(isLong)(s), isLong(s))
    assertEquals(
      contramap((n: number) => 'x'.repeat(n))(
        contramap((s: string) => s)(isLong),
      )(s.length),
      contramap((n: number) => 'x'.repeat(n))(isLong)(s.length),
    )
  }
})

// Laws

Deno.test('the monoid laws: associativity and the neutral element', () => {
  const neutral = empty(Predicate)
  const third = predicate<string>((s) => s.length < 5)
  for (const s of probes) {
    assertEquals(
      concat(concat(isLong)(startsA))(third)(s),
      concat(isLong)(concat(startsA)(third))(s),
    )
    assertEquals(concat(isLong)(neutral)(s), isLong(s))
    assertEquals(concat(neutral as Predicate<string>)(isLong)(s), isLong(s))
  }

  assertEquals(neutral('anything'), true)
  assertEquals(neutral(42), true)
})

Deno.test('predicateNot is !, predicateOr is ||, not twice is the identity', () => {
  for (const s of probes) {
    assertEquals(predicateNot(isLong)(s), !isLong(s))
    assertEquals(predicateOr(isLong)(startsA)(s), isLong(s) || startsA(s))
  }
  for (const s of probes) {
    assertEquals(predicateNot(predicateNot(isLong))(s), isLong(s))
  }
})

// Edge cases

Deno.test('concat is conjunction, and short-circuits from the left', () => {
  const both = concat(isLong)(startsA)
  for (const s of probes) assertEquals(both(s), isLong(s) && startsA(s))

  let asked = 0

  function recordPredicateCall() {
    asked += 1
    return true
  }

  const counted = predicate<string>(recordPredicateCall)
  concat(isLong)(counted)('ab')

  assertEquals(asked, 0)
  concat(isLong)(counted)('abcd')

  assertEquals(asked, 1)
})

// Type checking

Deno.test('Predicate types: a rule that reads only name accepts a full User', () => {
  const byName: Predicate<{ readonly name: string }> = contramap((
    u: { readonly name: string },
  ) => u.name)(isLong)
  const onUsers: Predicate<User> = byName

  assertEquals(onUsers({ name: 'abcd', age: 7 }), true)

  const onUser = predicate<User>((u) => u.age > 3)
  // @ts-expect-error a test on User does not fit where { name } is all there is
  const _bad: Predicate<{ readonly name: string }> = onUser
})

// Shared fixtures

type User = { readonly name: string; readonly age: number }

const isLong = predicate<string>((s) => s.length > 3)

const startsA = predicate<string>((s) => s.startsWith('a'))

const probes = ['', 'a', 'abcd', 'zzzz', 'abcdef']

Deno.test('allPass: every rule, and an empty list passes', () => {
  const short = predicate((s: string) => s.length < 4)
  const startsA = predicate((s: string) => s.startsWith('a'))

  assertEquals(allPass([short, startsA])('abc'), true)
  assertEquals(allPass([short, startsA])('bcd'), false)
  assertEquals(allPass<string>([])('anything'), true)
})

Deno.test('anyPass: one rule is enough, and an empty list fails', () => {
  const short = predicate((s: string) => s.length < 4)
  const startsA = predicate((s: string) => s.startsWith('a'))

  assertEquals(anyPass([short, startsA])('abcde'), true)
  assertEquals(anyPass([short, startsA])('bcdef'), false)
  assertEquals(anyPass<string>([])('anything'), false)
})

Deno.test('allPass and anyPass give back a Predicate, not a bare function', () => {
  const any = anyPass([predicate((n: number) => n > 0)])
  assertEquals(any.constructor, Predicate)
  assertEquals(any['@@type'], 'Predicate')
})
