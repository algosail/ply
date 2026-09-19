import { assertEquals, assertStrictEquals, assertThrows } from '@std/assert'
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
  last,
  none,
  reduce,
  reduce_,
  size,
  toArray,
} from './foldable.ts'
import { append } from './_append.ts'
import { filter } from './filterable.ts'
import { setMember } from '../natives/set.ts'
import { All, Any, Concat, Max, Min, Product, Sum } from '../data/monoid.ts'
import { just, nothing } from '../data/maybe.ts'
import { left, right } from '../data/either.ts'
import { identity } from '../data/identity.ts'
import { pair } from '../data/pair.ts'

// Examples

Deno.test('reduce: combines values from left to right, starting with an initial accumulator', () => {
  assertEquals(
    reduce<number, number>((a, b) => a + b)(0)([1, 2, 3]),
    6,
  )
  assertEquals(
    reduce<number, number>((accumulator, a) => accumulator + a)(1000)(
      pair('l', 1),
    ),
    1001,
  )
  assertEquals(
    reduce<number, number>((accumulator, a) => accumulator + a)(0)(
      nothing<number>(),
    ),
    0,
  )
})

Deno.test('reduce: the fold is a left one across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assertEquals(
      reduce<number, string>((accumulator, a) => `(${accumulator}+${a})`)('z')(
        wrappedValue as never,
      ),
      elements.reduce((accumulator, a) => `(${accumulator}+${a})`, 'z'),
      name,
    )
  }

  assertEquals(
    reduce<number, string>((accumulator, a) => `(${accumulator}+${a})`)('z')(
      [1, 2, 3] as never,
    ),
    '(((z+1)+2)+3)',
  )
})

Deno.test('foldr: combines values from right to left, starting with an initial accumulator', () => {
  assertEquals(
    foldr((a: number, accumulator: number[]) => [a, ...accumulator])(
      [] as number[],
    )([1, 2, 3]),
    [1, 2, 3],
  )
  assertEquals(
    foldr((a: number, accumulator: string) => `(${a}+${accumulator})`)('z')([
      1,
      2,
      3,
    ]),
    '(1+(2+(3+z)))',
  )
})

Deno.test('foldr: the fold is a right one across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assertEquals(
      foldr((a: number, accumulator: string) => `(${a}+${accumulator})`)('z')(
        wrappedValue as never,
      ),
      elements.reduceRight((accumulator, a) => `(${a}+${accumulator})`, 'z'),
      name,
    )
    assertEquals(
      foldr((a: number, accumulator: number[]) => [a, ...accumulator])(
        [] as number[],
      )(wrappedValue as never),
      elements,
      name,
    )
  }
})

Deno.test('foldr: the fold direction differs from reduce', () => {
  assertEquals(
    foldr((a: number, accumulator: string) => accumulator + a)('')([1, 2, 3]),
    '321',
  )
  assertEquals(
    reduce<number, string>((accumulator, a) => accumulator + a)('')([1, 2, 3]),
    '123',
  )
})

Deno.test('foldMap: maps values and combines the results with a monoid', () => {
  assertEquals(foldMap(Concat)((n: number) => `${n}`)([1, 2]), '12')
  assertEquals(foldMap(Concat)((n: number) => `${n}`)(just(5)), '5')
  assertEquals(foldMap(Sum)((n: number) => n)([1, 2, 3]), 6)
  assertEquals(foldMap(Product)((n: number) => n)([1, 2, 3]), 6)
  assertEquals(foldMap(Min)((n: number) => n)([3, 1, 2]), 1)
  assertEquals(foldMap(Max)((n: number) => n)([3, 1, 2]), 3)
  assertEquals(foldMap(All)((n: number) => n > 0)([1, 2]), true)
  assertEquals(foldMap(Any)((n: number) => n > 1)([1, 2]), true)
})

Deno.test('foldMap: structurally equal StrMaps fold the same way', () => {
  assertEquals(
    foldMap(Concat)((n: number) => `${n}`)({ b: 1, a: 2 }),
    foldMap(Concat)((n: number) => `${n}`)({ a: 2, b: 1 }),
  )
  assertEquals(
    foldMap(Concat)((n: number) => `${n}`)({ b: 1, a: 2 }),
    '21',
  )
})

