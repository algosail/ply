import { assertEquals, assertThrows } from '@std/assert'
import { Big } from './bigint.ts'
import { equals } from '../classes/setoid.ts'
import { lte } from '../classes/ord.ts'
import { show } from '../classes/show.ts'
import { map } from '../classes/functor.ts'
import { empty } from '../classes/monoid.ts'
import { of } from '../classes/applicative.ts'

// Examples

Deno.test('Big: recognizes values and provides the declared operations', () => {
  assertEquals(Big['@@type'], 'BigInt')
  assertEquals(Big.is(0n), true)
  assertEquals(Big.is(-7n), true)
  assertEquals(Big.is(huge), true)
  assertEquals(Big.is(0), false)
  assertEquals(Big.is('1'), false)
  assertEquals(Big.is(null), false)
  assertEquals(Big.is(Object(1n)), false)
})

Deno.test('Big.equals: compares values by content', () => {
  assertEquals(Big.equals(1n, 1n), true)
  assertEquals(Big.equals(1n, 2n), false)
  assertEquals(Big.equals(0n, -0n), true)
  assertEquals(Big.equals(-7n, -7n), true)
})

Deno.test('Big.equals: distinguishes integers beyond Number precision', () => {
  assertEquals(Number(huge) === Number(alsoHuge), true)
  assertEquals(Big.equals(huge, alsoHuge), false)
})

Deno.test('Big.lte: orders values from smaller to larger', () => {
  assertEquals(Big.lte(1n, 2n), true)
  assertEquals(Big.lte(2n, 1n), false)
  assertEquals(Big.lte(1n, 1n), true)
  assertEquals(Big.lte(-2n, -1n), true)
  assertEquals(Big.lte(-1n, 1n), true)
  assertEquals(Big.lte(alsoHuge, huge), true)
  assertEquals(Big.lte(huge, alsoHuge), false)
})

Deno.test('Big.show: formats values as readable strings', () => {
  assertEquals(Big.show(0n), '0')
  assertEquals(Big.show(10n), '10')
  assertEquals(Big.show(-7n), '-7')
  assertEquals(Big.show(huge), '9007199254740993')
  assertEquals(Big.show(1n).endsWith('n'), false)
})

Deno.test('Big.show: show distinguishes the same things as equals', () => {
  assertEquals(Big.show(huge) === Big.show(alsoHuge), false)
})

Deno.test('the Big class dictionary is wired into the instance tables', () => {
  const one: bigint = 1n
  const two: bigint = 2n
  assertEquals(show(10n), '10')
  assertEquals(equals(one)(one), true)
  assertEquals(equals(one)(two), false)
  assertEquals(lte(two)(one), true)
  assertEquals(lte(one)(two), false)
})

Deno.test('bigint and number are different types, not two spellings of one', () => {
  assertEquals(equals(1n as never, 1 as never), false)
  assertEquals(equals(1n as never, '1' as never), false)
})

// Laws

Deno.test('Big.equals: Setoid laws', () => {
  const probes = [0n, 1n, -1n, 7n, huge, alsoHuge]
  for (const a of probes) assertEquals(Big.equals(a, a), true) // reflexivity
  for (const a of probes) {
    for (const b of probes) {
      assertEquals(Big.equals(a, b), Big.equals(b, a)) // symmetry
      for (const c of probes) {
        if (Big.equals(a, b) && Big.equals(b, c)) {
          assertEquals(Big.equals(a, c), true) // transitivity
        }
      }
    }
  }
})

Deno.test('Big.lte: Ord laws', () => {
  const probes = [0n, 1n, -1n, 7n, -7n, huge, alsoHuge]
  for (const a of probes) {
    for (const b of probes) {
      assertEquals(Big.lte(a, b) || Big.lte(b, a), true)
      if (Big.lte(a, b) && Big.lte(b, a)) assertEquals(Big.equals(a, b), true)
      for (const c of probes) {
        if (Big.lte(a, b) && Big.lte(b, c)) {
          assertEquals(Big.lte(a, c), true) // transitivity
        }
      }
    }
  }
})

// Edge cases

Deno.test('bigint does not support Functor, Monoid and Applicative', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => map((n: bigint) => n)(1n as never),
    TypeError,
    'has no Functor',
  )
  assertThrows(() => empty(Big as never), TypeError, 'has no Monoid')
  assertThrows(() => of(Big as never), TypeError, 'has no Applicative')
})

// Shared fixtures

const huge = 9007199254740993n

const alsoHuge = 9007199254740992n
