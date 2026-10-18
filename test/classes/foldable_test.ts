import assert from 'node:assert/strict'
import { test } from 'node:test'
import { append } from '../../src/classes/_append.ts'
import { filter } from '../../src/classes/filterable.ts'
import {
  all,
  any,
  elem,
  elem_,
  foldableNatives,
  foldMap,
  foldr,
  forEach,
  head,
  intercalate,
  isEmpty,
  last,
  none,
  reduce,
  reduce_,
  size,
  toArray,
} from '../../src/classes/foldable.ts'
import { left, right } from '../../src/data/either.ts'
import { identity } from '../../src/data/identity.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { All, Any, Concat, Max, Min, Product, Sum } from '../../src/data/monoid.ts'
import { pair } from '../../src/data/pair.ts'
import { setMember } from '../../src/natives/set.ts'

test ('reduce: combines values from left to right, starting with an initial accumulator', () => {
  assert.deepStrictEqual (
    reduce<number, number> ((a, b) => a + b) (0) ([1, 2, 3]),
    6,
  )
  assert.deepStrictEqual (
    reduce<number, number> ((accumulator, a) => accumulator + a) (1000) (
      pair ('l', 1),
    ),
    1001,
  )
  assert.deepStrictEqual (
    reduce<number, number> ((accumulator, a) => accumulator + a) (0) (
      nothing<number> (),
    ),
    0,
  )
})

test ('reduce: the fold is a left one across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assert.deepStrictEqual (
      reduce<number, string> ((accumulator, a) => `(${accumulator}+${a})`) ('z') (
        wrappedValue as never,
      ),
      elements.reduce ((accumulator, a) => `(${accumulator}+${a})`, 'z'),
      name,
    )
  }

  assert.deepStrictEqual (
    reduce<number, string> ((accumulator, a) => `(${accumulator}+${a})`) ('z') (
      [1, 2, 3] as never,
    ),
    '(((z+1)+2)+3)',
  )
})

test ('foldr: combines values from right to left, starting with an initial accumulator', () => {
  assert.deepStrictEqual (
    foldr ((a: number, accumulator: number[]) => [a, ...accumulator]) (
      [] as number[],
    ) ([1, 2, 3]),
    [1, 2, 3],
  )
  assert.deepStrictEqual (
    foldr ((a: number, accumulator: string) => `(${a}+${accumulator})`) ('z') ([
      1,
      2,
      3,
    ]),
    '(1+(2+(3+z)))',
  )
})

test ('foldr: the fold is a right one across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assert.deepStrictEqual (
      foldr ((a: number, accumulator: string) => `(${a}+${accumulator})`) ('z') (
        wrappedValue as never,
      ),
      elements.reduceRight ((accumulator, a) => `(${a}+${accumulator})`, 'z'),
      name,
    )
    assert.deepStrictEqual (
      foldr ((a: number, accumulator: number[]) => [a, ...accumulator]) (
        [] as number[],
      ) (wrappedValue as never),
      elements,
      name,
    )
  }
})

test ('foldr: the fold direction differs from reduce', () => {
  assert.deepStrictEqual (
    foldr ((a: number, accumulator: string) => accumulator + a) ('') ([1, 2, 3]),
    '321',
  )
  assert.deepStrictEqual (
    reduce<number, string> ((accumulator, a) => accumulator + a) ('') ([1, 2, 3]),
    '123',
  )
})

test ('foldMap: maps values and combines the results with a monoid', () => {
  assert.deepStrictEqual (foldMap (Concat) ((n: number) => `${n}`) ([1, 2]), '12')
  assert.deepStrictEqual (foldMap (Concat) ((n: number) => `${n}`) (just (5)), '5')
  assert.deepStrictEqual (foldMap (Sum) ((n: number) => n) ([1, 2, 3]), 6)
  assert.deepStrictEqual (foldMap (Product) ((n: number) => n) ([1, 2, 3]), 6)
  assert.deepStrictEqual (foldMap (Min) ((n: number) => n) ([3, 1, 2]), 1)
  assert.deepStrictEqual (foldMap (Max) ((n: number) => n) ([3, 1, 2]), 3)
  assert.deepStrictEqual (foldMap (All) ((n: number) => n > 0) ([1, 2]), true)
  assert.deepStrictEqual (foldMap (Any) ((n: number) => n > 1) ([1, 2]), true)
})

