/**
 * Compose functions into pipelines and adapt their arguments.
 */

import type { ApplicativeDict } from '../classes/applicative.ts'
import type { ApplyDict } from '../classes/apply.ts'
import type { CategoryDict } from '../classes/category.ts'
import type { Chain, ChainDict } from '../classes/chain.ts'
import type { CheckableDict } from '../classes/checkable.ts'
import type { ContravariantDict } from '../classes/contravariant.ts'
import type { Foldable } from '../classes/foldable.ts'
import type { FunctorDict } from '../classes/functor.ts'
import type { ProfunctorDict } from '../classes/profunctor.ts'
import type { SemigroupoidDict } from '../classes/semigroupoid.ts'
import type { ShowDict } from '../classes/show.ts'
import type {
  BothB,
  KindOf,
  SameTypeAs,
  SlotAOf,
  SlotBOf,
} from '../core/kind.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { Matchable, Shape } from '../core/shape.ts'
import { chain } from '../classes/chain.ts'
import { reduce } from '../classes/foldable.ts'

/** The shape for functions. */
export interface FnShape extends Shape<'Fn'>, Matchable {
  readonly slotBVariance: 'in'
  readonly out: (i: this['slotB']) => this['slotA']
  readonly like: (i: never) => this['slotA']
  readonly readA: this['val'] extends (i: never) => infer O ? O : never
  readonly readB: this['val'] extends (i: infer I) => unknown ? I : never
}

/** A function from input type `I` to output type `O`. */
export type Fn<I, O> = (i: I) => O

/** The type of the `Fn` representative. */
export type FnDict =
  & NativeTypeRep<FnShape>
  & ApplicativeDict<FnShape>
  & ApplyDict<FnShape>
  & CategoryDict<FnShape>
  & ChainDict<FnShape>
  & CheckableDict<FnShape>
  & ContravariantDict<FnShape>
  & FunctorDict<FnShape>
  & ProfunctorDict<FnShape>
  & SemigroupoidDict<FnShape>
  & ShowDict<FnShape>

/**
 * The function representative.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.of (P.Fn) ('ready') (123) // => 'ready'
 * P.id (P.Fn) (42) // => 42
 * ```
 */
export const Fn: FnDict = {
  '@@type': 'Fn' as const,
  _shape: undefined as unknown as FnShape,
  is(x: unknown): x is (...a: unknown[]) => unknown {
    return typeof x === 'function'
  },
  of<A>(a: A) {
    return (_: unknown): A => a
  },
  ap<I, A, B>(g: (i: I) => A, h: (i: I) => (a: A) => B) {
    return (i: I): B => h (i) (g (i))
  },
  id<A>() {
    return (a: A): A => a
  },
  chain<I, A, B>(g: (i: I) => A, f: (a: A) => (i: I) => B) {
    return (i: I): B => f (g (i)) (i)
  },
  contramap<I, J, A>(g: (i: I) => A, f: (j: J) => I) {
    return (j: J): A => g (f (j))
  },
  map<I, A, B>(g: (i: I) => A, f: (a: A) => B) {
    return (i: I): B => f (g (i))
  },
  promap<I, J, A, B>(g: (i: I) => A, before: (j: J) => I, after: (a: A) => B) {
    return (j: J): B => after (g (before (j)))
  },
  compose<I, A, B>(g: (i: I) => A, f: (a: A) => B) {
    return (i: I): B => f (g (i))
  },
  show(f: (i: never) => unknown): string {
    return String (f)
  },
}

/**
 * Returns its argument unchanged.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.I ('foo') // => 'foo'
 * ```
 */
export function I<A>(a: A): A {
  return a
}

/**
 * Creates a function that always returns the supplied value.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.K ('foo') ('bar') // => 'foo'
 * P.K ('foo') () // => 'foo'
 * P.map (P.K (42)) ([0, 1, 2, 3, 4]) // => [42, 42, 42, 42, 42]
 * ```
 */
export function K<A>(a: A) {
  return (_b?: unknown): A => a
}

