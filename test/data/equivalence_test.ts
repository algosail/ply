import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contramap } from '../../src/classes/contravariant.ts'
import { empty } from '../../src/classes/monoid.ts'
import { concat } from '../../src/classes/semigroup.ts'
import { Equivalence, equivalence, equivalenceByEquals } from '../../src/data/equivalence.ts'

test ('Equivalence: uses its public name and supports detached static functions', () => {
  const { is, empty, conquer } = Equivalence
  const rule = new Equivalence<number> (Object.is)

  assert.deepStrictEqual (Object.getPrototypeOf (rule).constructor.name, 'Equivalence')
  assert.deepStrictEqual (rule (42, 42), true)
  assert.deepStrictEqual (is (rule), true)
  assert.deepStrictEqual (is (Object.is), false)
  assert.deepStrictEqual (empty () (1, 'anything'), true)
  assert.deepStrictEqual (conquer () (1, 'anything'), true)
})

test ('Equivalence: preserves call, apply, and bind', () => {
  function sameSize(first: string, second: string): boolean {
    return first.length === second.length
  }
  const rule = equivalence (sameSize)
  const bound = rule.bind (null, 'ab')

  assert.deepStrictEqual (rule instanceof Function, true)
  assert.deepStrictEqual (rule.call (null, 'ab', 'cd'), true)
  assert.deepStrictEqual (rule.apply (null, ['ab', 'c']), false)
  assert.deepStrictEqual (bound ('cd'), true)
  assert.deepStrictEqual (Object.keys (rule), [])
  assert.deepStrictEqual (rule.contramap === equivalence (sameSize).contramap, true)
})

test ('equivalence: creates a callable comparison with the Equivalence representative', () => {
  assert.deepStrictEqual (sameLength ('ab', 'cd'), true)
  assert.deepStrictEqual (sameLength ('ab', 'xyz'), false)
  assert.deepStrictEqual (sameLength.constructor, Equivalence)
  assert.deepStrictEqual (sameLength.constructor['@@type'], 'Equivalence')
})

test ('concat is conjunction: both have to agree', () => {
  const both = concat (sameLength) (sameFirst)
  const pairs: ReadonlyArray<readonly [string, string]> = [
    ['ann', 'amy'],
    ['ann', 'bob'],
    ['ann', 'annie'],
    ['', ''],
  ]
  for (const [a, b] of pairs) {
    assert.deepStrictEqual (both (a, b), sameLength (a, b) && sameFirst (a, b))
  }
  assert.deepStrictEqual (both ('ann', 'amy'), true)
  assert.deepStrictEqual (both ('ann', 'bob'), false)
})

test ('equivalenceByEquals compares structurally, through ply equals', () => {
  const byValue = equivalenceByEquals<readonly number[]> ()
  assert.deepStrictEqual (byValue ([1, 2], [1, 2]), true)
  assert.deepStrictEqual (byValue ([1, 2], [2, 1]), false)
  const byTags = contramap ((u: { readonly tags: readonly string[] }) => u.tags) (
    equivalenceByEquals<readonly string[]> (),
  )
  assert.deepStrictEqual (byTags ({ tags: ['a'] }, { tags: ['a'] }), true)
  assert.deepStrictEqual (byTags ({ tags: ['a'] }, { tags: ['b'] }), false)
})

test ('the monoid laws: associativity and the neutral element', () => {
  const neutral = empty (Equivalence)
  const sameLast = equivalence<string> ((a, b) => a.at (-1) === b.at (-1))
  const pairs: ReadonlyArray<readonly [string, string]> = [
    ['ann', 'amy'],
    ['ann', 'bob'],
    ['abc', 'abc'],
  ]
  for (const [a, b] of pairs) {
    assert.deepStrictEqual (
      concat (concat (sameLength) (sameFirst)) (sameLast) (a, b),
      concat (sameLength) (concat (sameFirst) (sameLast)) (a, b),
    )
    assert.deepStrictEqual (concat (sameLength) (neutral) (a, b), sameLength (a, b))
    assert.deepStrictEqual (
      concat (neutral as Equivalence<string>) (sameLength) (a, b),
      sameLength (a, b),
    )
  }
  assert.deepStrictEqual (neutral (1, 'x'), true)
})

test ('contramap puts both arguments through the accessor', () => {
  const byName = contramap ((u: User) => u.name) (sameLength)
  assert.deepStrictEqual (byName (ann, bob), true)
  assert.deepStrictEqual (byName (ann, { name: 'annie', age: 9 }), false)

  const byAge = contramap ((u: User) => u.age) (
    equivalence<number> ((a, b) => a === b),
  )
  assert.deepStrictEqual (byAge (ann, amy), true)
  assert.deepStrictEqual (byAge (ann, bob), false)
})

test ('contramap types: requires an Equivalence for a two-argument comparison', () => {
  const plain = (a: string, b: string) => a.length === b.length
  // @ts-expect-error a two-argument function is not a one-argument one
  const _bad = () => contramap ((n: number) => String (n)) (plain)
  assert.deepStrictEqual (typeof _bad, 'function')
})

test ('Equivalence types: a rule that reads only name accepts a full User', () => {
  const byName: Equivalence<{ readonly name: string }> = contramap (
    (u: { readonly name: string }) => u.name,
  ) (sameLength)
  const onUsers: Equivalence<User> = byName
  assert.deepStrictEqual (onUsers (ann, bob), true)

  const onUser = equivalence<User> ((a, b) => a.age === b.age)
  // @ts-expect-error a comparison that reads age does not fit where { name } is all there is
  const _bad: Equivalence<{ readonly name: string }> = onUser
})

type User = { readonly name: string; readonly age: number }

const sameLength = equivalence<string> ((a, b) => a.length === b.length)

const sameFirst = equivalence<string> ((a, b) => a[0] === b[0])

const ann: User = { name: 'ann', age: 1 }

const bob: User = { name: 'bob', age: 2 }

const amy: User = { name: 'amy', age: 1 }