test ('foldMap: structurally equal StrMaps fold the same way', () => {
  assert.deepStrictEqual (
    foldMap (Concat) ((n: number) => `${n}`) ({ b: 1, a: 2 }),
    foldMap (Concat) ((n: number) => `${n}`) ({ a: 2, b: 1 }),
  )
  assert.deepStrictEqual (
    foldMap (Concat) ((n: number) => `${n}`) ({ b: 1, a: 2 }),
    '21',
  )
})

test ('intercalate: combines values using a chosen monoid, inserting a separator between them', () => {
  assert.deepStrictEqual (intercalate (Concat) (', ') (['a', 'b']), 'a, b')
  assert.deepStrictEqual (intercalate (Concat) (', ') ([]), '')
  assert.deepStrictEqual (intercalate (Concat) (', ') (['a']), 'a')
  assert.deepStrictEqual (intercalate (Concat) (', ') (just ('a')), 'a')
  assert.deepStrictEqual (intercalate (Concat) (', ') (nothing<string> ()), '')
})

test ('intercalate: works in any monoid, not only in strings', () => {
  assert.deepStrictEqual (intercalate (Sum) (10) ([1, 2, 3]), 26)
  assert.deepStrictEqual (intercalate (Sum) (10) ([1]), 1)
})

test ('toArray: the traversal order across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assert.deepStrictEqual (toArray (wrappedValue as never), elements, name)
  }
})

test ('toArray: on StrMap the order is set by sorting the keys', () => {
  assert.deepStrictEqual (toArray ({ b: 1, a: 2 }), [2, 1])
  assert.deepStrictEqual (toArray ({ a: 2, b: 1 }), [2, 1])
  assert.deepStrictEqual (
    toArray ({ я: 1, а: 2, ё: 3 }),
    [2, 1, 3],
  )
  assert.deepStrictEqual (toArray ({ a: 1, B: 2 }), [2, 1])
})

test ('toArray: every call gives an array of its own', () => {
  const wrappedValue = [1, 2, 3]

  assert.deepStrictEqual (toArray (wrappedValue), [1, 2, 3])
  assert.deepStrictEqual (toArray (wrappedValue), [1, 2, 3])
})

test ('head: returns the first value or Nothing', () => {
  assert.deepStrictEqual (head (just (5)) as unknown, just (5))
  assert.deepStrictEqual (head ([1, 2, 3]) as unknown, just (1))
  assert.deepStrictEqual (head ([]) as unknown, nothing ())
  assert.deepStrictEqual (head (nothing ()) as unknown, nothing ())
  assert.deepStrictEqual (head ({ b: 1, a: 2 }) as unknown, just (2))
})

test ('last: returns the last value or Nothing', () => {
  assert.deepStrictEqual (last ([1, 2, 3]) as unknown, just (3))
  assert.deepStrictEqual (last ([]) as unknown, nothing ())
  assert.deepStrictEqual (last (nothing ()) as unknown, nothing ())
})

test ('head and last agree with toArray across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assert.deepStrictEqual (
      head (wrappedValue as never) as unknown,
      elements.length === 0 ? nothing () : just (elements[0]),
      name,
    )
    assert.deepStrictEqual (
      last (wrappedValue as never) as unknown,
      elements.length === 0 ? nothing () : just (elements[elements.length - 1]),
      name,
    )
  }
})

test ('all: checks whether every value passes the predicate. Returns true for no values', () => {
  assert.deepStrictEqual (all ((n: number) => n > 0) ([1, 2, 3]), true)
  assert.deepStrictEqual (all ((n: number) => n > 1) ([1, 2, 3]), false)
  assert.deepStrictEqual (all ((n: number) => n > 100) ([]), true)
  assert.deepStrictEqual (all ((n: number) => n > 100) (nothing<number> ()), true)
})

test ('any: checks whether at least one value passes the predicate', () => {
  assert.deepStrictEqual (any ((n: number) => n > 2) ([1, 2, 3]), true)
  assert.deepStrictEqual (any ((n: number) => n > 3) ([1, 2, 3]), false)
  assert.deepStrictEqual (any ((n: number) => n > 0) ([]), false)
  assert.deepStrictEqual (any ((n: number) => n > 0) (nothing<number> ()), false)
})

test ('none: checks whether no values pass the predicate. Returns true for no values', () => {
  assert.deepStrictEqual (none ((n: number) => n > 3) ([1, 2, 3]), true)
  assert.deepStrictEqual (none ((n: number) => n > 2) ([1, 2, 3]), false)
  assert.deepStrictEqual (none ((n: number) => n > 0) ([]), true)
})

