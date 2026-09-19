import { assertEquals, assertThrows } from '@std/assert'
import type { Shape, Widened } from '../core/shape.ts'
import type { ApplicativeTypeRep } from './applicative.ts'
import type { ApplyMethods } from './apply.ts'
import type { FunctorMethods } from './functor.ts'
import { sequence, traversableNatives, traverse } from './traversable.ts'
import { map } from './functor.ts'
import { foldMap, toArray } from './foldable.ts'
import { Arr } from '../natives/array.ts'
import { Concat } from '../data/monoid.ts'
import { Identity, identity } from '../data/identity.ts'
import { just, Maybe, nothing } from '../data/maybe.ts'
import { Either, left, right } from '../data/either.ts'
import { pair } from '../data/pair.ts'

// Examples

Deno.test('traverse: transforms values into a chosen wrapper and collects them inside one result', () => {
  assertEquals(traverse(Maybe)(ok)([1, 2, 3]), just([1, 2, 3]))
  assertEquals(traverse(Maybe)(ok)(just(1)), just(just(1)))
  assertEquals(
    traverse(Maybe)(ok)(right<string, number>(1)),
    just(right<string, number>(1)),
  )
  assertEquals(traverse(Maybe)(ok)(identity(1)), just(identity(1)))
  assertEquals(
    traverse(Maybe)(ok)(pair('log', 1)),
    just(pair('log', 1)),
  )
})

Deno.test('traverse: any Nothing or Left makes the result fail', () => {
  assertEquals(traverse(Maybe)(small)([1, 2, 3]), nothing())
  assertEquals(traverse(Maybe)(small)(just(5)), nothing())
})

Deno.test('traverse: the effects go left to right across supported types', () => {
  assertEquals(journal([1, 2, 3]), '123')
  assertEquals(journal(just(1)), '1')
  assertEquals(journal(identity(1)), '1')
  assertEquals(journal(pair('log', 1)), '1')
  assertEquals(journal(nothing<number>()), '')
  assertEquals(journal(left<string, number>('error')), '')
})

Deno.test('traverse: preserves the first Left error', () => {
  const boom = (n: number) =>
    n < 0 ? left<string, number>('err' + n) : right<string, number>(n)

  assertEquals(
    traverse(Either)(boom)([-1, 2, -3]),
    left<string, number[]>('err-1'),
  )
  assertEquals(
    traverse(Either)(boom)([1, -2, -3]),
    left<string, number[]>('err-2'),
  )
  assertEquals(
    traverse(Either)(boom)([1, 2, -3]),
    left<string, number[]>('err-3'),
  )
})

Deno.test('sequence: turns a collection of wrapped values into one wrapped collection', () => {
  assertEquals(sequence(Maybe)([just(1), just(2)]), just([1, 2]))
  assertEquals(
    sequence(Maybe)([just(1), nothing<number>()]),
    nothing(),
  )
  assertEquals(sequence(Maybe)(identity(just(1))), just(identity(1)))
  assertEquals(
    sequence(Either)(identity(right<string, number>(1))),
    right<string, Identity<number>>(identity(1)),
  )
})

Deno.test('sequence: the Array applicative gives the product', () => {
  assertEquals(sequence(Arr)([[1, 2], [3, 4]]), [
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
  ])
  const triple = sequence(Arr)([[1, 2], [3, 4], [5, 6]])

  assertEquals(triple.length, 8)
  assertEquals(triple[0], [1, 3, 5])
  assertEquals(triple[1], [1, 3, 6])
})

Deno.test('sequence: the native applicative Arr is accepted with no cast', () => {
  const collapsed: number[][] = sequence(Arr)([[1, 2]])

  assertEquals(collapsed, [[1], [2]])
})

Deno.test('traverse: into the Array applicative it passes from every type', () => {
  const both = (n: number) => [n, -n]

  assertEquals(traverse(Arr)(both)([1, 2]), [
    [1, 2],
    [1, -2],
    [-1, 2],
    [-1, -2],
  ])
  assertEquals(traverse(Arr)(both)(pair('x', 1)), [
    pair('x', 1),
    pair('x', -1),
  ])
  assertEquals(traverse(Arr)(both)(identity(1)), [
    identity(1),
    identity(-1),
  ])
  assertEquals(traverse(Arr)(both)(just(1)), [just(1), just(-1)])
  assertEquals(
    traverse(Arr)(both)(right<string, number>(1)),
    [right<string, number>(1), right<string, number>(-1)],
  )
})

