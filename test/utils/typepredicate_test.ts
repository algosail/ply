import assert from 'node:assert/strict'
import { test } from 'node:test'
import { left, right } from '../../src/data/either.ts'
import { equivalence } from '../../src/data/equivalence.ts'
import { identity } from '../../src/data/identity.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'
import { predicate } from '../../src/data/predicate.ts'

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
} from '../../src/utils/typepredicate.ts'

test ('isArray: accepts arrays and nothing else', () => {
  assert.deepStrictEqual (isArray ([]), true)
  assert.deepStrictEqual (isArray ([1]), true)
  assert.deepStrictEqual (isArray ('1'), false)
  assert.deepStrictEqual (isArray ({ length: 0 }), false)
})

test ('isBoolean: accepts both booleans and nothing else', () => {
  assert.deepStrictEqual (isBoolean (true), true)
  assert.deepStrictEqual (isBoolean (false), true)
  assert.deepStrictEqual (isBoolean (0), false)
})

test ('isBigInt: accepts bigints and nothing else', () => {
  assert.deepStrictEqual (isBigInt (0n), true)
  assert.deepStrictEqual (isBigInt (1n), true)
  assert.deepStrictEqual (isBigInt ('1'), false)
})

test ('isDate: a Date whatever time it holds', () => {
  assert.deepStrictEqual (isDate (new Date (0)), true)
  assert.deepStrictEqual (isDate (new Date ('nonsense')), true, 'an invalid one is one too')
  assert.deepStrictEqual (isDate (0), false)
})

test ('isFunction: accepts what can be called', () => {
  assert.deepStrictEqual (isFunction (<A>(a: A): A => a), true)
  assert.deepStrictEqual (isFunction ('I'), false)
  assert.deepStrictEqual (isFunction (null), false)
})

test ('isMap: accepts Map instances and nothing else', () => {
  assert.deepStrictEqual (isMap (new Map ()), true)
  assert.deepStrictEqual (isMap ('Map'), false)
  assert.deepStrictEqual (isMap (null), false)
})

test ('isNumber: accepts numbers, NaN excepted', () => {
  assert.deepStrictEqual (isNumber (1), true)
  assert.deepStrictEqual (isNumber (0), true)
  assert.deepStrictEqual (isNumber (Number.POSITIVE_INFINITY), true)
  assert.deepStrictEqual (isNumber (Number.NaN), false)
  assert.deepStrictEqual (isNumber ('1'), false)
})

test ('isRegexp: accepts regular expressions and nothing else', () => {
  assert.deepStrictEqual (isRegexp (/abc/), true)
  assert.deepStrictEqual (isRegexp ('abc'), false)
  assert.deepStrictEqual (isRegexp (null), false)
})

test ('isSet: accepts Set instances and nothing else', () => {
  assert.deepStrictEqual (isSet (new Set ()), true)
  assert.deepStrictEqual (isSet ('Set'), false)
  assert.deepStrictEqual (isSet (null), false)
})

test ('isString: accepts strings and nothing else', () => {
  assert.deepStrictEqual (isString ('a'), true)
  assert.deepStrictEqual (isString (''), true)
  assert.deepStrictEqual (isString (1), false)
  assert.deepStrictEqual (isString (null), false)
  assert.deepStrictEqual (isString (new String ('a')), false, 'a wrapper is not a string')
})

test ('isStrMap: a record, and not an instance of something else', () => {
  assert.deepStrictEqual (isStrMap ({}), true)
  assert.deepStrictEqual (isStrMap ({ a: 1 }), true)
  assert.deepStrictEqual (isStrMap ([1]), false)
  assert.deepStrictEqual (isStrMap (new Date (0)), false)
  assert.deepStrictEqual (isStrMap (new Map ()), false)
  assert.deepStrictEqual (isStrMap (null), false)
})

test ('isEither: accepts Either instances and nothing else', () => {
  assert.deepStrictEqual (isEither (left (1)), true)
  assert.deepStrictEqual (isEither (right ('a')), true)
  assert.deepStrictEqual (isEither (null), false)
  assert.deepStrictEqual (isEither (1), false)
})

test ('isEquivalence: accepts Equivalence instances and nothing else', () => {
  assert.deepStrictEqual (isEquivalence (equivalence (() => true)), true)
  assert.deepStrictEqual (isEquivalence (null), false)
  assert.deepStrictEqual (isEquivalence (1), false)
})

test ('isIdentity: accepts Identity instances and nothing else', () => {
  assert.deepStrictEqual (isIdentity (identity (1)), true)
  assert.deepStrictEqual (isIdentity (null), false)
  assert.deepStrictEqual (isIdentity (1), false)
})

test ('isMaybe: accepts Maybe instances and nothing else', () => {
  assert.deepStrictEqual (isMaybe (just (1)), true)
  assert.deepStrictEqual (isMaybe (nothing ()), true)
  assert.deepStrictEqual (isMaybe (null), false)
  assert.deepStrictEqual (isMaybe (1), false)
})

test ('isPair: accepts Pair instances and nothing else', () => {
  assert.deepStrictEqual (isPair (pair (1, 2)), true)
  assert.deepStrictEqual (isPair ([1, 2]), false)
  assert.deepStrictEqual (isPair (null), false)
})

test ('isPredicate: accepts Predicate instances and nothing else', () => {
  assert.deepStrictEqual (isPredicate (predicate (() => true)), true)
  assert.deepStrictEqual (isPredicate (() => true), false)
  assert.deepStrictEqual (isPredicate (1), false)
})
