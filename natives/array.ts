/**
 * Create, search, group, and transform arrays.
 * Use `Arr` with operations such as `of`, `empty`, and `traverse`.
 *
 * @module
 */

import type { NativeTypeRep } from '../core/named.ts'
import type { Matchable, Shape } from '../core/shape.ts'
import type { KindOf, ShapeOf, SlotAOf, SlotBOf } from '../core/kind.ts'
import type { AltDict } from '../classes/alt.ts'
import type {
  ApplicativeDict,
  ApplicativeTypeRep,
} from '../classes/applicative.ts'
import type { ApplyDict, ApplyMethods } from '../classes/apply.ts'
import type { ChainDict } from '../classes/chain.ts'
import type { ChainRecDict, Step } from '../classes/chainrec.ts'
import type { FilterableDict } from '../classes/filterable.ts'
import type { FoldableDict } from '../classes/foldable.ts'
import type { FunctorDict } from '../classes/functor.ts'
import type { MonoidDict } from '../classes/monoid.ts'
import type { OrdDict } from '../classes/ord.ts'
import type { PlusDict } from '../classes/plus.ts'
import type { SemigroupDict } from '../classes/semigroup.ts'
import type { SetoidDict } from '../classes/setoid.ts'
import type { ShowDict } from '../classes/show.ts'
import type { TraversableDict } from '../classes/traversable.ts'
import type { Maybe } from '../data/maybe.ts'
import type { Pair } from '../data/pair.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'
import { lte } from '../classes/ord.ts'
import { of } from '../classes/applicative.ts'
import { map } from '../classes/functor.ts'
import { ap } from '../classes/apply.ts'
import { integer, integerFrom } from '../core/domain.ts'
import { just, nothing } from '../data/maybe.ts'

/** The shape for arrays. Use it with `Kind` when declaring generic helpers. */
export interface ArrayShape extends Shape<'Array'>, Matchable {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: this['slotA'][]
  /** The accepted input form of this shape, including readonly inputs when supported. */
  readonly like: readonly this['slotA'][]
  /** The contained value type inferred from `val`. */
  readonly readA: this['val'] extends readonly (infer A)[] ? A : never
  /** The secondary type inferred from `val`, or `never` when unused. */
  readonly readB: never
}

/**
 * The type of the `Arr` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type ArrDict =
  & NativeTypeRep<ArrayShape>
  & AltDict<ArrayShape>
  & ApplicativeDict<ArrayShape>
  & ApplyDict<ArrayShape>
  & ChainDict<ArrayShape>
  & ChainRecDict<ArrayShape>
  & FilterableDict<ArrayShape>
  & FoldableDict<ArrayShape>
  & FunctorDict<ArrayShape>
  & MonoidDict<ArrayShape>
  & OrdDict<ArrayShape>
  & PlusDict<ArrayShape>
  & SemigroupDict<ArrayShape>
  & SetoidDict<ArrayShape>
  & ShowDict<ArrayShape>
  & TraversableDict<ArrayShape>

/**
 * The array representative. Pass it to `of`, `empty`, or `traverse` to choose
 * arrays.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.of(P.Arr)(1) // => [1]
 * P.empty(P.Arr) // => []
 * ```
 */
