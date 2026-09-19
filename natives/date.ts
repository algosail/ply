/**
 * Compare and format dates through the `Dates` representative.
 *
 * @module
 */

import type { Shape } from '../core/shape.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { OrdDict } from '../classes/ord.ts'
import type { SetoidDict } from '../classes/setoid.ts'
import type { ShowDict } from '../classes/show.ts'
import { show } from '../classes/show.ts'
import { Num } from './number.ts'

/** The shape for dates. Use it with `Kind` when declaring generic helpers. */
export interface DateShape extends Shape<'Date'> {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: Date
}

/**
 * The type of the `Dates` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type DatesDict =
  & NativeTypeRep<DateShape>
  & OrdDict<DateShape>
  & SetoidDict<DateShape>
  & ShowDict<DateShape>

/**
 * The date representative. Compares dates by their timestamps.
 * Invalid dates compare equal to each other and sort after valid dates.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.Dates.equals(new Date('2026-01-01'), new Date('2026-01-01')) // => true
 * ```
 */
export const Dates: DatesDict = {
  '@@type': 'Date' as const,
  _shape: undefined as unknown as DateShape,
  is(x: unknown): x is Date {
    return x instanceof Date
  },
  lte(a: Date, b: Date): boolean {
    return Num.lte(a.getTime(), b.getTime())
  },
  equals(a: Date, b: Date): boolean {
    return Num.equals(a.getTime(), b.getTime())
  },
  show(d: Date): string {
    return `Date (${show(Number.isNaN(d.valueOf()) ? NaN : d.toISOString())})`
  },
}
