import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Step } from '../../src/classes/chainrec.ts'
import { of } from '../../src/classes/applicative.ts'
import { chain } from '../../src/classes/chain.ts'
import { chainRec, chainRecNatives, done, loop } from '../../src/classes/chainrec.ts'
import { Identity } from '../../src/data/identity.ts'
import { Maybe } from '../../src/data/maybe.ts'
import { Pair } from '../../src/data/pair.ts'
import { Arr } from '../../src/natives/array.ts'
import { Fn } from '../../src/natives/function.ts'
import { Sets } from '../../src/natives/set.ts'

test ('loop: requests another chainRec step with the supplied value as its next input', () => {
  assert.deepStrictEqual (loop (1), { tag: 'loop', value: 1 })
  assert.deepStrictEqual (loop<string, number> ('more'), { tag: 'loop', value: 'more' })
})

test ('done: finishes a chainRec branch with the supplied result', () => {
  assert.deepStrictEqual (done ('x'), { tag: 'done', value: 'x' })
  assert.deepStrictEqual (done<number, number> (0), { tag: 'done', value: 0 })
})

test ('chainRec: the traversal goes depth-first, left to right', () => {
  assert.deepStrictEqual (chainRec (Arr, tree, 0), [
    'd0',
    'd1',
    'd2',
    'leaf3',
    'leaf12',
    'leaf11',
    'leaf10',
  ])
  assert.deepStrictEqual (chainRec (Arr, tree, 0), viaRecursion (0))
})

test ('chainRec: matches recursive chain across branching patterns', () => {
  for (let i = 0; i < shapes.length; i++) {
    const f = shapes[i]

    assert.deepStrictEqual (
      chainRec (Arr, (n: number) => [...f (n)], 0),
      viaChain (Arr, (n: number) => [...f (n)], 0),
      `Array, tree #${i}`,
    )
  }
})

test ('chainRec: repeats a step function without growing the call stack', () => {
  const upTo3 = (n: number): Step<number, number>[] =>
    n < 3 ? [loop (n + 1)] : [done (n)]

  assert.deepStrictEqual (chainRec (Arr, upTo3, 0), [3])
})

test ('chainRec: completes 200,000 steps without overflowing the stack', () => {
  const n = 200_000
  const linear = (i: number): Step<number, number>[] =>
    i < n ? [loop (i + 1)] : [done (i)]

  assert.deepStrictEqual (chainRec (Arr, linear, 0), [n])
})

test ('recursive chain: overflows the stack on the same 200,000 steps', () => {
  const n = 200_000
  const linear = (i: number): Step<number, number>[] =>
    i < n ? [loop (i + 1)] : [done (i)]

  assert.throws (() => viaChain (Arr, linear, 0), RangeError)
})

test ('chainRec: rejects values without ChainRec', () => {
  const f = (n: number) => [done<number, number> (n)]

  assert.throws (
    () => chainRec (Maybe as never, f as never, 0 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('chainRec: Maybe has no ChainRec'),
  )
  assert.throws (
    () => chainRec (Pair as never, f as never, 0 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('chainRec: Pair has no ChainRec'),
  )
  assert.throws (
    () => chainRec (Identity as never, f as never, 0 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('chainRec: Identity has no ChainRec'),
  )
  assert.throws (
    () => chainRec (Sets as never, f as never, 0 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('chainRec: Set has no ChainRec'),
  )
  assert.throws (
    () => chainRec (Fn as never, f as never, 0 as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('chainRec: Fn has no ChainRec'),
  )
})

test ('chainRec: Array passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return [done<number, number> (0)]
  }

  chainRec (Arr, recordArguments, 0)

  assert.deepStrictEqual (calls, [[0]])
})

test ('chainRecNatives: lists the supported native implementations', () => {
  assert.deepStrictEqual (new Set (Object.keys (chainRecNatives)), new Set (['Array']))
  assert.deepStrictEqual (chainRecNatives.Array['@@type'], 'Array')
  assert.deepStrictEqual (chainRecNatives.Array.chainRec (tree, 0), viaRecursion (0))
})

const tree = (n: number): Step<number, string>[] =>
  n >= 3 ? [done (`leaf${n}`)] : [done (`d${n}`), loop (n + 1), loop (n + 10)]

function viaRecursion(value: number): string[] {
  function followStep(step: Step<number, string>): string[] {
    if (step.tag === 'done') return [step.value]
    return viaRecursion (step.value)
  }

  return tree (value).flatMap (followStep)
}

function viaChain(
  T: unknown,
  next: (value: number) => unknown,
  initial: number,
): unknown {
  function followStep(step: Step<number, unknown>) {
    if (step.tag === 'done') return of (T as never) (step.value)
    return viaChain (T, next, step.value)
  }

  return chain (followStep) (next (initial) as never)
}

const shapes: readonly ((n: number) => readonly Step<number, number>[])[] = [
  (n) => n < 3 ? [loop (n + 1)] : [done (n)],
  (n) => n < 3 ? [done (n), loop (n + 1)] : [done (n * 100)],
  (n) => n < 3 ? [loop (n + 1), done (n), loop (n + 2)] : [done (-n)],
  (n) =>
    n < 4 ? [done (n), loop (n + 1), done (n * 2), loop (n + 2)] : [done (9000 + n)],
  (n) => n < 2 ? [loop (n + 1), loop (n + 1)] : [done (n), done (n + 1)],
  (n) => [done (n)],
  (n) => n < 5 ? [loop (n + 1), done (n)] : [done (n), done (n), done (n)],
  (n) => n < 3 ? [done (n), done (-n), loop (n + 1)] : [done (0)],
  (n) => n < 6 ? [loop (n + 2), done (n)] : [done (n * 7)],
  (n) => n < 3 ? [loop (n + 1), loop (n + 2), done (n)] : [done (n + 50)],
]
