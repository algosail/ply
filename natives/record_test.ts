import { assertEquals, assertThrows } from '@std/assert'
import { get, gets, modify, prop, props, remove, set } from './record.ts'
import { just, nothing } from '../data/maybe.ts'

// Examples

Deno.test('set: returns a copy with an updated property', () => {
  assertEquals(set('a')(9)({ a: 0, b: 1 }), { a: 9, b: 1 })
  assertEquals(set('a')(9)({ a: 0 }), { a: 9 })
  assertEquals(set('b')('y')({ a: 0, b: 'x' }), { a: 0, b: 'y' })
})

Deno.test('set: the original record is not changed', () => {
  const rec = { a: 0, b: 1 }
  const next = set('a')(9)(rec)

  assertEquals(rec, { a: 0, b: 1 })
  assertEquals(next === rec, false)
})

Deno.test('set: the key order is preserved', () => {
  assertEquals(Object.keys(set('a')(9)({ b: 1, a: 0 })), ['b', 'a'])
})

Deno.test('modify: copies a record with an existing property transformed by a function', () => {
  assertEquals(modify('a')((n: number) => n + 1)({ a: 0 }), { a: 1 })
  assertEquals(modify('a')((n: number) => n + 1)({ a: 0, b: 'x' }), {
    a: 1,
    b: 'x',
  })
  assertEquals(modify('b')((s: string) => s + '!')({ a: 0, b: 'x' }), {
    a: 0,
    b: 'x!',
  })
})

Deno.test('modify: the original record is not changed', () => {
  const rec = { a: 0, b: 'x' }
  const next = modify('a')((n: number) => n + 1)(rec)

  assertEquals(rec, { a: 0, b: 'x' })
  assertEquals(next === rec, false)
})

Deno.test('prop: reads a property, including an inherited property', () => {
  assertEquals(prop('a')({ a: 1, b: 2 }), 1)
  assertEquals(prop('b')({ a: 1, b: 2 }), 2)
  assertEquals(prop('a')({ a: undefined }), undefined)
})

Deno.test('prop: the key may be a number or a symbol', () => {
  const key = Symbol('k')

  assertEquals(prop(0)([10, 'x'] as [number, string]), 10)
  assertEquals(prop(key)({ [key]: 7 }), 7)
})

Deno.test('props: reads a nested property along a path, including inherited properties', () => {
  assertEquals(props(['a', 'b', 'c'])({ a: { b: { c: 1 } } }), 1)
  assertEquals(props(['a'])({ a: 1 }), 1)
  assertEquals(props([])({ a: 1 }), { a: 1 })
})

Deno.test('get: reads a property only when it passes validation', () => {
  assertEquals(get(isNumber)('x')({ x: 1, y: 2 }), just(1))
  assertEquals(get(isNumber)('x')({ x: '1', y: '2' }), nothing<number>())
  assertEquals(get(isNumber)('x')({}), nothing<number>())
  assertEquals(get(isNumberArray)('x')({ x: [1, 2, 3] }), just([1, 2, 3]))
  assertEquals(
    get(isNumberArray)('x')({ x: [1, 2, 3, null] }),
    nothing<number[]>(),
  )
})

Deno.test('get: a primitive is read through its wrapper', () => {
  assertEquals(get(isNumber)('length')('abc'), just(3))
})

Deno.test('gets: reads a nested property only when it passes validation', () => {
  assertEquals(
    gets(isNumber)(['a', 'b', 'c'])({ a: { b: { c: 42 } } }),
    just(42),
  )
  assertEquals(
    gets(isNumber)(['a', 'b', 'c'])({ a: { b: { c: '42' } } }),
    nothing<number>(),
  )
  assertEquals(gets(isNumber)(['a', 'b', 'c'])({}), nothing<number>())
  assertEquals(gets(isNumber)([])(1), just(1))
  assertEquals(gets(isNumber)([])('x'), nothing<number>())
})

Deno.test('gets: returns Nothing when a path is missing', () => {
  assertEquals(gets(isNumber)(['a', 'b'])({ a: {} }), nothing<number>())
  assertEquals(gets(isNumber)(['a', 'b'])({ a: null }), nothing<number>())
  assertEquals(gets(isNumber)(['a', 'b'])(null), nothing<number>())
})

Deno.test('remove: copies an object without the specified property', () => {
  assertEquals(remove('c')({ a: 1, b: 2, c: 3 }), { a: 1, b: 2 })
  assertEquals(remove('c')({}), {})
  const key = Symbol('k')

  assertEquals(remove(key)({ [key]: 0, n: 1 }), { n: 1 })
})