Deno.test('sequence takes a type whose slot is in input position', () => {
  const tick = threaded<number, number>((s) => [s * 2, s + 1])
  const both = sequence(Threaded)([tick, tick]) as unknown as Threaded<
    number,
    number[]
  >

  assertEquals(both.run(3), [[6, 8], 5])

  function labelAndAdvance(n: number) {
    return threaded<number, string>((s) => [`${n}`, s + 1])
  }

  const labelled = traverse(Threaded)(labelAndAdvance)([
    1,
    2,
    3,
  ]) as unknown as Threaded<number, string[]>

  assertEquals(labelled.run(0), [['1', '2', '3'], 3])
})

// Laws

Deno.test('traverse: the order coincides with the Foldable traversal', () => {
  for (const [name, ta] of Object.entries(samplesByType)) {
    assertEquals(journal(ta), foldMap(Concat)(String)(ta), name)
    assertEquals(
      journal(ta),
      (toArray(ta) as number[]).join(''),
      name,
    )
  }
})

Deno.test('traverse: identity law', () => {
  for (const [name, ta] of Object.entries(samplesByType)) {
    assertEquals(
      traverse(Identity)(identity)(ta),
      identity(ta),
      name,
    )
  }
})

Deno.test('traverse: the naturality law', () => {
  const t = (m: unknown): unknown[] => toArray(m as never)
  for (const [name, ta] of Object.entries(samplesByType)) {
    for (const f of [ok, small]) {
      assertEquals(
        t(traverse(Maybe)(f)(ta as never)),
        traverse(Arr)(((a: number) => t(f(a))) as never)(ta as never),
        `${name} / ${f === ok ? 'no refusal' : 'with a refusal'}`,
      )
    }
  }
})

Deno.test('traverse: agrees with map', () => {
  const f = (n: number) => n * 10
  for (const [name, ta] of Object.entries(samplesByType)) {
    assertEquals(
      traverse(Identity)((n: number) => identity(f(n)))(ta),
      identity(map(f)(ta)),
      name,
    )
  }
})

Deno.test('sequence: coincides with traverse of the identity across supported types', () => {
  for (const [name, ta] of Object.entries(samplesByType)) {
    const tb = map(ok)(ta)

    assertEquals(
      sequence(Maybe)(tb),
      traverse(Maybe)((m: Maybe<number>) => m)(tb),
      name,
    )
  }
})

// Edge cases

Deno.test('traverse: wraps an empty structure without calling the callback', () => {
  let calls = 0

  function recordVisit(_n: number) {
    calls += 1
    return nothing<number>()
  }

  assertEquals(
    traverse(Maybe)(recordVisit)(nothing<number>()),
    just(nothing()),
  )
  assertEquals(
    traverse(Maybe)(recordVisit)(left<string, number>('error')),
    just(left<string, number>('error')),
  )
  assertEquals(traverse(Maybe)(recordVisit)([] as number[]), just([]))
  assertEquals(calls, 0)
})

Deno.test('traverse: Array passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return just(1)
  }

  traverse(Maybe)(recordArguments)([1, 2, 3])

  assertEquals(calls, [[1], [2], [3]])
})

Deno.test('traverse: Just passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return just(1)
  }

  traverse(Maybe)(recordArguments)(just(1))

  assertEquals(calls, [[1]])
})

Deno.test('traverse: Nothing passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return just(1)
  }

  traverse(Maybe)(recordArguments)(nothing<number>())

  assertEquals(calls, [])
})

Deno.test('traverse: Right passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return just(1)
  }

  traverse(Maybe)(recordArguments)(right<string, number>(1))

  assertEquals(calls, [[1]])
})

Deno.test('traverse: Left passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return just(1)
  }

  traverse(Maybe)(recordArguments)(left<string, number>('error'))

  assertEquals(calls, [])
})

Deno.test('traverse: Identity passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return just(1)
  }

  traverse(Maybe)(recordArguments)(identity(1))

  assertEquals(calls, [[1]])
})

Deno.test('traverse: Pair passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return just(1)
  }

  traverse(Maybe)(recordArguments)(pair('log', 1))

  assertEquals(calls, [[1]])
})