/**
 * Passes a value to a function supplied afterward.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.T (42) (P.add (1)) // => 43
 * P.map<(n: number) => number, number> (P.T (100)) ([P.add (1), Math.sqrt])
 * // => [101, 10]
 * ```
 */
export function T<A>(a: A) {
  return <B>(f: Fn<A, B>): B => f (a)
}

/**
 * Calls a function for its side effects, then returns the input unchanged.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const seen: number[] = []
 * P.map (P.tap ((n: number) => seen.push (n))) ([1, 2, 3]) // => [1, 2, 3]
 * seen // => [1, 2, 3]
 * ```
 */
export function tap<A>(f: (a: A) => unknown) {
  return (a: A): A => {
    f (a)
    return a
  }
}

/**
 * Calls the function at most once and reuses its result, ignoring later arguments.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const next = P.once ((n: number) => n + 1)
 * next (1) // => 2
 * next (9) // => 2
 * ```
 */
export function once<Args extends unknown[], B>(f: (...args: Args) => B) {
  let called = false
  let answer: B
  return (...args: Args): B => {
    if (!called) {
      called = true
      answer = f (...args)
    }
    return answer
  }
}

/**
 * Transforms both inputs before applying a curried two-argument function.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.on (P.concat) (P.reverse) ([1, 2, 3]) ([4, 5, 6]) // => [3, 2, 1, 6, 5, 4]
 * ```
 */
export function on<B, C>(f: Fn<B, Fn<B, C>>) {
  return <A>(g: Fn<A, B>) => (x: A) => (y: A): C => f (g (x)) (g (y))
}

/** A single-argument function accepted as a step in `pipe` or `pipeK`. */
export type AnyFn = Fn<never, unknown>

type LastOf<Gs> = Gs extends readonly [...unknown[], infer G] ? G : never

type SameTypesAs<F, Gs extends readonly unknown[]> = Gs extends
  readonly [infer G, ...infer Rest extends readonly unknown[]]
  ? SameTypeAs<G, F> & SameTypesAs<F, Rest>
  : unknown

type BothBs<F, B, Gs extends readonly unknown[]> = Gs extends
  readonly [infer G, ...infer Rest extends readonly unknown[]]
  ? BothBs<F, BothB<F, B, SlotBOf<G>>, Rest>
  : B

type PipedK<A, Gs extends readonly unknown[]> =
  <F extends Chain<F, A> & SameTypesAs<F, Gs>>(mx: F) =>
    KindOf<F, SlotAOf<LastOf<Gs>>, BothBs<F, SlotBOf<F>, Gs>>

const foldFns = (
  fs: Foldable<unknown, AnyFn>,
  step: (acc: unknown, f: Fn<unknown, unknown>) => unknown,
  init: unknown,
): unknown =>
  (reduce as (
    f: unknown,
  ) => (init: unknown) => (fa: unknown) => unknown) (step) (init) (fs)

const chainWith = (f: Fn<unknown, unknown>) => (mx: unknown): unknown =>
  (chain as (g: unknown) => (fa: unknown) => unknown) (f) (mx)

/**
 * Passes an input through functions in order, from left to right.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.pipe (P.add (1), Math.sqrt, P.sub (1)) (99) // => 9
 * P.pipe ((s: string) => s.length, P.add (1)) ('abc') // => 4
 * ```
 */
