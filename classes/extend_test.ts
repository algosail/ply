import { assertEquals, assertThrows } from '@std/assert'
import { duplicate, extend, extendNatives } from './extend.ts'
import { extract } from './comonad.ts'
import { map } from './functor.ts'
import { toArray } from './foldable.ts'
import { identity } from '../data/identity.ts'
import { pair } from '../data/pair.ts'
import { just, nothing } from '../data/maybe.ts'
import { right } from '../data/either.ts'

// Examples

Deno.test('extend: leaves the left slot of Pair alone', () => {
  assertEquals(
    extend(measured)(pair('log', 'a') as never),
    pair('log', '1:a'),
  )
})

Deno.test('duplicate: wraps a value together with its existing wrapper', () => {
  assertEquals(duplicate(identity('a')), identity(identity('a')))
  assertEquals(
    duplicate(pair('log', 'a')),
    pair('log', pair('log', 'a')),
  )
})

Deno.test('duplicate: coincides with extend of identity across supported types', () => {
  const id = (w: unknown): unknown => w
  for (const [name, w] of Object.entries(samplesByType)) {
    assertEquals(duplicate(w as never), extend(id)(w as never), name)
  }
})

// Laws

Deno.test('extend: associativity law across supported types', () => {
  for (const [name, w] of Object.entries(samplesByType)) {
    assertEquals(
      extend(measured)(extend(whole)(w as never) as never),
      extend((v: unknown) => measured(extend(whole)(v as never)))(w as never),
      name,
    )
  }
})

Deno.test('extend: agrees with map through extract', () => {
  const f = (s: string) => s + '!'
  for (const [name, w] of Object.entries(samplesByType)) {
    assertEquals(
      map(f)(w as never),
      extend((v: unknown) => f(extract(v as never)))(w as never),
      name,
    )
  }
})

// Edge cases

Deno.test('extend: computes a new value from the whole wrapper', () => {
  assertEquals(extend(whole)(identity('a') as never), identity('a'))
  assertEquals(
    extend(whole)(pair('log', 'a') as never),
    pair('log', 'a'),
  )
})

Deno.test('extend: Identity passes the whole wrapper', () => {
  const value = identity(1)
  const calls: unknown[][] = []

  function recordArguments(...args: [typeof value]) {
    calls.push(args)
    return '1'
  }

  extend(recordArguments)(value)

  assertEquals(calls, [[value]])
})

Deno.test('extend: Pair passes the whole wrapper', () => {
  const value = pair('log', 1)
  const calls: unknown[][] = []

  function recordArguments(...args: [typeof value]) {
    calls.push(args)
    return '1'
  }

  extend(recordArguments)(value)

  assertEquals(calls, [[value]])
})

Deno.test('extend: rejects values without Extend', () => {
  // Bypass the type checker to verify the runtime error.
  const strangers = {
    'Array': [1, 2, 3],
    'Set': new Set([1, 2, 3]),
    'Map': new Map([['a', 1]]),
    'StrMap': { a: 1 },
    'Maybe.Just': just(1),
    'Maybe.Nothing': nothing<number>(),
    'Either.Right': right<string, number>(1),
    'String': 'string',
  }
  for (const [name, wrappedValue] of Object.entries(strangers)) {
    assertThrows(
      () => extend(whole)(wrappedValue as never),
      TypeError,
      'has no Extend',
      name,
    )
    assertThrows(
      () => duplicate(wrappedValue as never),
      TypeError,
      'has no Extend',
      name,
    )
  }
})

Deno.test('extend: the failure comes before the callback is called', () => {
  // Bypass the type checker to verify the runtime error.
  let calls = 0

  function recordCallbackCall() {
    calls += 1
    return 0
  }

  assertThrows(() => extend(recordCallbackCall)([1, 2, 3] as never))
  assertEquals(calls, 0)
})

// Native operation tables

Deno.test('extendNatives: there are no native representatives', () => {
  assertEquals(Object.keys(extendNatives), [])
})

// Shared fixtures

const samplesByType = {
  'Identity': identity('a'),
  'Pair': pair('log', 'a'),
}

const whole = (w: unknown): string => (toArray(w as never) as string[]).join('')

const measured = (w: unknown): string =>
  `${(toArray(w as never) as string[]).length}:${extract(w as never)}`