test ('all and any stop calling the predicate once the answer is known', () => {
  const seen: number[] = []
  const label = (p: (n: number) => boolean) => (n: number) => {
    seen.push (n)
    return p (n)
  }
  all (label ((n: number) => n < 2)) ([1, 2, 3])

  assert.deepStrictEqual (seen, [1, 2])
  seen.length = 0
  any (label ((n: number) => n > 1)) ([1, 2, 3])

  assert.deepStrictEqual (seen, [1, 2])
  seen.length = 0
  none (label ((n: number) => n > 1)) ([1, 2, 3])

  assert.deepStrictEqual (seen, [1, 2])
})

test ("elem: checks whether a collection contains a value, using ply's equals", () => {
  assert.deepStrictEqual (elem (2) ([1, 2, 3]), true)
  assert.deepStrictEqual (elem (4) ([1, 2, 3]), false)
  assert.deepStrictEqual (elem (1) ([]), false)
  assert.deepStrictEqual (elem (1) (just (1)), true)
  assert.deepStrictEqual (elem (1) (nothing<number> ()), false)
})

test ('elem: compares by value, not by reference', () => {
  assert.deepStrictEqual (elem (just (1)) ([just (1), just (2)]), true)
  assert.deepStrictEqual (elem (just (3)) ([just (1), just (2)]), false)
  assert.deepStrictEqual (elem ([1, 2]) ([[1, 2], [3]]), true)
})

test ('elem_: checks for a value in a collection supplied first', () => {
  assert.deepStrictEqual (elem_ (['yes', 'oui', 'ja']) ('oui'), true)
  assert.deepStrictEqual (filter (elem_ (['yes', 'oui', 'ja'])) (['yes', 'no']), ['yes'])
  assert.deepStrictEqual (filter (elem_ (['yes', 'oui', 'ja'])) (['ja', 'nein']), ['ja'])
  assert.deepStrictEqual (elem_ ([1, 2, 3]) (2), true)
  assert.deepStrictEqual (elem_ ([1, 2, 3]) (4), false)
})

test ('forEach: calls a function for each value and returns the original collection', () => {
  const seen: number[] = []
  const wrappedValue = [1, 2, 3]

  function recordVisitedValue(n: number) {
    seen.push (n)
  }

  const returned = forEach (recordVisitedValue) (wrappedValue)

  assert.deepStrictEqual (seen, [1, 2, 3])
  assert.strictEqual (returned as unknown, wrappedValue)
})

test ('forEach: walks in the fold order across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    const seen: number[] = []
    const recordVisitedValue = (n: number) => {
      seen.push (n)
    }

    const returned = forEach (recordVisitedValue) (wrappedValue as never)

    assert.deepStrictEqual (seen, elements, name)
    assert.strictEqual (returned as unknown, wrappedValue, name)
  }
})

test ('the derived operations agree with toArray across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assert.deepStrictEqual (
      reduce<number, number> ((accumulator, a) => accumulator * 2 + a) (1) (
        wrappedValue as never,
      ),
      elements.reduce ((accumulator, a) => accumulator * 2 + a, 1),
      `${name}: reduce`,
    )
    assert.deepStrictEqual (size (wrappedValue as never), elements.length, `${name}: size`)
    assert.deepStrictEqual (
      all ((n: number) => n > 0) (wrappedValue as never),
      elements.every ((n) => n > 0),
      `${name}: all`,
    )
    assert.deepStrictEqual (
      any ((n: number) => n > 2) (wrappedValue as never),
      elements.some ((n) => n > 2),
      `${name}: any`,
    )
    assert.deepStrictEqual (
      elem (2) (wrappedValue as never),
      elements.includes (2),
      `${name}: elem`,
    )
  }
})

test ("foldMap: an empty Foldable gives the monoid's neutral element", () => {
  assert.deepStrictEqual (foldMap (Concat) ((n: number) => `${n}`) ([]), '')
  assert.deepStrictEqual (foldMap (Sum) ((n: number) => n) (nothing<number> ()), 0)
})

test ('foldMap: agrees with the fold and the order across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assert.deepStrictEqual (
      foldMap (Concat) ((n: number) => `${n}`) (wrappedValue as never),
      elements.join (''),
      name,
    )
    assert.deepStrictEqual (
      foldMap (Sum) ((n: number) => n) (wrappedValue as never),
      elements.reduce ((a, b) => a + b, 0),
      name,
    )
  }
})