Deno.test('intercalate: combines values using a chosen monoid, inserting a separator between them', () => {
  assertEquals(intercalate(Concat)(', ')(['a', 'b']), 'a, b')
  assertEquals(intercalate(Concat)(', ')([]), '')
  assertEquals(intercalate(Concat)(', ')(['a']), 'a')
  assertEquals(intercalate(Concat)(', ')(just('a')), 'a')
  assertEquals(intercalate(Concat)(', ')(nothing<string>()), '')
})

Deno.test('intercalate: works in any monoid, not only in strings', () => {
  assertEquals(intercalate(Sum)(10)([1, 2, 3]), 26)
  assertEquals(intercalate(Sum)(10)([1]), 1)
})

Deno.test('toArray: the traversal order across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assertEquals(toArray(wrappedValue as never), elements, name)
  }
})

Deno.test('toArray: on StrMap the order is set by sorting the keys', () => {
  assertEquals(toArray({ b: 1, a: 2 }), [2, 1])
  assertEquals(toArray({ a: 2, b: 1 }), [2, 1])
  assertEquals(
    toArray({ '\u044F': 1, '\u0430': 2, '\u0451': 3 }),
    [2, 1, 3],
  )
  assertEquals(toArray({ a: 1, B: 2 }), [2, 1])
})

Deno.test('toArray: every call gives an array of its own', () => {
  const wrappedValue = [1, 2, 3]

  assertEquals(toArray(wrappedValue), [1, 2, 3])
  assertEquals(toArray(wrappedValue), [1, 2, 3])
})

Deno.test('head: returns the first value or Nothing', () => {
  assertEquals(head(just(5)) as unknown, just(5))
  assertEquals(head([1, 2, 3]) as unknown, just(1))
  assertEquals(head([]) as unknown, nothing())
  assertEquals(head(nothing()) as unknown, nothing())
  assertEquals(head({ b: 1, a: 2 }) as unknown, just(2))
})

Deno.test('last: returns the last value or Nothing', () => {
  assertEquals(last([1, 2, 3]) as unknown, just(3))
  assertEquals(last([]) as unknown, nothing())
  assertEquals(last(nothing()) as unknown, nothing())
})

Deno.test('head and last agree with toArray across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assertEquals(
      head(wrappedValue as never) as unknown,
      elements.length === 0 ? nothing() : just(elements[0]),
      name,
    )
    assertEquals(
      last(wrappedValue as never) as unknown,
      elements.length === 0 ? nothing() : just(elements[elements.length - 1]),
      name,
    )
  }
})

Deno.test('all: checks whether every value passes the predicate. Returns true for no values', () => {
  assertEquals(all((n: number) => n > 0)([1, 2, 3]), true)
  assertEquals(all((n: number) => n > 1)([1, 2, 3]), false)
  assertEquals(all((n: number) => n > 100)([]), true)
  assertEquals(all((n: number) => n > 100)(nothing<number>()), true)
})

Deno.test('any: checks whether at least one value passes the predicate', () => {
  assertEquals(any((n: number) => n > 2)([1, 2, 3]), true)
  assertEquals(any((n: number) => n > 3)([1, 2, 3]), false)
  assertEquals(any((n: number) => n > 0)([]), false)
  assertEquals(any((n: number) => n > 0)(nothing<number>()), false)
})

Deno.test('none: checks whether no values pass the predicate. Returns true for no values', () => {
  assertEquals(none((n: number) => n > 3)([1, 2, 3]), true)
  assertEquals(none((n: number) => n > 2)([1, 2, 3]), false)
  assertEquals(none((n: number) => n > 0)([]), true)
})

Deno.test('all and any stop calling the predicate once the answer is known', () => {
  const seen: number[] = []
  const label = (p: (n: number) => boolean) => (n: number) => {
    seen.push(n)
    return p(n)
  }
  all(label((n: number) => n < 2))([1, 2, 3])

  assertEquals(seen, [1, 2])
  seen.length = 0
  any(label((n: number) => n > 1))([1, 2, 3])

  assertEquals(seen, [1, 2])
  seen.length = 0
  none(label((n: number) => n > 1))([1, 2, 3])

  assertEquals(seen, [1, 2])
})

