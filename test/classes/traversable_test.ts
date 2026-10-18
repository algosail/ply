import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ApplicativeTypeRep } from '../../src/classes/applicative.ts'
import type { ApplyMethods } from '../../src/classes/apply.ts'
import type { FunctorMethods } from '../../src/classes/functor.ts'
import type { Shape, Widened } from '../../src/core/shape.ts'
import { foldMap, toArray } from '../../src/classes/foldable.ts'
import { map } from '../../src/classes/functor.ts'
import { sequence, traversableNatives, traverse } from '../../src/classes/traversable.ts'
import { Either, left, right } from '../../src/data/either.ts'
import { Identity, identity } from '../../src/data/identity.ts'
import { just, Maybe, nothing } from '../../src/data/maybe.ts'
import { Concat } from '../../src/data/monoid.ts'
import { pair } from '../../src/data/pair.ts'
import { Arr } from '../../src/natives/array.ts'

test ('traverse: transforms values into a chosen wrapper and collects them inside one result', () => {
  assert.deepStrictEqual (traverse (Maybe) (ok) ([1, 2, 3]), just ([1, 2, 3]))
  assert.deepStrictEqual (traverse (Maybe) (ok) (just (1)), just (just (1)))
  assert.deepStrictEqual (
    traverse (Maybe) (ok) (right<string, number> (1)),
    just (right<string, number> (1)),
  )
  assert.deepStrictEqual (traverse (Maybe) (ok) (identity (1)), just (identity (1)))
  assert.deepStrictEqual (
    traverse (Maybe) (ok) (pair ('log', 1)),
    just (pair ('log', 1)),
  )
})

test ('traverse: any Nothing or Left makes the result fail', () => {
  assert.deepStrictEqual (traverse (Maybe) (small) ([1, 2, 3]), nothing ())
  assert.deepStrictEqual (traverse (Maybe) (small) (just (5)), nothing ())
})

test ('traverse: the effects go left to right across supported types', () => {
  assert.deepStrictEqual (journal ([1, 2, 3]), '123')
  assert.deepStrictEqual (journal (just (1)), '1')
  assert.deepStrictEqual (journal (identity (1)), '1')
  assert.deepStrictEqual (journal (pair ('log', 1)), '1')
  assert.deepStrictEqual (journal (nothing<number> ()), '')
  assert.deepStrictEqual (journal (left<string, number> ('error')), '')
})

test ('traverse: preserves the first Left error', () => {
  const boom = (n: number) =>
    n < 0 ? left<string, number> ('err' + n) : right<string, number> (n)

  assert.deepStrictEqual (
    traverse (Either) (boom) ([-1, 2, -3]),
    left<string, number[]> ('err-1'),
  )
  assert.deepStrictEqual (
    traverse (Either) (boom) ([1, -2, -3]),
    left<string, number[]> ('err-2'),
  )
  assert.deepStrictEqual (
    traverse (Either) (boom) ([1, 2, -3]),
    left<string, number[]> ('err-3'),
  )
})

test ('sequence: turns a collection of wrapped values into one wrapped collection', () => {
  assert.deepStrictEqual (sequence (Maybe) ([just (1), just (2)]), just ([1, 2]))
  assert.deepStrictEqual (
    sequence (Maybe) ([just (1), nothing<number> ()]),
    nothing (),
  )
  assert.deepStrictEqual (sequence (Maybe) (identity (just (1))), just (identity (1)))
  assert.deepStrictEqual (
    sequence (Either) (identity (right<string, number> (1))),
    right<string, Identity<number>> (identity (1)),
  )
})

test ('sequence: the Array applicative gives the product', () => {
  assert.deepStrictEqual (sequence (Arr) ([[1, 2], [3, 4]]), [
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
  ])
  const triple = sequence (Arr) ([[1, 2], [3, 4], [5, 6]])

  assert.deepStrictEqual (triple.length, 8)
  assert.deepStrictEqual (triple[0], [1, 3, 5])
  assert.deepStrictEqual (triple[1], [1, 3, 6])
})

test ('sequence: the native applicative Arr is accepted with no cast', () => {
  const collapsed: number[][] = sequence (Arr) ([[1, 2]])

  assert.deepStrictEqual (collapsed, [[1], [2]])
})

