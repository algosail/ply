import { assertEquals } from '@std/assert'
import { Equivalence, equivalence, equivalenceByEquals } from './equivalence.ts'
import { contramap } from '../classes/contravariant.ts'
import { concat } from '../classes/semigroup.ts'
import { empty } from '../classes/monoid.ts'

// Examples

Deno.test('equivalence: creates a callable comparison with the Equivalence representative', () => {
  assertEquals(sameLength('ab', 'cd'), true)
  assertEquals(sameLength('ab', 'xyz'), false)
  assertEquals(sameLength.constructor, Equivalence)
  assertEquals(sameLength['@@type'], 'Equivalence')
})

Deno.test('concat is conjunction: both have to agree', () => {
  const both = concat(sameLength)(sameFirst)
  const pairs: ReadonlyArray<readonly [string, string]> = [
    ['ann', 'amy'],
    ['ann', 'bob'],
    ['ann', 'annie'],
    ['', ''],
  ]
  for (const [a, b] of pairs) {
    assertEquals(both(a, b), sameLength(a, b) && sameFirst(a, b))
  }
  assertEquals(both('ann', 'amy'), true)
  assertEquals(both('ann', 'bob'), false)
})

Deno.test('equivalenceByEquals compares structurally, through ply equals', () => {
  const byValue = equivalenceByEquals<readonly number[]>()
  assertEquals(byValue([1, 2], [1, 2]), true)
  assertEquals(byValue([1, 2], [2, 1]), false)
  const byTags = contramap((u: { readonly tags: readonly string[] }) => u.tags)(
    equivalenceByEquals<readonly string[]>(),
  )
  assertEquals(byTags({ tags: ['a'] }, { tags: ['a'] }), true)
  assertEquals(byTags({ tags: ['a'] }, { tags: ['b'] }), false)
})

// Laws

Deno.test('the monoid laws: associativity and the neutral element', () => {
  const neutral = empty(Equivalence)
  const sameLast = equivalence<string>((a, b) => a.at(-1) === b.at(-1))
  const pairs: ReadonlyArray<readonly [string, string]> = [
    ['ann', 'amy'],
    ['ann', 'bob'],
    ['abc', 'abc'],
  ]
  for (const [a, b] of pairs) {
    assertEquals(
      concat(concat(sameLength)(sameFirst))(sameLast)(a, b),
      concat(sameLength)(concat(sameFirst)(sameLast))(a, b),
    )
    assertEquals(concat(sameLength)(neutral)(a, b), sameLength(a, b))
    assertEquals(
      concat(neutral as Equivalence<string>)(sameLength)(a, b),
      sameLength(a, b),
    )
  }
  assertEquals(neutral(1, 'x'), true)
})

// Edge cases

Deno.test('contramap puts both arguments through the accessor', () => {
  const byName = contramap((u: User) => u.name)(sameLength)
  assertEquals(byName(ann, bob), true)
  assertEquals(byName(ann, { name: 'annie', age: 9 }), false)

  const byAge = contramap((u: User) => u.age)(
    equivalence<number>((a, b) => a === b),
  )
  assertEquals(byAge(ann, amy), true)
  assertEquals(byAge(ann, bob), false)
})

// Type checking

Deno.test('contramap types: requires an Equivalence for a two-argument comparison', () => {
  const plain = (a: string, b: string) => a.length === b.length
  // @ts-expect-error a two-argument function is not a one-argument one
  const _bad = () => contramap((n: number) => String(n))(plain)
  assertEquals(typeof _bad, 'function')
})

Deno.test('Equivalence types: a rule that reads only name accepts a full User', () => {
  const byName: Equivalence<{ readonly name: string }> = contramap(
    (u: { readonly name: string }) => u.name,
  )(sameLength)
  const onUsers: Equivalence<User> = byName
  assertEquals(onUsers(ann, bob), true)

  const onUser = equivalence<User>((a, b) => a.age === b.age)
  // @ts-expect-error a comparison that reads age does not fit where { name } is all there is
  const _bad: Equivalence<{ readonly name: string }> = onUser
})

// Shared fixtures

type User = { readonly name: string; readonly age: number }

const sameLength = equivalence<string>((a, b) => a.length === b.length)

const sameFirst = equivalence<string>((a, b) => a[0] === b[0])

const ann: User = { name: 'ann', age: 1 }

const bob: User = { name: 'bob', age: 2 }

const amy: User = { name: 'amy', age: 1 }