Deno.test("elem: checks whether a collection contains a value, using ply's equals", () => {
  assertEquals(elem(2)([1, 2, 3]), true)
  assertEquals(elem(4)([1, 2, 3]), false)
  assertEquals(elem(1)([]), false)
  assertEquals(elem(1)(just(1)), true)
  assertEquals(elem(1)(nothing<number>()), false)
})

Deno.test('elem: compares by value, not by reference', () => {
  assertEquals(elem(just(1))([just(1), just(2)]), true)
  assertEquals(elem(just(3))([just(1), just(2)]), false)
  assertEquals(elem([1, 2])([[1, 2], [3]]), true)
})

Deno.test('elem_: checks for a value in a collection supplied first', () => {
  assertEquals(elem_(['yes', 'oui', 'ja'])('oui'), true)
  assertEquals(filter(elem_(['yes', 'oui', 'ja']))(['yes', 'no']), ['yes'])
  assertEquals(filter(elem_(['yes', 'oui', 'ja']))(['ja', 'nein']), ['ja'])
  assertEquals(elem_([1, 2, 3])(2), true)
  assertEquals(elem_([1, 2, 3])(4), false)
})

Deno.test('forEach: calls a function for each value and returns the original collection', () => {
  const seen: number[] = []
  const wrappedValue = [1, 2, 3]

  function recordVisitedValue(n: number) {
    seen.push(n)
  }

  const returned = forEach(recordVisitedValue)(wrappedValue)

  assertEquals(seen, [1, 2, 3])
  assertStrictEquals(returned as unknown, wrappedValue)
})

Deno.test('forEach: walks in the fold order across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    const seen: number[] = []
    const recordVisitedValue = (n: number) => {
      seen.push(n)
    }

    const returned = forEach(recordVisitedValue)(wrappedValue as never)

    assertEquals(seen, elements, name)
    assertStrictEquals(returned as unknown, wrappedValue, name)
  }
})

Deno.test('the derived operations agree with toArray across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assertEquals(
      reduce<number, number>((accumulator, a) => accumulator * 2 + a)(1)(
        wrappedValue as never,
      ),
      elements.reduce((accumulator, a) => accumulator * 2 + a, 1),
      `${name}: reduce`,
    )
    assertEquals(size(wrappedValue as never), elements.length, `${name}: size`)
    assertEquals(
      all((n: number) => n > 0)(wrappedValue as never),
      elements.every((n) => n > 0),
      `${name}: all`,
    )
    assertEquals(
      any((n: number) => n > 2)(wrappedValue as never),
      elements.some((n) => n > 2),
      `${name}: any`,
    )
    assertEquals(
      elem(2)(wrappedValue as never),
      elements.includes(2),
      `${name}: elem`,
    )
  }
})

// Laws

Deno.test("foldMap: an empty Foldable gives the monoid's neutral element", () => {
  assertEquals(foldMap(Concat)((n: number) => `${n}`)([]), '')
  assertEquals(foldMap(Sum)((n: number) => n)(nothing<number>()), 0)
})

Deno.test('foldMap: agrees with the fold and the order across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assertEquals(
      foldMap(Concat)((n: number) => `${n}`)(wrappedValue as never),
      elements.join(''),
      name,
    )
    assertEquals(
      foldMap(Sum)((n: number) => n)(wrappedValue as never),
      elements.reduce((a, b) => a + b, 0),
      name,
    )
  }
})

Deno.test('size: coincides with the length of toArray across supported types', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    assertEquals(size(wrappedValue as never), elements.length, name)
  }
})

Deno.test('all, any and none are tied by negation across supported types', () => {
  const probes: ((n: number) => boolean)[] = [
    (n) => n > 0,
    (n) => n > 2,
    (n) => n > 100,
    (n) => n % 2 === 0,
  ]
  for (const [name, wrappedValue] of samplesByType) {
    for (const p of probes) {
      const q = (n: number) => !p(n)

      assertEquals(
        none(p)(wrappedValue as never),
        all(q)(wrappedValue as never),
        `${name}: none === all·not`,
      )
      assertEquals(
        none(p)(wrappedValue as never),
        !any(p)(wrappedValue as never),
        `${name}: none === not·any`,
      )
    }
  }
})