export const Arr: ArrDict = {
  '@@type': 'Array' as const,
  _shape: undefined as unknown as ArrayShape,
  is(x: unknown): x is unknown[] {
    return Array.isArray(x)
  },
  alt<A>(a: readonly A[], b: readonly A[]): A[] {
    return [...a, ...b]
  },
  of<A>(a: A): A[] {
    return [a]
  },
  ap<A, B>(xs: readonly A[], fs: readonly ((a: A) => B)[]): B[] {
    return fs.flatMap((f) => xs.map((x) => f(x)))
  },
  chain<A, B>(xs: readonly A[], f: (a: A) => readonly B[]): B[] {
    return xs.flatMap((x) => [...f(x)])
  },
  chainRec<Loop, A>(f: (x: Loop) => Step<Loop, A>[], init: Loop): A[] {
    const out = []
    const frames = [f(init)]
    const at = [0]
    while (frames.length > 0) {
      const frame = frames[frames.length - 1]
      const i = at[at.length - 1]
      if (i >= frame.length) {
        frames.pop()
        at.pop()
        continue
      }
      at[at.length - 1] = i + 1
      const step = frame[i]
      if (step.tag === 'done') out.push(step.value)
      else {
        frames.push(f(step.value))
        at.push(0)
      }
    }
    return out
  },
  filter<A>(xs: readonly A[], p: (a: A) => boolean): A[] {
    return xs.filter((x) => p(x))
  },
  reduce<A, Acc>(xs: readonly A[], f: (acc: Acc, a: A) => Acc, init: Acc): Acc {
    return xs.reduce((acc: Acc, x: A) => f(acc, x), init)
  },
  map<A, B>(xs: readonly A[], f: (a: A) => B): B[] {
    return xs.map((x) => f(x))
  },
  empty<A>(): A[] {
    return []
  },
  lte(a: readonly unknown[], b: readonly unknown[]): boolean {
    const n = Math.min(a.length, b.length)
    for (let i = 0; i < n; i++) {
      if (!equals(a[i], b[i])) return lte(b[i] as never)(a[i] as never)
    }
    return a.length <= b.length
  },
  zero<A>(): A[] {
    return []
  },
  concat<A>(a: readonly A[], b: readonly A[]): A[] {
    return [...a, ...b]
  },
  equals(a: readonly unknown[], b: readonly unknown[]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if ((i in a) !== (i in b)) return false
      if (!equals(a[i], b[i])) return false
    }
    return true
  },
  show(xs: readonly unknown[]): string {
    const parts: string[] = []
    for (let i = 0; i < xs.length; i++) parts.push(i in xs ? show(xs[i]) : '')
    return `[${parts.join(', ')}]`
  },
  traverse<A, G extends ApplyMethods<never, SlotAOf<G>, SlotBOf<G>>>(
    xs: readonly A[],
    T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: A) => G,
  ): KindOf<G, SlotAOf<G>[]> {
    return xs.reduce(
      (acc: unknown, x) =>
        ap(map((bs: unknown[]) => (b: unknown) => [...bs, b])(acc as never))(
          f(x) as never,
        ),
      of(T as never)([] as SlotAOf<G>[]) as unknown,
    ) as KindOf<G, SlotAOf<G>[]>
  },
}

/**
 * Copies an iterable into an array.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromIterable(new Set([1, 2, 2, 3])) // => [1, 2, 3]
 * P.fromIterable('abc') // => ['a', 'b', 'c']
 * ```
 */
export function fromIterable<A>(source: Iterable<A>): A[] {
  return [...source]
}

/**
 * Creates consecutive integers from `start` up to, but excluding, `end`.
 * Returns `[]` if `end` is at or below `start`.
 *
 * @throws {TypeError} If either bound is not an integer.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.range(0)(5) // => [0, 1, 2, 3, 4]
 * P.range(3)(3) // => []
 * ```
 */
export function range(start: number): (end: number) => number[] {
  integer('range', start)
  return (end) => {
    integer('range', end)
    return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i)
  }
}

/**
 * Keeps the leading values that pass the predicate.
 * Stops at the first non-match.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.takeWhile((n: number) => n < 3)([1, 2, 3, 1]) // => [1, 2]
 * ```
 */
export function takeWhile<A>(p: (a: A) => boolean): (xs: readonly A[]) => A[] {
  return (xs) => {
    const at = xs.findIndex((x) => !p(x))
    return at < 0 ? [...xs] : xs.slice(0, at)
  }
}

/**
 * Removes the leading values that pass the predicate.
 * Keeps everything from the first non-match onward.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.dropWhile((n: number) => n < 3)([1, 2, 3, 1]) // => [3, 1]
 * ```
 */
export function dropWhile<A>(p: (a: A) => boolean): (xs: readonly A[]) => A[] {
  return (xs) => {
    const at = xs.findIndex((x) => !p(x))
    return at < 0 ? [] : xs.slice(at)
  }
}