test ('traverse: into the Array applicative it passes from every type', () => {
  const both = (n: number) => [n, -n]

  assert.deepStrictEqual (traverse (Arr) (both) ([1, 2]), [
    [1, 2],
    [1, -2],
    [-1, 2],
    [-1, -2],
  ])
  assert.deepStrictEqual (traverse (Arr) (both) (pair ('x', 1)), [
    pair ('x', 1),
    pair ('x', -1),
  ])
  assert.deepStrictEqual (traverse (Arr) (both) (identity (1)), [
    identity (1),
    identity (-1),
  ])
  assert.deepStrictEqual (traverse (Arr) (both) (just (1)), [just (1), just (-1)])
  assert.deepStrictEqual (
    traverse (Arr) (both) (right<string, number> (1)),
    [right<string, number> (1), right<string, number> (-1)],
  )
})

test ('sequence takes a type whose slot is in input position', () => {
  const tick = threaded<number, number> ((s) => [s * 2, s + 1])
  const both = sequence (Threaded) ([tick, tick]) as unknown as Threaded<
    number,
    number[]
  >

  assert.deepStrictEqual (both.run (3), [[6, 8], 5])

  function labelAndAdvance(n: number) {
    return threaded<number, string> ((s) => [`${n}`, s + 1])
  }

  const labelled = traverse (Threaded) (labelAndAdvance) ([
    1,
    2,
    3,
  ]) as unknown as Threaded<number, string[]>

  assert.deepStrictEqual (labelled.run (0), [['1', '2', '3'], 3])
})

test ('traverse: the order coincides with the Foldable traversal', () => {
  for (const [name, ta] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (journal (ta), foldMap (Concat) (String) (ta), name)
    assert.deepStrictEqual (
      journal (ta),
      (toArray (ta) as number[]).join (''),
      name,
    )
  }
})

test ('traverse: identity law', () => {
  for (const [name, ta] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (
      traverse (Identity) (identity) (ta),
      identity (ta),
      name,
    )
  }
})

test ('traverse: the naturality law', () => {
  const t = (m: unknown): unknown[] => toArray (m as never)
  for (const [name, ta] of Object.entries (samplesByType)) {
    for (const f of [ok, small]) {
      assert.deepStrictEqual (
        t (traverse (Maybe) (f) (ta as never)),
        traverse (Arr) (((a: number) => t (f (a))) as never) (ta as never),
        `${name} / ${f === ok ? 'no refusal' : 'with a refusal'}`,
      )
    }
  }
})

test ('traverse: agrees with map', () => {
  const f = (n: number) => n * 10
  for (const [name, ta] of Object.entries (samplesByType)) {
    assert.deepStrictEqual (
      traverse (Identity) ((n: number) => identity (f (n))) (ta),
      identity (map (f) (ta)),
      name,
    )
  }
})

test ('sequence: coincides with traverse of the identity across supported types', () => {
  for (const [name, ta] of Object.entries (samplesByType)) {
    const tb = map (ok) (ta)

    assert.deepStrictEqual (
      sequence (Maybe) (tb),
      traverse (Maybe) ((m: Maybe<number>) => m) (tb),
      name,
    )
  }
})

test ('traverse: wraps an empty structure without calling the callback', () => {
  let calls = 0

  function recordVisit(_n: number) {
    calls += 1
    return nothing<number> ()
  }

  assert.deepStrictEqual (
    traverse (Maybe) (recordVisit) (nothing<number> ()),
    just (nothing ()),
  )
  assert.deepStrictEqual (
    traverse (Maybe) (recordVisit) (left<string, number> ('error')),
    just (left<string, number> ('error')),
  )
  assert.deepStrictEqual (traverse (Maybe) (recordVisit) ([] as number[]), just ([]))
  assert.deepStrictEqual (calls, 0)
})

test ('traverse: Array passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return just (1)
  }

  traverse (Maybe) (recordArguments) ([1, 2, 3])

  assert.deepStrictEqual (calls, [[1], [2], [3]])
})

