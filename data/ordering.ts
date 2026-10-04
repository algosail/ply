/**
 * Compare and sort values, including comparisons by multiple keys.
 *
 * @module
 */

import type { Nullary } from '../core/shape.ts'
import type { MonoidDict } from '../classes/monoid.ts'
import { lte } from '../classes/ord.ts'

/** The answer when the first value comes before the second. */
export type LT = { readonly tag: 'LT' }
/** The answer when neither value comes before the other. */
export type EQ = { readonly tag: 'EQ' }
/** The answer when the first value comes after the second. */
export type GT = { readonly tag: 'GT' }

/**
 * A comparison result: less than (LT), equal (EQ), or greater than (GT).
 */
export type Ordering = LT | EQ | GT

/** A function that compares two values and says which comes first. */
export type Comparator<A> = (a: A, b: A) => Ordering

// The singletons come before the dictionary: the literal below takes them into
// its fields as it is evaluated, so declaring them after would leave it empty.
/** The less-than comparison result. */
const LT: LT = { tag: 'LT' }
/** The equal comparison result. */
const EQ: EQ = { tag: 'EQ' }
/** The greater-than comparison result. */
const GT: GT = { tag: 'GT' }

/**
 * Combine comparisons by keeping the first non-equal result.
 * Use this to sort by several keys, with later keys breaking ties.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * function length(word: string): number {
 *   return word.length
 * }
 *
 * const byLength = P.comparing(length)
 *
 * function compareWords(a: string, b: string): P.Ordering {
 *   return P.mconcat(P.Ordering)([byLength(a, b), P.compare(a, b)])
 * }
 *
 * P.sortWith(compareWords)(['bb', 'a', 'ba', 'ab']) // => ['a', 'ab', 'ba', 'bb']
 * ```
 */
export const Ordering: MonoidDict<Nullary<Ordering>> & {
  /** The less-than result. */
  readonly lt: LT
  /** The equal result. */
  readonly eq: EQ
  /** The greater-than result. */
  readonly gt: GT
  /** Check for a less-than result. */
  isLT(o: Ordering): o is LT
  /** Check for an equal result. */
  isEQ(o: Ordering): o is EQ
  /** Check for a greater-than result. */
  isGT(o: Ordering): o is GT
  /** Convert to -1, 0, or 1 for native sorting. */
  toNumber(o: Ordering): -1 | 0 | 1
  /** Convert a negative, zero, or positive number; NaN becomes EQ. */
  fromNumber(n: number): Ordering
  /** Exchange LT and GT, leaving EQ unchanged. */
  reverse(o: Ordering): Ordering
  /** Compare two values using ply ordering. */
  compare<A>(a: A, b: A): Ordering
  /** Compare the values returned by a function. */
  comparing<A, B>(f: (a: A) => B): Comparator<A>
  /** Return a sorted copy using the supplied comparator. */
  sortWith<A>(cmp: Comparator<A>): (xs: readonly A[]) => A[]
} = {
  empty: () => EQ,
  concat: (a, b) => a.tag === 'EQ' ? b : a,

  lt: LT,
  eq: EQ,
  gt: GT,

  isLT: (o): o is LT => o.tag === 'LT',
  isEQ: (o): o is EQ => o.tag === 'EQ',
  isGT: (o): o is GT => o.tag === 'GT',

  toNumber: (o) => o.tag === 'LT' ? -1 : o.tag === 'GT' ? 1 : 0,
  fromNumber: (n) => n < 0 ? LT : n > 0 ? GT : EQ,
  reverse: (o) => o.tag === 'LT' ? GT : o.tag === 'GT' ? LT : EQ,

  compare: <A>(a: A, b: A): Ordering => {
    const aFirst = lte(b as never)(a as never)
    const bFirst = lte(a as never)(b as never)
    return aFirst && bFirst ? EQ : aFirst ? LT : GT
  },

  comparing: <A, B>(f: (a: A) => B): Comparator<A> => (a, b) =>
    Ordering.compare(f(a), f(b)),

  sortWith: <A>(cmp: Comparator<A>) => (xs: readonly A[]): A[] =>
    [...xs].sort((a, b) => Ordering.toNumber(cmp(a, b))),
}

/**
 * Compare two values using ply ordering. Two `NaN` values compare as equal.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.Ordering.isLT(P.compare(1, 2)) // => true
 * P.Ordering.isEQ(P.compare(Number.NaN, Number.NaN)) // => true
 * ```
 */
export const compare: <A>(a: A, b: A) => Ordering = Ordering.compare

/**
 * Create a comparator that compares the values returned by a function.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const byLength = P.comparing((s: string) => s.length)
 * P.Ordering.isLT(byLength('ab', 'cde')) // => true
 * ```
 */
export const comparing: <A, B>(f: (a: A) => B) => Comparator<A> =
  Ordering.comparing

/**
 * Sorts by a comparator, leaving the array it was given alone.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.sortWith(P.comparing((s: string) => s.length))(['aaa', 'a', 'aa'])
 * // => [ "a", "aa", "aaa" ]
 * ```
 */
export const sortWith: <A>(cmp: Comparator<A>) => (xs: readonly A[]) => A[] =
  Ordering.sortWith

/**
 * Check whether the first value compares as less than the second.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isLT(P.compare(1, 2)) // => true
 * P.isEQ(P.compare(2, 2)) // => true
 * P.isGT(P.compare(2, 1)) // => true
 * ```
 */
export const isLT: (o: Ordering) => o is LT = Ordering.isLT
/** Whether the comparison came out equal. See {@link isLT}. */
export const isEQ: (o: Ordering) => o is EQ = Ordering.isEQ
/** Whether the comparison came out greater. See {@link isLT}. */
export const isGT: (o: Ordering) => o is GT = Ordering.isGT
