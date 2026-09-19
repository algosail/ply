import { assertEquals, assertThrows } from '@std/assert'
import { applicativeNatives, of } from './applicative.ts'
import { ap } from './apply.ts'
import { Identity, identity } from '../data/identity.ts'
import { just, Maybe, nothing } from '../data/maybe.ts'
import { Either, right } from '../data/either.ts'
import { Pair } from '../data/pair.ts'
import { Arr } from '../natives/array.ts'
import { Fn } from '../natives/function.ts'
import { Sets } from '../natives/set.ts'
import { Maps } from '../natives/map.ts'
import { StrMap } from '../natives/strmap.ts'
import { Str } from '../natives/string.ts'

// Shared fixtures

const increment = (n: number) => n + 1

const doubleNumber = (n: number) => n * 2

const id = <A>(a: A): A => a

interface Case {
  readonly T: unknown
  readonly u: unknown
  readonly v: unknown
}

const applicatives: Record<string, Case> = {
  'Array': { T: Arr, u: [increment, doubleNumber], v: [1, 2] },
  'Set': { T: Sets, u: new Set([increment, doubleNumber]), v: new Set([1, 2]) },
  'Maybe.Just': { T: Maybe, u: just(increment), v: just(1) },
  'Maybe.Nothing': { T: Maybe, u: just(increment), v: nothing<number>() },
  'Either': {
    T: Either,
    u: right<string, (a: number) => number>(increment),
    v: right<string, number>(1),
  },
  'Identity': { T: Identity, u: identity(increment), v: identity(1) },
}

// Examples

Deno.test('of: wraps a value in the selected type', () => {
  assertEquals(of(Arr)(7), [7])
  assertEquals(of(Sets)(7), new Set([7]))
  assertEquals(of(Maybe)(7), just(7))
  assertEquals(of(Either)(7), right(7))
  assertEquals(of(Identity)(7), identity(7))
})

Deno.test('of: on functions this is the constant function', () => {
  const seven = of(Fn)(7) as (i: unknown) => number
  assertEquals([seven(0), seven('anything'), seven(null)], [7, 7, 7])
})

// Laws

Deno.test('of: identity law across supported applicatives', () => {
  for (const [name, { T, v }] of Object.entries(applicatives)) {
    assertEquals(ap(of(T as never)(id) as never)(v as never), v, name)
  }
})

Deno.test('of: the homomorphism law across supported applicatives', () => {
  for (const [name, { T }] of Object.entries(applicatives)) {
    assertEquals(
      ap(of(T as never)(increment) as never)(of(T as never)(1) as never),
      of(T as never)(2),
      name,
    )
  }
})

Deno.test('of: the interchange law across supported applicatives', () => {
  const y = 5
  for (const [name, { T, u }] of Object.entries(applicatives)) {
    assertEquals(
      ap(u as never)(of(T as never)(y) as never),
      ap(of(T as never)((f: (a: number) => number) => f(y)) as never)(
        u as never,
      ),
      name,
    )
  }
})

Deno.test('of: all three laws on functions', () => {
  const probes = [0, 1, 7]
  const u = (i: number) => (n: number) => n + i
  const v = (i: number) => i * 2
  const y = 5

  const identityLaw = ap(of(Fn)(id))(v) as (
    i: number,
  ) => number
  for (const i of probes) {
    assertEquals(identityLaw(i), v(i), `identity at i=${i}`)
  }

  const homL = ap(of(Fn)(increment))(of(Fn)(1)) as (
    i: number,
  ) => number
  const homR = of(Fn)(increment(1)) as (i: number) => number
  for (const i of probes) {
    assertEquals(homL(i), homR(i), `homomorphism at i=${i}`)
  }

  const excL = ap(u)(of(Fn)(y)) as (i: number) => number
  const excR = ap(of(Fn)((f: (a: number) => number) => f(y)))(
    u,
  ) as (
    i: number,
  ) => number
  for (const i of probes) {
    assertEquals(excL(i), excR(i), `interchange at i=${i}`)
  }
})

// Edge cases

Deno.test('of: rejects values without Applicative', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => of(Pair as never)(1),
    TypeError,
    'of: Pair has no Applicative',
  )
  assertThrows(
    () => of(Maps as never)(1),
    TypeError,
    'of: Map has no Applicative',
  )
  assertThrows(
    () => of(StrMap as never)(1),
    TypeError,
    'of: StrMap has no Applicative',
  )
  assertThrows(
    () => of(Str as never)(1),
    TypeError,
    'of: String has no Applicative',
  )
})

Deno.test('of: the failure calls the type by name, not by value', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => of(null as never)(1),
    TypeError,
    'of: Null has no Applicative',
  )
  assertThrows(
    () => of(undefined as never)(1),
    TypeError,
    'of: Undefined has no Applicative',
  )
  assertThrows(
    () => of({} as never)(1),
    TypeError,
    'of: StrMap has no Applicative',
  )
})

// Native operation tables

Deno.test('applicativeNatives: lists the supported native implementations', () => {
  assertEquals(
    new Set(Object.keys(applicativeNatives)),
    new Set(['Array', 'Fn', 'Set']),
  )
  assertEquals(applicativeNatives.Array.of(7), [7])
  assertEquals(applicativeNatives.Set.of(7), new Set([7]))
  assertEquals(
    (applicativeNatives.Fn.of(7) as (i: never) => number)(0 as never),
    7,
  )
})
