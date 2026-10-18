import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Pair } from '../../src/data/pair.ts'
import { size } from '../../src/classes/foldable.ts'
import { compose, semigroupoidNatives } from '../../src/classes/semigroupoid.ts'
import { just } from '../../src/data/maybe.ts'
import { pair } from '../../src/data/pair.ts'
import { toUpper, words } from '../../src/natives/string.ts'

test ('compose: runs the second function before the first', () => {
  assert.deepStrictEqual (compose ((n: number) => n * 10) ((n: number) => n + 1) (2), 30)
  assert.deepStrictEqual (compose ((n: number) => n + 1) ((n: number) => n * 10) (2), 21)
  assert.deepStrictEqual (compose (size) (words) ('one two three'), 3)
})

test ('compose: Pair as an arrow', () => {
  const arrow = compose (pair ('b' as const, 'c' as const)) (
    pair ('a' as const, 'b' as const),
  )
  typed<Pair<'a', 'c'>> () (arrow, true)
  assert.deepStrictEqual ([arrow.fst, arrow.snd], ['a', 'c'])

  const chained = compose (compose (pair (2, 3)) (pair (1, 2))) (pair (0, 1))
  typed<Pair<number, number>> () (chained, true)
  assert.deepStrictEqual ([chained.fst, chained.snd], [0, 3])
})

test ('compose: Pair does not require Semigroup at the ends', () => {
  const c = compose (pair (2, 3)) (pair (1, 2))
  assert.deepStrictEqual ([c.fst, c.snd], [1, 3])
})

test ('compose: associativity law across supported types', () => {
  const lhsFn = compose (compose (str) (big)) (len)
  const rhsFn = compose (str) (compose (big) (len))
  for (const s of ['', 'ab', 'abcd']) assert.deepStrictEqual (lhsFn (s), rhsFn (s))

  const a1 = pair ('a' as const, 'b' as const)
  const a2 = pair ('b' as const, 'c' as const)
  const a3 = pair ('c' as const, 'd' as const)
  assert.deepStrictEqual (compose (compose (a3) (a2)) (a1), compose (a3) (compose (a2) (a1)))
})

test ('compose: rejects values without Semigroupoid', () => {
  assert.throws (
    () => compose ((n: number) => n) ([1, 2, 3] as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('compose: Array has no Semigroupoid'),
  )
  assert.throws (
    () => compose ((n: number) => n) (just (1) as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('compose: Maybe has no Semigroupoid'),
  )
})

test ('compose: the type of a function composition is inferred exactly', () => {
  const wordCount = compose (size) (words)
  typed<(i: string) => number> () (wordCount, true)

  const shout = compose (toUpper) ((values: readonly string[]) =>
    values.join (' '),
  )
  typed<(i: readonly string[]) => string> () (shout, true)
  assert.deepStrictEqual (shout (['ab', 'cd']), 'AB CD')

  const deep = compose (compose (big) (len)) ((values: readonly string[]) =>
    values.join (''),
  )
  typed<(i: readonly string[]) => boolean> () (deep, true)
  assert.deepStrictEqual (deep (['a', 'b']), false)
  assert.deepStrictEqual (deep (['abc', 'd']), true)
})

test ('compose: the ends of the arrows must meet', () => {
  // @ts-expect-error the output of g is boolean, the input of f is number
  const bad1 = compose ((n: number) => String (n)) ((s: string) => s.length > 2)
  // @ts-expect-error snd of g is number, fst of f is string
  const bad2 = compose (pair ('text' as const, 1)) (pair ('a' as const, 99))
  // @ts-expect-error the output of g is string, the input of f is readonly string[]
  const bad3 = compose (size) ((n: number) => String (n))
  void bad1, bad2, bad3
})

test ('compose: widening one end does not glue arrows that do not meet', () => {
  const toB = pair ('a' as const, 'b' as const)
  const fromWide = compose (pair ('b' as 'b' | 'c', 'z' as const))
  // @ts-expect-error snd of g is 'b', fst of f is the wider 'b' | 'c'
  const wider = fromWide (toB)

  const toWide = pair ('a' as const, 'b' as 'b' | 'c')
  const fromB = compose (pair ('b' as const, 'z' as const))
  // @ts-expect-error snd of g is the wider 'b' | 'c', fst of f is 'b'
  const narrower = fromB (toWide)

  void wider, narrower
})

test ('compose: a consumed end may be widened, a carried one may not', () => {
  const wide = compose ((x: string) => x.length) ((_n: number): 'b' => 'b')
  typed<(i: number) => number> () (wide, true)
  assert.deepStrictEqual (wide (1), 1)

  // @ts-expect-error the output of g is wider than the input of f
  const bad = compose ((x: 'b') => x.length) ((_n: number): 'b' | 'c' => 'b')
  void bad
})

test ('compose: both arrows must be in one category', () => {
  const arrowFn = (_s: string): 'b' => 'b'
  const fromPair = compose (pair ('b' as const, 'z' as const))
  // @ts-expect-error a Pair arrow cannot be composed onto a function
  const mixed = fromPair (arrowFn)

  const toPair = pair ('a' as const, 'b' as const)
  const fromFn = compose ((x: 'b') => x.length)
  // @ts-expect-error a function cannot be composed onto a Pair arrow
  const mixedBack = fromFn (toPair)

  void mixed, mixedBack
})

test ('compose: an unsound first arrow does not pass the type check', () => {
  // @ts-expect-error an array does not inhabit Semigroupoid
  const bad = compose ([1, 2, 3]) ((n: number) => n + 1)
  void bad
})

test ('semigroupoidNatives: provides only Fn operations', () => {
  assert.deepStrictEqual (Object.keys (semigroupoidNatives), ['Fn'])
  assert.deepStrictEqual (typeof semigroupoidNatives.Fn.compose, 'function')
})

type Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false

const typed = <Want>() => <Got>(_value: Got, _same: Eq<Got, Want>): void => {}

const len = (s: string) => s.length

const big = (n: number) => n > 2

const str = (b: boolean) => String (b)