Deno.test('remove: the original record is not changed', () => {
  const rec = { a: 1, b: 2, c: 3 }
  const next = remove('c')(rec)

  assertEquals(rec, { a: 1, b: 2, c: 3 })
  assertEquals(next === rec, false)
  assertEquals('c' in next, false)
})

Deno.test('remove: exactly one field is taken away', () => {
  const rec = { a: 1, b: 2, c: 3 }

  assertEquals(Object.keys(remove('b')(rec)), ['a', 'c'])
  assertEquals(remove('a')(remove('b')(rec)), { c: 3 })
})

// Laws

Deno.test('set and modify: the write and read laws', () => {
  const rec = { a: 1, b: 'x' }

  assertEquals(prop('a')(set('a')(9)(rec)), 9)
  assertEquals(set('a')(prop('a')(rec))(rec), rec)
  assertEquals(set('a')(2)(set('a')(9)(rec)), set('a')(2)(rec))
  assertEquals(modify('a')((n: number) => n)(rec), rec)
  assertEquals(
    modify('a')((n: number) => n + 1)(set('a')(9)(rec)),
    set('a')(10)(rec),
  )
})

// Edge cases

Deno.test('modify: passes only the selected field’s value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  modify('a')(recordArguments)({ a: 1 })
  modify('b')(recordArguments)({ a: 1, b: 2 })

  assertEquals(calls, [[1], [2]])
})

Deno.test('prop: a missing field is a failure naming the key', () => {
  const lies = {} as { c: number }

  assertThrows(
    () => prop('c')(lies),
    TypeError,
    'prop: object has no property named c',
  )
  const key = Symbol('k')

  assertThrows(
    () => prop(key)({} as Record<typeof key, number>),
    TypeError,
    'prop: object has no property named Symbol(k)',
  )
})

Deno.test('props: a broken path rejects, naming the key and the whole path', () => {
  assertThrows(
    () => props(['a', 'b', 'c'])({}),
    TypeError,
    'props: object has no property named a at path a.b.c',
  )
  assertThrows(
    () => props(['a', 'b', 'c'])({ a: { x: 1 } }),
    TypeError,
    'props: object has no property named b at path a.b.c',
  )
  assertThrows(
    () => props(['a', 'b'])({ a: null }),
    TypeError,
    'props: object has no property named b at path a.b',
  )
})

Deno.test('get: returns Nothing for null and undefined inputs', () => {
  assertEquals(get(isNumber)('x')(null), nothing<number>())
  assertEquals(get(isNumber)('x')(undefined), nothing<number>())
})

Deno.test('get: passes only the selected field’s value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  get(recordArguments)('a')({ a: 1 })

  assertEquals(calls, [[1]])
})

Deno.test('gets: passes only the value at the end of the path', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  gets(recordArguments)(['a', 'b'])({ a: { b: 1 } })

  assertEquals(calls, [[1]])
})

Deno.test('gets: does not call the predicate for a missing path', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return true
  }

  gets(recordArguments)(['a', 'b'])({})

  assertEquals(calls, [])
})

Deno.test('get answers Just exactly where prop does not refuse', () => {
  const probes: readonly (readonly [PropertyKey, unknown])[] = [
    ['a', { a: 1 }],
    ['a', { a: undefined }],
    ['b', { a: 1 }],
    ['a', {}],
    ['a', null],
    ['a', undefined],
    ['length', 'abc'],
  ]
  for (const [key, a] of probes) {
    const label = `${String(key)} in ${String(a)}`
    let refused = false
    try {
      prop(key)(a as never)
    } catch {
      refused = true
    }

    assertEquals(get(() => true)(key)(a).tag === 'just', !refused, label)
  }
})

Deno.test('gets answers Just exactly where props does not refuse', () => {
  const probes: readonly (readonly [PropertyKey[], unknown])[] = [
    [['a', 'b'], { a: { b: 1 } }],
    [['a', 'b'], { a: {} }],
    [['a', 'b'], { a: null }],
    [[], { a: 1 }],
    [['a'], null],
  ]
  for (const [path, a] of probes) {
    const label = `${path.map(String).join('.')} in ${String(a)}`
    let refused = false
    try {
      props(path)(a)
    } catch {
      refused = true
    }

    assertEquals(gets(() => true)(path)(a).tag === 'just', !refused, label)
  }
})

// Shared fixtures

const isNumber = (x: unknown): x is number => typeof x === 'number'

const isNumberArray = (x: unknown): x is number[] =>
  Array.isArray(x) && x.every(isNumber)
