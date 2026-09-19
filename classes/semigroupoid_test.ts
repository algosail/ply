import { assertEquals, assertThrows } from '@std/assert'
import { compose, semigroupoidNatives } from './semigroupoid.ts'
import { size } from './foldable.ts'
import { toUpper, words } from '../natives/string.ts'
import { pair } from '../data/pair.ts'
import type { Pair } from '../data/pair.ts'
import { just } from '../data/maybe.ts'

// Examples

Deno.test('compose: runs the second function before the first', () => {
  assertEquals(compose((n: number) => n * 10)((n: number) => n + 1)(2), 30)
  assertEquals(compose((n: number) => n + 1)((n: number) => n * 10)(2), 21)
  assertEquals(compose(size)(words)('one two three'), 3)
})

Deno.test('compose: Pair as an arrow', () => {
  const arrow = compose(pair('b' as const, 'c' as const))(
    pair('a' as const, 'b' as const),
  )
  typed<Pair<'a', 'c'>>()(arrow, true)
  assertEquals([arrow.fst, arrow.snd], ['a', 'c'])

  const chained = compose(compose(pair(2, 3))(pair(1, 2)))(pair(0, 1))
  typed<Pair<number, number>>()(chained, true)
  assertEquals([chained.fst, chained.snd], [0, 3])
})

Deno.test('compose: Pair does not require Semigroup at the ends', () => {
  const c = compose(pair(2, 3))(pair(1, 2))
  assertEquals([c.fst, c.snd], [1, 3])
})

// Laws

Deno.test('compose: associativity law across supported types', () => {
  const lhsFn = compose(compose(str)(big))(len)
  const rhsFn = compose(str)(compose(big)(len))
  for (const s of ['', 'ab', 'abcd']) assertEquals(lhsFn(s), rhsFn(s))

  const a1 = pair('a' as const, 'b' as const)
  const a2 = pair('b' as const, 'c' as const)
  const a3 = pair('c' as const, 'd' as const)
  assertEquals(compose(compose(a3)(a2))(a1), compose(a3)(compose(a2)(a1)))
})

// Edge cases

Deno.test('compose: rejects values without Semigroupoid', () => {
  // Bypass the type checker to verify the runtime error.
  assertThrows(
    () => compose((n: number) => n)([1, 2, 3] as never),
    TypeError,
    'compose: Array has no Semigroupoid',
  )
  assertThrows(
    () => compose((n: number) => n)(just(1) as never),
    TypeError,
    'compose: Maybe has no Semigroupoid',
  )
})

// Type checking

Deno.test('compose: the type of a function composition is inferred exactly', () => {
  const wordCount = compose(size)(words)
  typed<(i: string) => number>()(wordCount, true)

  const shout = compose(toUpper)((values: readonly string[]) =>
    values.join(' ')
  )
  typed<(i: readonly string[]) => string>()(shout, true)
  assertEquals(shout(['ab', 'cd']), 'AB CD')

  const deep = compose(compose(big)(len))((values: readonly string[]) =>
    values.join('')
  )
  typed<(i: readonly string[]) => boolean>()(deep, true)
  assertEquals(deep(['a', 'b']), false)
  assertEquals(deep(['abc', 'd']), true)
})

Deno.test('compose: the ends of the arrows must meet', () => {
  // @ts-expect-error the output of g is boolean, the input of f is number
  const bad1 = compose((n: number) => String(n))((s: string) => s.length > 2)
  // @ts-expect-error snd of g is number, fst of f is string
  const bad2 = compose(pair('text' as const, 1))(pair('a' as const, 99))
  // @ts-expect-error the output of g is string, the input of f is readonly string[]
  const bad3 = compose(size)((n: number) => String(n))
  void bad1, bad2, bad3
})

Deno.test('compose: widening one end does not glue arrows that do not meet', () => {
  const toB = pair('a' as const, 'b' as const)
  const fromWide = compose(pair('b' as 'b' | 'c', 'z' as const))
  // @ts-expect-error snd of g is 'b', fst of f is the wider 'b' | 'c'
  const wider = fromWide(toB)

  const toWide = pair('a' as const, 'b' as 'b' | 'c')
  const fromB = compose(pair('b' as const, 'z' as const))
  // @ts-expect-error snd of g is the wider 'b' | 'c', fst of f is 'b'
  const narrower = fromB(toWide)

  void wider, narrower
})

Deno.test('compose: a consumed end may be widened, a carried one may not', () => {
  const wide = compose((x: string) => x.length)((_n: number): 'b' => 'b')
  typed<(i: number) => number>()(wide, true)
  assertEquals(wide(1), 1)

  // @ts-expect-error the output of g is wider than the input of f
  const bad = compose((x: 'b') => x.length)((_n: number): 'b' | 'c' => 'b')
  void bad
})

Deno.test('compose: both arrows must be in one category', () => {
  const arrowFn = (_s: string): 'b' => 'b'
  const fromPair = compose(pair('b' as const, 'z' as const))
  // @ts-expect-error a Pair arrow cannot be composed onto a function
  const mixed = fromPair(arrowFn)

  const toPair = pair('a' as const, 'b' as const)
  const fromFn = compose((x: 'b') => x.length)
  // @ts-expect-error a function cannot be composed onto a Pair arrow
  const mixedBack = fromFn(toPair)

  void mixed, mixedBack
})

Deno.test('compose: an unsound first arrow does not pass the type check', () => {
  // @ts-expect-error an array does not inhabit Semigroupoid
  const bad = compose([1, 2, 3])((n: number) => n + 1)
  void bad
})

// Native operation tables

Deno.test('semigroupoidNatives: provides only Fn operations', () => {
  assertEquals(Object.keys(semigroupoidNatives), ['Fn'])
  assertEquals(typeof semigroupoidNatives.Fn.compose, 'function')
})

// Shared fixtures

type Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false

const typed = <Want>() => <Got>(_value: Got, _same: Eq<Got, Want>): void => {}

const len = (s: string) => s.length

const big = (n: number) => n > 2

const str = (b: boolean) => String(b)
