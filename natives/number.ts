/**
 * Curried arithmetic, integer checks, and numeric summaries.
 *
 * @module
 */

import type { Shape } from '../core/shape.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { Foldable } from '../classes/foldable.ts'
import type { OrdDict } from '../classes/ord.ts'
import type { SetoidDict } from '../classes/setoid.ts'
import type { ShowDict } from '../classes/show.ts'
import type { Maybe } from '../data/maybe.ts'
import { integer } from '../core/domain.ts'
import { reduce } from '../classes/foldable.ts'
import { just, nothing } from '../data/maybe.ts'

/**
 * The shape for numbers. Use it with `Kind` when declaring generic helpers.
 */
export interface NumShape extends Shape<'Number'> {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: number
}

/**
 * The type of the `Num` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type NumTypeRep =
  & NativeTypeRep<NumShape>
  & OrdDict<NumShape>
  & SetoidDict<NumShape>
  & ShowDict<NumShape>

/**
 * The number representative. Treats `NaN` as equal to itself and orders it
 * last.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.Num.is(42) // => true
 * P.Num.equals(NaN, NaN) // => true
 * ```
 */
export const Num: NumTypeRep = {
  '@@type': 'Number' as const,
  _shape: undefined as unknown as NumShape,
  is(x: unknown): x is number {
    return typeof x === 'number'
  },
  lte(a: number, b: number): boolean {
    if (Number.isNaN(a)) return Number.isNaN(b)
    if (Number.isNaN(b)) return true
    return a <= b
  },
  equals(a: number, b: number): boolean {
    return a === b || (Number.isNaN(a) && Number.isNaN(b))
  },
  show(n: number): string {
    return Object.is(n, -0) ? '-0' : String(n)
  },
}

/**
 * Adds the supplied number to its next argument.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.add(1)(1) // => 2
 * ```
 */
export function add(x: number): (y: number) => number {
  return (y) => x + y
}

/**
 * Subtracts the supplied number from its next argument: `sub(2)(5)` is `3`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.map(P.sub(1))([1, 2, 3]) // => [0, 1, 2]
 * ```
 */
export function sub(y: number): (x: number) => number {
  return (x) => x - y
}

/**
 * Multiplies its next argument by the supplied number.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mult(4)(2) // => 8
 * ```
 */
export function mult(x: number): (y: number) => number {
  return (y) => x * y
}

/**
 * Divides its next argument by the supplied divisor: `div(2)(8)` is `4`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.map(P.div(2))([0, 1, 2, 3]) // => [0, 0.5, 1, 1.5]
 * ```
 */
export function div(y: number): (x: number) => number {
  return (x) => x / y
}

/**
 * Raises its next argument to the supplied exponent: `pow(2)(3)` is `9`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.map(P.pow(2))([-3, -2, -1, 0, 1, 2, 3]) // => [9, 4, 1, 0, 1, 4, 9]
 * P.map(P.pow(0.5))([1, 4, 9, 16, 25]) // => [1, 2, 3, 4, 5]
 * ```
 */
export function pow(exp: number): (base: number) => number {
  return (base) => Math.pow(base, exp)
}

/**
 * Changes the sign of a number.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.negate(12.5) // => -12.5
 * P.negate(-42) // => 42
 * ```
 */
export function negate(n: number): number {
  return -n
}

/**
 * Checks whether an integer is even.
 *
 * @throws {TypeError} If the input is not an integer.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import * as P from '@algosail/ply'
 *
 * P.even(42) // => true
 * P.even(99) // => false
 * assertThrows(() => P.even(2.5), TypeError, 'even: 2.5 is not an integer')
 * ```
 */
export function even(n: number): boolean {
  integer('even', n)
  return n % 2 === 0
}

/**
 * Checks whether an integer is odd.
 *
 * @throws {TypeError} If the input is not an integer.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import * as P from '@algosail/ply'
 *
 * P.odd(99) // => true
 * P.odd(42) // => false
 * assertThrows(() => P.odd(2.5), TypeError, 'odd: 2.5 is not an integer')
 * ```
 */
export function odd(n: number): boolean {
  integer('odd', n)
  return n % 2 !== 0
}

/**
 * Adds the contained numbers. Returns `0` when there are no values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.sum([1, 2, 3, 4, 5]) // => 15
 * P.sum([]) // => 0
 * P.sum(P.just(42)) // => 42
 * P.sum(P.nothing<number>()) // => 0
 * ```
 */
export function sum<F extends Foldable<F, number>>(fa: F): number {
  return reduce<number, number>((acc: number, n: number) => acc + n)(0)(
    fa as never,
  )
}

/**
 * Multiplies the contained numbers. Returns `1` when there are no values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.product([1, 2, 3, 4, 5]) // => 120
 * P.product([]) // => 1
 * P.product(P.just(42)) // => 42
 * P.product(P.nothing<number>()) // => 1
 * ```
 */
export function product<F extends Foldable<F, number>>(fa: F): number {
  return reduce<number, number>((acc: number, n: number) => acc * n)(1)(
    fa as never,
  )
}

/**
 * Returns the arithmetic mean as `Just`, or `Nothing` when there are no
 * values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mean([1, 2, 3, 4]) // => Just (2.5)
 * P.mean([]) // => Nothing
 * P.mean(P.just(42)) // => Just (42)
 * P.mean(P.nothing<number>()) // => Nothing
 * ```
 */
export function mean<F>(fa: F): Maybe<number> {
  const total = reduce<number, [number, number]>(
    ([n, acc]: [number, number], x: number) => [n + 1, acc + x],
  )([0, 0])(fa as never)
  return total[0] === 0 ? nothing() : just(total[1] / total[0])
}