/**
 * Splits an array into chunks of at most `n` values.
 * The final chunk may be shorter.
 *
 * @throws {TypeError} If `n` is not a positive integer.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.chunksOf(2)([1, 2, 3, 4, 5]) // => [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunksOf(n: number): <A>(xs: readonly A[]) => A[][] {
  integerFrom('chunksOf', 1, n)
  return (xs) => {
    return range(0)(Math.ceil(xs.length / n))
      .map((i) => xs.slice(i * n, i * n + n))
  }
}

/**
 * Returns the first matching value as `Just`, or `Nothing` if none match.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.find((n: number) => n % 2 === 0)([1, 2, 3, 4]) // => Just (2)
 * P.find((n: number) => n > 9)([1, 2]) // => Nothing
 * ```
 */
export function find<A>(p: (a: A) => boolean): (xs: readonly A[]) => Maybe<A> {
  return (xs) => {
    for (const x of xs) {
      if (p(x)) return just(x)
    }
    return nothing()
  }
}

/**
 * Returns the first `Just` produced by the function.
 * Stops at that result, or returns `Nothing` if there are no successful
 * results.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const tenfoldEven = (n: number) => n % 2 === 0 ? P.just(n * 10) : P.nothing()
 *
 * P.findMap(tenfoldEven)([1, 2, 3, 4]) // => Just (20)
 * ```
 */
export function findMap<A, B>(
  f: (a: A) => Maybe<B>,
): (xs: readonly A[]) => Maybe<B> {
  return (xs) => {
    for (const x of xs) {
      const r = f(x)
      if (r.tag === 'just') return r
    }
    return nothing()
  }
}

/**
 * Returns the value at a zero-based index as `Just`.
 * Returns `Nothing` for a negative index or an index outside the array.
 *
 * @throws {TypeError} If the index is not an integer.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.index(1)(['a', 'b', 'c']) // => Just ('b')
 * P.index(9)(['a']) // => Nothing
 * ```
 */
export function index(i: number): <A>(xs: readonly A[]) => Maybe<A> {
  integer('index', i)
  return (xs) => {
    if (i >= 0 && i < xs.length) return just(xs[i])
    return nothing()
  }
}

/**
 * Returns the zero-based index of the first match as `Just`.
 * Returns `Nothing` if no value matches.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.findIndex((n: number) => n > 1)([1, 2, 3]) // => Just (1)
 * P.findIndex((n: number) => n > 9)([1, 2, 3]) // => Nothing
 * ```
 */
export function findIndex<A>(
  p: (a: A) => boolean,
): (xs: readonly A[]) => Maybe<number> {
  return (xs) => {
    const at = xs.findIndex((x) => p(x))
    return at < 0 ? nothing<number>() : just(at)
  }
}

/**
 * Combines corresponding values from two arrays with a function.
 * Stops at the end of the shorter array.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.zipWith((a: number, b: number) => a + b)([1, 2, 3])([10, 20])
 * // => [11, 22]
 * ```
 */
export function zipWith<A, B, C>(
  f: (a: A, b: B) => C,
): (as: readonly A[]) => (bs: readonly B[]) => C[] {
  return (as) => (bs) => {
    const n = Math.min(as.length, bs.length)
    const out = []
    for (let i = 0; i < n; i++) out.push(f(as[i], bs[i]))
    return out
  }
}

/**
 * Pairs corresponding values from two arrays into tuples.
 * Stops at the end of the shorter array.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.zip([1, 2])(['a', 'b', 'c']) // => [[1, 'a'], [2, 'b']]
 * ```
 */
export function zip<A>(as: readonly A[]): <B>(bs: readonly B[]) => [A, B][] {
  return <B>(bs: readonly B[]): [A, B][] => {
    return zipWith<A, B, [A, B]>((a, b) => [a, b])(as)(bs)
  }
}

