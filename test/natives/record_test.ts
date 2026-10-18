import assert from 'node:assert/strict'
import { test } from 'node:test'
import { just, nothing } from '../../src/data/maybe.ts'
import { get, gets, modify, prop, props, remove, set } from '../../src/natives/record.ts'

test ('set: returns a copy with an updated property', () => {
  assert.deepStrictEqual (set ('a') (9) ({ a: 0, b: 1 }), { a: 9, b: 1 })
  assert.deepStrictEqual (set ('a') (9) ({ a: 0 }), { a: 9 })
  assert.deepStrictEqual (set ('b') ('y') ({ a: 0, b: 'x' }), { a: 0, b: 'y' })
})

test ('set: the original record is not changed', () => {
  const rec = { a: 0, b: 1 }
  const next = set ('a') (9) (rec)

  assert.deepStrictEqual (rec, { a: 0, b: 1 })
  assert.deepStrictEqual (next === rec, false)
})

test ('set: the key order is preserved', () => {
  assert.deepStrictEqual (Object.keys (set ('a') (9) ({ b: 1, a: 0 })), ['b', 'a'])
})

test ('modify: copies a record with an existing property transformed by a function', () => {
  assert.deepStrictEqual (modify ('a') ((n: number) => n + 1) ({ a: 0 }), { a: 1 })
  assert.deepStrictEqual (modify ('a') ((n: number) => n + 1) ({ a: 0, b: 'x' }), {
    a: 1,
    b: 'x',
  })
  assert.deepStrictEqual (modify ('b') ((s: string) => s + '!') ({ a: 0, b: 'x' }), {
    a: 0,
    b: 'x!',
  })
})

test ('modify: the original record is not changed', () => {
  const rec = { a: 0, b: 'x' }
  const next = modify ('a') ((n: number) => n + 1) (rec)

  assert.deepStrictEqual (rec, { a: 0, b: 'x' })
  assert.deepStrictEqual (next === rec, false)
})

test ('prop: reads a property, including an inherited property', () => {
  assert.deepStrictEqual (prop ('a') ({ a: 1, b: 2 }), 1)
  assert.deepStrictEqual (prop ('b') ({ a: 1, b: 2 }), 2)
  assert.deepStrictEqual (prop ('a') ({ a: undefined }), undefined)
})

test ('prop: the key may be a number or a symbol', () => {
  const key = Symbol ('k')

  assert.deepStrictEqual (prop (0) ([10, 'x'] as [number, string]), 10)
  assert.deepStrictEqual (prop (key) ({ [key]: 7 }), 7)
})

test ('props: reads a nested property along a path, including inherited properties', () => {
  assert.deepStrictEqual (props (['a', 'b', 'c']) ({ a: { b: { c: 1 } } }), 1)
  assert.deepStrictEqual (props (['a']) ({ a: 1 }), 1)
  assert.deepStrictEqual (props ([]) ({ a: 1 }), { a: 1 })
})

test ('get: reads a property only when it passes validation', () => {
  assert.deepStrictEqual (get (isNumber) ('x') ({ x: 1, y: 2 }), just (1))
  assert.deepStrictEqual (get (isNumber) ('x') ({ x: '1', y: '2' }), nothing<number> ())
  assert.deepStrictEqual (get (isNumber) ('x') ({}), nothing<number> ())
  assert.deepStrictEqual (get (isNumberArray) ('x') ({ x: [1, 2, 3] }), just ([1, 2, 3]))
  assert.deepStrictEqual (
    get (isNumberArray) ('x') ({ x: [1, 2, 3, null] }),
    nothing<number[]> (),
  )
})

test ('get: a primitive is read through its wrapper', () => {
  assert.deepStrictEqual (get (isNumber) ('length') ('abc'), just (3))
})

test ('gets: reads a nested property only when it passes validation', () => {
  assert.deepStrictEqual (
    gets (isNumber) (['a', 'b', 'c']) ({ a: { b: { c: 42 } } }),
    just (42),
  )
  assert.deepStrictEqual (
    gets (isNumber) (['a', 'b', 'c']) ({ a: { b: { c: '42' } } }),
    nothing<number> (),
  )
  assert.deepStrictEqual (gets (isNumber) (['a', 'b', 'c']) ({}), nothing<number> ())
  assert.deepStrictEqual (gets (isNumber) ([]) (1), just (1))
  assert.deepStrictEqual (gets (isNumber) ([]) ('x'), nothing<number> ())
})

test ('gets: returns Nothing when a path is missing', () => {
  assert.deepStrictEqual (gets (isNumber) (['a', 'b']) ({ a: {} }), nothing<number> ())
  assert.deepStrictEqual (gets (isNumber) (['a', 'b']) ({ a: null }), nothing<number> ())
  assert.deepStrictEqual (gets (isNumber) (['a', 'b']) (null), nothing<number> ())
})