export function pipe(): <A>(a: A) => A
export function pipe<A, B>(ab: Fn<A, B>): (a: A) => B
export function pipe<A, B, C>(
  ab: Fn<A, B>, bc: Fn<B, C>,
): (a: A) => C
export function pipe<A, B, C, D>(
  ab: Fn<A, B>, bc: Fn<B, C>, cd: Fn<C, D>,
): (a: A) => D
export function pipe<A, B, C, D, E>(
  ab: Fn<A, B>, bc: Fn<B, C>, cd: Fn<C, D>, de: Fn<D, E>,
): (a: A) => E
export function pipe<A, B, C, D, E, F>(
  ab: Fn<A, B>, bc: Fn<B, C>, cd: Fn<C, D>, de: Fn<D, E>, ef: Fn<E, F>,
): (a: A) => F
export function pipe<A, B, C, D, E, F, G>(
  ab: Fn<A, B>, bc: Fn<B, C>, cd: Fn<C, D>, de: Fn<D, E>, ef: Fn<E, F>, fg: Fn<F, G>,
): (a: A) => G
export function pipe<A, B, C, D, E, F, G, H>(
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
  gh: Fn<G, H>,
): (a: A) => H
export function pipe<A, B, C, D, E, F, G, H, I>(
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
  gh: Fn<G, H>,
  hi: Fn<H, I>,
): (a: A) => I
export function pipe<A, B, C, D, E, F, G, H, I, J>(
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
  gh: Fn<G, H>,
  hi: Fn<H, I>,
  ij: Fn<I, J>,
): (a: A) => J
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
  gh: Fn<G, H>,
  hi: Fn<H, I>,
  ij: Fn<I, J>,
  jk: Fn<J, K>,
): (a: A) => K
export function pipe(...fns: AnyFn[]) {
  return <A = unknown, B = unknown>(x: A): B => foldFns (fns, (acc, f) => f (acc), x) as B
}

/**
 * Chains functions over a wrapped input from left to right.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.pipeK (P.tail, P.tail, P.head) (P.just ([1, 2, 3, 4])) // => Just (3)
 * ```
 */
export function pipeK(): <F>(mx: F) => F
export function pipeK<A, G1>(g1: Fn<A, G1>): PipedK<A, [G1]>
export function pipeK<A, G1, G2>(
  g1: Fn<A, G1>, g2: Fn<SlotAOf<G1>, G2>,
): PipedK<A, [G1, G2]>
export function pipeK<A, G1, G2, G3>(
  g1: Fn<A, G1>,
  g2: Fn<SlotAOf<G1>, G2>,
  g3: Fn<SlotAOf<G2>, G3>,
): PipedK<A, [G1, G2, G3]>
export function pipeK<A, G1, G2, G3, G4>(
  g1: Fn<A, G1>,
  g2: Fn<SlotAOf<G1>, G2>,
  g3: Fn<SlotAOf<G2>, G3>,
  g4: Fn<SlotAOf<G3>, G4>,
): PipedK<A, [G1, G2, G3, G4]>
export function pipeK<A, G1, G2, G3, G4, G5>(
  g1: Fn<A, G1>,
  g2: Fn<SlotAOf<G1>, G2>,
  g3: Fn<SlotAOf<G2>, G3>,
  g4: Fn<SlotAOf<G3>, G4>,
  g5: Fn<SlotAOf<G4>, G5>,
): PipedK<A, [G1, G2, G3, G4, G5]>
export function pipeK<A, G1, G2, G3, G4, G5, G6>(
  g1: Fn<A, G1>,
  g2: Fn<SlotAOf<G1>, G2>,
  g3: Fn<SlotAOf<G2>, G3>,
  g4: Fn<SlotAOf<G3>, G4>,
  g5: Fn<SlotAOf<G4>, G5>,
  g6: Fn<SlotAOf<G5>, G6>,
): PipedK<A, [G1, G2, G3, G4, G5, G6]>
export function pipeK<A, G1, G2, G3, G4, G5, G6, G7>(
  g1: Fn<A, G1>,
  g2: Fn<SlotAOf<G1>, G2>,
  g3: Fn<SlotAOf<G2>, G3>,
  g4: Fn<SlotAOf<G3>, G4>,
  g5: Fn<SlotAOf<G4>, G5>,
  g6: Fn<SlotAOf<G5>, G6>,
  g7: Fn<SlotAOf<G6>, G7>,
): PipedK<A, [G1, G2, G3, G4, G5, G6, G7]>
export function pipeK<A, G1, G2, G3, G4, G5, G6, G7, G8>(
  g1: Fn<A, G1>,
  g2: Fn<SlotAOf<G1>, G2>,
  g3: Fn<SlotAOf<G2>, G3>,
  g4: Fn<SlotAOf<G3>, G4>,
  g5: Fn<SlotAOf<G4>, G5>,
  g6: Fn<SlotAOf<G5>, G6>,
  g7: Fn<SlotAOf<G6>, G7>,
  g8: Fn<SlotAOf<G7>, G8>,
): PipedK<A, [G1, G2, G3, G4, G5, G6, G7, G8]>
export function pipeK<A, G1, G2, G3, G4, G5, G6, G7, G8, G9>(
  g1: Fn<A, G1>,
  g2: Fn<SlotAOf<G1>, G2>,
  g3: Fn<SlotAOf<G2>, G3>,
  g4: Fn<SlotAOf<G3>, G4>,
  g5: Fn<SlotAOf<G4>, G5>,
  g6: Fn<SlotAOf<G5>, G6>,
  g7: Fn<SlotAOf<G6>, G7>,
  g8: Fn<SlotAOf<G7>, G8>,
  g9: Fn<SlotAOf<G8>, G9>,
): PipedK<A, [G1, G2, G3, G4, G5, G6, G7, G8, G9]>
export function pipeK<A, G1, G2, G3, G4, G5, G6, G7, G8, G9, G10>(
  g1: Fn<A, G1>,
  g2: Fn<SlotAOf<G1>, G2>,
  g3: Fn<SlotAOf<G2>, G3>,
  g4: Fn<SlotAOf<G3>, G4>,
  g5: Fn<SlotAOf<G4>, G5>,
  g6: Fn<SlotAOf<G5>, G6>,
  g7: Fn<SlotAOf<G6>, G7>,
  g8: Fn<SlotAOf<G7>, G8>,
  g9: Fn<SlotAOf<G8>, G9>,
  g10: Fn<SlotAOf<G9>, G10>,
): PipedK<A, [G1, G2, G3, G4, G5, G6, G7, G8, G9, G10]>
export function pipeK(...fns: AnyFn[]) {
  return <F = unknown, B = unknown>(mx: F): B =>
    foldFns (fns, (acc, f) => chainWith (f) (acc), mx) as B
}