test ('traverse: Just passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return just (1)
  }

  traverse (Maybe) (recordArguments) (just (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('traverse: Nothing passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return just (1)
  }

  traverse (Maybe) (recordArguments) (nothing<number> ())

  assert.deepStrictEqual (calls, [])
})

test ('traverse: Right passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return just (1)
  }

  traverse (Maybe) (recordArguments) (right<string, number> (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('traverse: Left passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return just (1)
  }

  traverse (Maybe) (recordArguments) (left<string, number> ('error'))

  assert.deepStrictEqual (calls, [])
})

test ('traverse: Identity passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return just (1)
  }

  traverse (Maybe) (recordArguments) (identity (1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('traverse: Pair passes only its contained values', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return just (1)
  }

  traverse (Maybe) (recordArguments) (pair ('log', 1))

  assert.deepStrictEqual (calls, [[1]])
})

test ('traverse: rejects values without Traversable', () => {
  const strangers = {
    Set: new Set ([1, 2, 3]),
    Map: new Map ([['a', 1]]),
    StrMap: { a: 1 },
    String: 'text',
    Fn: (n: number) => n,
  }
  for (const [name, ta] of Object.entries (strangers)) {
    assert.throws (
      () => traverse (Maybe) (ok) (ta as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Traversable'),
      name,
    )
    assert.throws (
      () => sequence (Maybe) (ta as never),
      (error: unknown) => error instanceof TypeError && error.message.includes ('has no Traversable'),
      name,
    )
  }
})

test ('traverse: the failure comes before the callback is called', () => {
  let calls = 0

  assert.throws (() =>
    traverse (Maybe) (
      ((n: number) => {
        calls += 1
        return just (n)
      }) as never,
    ) (new Set ([1, 2]) as never),
  )
  assert.deepStrictEqual (calls, 0)
})

test ('sequence still rejects a Traversable of plain values', () => {
  // @ts-expect-error a number is not a member of the Array family
  const _flat = () => sequence (Arr) ([1, 2, 3])

  assert.deepStrictEqual (typeof _flat, 'function')
})

test ('traversableNatives: the only native type is Array', () => {
  assert.deepStrictEqual (Object.keys (traversableNatives), ['Array'])
})

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
    return logged (log, f (value))
  },
  ap<B>(wrappedFunctions: Logged<(a: A) => B>): Logged<B> {
    return logged (wrappedFunctions.log + log, wrappedFunctions.value (value))
  },
})

const Logged = {
  '@@type': 'Logged' as const,
  _shape: undefined as never,
  of: <A>(a: A): Logged<A> => logged ('', a),
}

const journal = (ta: unknown): string =>
  (traverse (Logged as never) (((a: number) => logged (String (a), a)) as never) (
    ta as never,
  ) as unknown as Logged<unknown>)
    .log

const samplesByType = {
  Array: [1, 2, 3],
  'Maybe.Just': just (1),
  'Maybe.Nothing': nothing<number> (),
  'Either.Right': right<string, number> (1),
  'Either.Left': left<string, number> ('error'),
  Identity: identity (1),
  Pair: pair ('log', 1),
}

const ok = (n: number) => just (n)

const small = (n: number) => n < 3 ? just (n) : nothing<number> ()

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
    return threaded<S, B> ((s) => {
      const [a, next] = this.run (s)
      return [f (a), next]
    })
  },
  ap<S, A, B>(
    this: Threaded<S, A>,
    wrappedFunctions: Threaded<S, (a: A) => B>,
  ): Threaded<S, B> {
    return threaded<S, B> ((s) => {
      const [f, afterF] = wrappedFunctions.run (s)
      const [a, afterA] = this.run (afterF)
      return [f (a), afterA]
    })
  },
}

const threaded = <S, A>(run: (s: S) => readonly [A, S]): Threaded<S, A> =>
  Object.assign (Object.create (threadedProto) as Threaded<S, A>, {
    '@@type': 'Threaded' as const,
    run,
  })

const Threaded = {
  '@@type': 'Threaded' as const,
  _shape: undefined as unknown as ThreadedShape,
  of: <A>(a: A) => threaded<unknown, A> ((s) => [a, s]),
} as unknown as ApplicativeTypeRep<ThreadedShape, unknown>
