import { assertEquals } from '@std/assert'
import { left, right } from '../data/either.ts'
import { equivalence } from '../data/equivalence.ts'
import { identity } from '../data/identity.ts'
import { just, nothing } from '../data/maybe.ts'
import { pair } from '../data/pair.ts'
import { predicate } from '../data/predicate.ts'

import {
  isArray,
  isBigInt,
  isBoolean,
  isDate,
  isEither,
  isEquivalence,
  isFunction,
  isIdentity,
  isMap,
  isMaybe,
  isNumber,
  isPair,
  isPredicate,
  isRegexp,
  isSet,
  isString,
  isStrMap,
} from './typepredicate.ts'

Deno.test('isArray: accepts arrays and nothing else', () => {
  assertEquals(isArray([]), true)
  assertEquals(isArray([1]), true)
  assertEquals(isArray('1'), false)
  assertEquals(isArray({ length: 0 }), false)
})

Deno.test('isBoolean: accepts both booleans and nothing else', () => {
  assertEquals(isBoolean(true), true)
  assertEquals(isBoolean(false), true)
  assertEquals(isBoolean(0), false)
})

Deno.test('isBigInt: accepts bigints and nothing else', () => {
  assertEquals(isBigInt(0n), true)
  assertEquals(isBigInt(1n), true)
  assertEquals(isBigInt('1'), false)
})

Deno.test('isDate: a Date whatever time it holds', () => {
  assertEquals(isDate(new Date(0)), true)
  assertEquals(isDate(new Date('nonsense')), true, 'an invalid one is one too')
  assertEquals(isDate(0), false)
})

Deno.test('isFunction: accepts what can be called', () => {
  assertEquals(isFunction(<A>(a: A): A => a), true)
  assertEquals(isFunction('I'), false)
  assertEquals(isFunction(null), false)
})

Deno.test('isMap: accepts Map instances and nothing else', () => {
  assertEquals(isMap(new Map()), true)
  assertEquals(isMap('Map'), false)
  assertEquals(isMap(null), false)
})

Deno.test('isNumber: accepts numbers, NaN excepted', () => {
  assertEquals(isNumber(1), true)
  assertEquals(isNumber(0), true)
  assertEquals(isNumber(Number.POSITIVE_INFINITY), true)
  assertEquals(isNumber(Number.NaN), false)
  assertEquals(isNumber('1'), false)
})

Deno.test('isRegexp: accepts regular expressions and nothing else', () => {
  assertEquals(isRegexp(/abc/), true)
  assertEquals(isRegexp('abc'), false)
  assertEquals(isRegexp(null), false)
})

Deno.test('isSet: accepts Set instances and nothing else', () => {
  assertEquals(isSet(new Set()), true)
  assertEquals(isSet('Set'), false)
  assertEquals(isSet(null), false)
})

Deno.test('isString: accepts strings and nothing else', () => {
  assertEquals(isString('a'), true)
  assertEquals(isString(''), true)
  assertEquals(isString(1), false)
  assertEquals(isString(null), false)
  assertEquals(isString(new String('a')), false, 'a wrapper is not a string')
})

Deno.test('isStrMap: a record, and not an instance of something else', () => {
  assertEquals(isStrMap({}), true)
  assertEquals(isStrMap({ a: 1 }), true)
  assertEquals(isStrMap([1]), false)
  assertEquals(isStrMap(new Date(0)), false)
  assertEquals(isStrMap(new Map()), false)
  assertEquals(isStrMap(null), false)
})

Deno.test('isEither: accepts Either instances and nothing else', () => {
  assertEquals(isEither(left(1)), true)
  assertEquals(isEither(right('a')), true)
  assertEquals(isEither(null), false)
  assertEquals(isEither(1), false)
})

Deno.test('isEquivalence: accepts Equivalence instances and nothing else', () => {
  assertEquals(isEquivalence(equivalence(() => true)), true)
  assertEquals(isEquivalence(null), false)
  assertEquals(isEquivalence(1), false)
})

Deno.test('isIdentity: accepts Identity instances and nothing else', () => {
  assertEquals(isIdentity(identity(1)), true)
  assertEquals(isIdentity(null), false)
  assertEquals(isIdentity(1), false)
})

Deno.test('isMaybe: accepts Maybe instances and nothing else', () => {
  assertEquals(isMaybe(just(1)), true)
  assertEquals(isMaybe(nothing()), true)
  assertEquals(isMaybe(null), false)
  assertEquals(isMaybe(1), false)
})

Deno.test('isPair: accepts Pair instances and nothing else', () => {
  assertEquals(isPair(pair(1, 2)), true)
  assertEquals(isPair([1, 2]), false)
  assertEquals(isPair(null), false)
})

Deno.test('isPredicate: accepts Predicate instances and nothing else', () => {
  assertEquals(isPredicate(predicate(() => true)), true)
  assertEquals(isPredicate(() => true), false)
  assertEquals(isPredicate(1), false)
})