// Edge cases

Deno.test('reduce_: combines values from left to right with a curried callback', () => {
  function addToAccumulator(a: number) {
    return (accumulator: number) => accumulator + a
  }

  assertEquals(
    reduce_(addToAccumulator)(0)([1, 2, 3]),
    6,
  )
  assertEquals(
    reduce_<number, number[]>(append)([])([1, 2, 3]),
    [1, 2, 3],
  )
})

Deno.test('reduce_: this is reduce with the arguments swapped', () => {
  for (const [name, wrappedValue] of samplesByType) {
    const appendToText = (a: number) => (accumulator: string) =>
      `${accumulator}|${a}`

    assertEquals(
      reduce_(appendToText)('')(wrappedValue as never),
      reduce<number, string>((accumulator, a) => `${accumulator}|${a}`)('')(
        wrappedValue as never,
      ),
      name,
    )
  }
})

Deno.test('toArray: collects contained values into an array. Records use sorted key order', () => {
  // Bypass the type checker to verify the runtime error.
  assertEquals(toArray(just(1) as never), [1])
  assertEquals(toArray(nothing() as never), [])
  assertThrows(
    () => toArray(new Set([1, 2]) as never),
    TypeError,
    'reduce: Set has no Foldable',
  )
})

Deno.test('size: counts the values in a collection or wrapper', () => {
  // Bypass the type checker to verify the runtime error.
  assertEquals(size([1, 2, 3] as never), 3)
  assertEquals(size([] as never), 0)
  assertEquals(size(pair('log', 1) as never), 1)
  assertEquals(size(nothing() as never), 0)
  assertThrows(
    () => size(new Map([['a', 1], ['b', 2]]) as never),
    TypeError,
    'reduce: Map has no Foldable',
  )
  assertEquals(new Map([['a', 1], ['b', 2]]).size, 2)
})

Deno.test('elem and elem_: on a set setMember stands in for them', () => {
  // Bypass the type checker to verify the runtime error.
  const s = new Set([1, 2])

  assertThrows(
    () => elem(2)(s as never),
    TypeError,
    'reduce: Set has no Foldable',
  )
  assertThrows(
    () => elem_(s as never)(2 as never),
    TypeError,
    'reduce: Set has no Foldable',
  )
  assertEquals(setMember(2)(s), true)
  assertEquals(setMember(3)(s), false)
  assertEquals(setMember([1])(new Set([[1], [2]])), true)
})

Deno.test('elem_: this is elem with the arguments swapped', () => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    for (const n of [1, 2, 3, 4]) {
      assertEquals(
        elem_(wrappedValue as never)(n as never),
        elements.includes(n),
        `${name}: ${n}`,
      )
    }
  }
})

Deno.test('reduce: passes only accumulator and value', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): number {
        calls.push(args)
        return 10
      }

      reduce(recordArguments)(10)(wrappedValue as never)

      assertEquals(calls, elements.map((value) => [10, value]), name)
    })
  }
})

Deno.test('foldr: passes only value and accumulator, from right to left', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): number {
        calls.push(args)
        return 10
      }

      foldr(recordArguments)(10)(wrappedValue as never)

      assertEquals(
        calls,
        [...elements].reverse().map((value) => [value, 10]),
        name,
      )
    })
  }
})

Deno.test('all: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): boolean {
        calls.push(args)
        return true
      }

      all(recordArguments)(wrappedValue as never)

      assertEquals(calls, elements.map((value) => [value]), name)
    })
  }
})

Deno.test('any: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): boolean {
        calls.push(args)
        return true
      }

      any(recordArguments)(wrappedValue as never)

      assertEquals(calls, elements.slice(0, 1).map((value) => [value]), name)
    })
  }
})

Deno.test('none: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): boolean {
        calls.push(args)
        return true
      }

      none(recordArguments)(wrappedValue as never)

      assertEquals(calls, elements.slice(0, 1).map((value) => [value]), name)
    })
  }
})

Deno.test('forEach: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): void {
        calls.push(args)
      }

      forEach(recordArguments)(wrappedValue as never)

      assertEquals(calls, elements.map((value) => [value]), name)
    })
  }
})