/**
 * Removes duplicates using ply's `equals`, keeping the first occurrence.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.nub([1, 1, 2, 1, 3]) // => [1, 2, 3]
 * P.nub([[1], [1], [2]]) // => [[1], [2]]
 * ```
 */
export function nub<A>(xs: readonly A[]): A[] {
  return xs.reduce(
    (kept: A[], x) =>
      kept.some((k) => equals(k, x)) ? kept : (kept.push(x), kept),
    [],
  )
}

/**
 * Removes duplicates using the supplied comparison, keeping the first
 * occurrence.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const sameLength = (a: string, b: string) => a.length === b.length
 *
 * P.nubBy(sameLength)(['a', 'b', 'cc']) // => ['a', 'cc']
 * ```
 */
export function nubBy<A>(
  same: (a: A, b: A) => boolean,
): (xs: readonly A[]) => A[] {
  return (xs) => {
    return xs.reduce(
      (kept: A[], x) =>
        kept.some((k) => same(k, x)) ? kept : (kept.push(x), kept),
      [],
    )
  }
}

/**
 * Handles an empty array with a default value, or a non-empty array with a
 * function.
 * The function receives the first value, then an array of the remaining
 * values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const describe = P.array('empty')((h: number) => (t: number[]) =>
 *   `${h} then ${P.show(t)}`)
 *
 * describe([1, 2, 3]) // => '1 then [2, 3]'
 * describe([]) // => 'empty'
 * ```
 */
export function array<B>(
  onNil: B,
): <A>(onCons: (head: A) => (tail: A[]) => B) => (xs: readonly A[]) => B {
  return (onCons) => (xs) =>
    xs.length === 0 ? onNil : onCons(xs[0])(xs.slice(1))
}

/**
 * Builds an array by repeatedly applying a function to a seed.
 * Return `Just(pair(value, nextSeed))` to append a value, or `Nothing` to
 * stop.
 *
 * @example
 * ```ts
 * import type { Maybe, Pair } from '@algosail/ply'
 * import * as P from '@algosail/ply'
 *
 * const countdown = (n: number): Maybe<Pair<number, number>> =>
 *   n === 0 ? P.nothing() : P.just(P.pair(n, n - 1))
 *
 * P.unfold(countdown)(3) // => [3, 2, 1]
 * ```
 */
export function unfold<A, B>(
  f: (seed: B) => Maybe<Pair<A, B>>,
): (start: B) => A[] {
  return (start) => {
    const out: A[] = []
    let seed = start
    while (true) {
      const step = f(seed)
      if (step.tag === 'nothing') return out
      out.push(step.value.fst)
      seed = step.value.snd
    }
  }
}

/**
 * Groups consecutive values that match the first value in each group.
 * The comparison is curried: `same(first)(next)`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.groupBy((a: number) => (b: number) => a === b)([1, 1, 2, 1])
 * // => [[1, 1], [2], [1]]
 * ```
 */
export function groupBy<A>(
  same: (a: A) => (b: A) => boolean,
): (xs: readonly A[]) => A[][] {
  return (xs) => {
    if (xs.length === 0) return []
    let leader = xs[0]
    let active = [leader]
    const out = [active]
    for (let i = 1; i < xs.length; i++) {
      const x = xs[i]
      if (same(leader)(x)) active.push(x)
      else {
        leader = x
        active = [leader]
        out.push(active)
      }
    }
    return out
  }
}

/**
 * Builds an array from a seed. Alias of `unfold`.
 *
 * @example
 * ```ts
 * import type { Maybe, Pair } from '@algosail/ply'
 * import * as P from '@algosail/ply'
 *
 * const countdown = (n: number): Maybe<Pair<number, number>> =>
 *   n === 0 ? P.nothing() : P.just(P.pair(n, n - 1))
 *
 * P.unfoldr(countdown)(3) // => [3, 2, 1]
 * ```
 *
 * @see {@link unfold}
 */
export function unfoldr<A, B>(
  f: (b: B) => Maybe<Pair<A, B>>,
): (start: B) => A[] {
  return (start) => unfold(f)(start)
}
