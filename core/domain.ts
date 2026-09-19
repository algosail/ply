/**
 * Validate numeric arguments with errors that include your operation name.
 *
 * @module
 */

const shown = (n: number): string => Object.is(n, -0) ? '-0' : String(n)

/**
 * Validates an integer and returns it unchanged.
 * Use `op` to name the operation in the error message.
 *
 * @throws {TypeError} If `n` is not an integer.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import { integer } from './domain.ts'
 *
 * integer('take', 2) // => 2
 * assertThrows(
 *   () => integer('take', 2.5),
 *   TypeError,
 *   'take: 2.5 is not an integer',
 * )
 * ```
 */
export function integer(op: string, n: number): number {
  if (!Number.isInteger(n)) {
    throw new TypeError(`${op}: ${shown(n)} is not an integer`)
  }
  return n
}

/**
 * Validates an integer at or above `least` and returns it unchanged.
 * Use `op` to name the operation in the error message.
 *
 * @throws {TypeError} If `n` is not an integer or is below `least`.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import { integerFrom } from './domain.ts'
 *
 * integerFrom('chunksOf', 1, 3) // => 3
 * assertThrows(
 *   () => integerFrom('chunksOf', 1, 0),
 *   TypeError,
 *   'chunksOf: 0 is not an integer >= 1',
 * )
 * ```
 */
export function integerFrom(op: string, least: number, n: number): number {
  if (!Number.isInteger(n) || n < least) {
    throw new TypeError(`${op}: ${shown(n)} is not an integer >= ${least}`)
  }
  return n
}

/**
 * Validates a finite number at or above `least` and returns it unchanged.
 * Use `op` to name the operation in the error message.
 *
 * @throws {TypeError} If `n` is not finite or is below `least`.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import { finiteFrom } from './domain.ts'
 *
 * finiteFrom('after', 0, 12.5) // => 12.5
 * assertThrows(
 *   () => finiteFrom('after', 0, NaN),
 *   TypeError,
 *   'after: NaN is not a finite number >= 0',
 * )
 * ```
 */
export function finiteFrom(op: string, least: number, n: number): number {
  if (!Number.isFinite(n) || n < least) {
    throw new TypeError(
      `${op}: ${shown(n)} is not a finite number >= ${least}`,
    )
  }
  return n
}