test ('size: coincides with the length of toArray across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assert.deepStrictEqual (size (wrappedValue as never), elements.length, name)
  }
})

test ('all, any and none are tied by negation across supported types', () => {
  const probes: ((n: number) => boolean)[] = [
    (n) => n > 0,
    (n) => n > 2,
    (n) => n > 100,
    (n) => n % 2 === 0,
  ]
  for (const [name, wrappedValue] of samplesByType) {
    for (const p of probes) {
      const q = (n: number) => !p (n)

      assert.deepStrictEqual (
        none (p) (wrappedValue as never),
        all (q) (wrappedValue as never),
        `${name}: none === all·not`,
      )
      assert.deepStrictEqual (
        none (p) (wrappedValue as never),
        !any (p) (wrappedValue as never),
        `${name}: none === not·any`,
      )
    }
  }
})

test ('reduce_: combines values from left to right with a curried callback', () => {
  function addToAccumulator(a: number) {
    return (accumulator: number) => accumulator + a
  }

  assert.deepStrictEqual (
    reduce_ (addToAccumulator) (0) ([1, 2, 3]),
    6,
  )
  assert.deepStrictEqual (
    reduce_<number, number[]> (append) ([]) ([1, 2, 3]),
    [1, 2, 3],
  )
})

test ('reduce_: this is reduce with the arguments swapped', () => {
  for (const [name, wrappedValue] of samplesByType) {
    const appendToText = (a: number) => (accumulator: string) =>
      `${accumulator}|${a}`

    assert.deepStrictEqual (
      reduce_ (appendToText) ('') (wrappedValue as never),
      reduce<number, string> ((accumulator, a) => `${accumulator}|${a}`) ('') (
        wrappedValue as never,
      ),
      name,
    )
  }
})

test ('toArray: collects contained values into an array. Records use sorted key order', () => {
  assert.deepStrictEqual (toArray (just (1) as never), [1])
  assert.deepStrictEqual (toArray (nothing () as never), [])
  assert.throws (
    () => toArray (new Set ([1, 2]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
})

test ('size: counts the values in a collection or wrapper', () => {
  assert.deepStrictEqual (size ([1, 2, 3] as never), 3)
  assert.deepStrictEqual (size ([] as never), 0)
  assert.deepStrictEqual (size (pair ('log', 1) as never), 1)
  assert.deepStrictEqual (size (nothing () as never), 0)
  assert.throws (
    () => size (new Map ([['a', 1], ['b', 2]]) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Map has no Foldable'),
  )
  assert.deepStrictEqual (new Map ([['a', 1], ['b', 2]]).size, 2)
})

test ('elem and elem_: on a set setMember stands in for them', () => {
  const s = new Set ([1, 2])

  assert.throws (
    () => elem (2) (s as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
  assert.throws (
    () => elem_ (s as never) (2 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
  )
  assert.deepStrictEqual (setMember (2) (s), true)
  assert.deepStrictEqual (setMember (3) (s), false)
  assert.deepStrictEqual (setMember ([1]) (new Set ([[1], [2]])), true)
})

test ('elem_: this is elem with the arguments swapped', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    for (const n of [1, 2, 3, 4]) {
      assert.deepStrictEqual (
        elem_ (wrappedValue as never) (n as never),
        elements.includes (n),
        `${name}: ${n}`,
      )
    }
  }
})

test ('reduce: passes only accumulator and value', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.test (name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): number {
        calls.push (args)
        return 10
      }

      reduce (recordArguments) (10) (wrappedValue as never)

      assert.deepStrictEqual (calls, elements.map ((value) => [10, value]), name)
    })
  }
})

test ('foldr: passes only value and accumulator, from right to left', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.test (name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): number {
        calls.push (args)
        return 10
      }

      foldr (recordArguments) (10) (wrappedValue as never)

      assert.deepStrictEqual (
        calls,
        [...elements].reverse ().map ((value) => [value, 10]),
        name,
      )
    })
  }
})

test ('all: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.test (name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): boolean {
        calls.push (args)
        return true
      }

      all (recordArguments) (wrappedValue as never)

      assert.deepStrictEqual (calls, elements.map ((value) => [value]), name)
    })
  }
})

test ('any: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.test (name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): boolean {
        calls.push (args)
        return true
      }

      any (recordArguments) (wrappedValue as never)

      assert.deepStrictEqual (calls, elements.slice (0, 1).map ((value) => [value]), name)
    })
  }
})

