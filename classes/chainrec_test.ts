import { assertEquals, assertThrows } from '@std/assert'
import type { Step } from './chainrec.ts'
import { chainRec, chainRecNatives, done, loop } from './chainrec.ts'
import { chain } from './chain.ts'
import { of } from './applicative.ts'
import { Maybe } from '../data/maybe.ts'
import { Identity } from '../data/identity.ts'
import { Pair } from '../data/pair.ts'
import { Arr } from '../natives/array.ts'
import { Sets } from '../natives/set.ts'
import { Fn } from '../natives/function.ts'

// Examples

Deno.test('loop: requests another chainRec step with the supplied value as its next input', () => {
  assertEquals(loop(1), { tag: 'loop', value: 1 })
  assertEquals(loop<string, number>('more'), { tag: 'loop', value: 'more' })
})

Deno.test('done: finishes a chainRec branch with the supplied result', () => {
  assertEquals(done('x'), { tag: 'done', value: 'x' })
  assertEquals(done<number, number>(0), { tag: 'done', value: 0 })
})

Deno.test('chainRec: the traversal goes depth-first, left to right', () => {
  assertEquals(chainRec(Arr, tree, 0), [
    'd0',
    'd1',
    'd2',
    'leaf3',
    'leaf12',
    'leaf11',
    'leaf10',
  ])
  assertEquals(chainRec(Arr, tree, 0), viaRecursion(0))
})

Deno.test('chainRec: matches recursive chain across branching patterns', () => {
  for (let i = 0; i < shapes.length; i++) {
    const f = shapes[i]

    assertEquals(
      chainRec(Arr, (n: number) => [...f(n)], 0),
      viaChain(Arr, (n: number) => [...f(n)], 0),
      `Array, tree #${i}`,
    )
  }
})

// Edge cases

Deno.test('chainRec: repeats a step function without growing the call stack', () => {
  const upTo3 = (n: number): Step<number, number>[] =>
    n < 3 ? [loop(n + 1)] : [done(n)]

  assertEquals(chainRec(Arr, upTo3, 0), [3])
})

Deno.test('chainRec: completes 200,000 steps without overflowing the stack', () => {
  const n = 200_000
  const linear = (i: number): Step<number, number>[] =>
    i < n ? [loop(i + 1)] : [done(i)]

  assertEquals(chainRec(Arr, linear, 0), [n])
})

Deno.test('recursive chain: overflows the stack on the same 200,000 steps', () => {
  const n = 200_000
  const linear = (i: number): Step<number, number>[] =>
    i < n ? [loop(i + 1)] : [done(i)]

  assertThrows(() => viaChain(Arr, linear, 0), RangeError)
})

Deno.test('chainRec: rejects values without ChainRec', () => {
  // Bypass the type checker to verify the runtime error.
  const f = (n: number) => [done<number, number>(n)]

  assertThrows(
    () => chainRec(Maybe as never, f as never, 0 as never),
    TypeError,
    'chainRec: Maybe has no ChainRec',
  )
  assertThrows(
    () => chainRec(Pair as never, f as never, 0 as never),
    TypeError,
    'chainRec: Pair has no ChainRec',
  )
  assertThrows(
    () => chainRec(Identity as never, f as never, 0 as never),
    TypeError,
    'chainRec: Identity has no ChainRec',
  )
  assertThrows(
    () => chainRec(Sets as never, f as never, 0 as never),
    TypeError,
    'chainRec: Set has no ChainRec',
  )
  assertThrows(
    () => chainRec(Fn as never, f as never, 0 as never),
    TypeError,
    'chainRec: Fn has no ChainRec',
  )
})

Deno.test('chainRec: Array passes only the current value', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push(args)
    return [done<number, number>(0)]
  }

  chainRec(Arr, recordArguments, 0)

  assertEquals(calls, [[0]])
})

// Native operation tables

Deno.test('chainRecNatives: lists the supported native implementations', () => {
  // One native type inhabits the class: Set and Fn have no traversal.
  assertEquals(new Set(Object.keys(chainRecNatives)), new Set(['Array']))
  assertEquals(chainRecNatives.Array['@@type'], 'Array')
  assertEquals(chainRecNatives.Array.chainRec(tree, 0), viaRecursion(0))
})

// Shared fixtures

const tree = (n: number): Step<number, string>[] =>
  n >= 3 ? [done(`leaf${n}`)] : [done(`d${n}`), loop(n + 1), loop(n + 10)]

function viaRecursion(value: number): string[] {
  function followStep(step: Step<number, string>): string[] {
    if (step.tag === 'done') return [step.value]
    return viaRecursion(step.value)
  }

  return tree(value).flatMap(followStep)
}

function viaChain(
  T: unknown,
  next: (value: number) => unknown,
  initial: number,
): unknown {
  function followStep(step: Step<number, unknown>) {
    if (step.tag === 'done') return of(T as never)(step.value)
    return viaChain(T, next, step.value)
  }

  return chain(followStep)(next(initial) as never)
}

const shapes: readonly ((n: number) => readonly Step<number, number>[])[] = [
  (n) => n < 3 ? [loop(n + 1)] : [done(n)],
  (n) => n < 3 ? [done(n), loop(n + 1)] : [done(n * 100)],
  (n) => n < 3 ? [loop(n + 1), done(n), loop(n + 2)] : [done(-n)],
  (n) =>
    n < 4 ? [done(n), loop(n + 1), done(n * 2), loop(n + 2)] : [done(9000 + n)],
  (n) => n < 2 ? [loop(n + 1), loop(n + 1)] : [done(n), done(n + 1)],
  (n) => [done(n)],
  (n) => n < 5 ? [loop(n + 1), done(n)] : [done(n), done(n), done(n)],
  (n) => n < 3 ? [done(n), done(-n), loop(n + 1)] : [done(0)],
  (n) => n < 6 ? [loop(n + 2), done(n)] : [done(n * 7)],
  (n) => n < 3 ? [loop(n + 1), loop(n + 2), done(n)] : [done(n + 50)],
]