/**
 * Converts a two-argument function into consecutive one-argument calls.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const sum2 = (a: number, b: number) => a + b
 *
 * P.curry2 (sum2) (1) (2) // => 3
 * ```
 */
export function curry2<A, B, C>(f: (a: A, b: B) => C) {
  return (a: A) => (b: B): C => f (a, b)
}

/**
 * Converts a three-argument function into consecutive one-argument calls.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const pin = (lo: number, hi: number, n: number) =>
 *   Math.min (hi, Math.max (lo, n))
 *
 * P.curry3 (pin) (0) (10) (99) // => 10
 * ```
 */
export function curry3<A, B, C, D>(f: (a: A, b: B, c: C) => D) {
  return (a: A) => (b: B) => (c: C): D => f (a, b, c)
}

/**
 * Converts a four-argument function into consecutive one-argument calls.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const sum4 = (a: number, b: number, c: number, d: number) => a + b + c + d
 *
 * P.curry4 (sum4) (1) (2) (3) (4) // => 10
 * ```
 */
export function curry4<A, B, C, D, E>(f: (a: A, b: B, c: C, d: D) => E) {
  return (a: A) => (b: B) => (c: C) => (d: D): E => f (a, b, c, d)
}

/**
 * Converts a five-argument function into consecutive one-argument calls.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const sum5 = (a: number, b: number, c: number, d: number, e: number) =>
 *   a + b + c + d + e
 *
 * P.curry5 (sum5) (1) (2) (3) (4) (5) // => 15
 * ```
 */
export function curry5<A, B, C, D, E, F>(f: (a: A, b: B, c: C, d: D, e: E) => F) {
  return (a: A) => (b: B) => (c: C) => (d: D) => (e: E): F => f (a, b, c, d, e)
}