test ('none: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.test (name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): boolean {
        calls.push (args)
        return true
      }

      none (recordArguments) (wrappedValue as never)

      assert.deepStrictEqual (calls, elements.slice (0, 1).map ((value) => [value]), name)
    })
  }
})

test ('forEach: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.test (name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): void {
        calls.push (args)
      }

      forEach (recordArguments) (wrappedValue as never)

      assert.deepStrictEqual (calls, elements.map ((value) => [value]), name)
    })
  }
})

test ('foldMap: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.test (name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): number {
        calls.push (args)
        return 0
      }

      foldMap (Sum) (recordArguments) (wrappedValue as never)

      assert.deepStrictEqual (calls, elements.map ((value) => [value]), name)
    })
  }
})

test ('reduce_: passes the value first, then the accumulator in a separate call', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.test (name, () => {
      const valueCalls: unknown[][] = []
      const accumulatorCalls: unknown[][] = []

      function recordValue(...args: unknown[]) {
        valueCalls.push (args)
        return recordAccumulator
      }

      function recordAccumulator(...args: unknown[]): number {
        accumulatorCalls.push (args)
        return 10
      }

      reduce_ (recordValue) (10) (wrappedValue as never)

      assert.deepStrictEqual (valueCalls, elements.map ((value) => [value]), name)
      assert.deepStrictEqual (accumulatorCalls, elements.map (() => [10]), name)
    })
  }
})

test ('foldMap: parseInt receives no array index as its radix', () => {
  assert.deepStrictEqual (foldMap (Sum) (Number.parseInt) (['1', '2', '3']), 6)
})

test ('foldMap: concat receives only the accumulated result and the next value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  function emptyValue() {
    return 0
  }

  function returnValue(value: number) {
    return value
  }

  const monoid = { empty: emptyValue, concat: recordArguments }
  foldMap (monoid) (returnValue) ([1, 2, 3])

  assert.deepStrictEqual (calls, [[0, 1], [0, 2], [0, 3]])
})

test ('intercalate: concat receives only the accumulated result and the next value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 0
  }

  function emptyValue() {
    return 0
  }

  const monoid = { empty: emptyValue, concat: recordArguments }
  intercalate (monoid) (0) ([1, 2, 3])

  assert.deepStrictEqual (calls, [[1, 0], [0, 2], [0, 0], [0, 3]])
})

