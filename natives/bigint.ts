/**
 * Type checking, comparison, and formatting for bigint values through `Big`.
 *
 * @module
 */

import type { Shape } from '../core/shape.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { OrdDict } from '../classes/ord.ts'
import type { SetoidDict } from '../classes/setoid.ts'
import type { ShowDict } from '../classes/show.ts'

/**
 * The shape for bigints. Use it with `Kind` when declaring generic helpers.
 */
export interface BigShape extends Shape<'BigInt'> {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: bigint
}

/**
 * The type of the `Big` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type BigDict =
  & NativeTypeRep<BigShape>
  & OrdDict<BigShape>
  & SetoidDict<BigShape>
  & ShowDict<BigShape>

/**
 * The bigint representative, with type checking, comparison, and formatting
 * operations.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.Big.is(42n) // => true
 * P.Big.lte(1n, 2n) // => true
 * ```
 */
export const Big: BigDict = {
  '@@type': 'BigInt' as const,
  _shape: undefined as unknown as BigShape,
  is(x: unknown): x is bigint {
    return typeof x === 'bigint'
  },
  lte(a: bigint, b: bigint): boolean {
    return a <= b
  },
  equals(a: bigint, b: bigint): boolean {
    return a === b
  },
  show(n: bigint): string {
    return String(n)
  },
}
