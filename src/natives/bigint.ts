/**
 * Type checking, comparison, and formatting for bigint values through `Big`.
 */

import type { CheckableDict } from '../classes/checkable.ts'
import type { OrdDict } from '../classes/ord.ts'
import type { SetoidDict } from '../classes/setoid.ts'
import type { ShowDict } from '../classes/show.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { Shape } from '../core/shape.ts'

/** The shape for bigints. */
export interface BigShape extends Shape<'BigInt'> {
  readonly out: bigint
}

/** The type of the `Big` representative. */
export type BigDict =
  & NativeTypeRep<BigShape>
  & CheckableDict<BigShape>
  & OrdDict<BigShape>
  & SetoidDict<BigShape>
  & ShowDict<BigShape>

/**
 * The bigint representative, with type checking, comparison, and formatting operations.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.Big.is (42n) // => true
 * P.Big.lte (1n, 2n) // => true
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
    return String (n)
  },
}