Deno.test('foldMap: passes only the value to its callback', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.step(name, () => {
      const calls: unknown[][] = []

      function recordArguments(...args: unknown[]): number {
        calls.push(args)
        return 0
      }

      foldMap(Sum)(recordArguments)(wrappedValue as never)

      assertEquals(calls, elements.map((value) => [value]), name)
    })
  }
})

Deno.test('reduce_: passes the value first, then the accumulator in a separate call', async (test) => {
  for (const [name, wrappedValue, elements] of samplesByType) {
    await test.step(name, () => {
      const valueCalls: unknown[][] = []
      const accumulatorCalls: unknown[][] = []

      function recordValue(...args: unknown[]) {
        valueCalls.push(args)
        return recordAccumulator
      }

      function recordAccumulator(...args: unknown[]): number {
        accumulatorCalls.push(args)
        return 10
      }

      reduce_(recordValue)(10)(wrappedValue as never)

      assertEquals(valueCalls, elements.map((value) => [value]), name)
      assertEquals(accumulatorCalls, elements.map(() => [10]), name)
    })
  }
})

Deno.test('foldMap: parseInt receives no array index as its radix', () => {
  assertEquals(foldMap(Sum)(Number.parseInt)(['1', '2', '3']), 6)
})

Deno.test('foldMap: concat receives only the accumulated result and the next value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  function emptyValue() {
    return 0
  }

  function returnValue(value: number) {
    return value
  }

  const monoid = { empty: emptyValue, concat: recordArguments }
  foldMap(monoid)(returnValue)([1, 2, 3])

  assertEquals(calls, [[0, 1], [0, 2], [0, 3]])
})

Deno.test('intercalate: concat receives only the accumulated result and the next value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return 0
  }

  function emptyValue() {
    return 0
  }

  const monoid = { empty: emptyValue, concat: recordArguments }
  intercalate(monoid)(0)([1, 2, 3])

  assertEquals(calls, [[1, 0], [0, 2], [0, 0], [0, 3]])
})