test ('remove: copies an object without the specified property', () => {
  assert.deepStrictEqual (remove ('c') ({ a: 1, b: 2, c: 3 }), { a: 1, b: 2 })
  assert.deepStrictEqual (remove ('c') ({}), {})
  const key = Symbol ('k')

  assert.deepStrictEqual (remove (key) ({ [key]: 0, n: 1 }), { n: 1 })
})

test ('remove: the original record is not changed', () => {
  const rec = { a: 1, b: 2, c: 3 }
  const next = remove ('c') (rec)

  assert.deepStrictEqual (rec, { a: 1, b: 2, c: 3 })
  assert.deepStrictEqual (next === rec, false)
  assert.deepStrictEqual ('c' in next, false)
})

test ('remove: exactly one field is taken away', () => {
  const rec = { a: 1, b: 2, c: 3 }

  assert.deepStrictEqual (Object.keys (remove ('b') (rec)), ['a', 'c'])
  assert.deepStrictEqual (remove ('a') (remove ('b') (rec)), { c: 3 })
})

test ('set and modify: the write and read laws', () => {
  const rec = { a: 1, b: 'x' }

  assert.deepStrictEqual (prop ('a') (set ('a') (9) (rec)), 9)
  assert.deepStrictEqual (set ('a') (prop ('a') (rec)) (rec), rec)
  assert.deepStrictEqual (set ('a') (2) (set ('a') (9) (rec)), set ('a') (2) (rec))
  assert.deepStrictEqual (modify ('a') ((n: number) => n) (rec), rec)
  assert.deepStrictEqual (
    modify ('a') ((n: number) => n + 1) (set ('a') (9) (rec)),
    set ('a') (10) (rec),
  )
})

test ('modify: passes only the selected field’s value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  modify ('a') (recordArguments) ({ a: 1 })
  modify ('b') (recordArguments) ({ a: 1, b: 2 })

  assert.deepStrictEqual (calls, [[1], [2]])
})

test ('prop: a missing field is a failure naming the key', () => {
  const lies = {} as { c: number }

  assert.throws (
    () => prop ('c') (lies),
    (error: unknown) => error instanceof TypeError && error.message.includes ('prop: object has no property named c'),
  )
  const key = Symbol ('k')

  assert.throws (
    () => prop (key) ({} as Record<typeof key, number>),
    (error: unknown) => error instanceof TypeError && error.message.includes ('prop: object has no property named Symbol(k)'),
  )
})

test ('props: a broken path rejects, naming the key and the whole path', () => {
  assert.throws (
    () => props (['a', 'b', 'c']) ({}),
    (error: unknown) => error instanceof TypeError && error.message.includes ('props: object has no property named a at path a.b.c'),
  )
  assert.throws (
    () => props (['a', 'b', 'c']) ({ a: { x: 1 } }),
    (error: unknown) => error instanceof TypeError && error.message.includes ('props: object has no property named b at path a.b.c'),
  )
  assert.throws (
    () => props (['a', 'b']) ({ a: null }),
    (error: unknown) => error instanceof TypeError && error.message.includes ('props: object has no property named b at path a.b'),
  )
})

test ('get: returns Nothing for null and undefined inputs', () => {
  assert.deepStrictEqual (get (isNumber) ('x') (null), nothing<number> ())
  assert.deepStrictEqual (get (isNumber) ('x') (undefined), nothing<number> ())
})

test ('get: passes only the selected field’s value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  get (recordArguments) ('a') ({ a: 1 })

  assert.deepStrictEqual (calls, [[1]])
})

test ('gets: passes only the value at the end of the path', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  gets (recordArguments) (['a', 'b']) ({ a: { b: 1 } })

  assert.deepStrictEqual (calls, [[1]])
})

test ('gets: does not call the predicate for a missing path', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return true
  }

  gets (recordArguments) (['a', 'b']) ({})

  assert.deepStrictEqual (calls, [])
})

test ('get answers Just exactly where prop does not refuse', () => {
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
    const label = `${String (key)} in ${String (a)}`
    let refused = false
    try {
      prop (key) (a as never)
    } catch {
      refused = true
    }

    assert.deepStrictEqual (get (() => true) (key) (a).tag === 'just', !refused, label)
  }
})

test ('gets answers Just exactly where props does not refuse', () => {
  const probes: readonly (readonly [PropertyKey[], unknown])[] = [
    [['a', 'b'], { a: { b: 1 } }],
    [['a', 'b'], { a: {} }],
    [['a', 'b'], { a: null }],
    [[], { a: 1 }],
    [['a'], null],
  ]
  for (const [path, a] of probes) {
    const label = `${path.map (String).join ('.')} in ${String (a)}`
    let refused = false
    try {
      props (path) (a)
    } catch {
      refused = true
    }

    assert.deepStrictEqual (gets (() => true) (path) (a).tag === 'just', !refused, label)
  }
})

const isNumber = (x: unknown): x is number => typeof x === 'number'

const isNumberArray = (x: unknown): x is number[] =>
  Array.isArray (x) && x.every (isNumber)