test ('reduce: rejects values without Foldable', async (test) => {
  function addValue(accumulator: number, value: number) {
    return accumulator + value
  }

  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => reduce<number, number> (addValue) (0) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => reduce<number, number> (addValue) (0) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('reduce_: rejects values without Foldable', async (test) => {
  function addToAccumulator(value: number) {
    return (accumulator: number) => accumulator + value
  }

  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => reduce_ (addToAccumulator) (0) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => reduce_ (addToAccumulator) (0) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('foldr: rejects values without Foldable', async (test) => {
  function addFromRight(value: number, accumulator: number) {
    return value + accumulator
  }

  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => foldr (addFromRight) (0) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => foldr (addFromRight) (0) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('foldMap: rejects values without Foldable', async (test) => {
  function returnValue(value: number) {
    return value
  }

  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => foldMap (Sum) (returnValue) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => foldMap (Sum) (returnValue) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('intercalate: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => intercalate (Sum) (10) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => intercalate (Sum) (10) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('toArray: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => toArray (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => toArray (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('head: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => head (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => head (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('last: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => last (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => last (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('size: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => size (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => size (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('all: rejects values without Foldable', async (test) => {
  function isPositive(value: number) {
    return value > 0
  }

  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => all (isPositive) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => all (isPositive) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('any: rejects values without Foldable', async (test) => {
  function isPositive(value: number) {
    return value > 0
  }

  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => any (isPositive) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => any (isPositive) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('none: rejects values without Foldable', async (test) => {
  function isPositive(value: number) {
    return value > 0
  }

  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => none (isPositive) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => none (isPositive) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('elem: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => elem (2) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => elem (2) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('elem_: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => elem_ (wrappedValue as never) (2 as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => elem_ (wrappedValue as never) (2 as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('forEach: rejects values without Foldable', async (test) => {
  function ignoreValue(_value: number) {}

  for (const [name, wrappedValue] of foreign) {
    await test.test (name, () => {
      assert.throws (
        () => forEach (ignoreValue) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes ('has no Foldable'),
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.test (name, () => {
      assert.throws (
        () => forEach (ignoreValue) (wrappedValue as never),
        (error: unknown) => error instanceof TypeError && error.message.includes (`reduce: ${name} has no Foldable`),
      )
    })
  }
})

test ('counterexample: folding equal sets would expose insertion order', () => {
  const a = new Set ([1, 2])
  const b = new Set ([2, 1])

  assert.deepStrictEqual (a, b)
  assert.deepStrictEqual ([...a], [1, 2])
  assert.deepStrictEqual ([...b], [2, 1])
  assert.deepStrictEqual (
    [...a].reduce ((accumulator, n) => `${accumulator}${n}`, ''),
    '12',
  )
  assert.deepStrictEqual (
    [...b].reduce ((accumulator, n) => `${accumulator}${n}`, ''),
    '21',
  )
  for (const wrappedValue of [a, b]) {
    assert.throws (
      () =>
        reduce<number, string> ((accumulator, n) => `${accumulator}${n}`) ('') (
          wrappedValue as never,
        ),
      (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    )
  }
})

test ('counterexample: folding equal maps would expose insertion order', () => {
  const a = new Map ([['a', 1], ['b', 2]])
  const b = new Map ([['b', 2], ['a', 1]])

  assert.deepStrictEqual (a, b)
  assert.deepStrictEqual ([...a.values ()], [1, 2])
  assert.deepStrictEqual ([...b.values ()], [2, 1])
  assert.deepStrictEqual (
    [...a.values ()].reduce ((accumulator, n) => `${accumulator}${n}`, ''),
    '12',
  )
  assert.deepStrictEqual (
    [...b.values ()].reduce ((accumulator, n) => `${accumulator}${n}`, ''),
    '21',
  )
  for (const wrappedValue of [a, b]) {
    assert.throws (
      () =>
        reduce<number, string> ((accumulator, n) => `${accumulator}${n}`) ('') (
          wrappedValue as never,
        ),
      (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Map has no Foldable'),
    )
  }
})

test ('counterexample: folding equal sets can expose object identity', () => {
  const k1 = [1]
  const k2 = [1]

  assert.deepStrictEqual (new Set ([k1]), new Set ([k2]))
  const rebuild = (s: Set<unknown>) => new Set ([...s, ...new Set ([k1])])

  assert.deepStrictEqual (rebuild (new Set ([k1])).size, 1)
  assert.deepStrictEqual (rebuild (new Set ([k2])).size, 2)
  assert.deepStrictEqual (
    rebuild (new Set ([k1])).size !== rebuild (new Set ([k2])).size,
    true,
  )
  for (const wrappedValue of [new Set ([k1]), new Set ([k2])]) {
    assert.throws (
      () => size (wrappedValue as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('reduce: Set has no Foldable'),
    )
  }
})

test ('foldableNatives: lists native fold implementations', () => {
  assert.deepStrictEqual (Object.keys (foldableNatives).sort (), ['Array', 'StrMap'])
  for (const [name, dict] of Object.entries (foldableNatives)) {
    assert.deepStrictEqual (typeof dict.reduce, 'function', name)
  }
  for (const [name] of dropped) {
    assert.deepStrictEqual (name in foldableNatives, false, name)
  }
})

const samplesByType: [string, unknown, number[]][] = [
  ['Array', [1, 2, 3], [1, 2, 3]],
  ['StrMap', { c: 3, a: 1, b: 2 }, [1, 2, 3]],
  ['Maybe.Just', just (1), [1]],
  ['Maybe.Nothing', nothing<number> (), []],
  ['Either.Right', right<string, number> (1), [1]],
  ['Either.Left', left<string, number> ('error'), []],
  ['Identity', identity (1), [1]],
  ['Pair', pair ('log', 1), [1]],
]

const dropped: [string, unknown][] = [
  ['Set', new Set ([1, 2, 3])],
  ['Map', new Map ([['a', 1], ['b', 2], ['c', 3]])],
]

const foreign: [string, unknown][] = [
  ['String', 'abc'],
  ['Number', 42],
]

test ('isEmpty: holds nothing at all', () => {
  assert.deepStrictEqual (isEmpty ([]), true)
  assert.deepStrictEqual (isEmpty ([1]), false)
  assert.deepStrictEqual (isEmpty ({}), true)
  assert.deepStrictEqual (isEmpty ({ a: 1 }), false)
})

test ('isEmpty: a wrapper with nothing in it is empty', () => {
  assert.deepStrictEqual (isEmpty (nothing<number> ()), true)
  assert.deepStrictEqual (isEmpty (just (1)), false)
})