Deno.test('reduce: rejects values without Foldable', async (test) => {
  function addValue(accumulator: number, value: number) {
    return accumulator + value
  }

  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => reduce<number, number>(addValue)(0)(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => reduce<number, number>(addValue)(0)(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('reduce_: rejects values without Foldable', async (test) => {
  function addToAccumulator(value: number) {
    return (accumulator: number) => accumulator + value
  }

  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => reduce_(addToAccumulator)(0)(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => reduce_(addToAccumulator)(0)(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('foldr: rejects values without Foldable', async (test) => {
  function addFromRight(value: number, accumulator: number) {
    return value + accumulator
  }

  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => foldr(addFromRight)(0)(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => foldr(addFromRight)(0)(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('foldMap: rejects values without Foldable', async (test) => {
  function returnValue(value: number) {
    return value
  }

  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => foldMap(Sum)(returnValue)(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => foldMap(Sum)(returnValue)(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('intercalate: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => intercalate(Sum)(10)(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => intercalate(Sum)(10)(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('toArray: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => toArray(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => toArray(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('head: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => head(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => head(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('last: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => last(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => last(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('size: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => size(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => size(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('all: rejects values without Foldable', async (test) => {
  function isPositive(value: number) {
    return value > 0
  }

  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => all(isPositive)(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => all(isPositive)(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('any: rejects values without Foldable', async (test) => {
  function isPositive(value: number) {
    return value > 0
  }

  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => any(isPositive)(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => any(isPositive)(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('none: rejects values without Foldable', async (test) => {
  function isPositive(value: number) {
    return value > 0
  }

  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => none(isPositive)(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => none(isPositive)(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('elem: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => elem(2)(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => elem(2)(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('elem_: rejects values without Foldable', async (test) => {
  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => elem_(wrappedValue as never)(2 as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => elem_(wrappedValue as never)(2 as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('forEach: rejects values without Foldable', async (test) => {
  function ignoreValue(_value: number) {}

  for (const [name, wrappedValue] of foreign) {
    await test.step(name, () => {
      assertThrows(
        () => forEach(ignoreValue)(wrappedValue as never),
        TypeError,
        'has no Foldable',
      )
    })
  }
  for (const [name, wrappedValue] of dropped) {
    await test.step(name, () => {
      assertThrows(
        () => forEach(ignoreValue)(wrappedValue as never),
        TypeError,
        `reduce: ${name} has no Foldable`,
      )
    })
  }
})

Deno.test('counterexample: folding equal sets would expose insertion order', () => {
  // Bypass the type checker to verify the runtime error.
  const a = new Set([1, 2])
  const b = new Set([2, 1])

  assertEquals(a, b)
  assertEquals([...a], [1, 2])
  assertEquals([...b], [2, 1])
  assertEquals(
    [...a].reduce((accumulator, n) => `${accumulator}${n}`, ''),
    '12',
  )
  assertEquals(
    [...b].reduce((accumulator, n) => `${accumulator}${n}`, ''),
    '21',
  )
  for (const wrappedValue of [a, b]) {
    assertThrows(
      () =>
        reduce<number, string>((accumulator, n) => `${accumulator}${n}`)('')(
          wrappedValue as never,
        ),
      TypeError,
      'reduce: Set has no Foldable',
    )
  }
})

Deno.test('counterexample: folding equal maps would expose insertion order', () => {
  // Bypass the type checker to verify the runtime error.
  const a = new Map([['a', 1], ['b', 2]])
  const b = new Map([['b', 2], ['a', 1]])

  assertEquals(a, b)
  assertEquals([...a.values()], [1, 2])
  assertEquals([...b.values()], [2, 1])
  assertEquals(
    [...a.values()].reduce((accumulator, n) => `${accumulator}${n}`, ''),
    '12',
  )
  assertEquals(
    [...b.values()].reduce((accumulator, n) => `${accumulator}${n}`, ''),
    '21',
  )
  for (const wrappedValue of [a, b]) {
    assertThrows(
      () =>
        reduce<number, string>((accumulator, n) => `${accumulator}${n}`)('')(
          wrappedValue as never,
        ),
      TypeError,
      'reduce: Map has no Foldable',
    )
  }
})

Deno.test('counterexample: folding equal sets can expose object identity', () => {
  // Bypass the type checker to verify the runtime error.
  const k1 = [1]
  const k2 = [1]

  assertEquals(new Set([k1]), new Set([k2]))
  const rebuild = (s: Set<unknown>) => new Set([...s, ...new Set([k1])])

  assertEquals(rebuild(new Set([k1])).size, 1)
  assertEquals(rebuild(new Set([k2])).size, 2)
  assertEquals(
    rebuild(new Set([k1])).size !== rebuild(new Set([k2])).size,
    true,
  )
  for (const wrappedValue of [new Set([k1]), new Set([k2])]) {
    assertThrows(
      () => size(wrappedValue as never),
      TypeError,
      'reduce: Set has no Foldable',
    )
  }
})

// Native operation tables

Deno.test('foldableNatives: lists native fold implementations', () => {
  assertEquals(Object.keys(foldableNatives).sort(), ['Array', 'StrMap'])
  for (const [name, dict] of Object.entries(foldableNatives)) {
    assertEquals(typeof dict.reduce, 'function', name)
  }
  for (const [name] of dropped) {
    assertEquals(name in foldableNatives, false, name)
  }
})

// Shared fixtures

const samplesByType: [string, unknown, number[]][] = [
  ['Array', [1, 2, 3], [1, 2, 3]],
  ['StrMap', { c: 3, a: 1, b: 2 }, [1, 2, 3]],
  ['Maybe.Just', just(1), [1]],
  ['Maybe.Nothing', nothing<number>(), []],
  ['Either.Right', right<string, number>(1), [1]],
  ['Either.Left', left<string, number>('error'), []],
  ['Identity', identity(1), [1]],
  ['Pair', pair('log', 1), [1]],
]

const dropped: [string, unknown][] = [
  ['Set', new Set([1, 2, 3])],
  ['Map', new Map([['a', 1], ['b', 2], ['c', 3]])],
]

const foreign: [string, unknown][] = [
  ['String', 'abc'],
  ['Number', 42],
]