Deno.test('traverse: rejects values without Traversable', () => {
  // Bypass the type checker to verify the runtime error.
  const strangers = {
    'Set': new Set([1, 2, 3]),
    'Map': new Map([['a', 1]]),
    'StrMap': { a: 1 },
    'String': 'text',
    'Fn': (n: number) => n,
  }
  for (const [name, ta] of Object.entries(strangers)) {
    assertThrows(
      () => traverse(Maybe)(ok)(ta as never),
      TypeError,
      'has no Traversable',
      name,
    )
    assertThrows(
      () => sequence(Maybe)(ta as never),
      TypeError,
      'has no Traversable',
      name,
    )
  }
})

Deno.test('traverse: the failure comes before the callback is called', () => {
  // Bypass the type checker to verify the runtime error.
  let calls = 0

  assertThrows(() =>
    traverse(Maybe)(
      ((n: number) => {
        calls += 1
        return just(n)
      }) as never,
    )(new Set([1, 2]) as never)
  )
  assertEquals(calls, 0)
})

// Type checking

Deno.test('sequence still rejects a Traversable of plain values', () => {
  // @ts-expect-error a number is not a member of the Array family
  const _flat = () => sequence(Arr)([1, 2, 3])

  assertEquals(typeof _flat, 'function')
})

// Native operation tables

Deno.test('traversableNatives: the only native type is Array', () => {
  assertEquals(Object.keys(traversableNatives), ['Array'])
})

// Shared fixtures

interface Logged<A> {
  readonly '@@type': 'Logged'
  readonly log: string
  readonly value: A
  map<B>(f: (a: A) => B): Logged<B>
  ap<B>(wrappedFunctions: Logged<(a: A) => B>): Logged<B>
}

const logged = <A>(log: string, value: A): Logged<A> => ({
  '@@type': 'Logged',
  log,
  value,
  map<B>(f: (a: A) => B): Logged<B> {
    return logged(log, f(value))
  },
  ap<B>(wrappedFunctions: Logged<(a: A) => B>): Logged<B> {
    return logged(wrappedFunctions.log + log, wrappedFunctions.value(value))
  },
})

const Logged = {
  '@@type': 'Logged' as const,
  _shape: undefined as never,
  of: <A>(a: A): Logged<A> => logged('', a),
}

const journal = (ta: unknown): string =>
  (traverse(Logged as never)(((a: number) => logged(String(a), a)) as never)(
    ta as never,
  ) as unknown as Logged<unknown>)
    .log

const samplesByType = {
  'Array': [1, 2, 3],
  'Maybe.Just': just(1),
  'Maybe.Nothing': nothing<number>(),
  'Either.Right': right<string, number>(1),
  'Either.Left': left<string, number>('error'),
  'Identity': identity(1),
  'Pair': pair('log', 1),
}

const ok = (n: number) => just(n)

const small = (n: number) => n < 3 ? just(n) : nothing<number>()

interface Threaded<S, A>
  extends
    FunctorMethods<Threaded<S, A>, A, S>,
    ApplyMethods<Threaded<S, A>, A, S> {
  readonly '@@type': 'Threaded'
  readonly _shape: ThreadedShape
  readonly run: (s: S) => readonly [A, S]
  readonly _A?: (_: never) => A
  readonly _B?: (_: never) => S
}

interface ThreadedShape extends Shape<'Threaded'>, Widened {
  readonly out: Threaded<this['slotB'], this['slotA']>
  readonly like: ThreadedLike<this['slotA']>
}

interface ThreadedLike<A> {
  readonly run: (s: never) => readonly [A, unknown]
}

const threadedProto = {
  map<S, A, B>(this: Threaded<S, A>, f: (a: A) => B): Threaded<S, B> {
    return threaded<S, B>((s) => {
      const [a, next] = this.run(s)
      return [f(a), next]
    })
  },
  ap<S, A, B>(
    this: Threaded<S, A>,
    wrappedFunctions: Threaded<S, (a: A) => B>,
  ): Threaded<S, B> {
    return threaded<S, B>((s) => {
      const [f, afterF] = wrappedFunctions.run(s)
      const [a, afterA] = this.run(afterF)
      return [f(a), afterA]
    })
  },
}

const threaded = <S, A>(run: (s: S) => readonly [A, S]): Threaded<S, A> =>
  Object.assign(Object.create(threadedProto) as Threaded<S, A>, {
    '@@type': 'Threaded' as const,
    run,
  })

const Threaded = {
  '@@type': 'Threaded' as const,
  _shape: undefined as unknown as ThreadedShape,
  of: <A>(a: A) => threaded<unknown, A>((s) => [a, s]),
} as unknown as ApplicativeTypeRep<ThreadedShape, unknown>
