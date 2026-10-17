/**
 * Types for naming custom values and declaring tables of operations.
 */

import type { MemberOf } from './kind.ts'
import type { Shape, Shaped } from './shape.ts'

/**
 * Names a type and provides an `is` function to recognize its values.
 */
export type NamedGuard<A = unknown> = {
  /**
   * Checks whether an unknown value belongs to this type.
   */
  is(value: unknown): value is A
  /**
   * The name used to recognize this type in ply operations.
   */
  readonly '@@type': string
}

/**
 * Describes a native type representative with a name, shape, and type guard.
 */
export type NativeTypeRep<L extends Shape> = Shaped<L> & NamedGuard<MemberOf<L>>

/**
 * Describes a family of operation dictionaries parameterized by a shape.
 */
export type DictsOf = (shape: never) => unknown

/**
 * Selects the operation dictionary for a particular shape.
 */
export type DictAt<D extends DictsOf, S extends Shape> = D extends
  (s: S) => infer R ? R
  : never

/**
 * Types a table of native representatives and their operations by type name.
 */
export type Instances<D extends DictsOf, Shapes> = {
  readonly [U in keyof Shapes]:
    & DictAt<D, Extract<Shapes[U], Shape>>
    & NativeTypeRep<Extract<Shapes[U], Shape>>
}

/**
 * Declares the representative available through a value's `constructor`.
 */
export interface Constructed<R> {
  /**
   * The representative used to construct values of this type.
   */
  readonly constructor: R
}

/**
 * Reads a string type name from a value or, when the value has none, from its
 * constructor. A non-string `@@type` on the value hides a constructor name.
 * @example
 * ```ts
 * import { just } from '../data/maybe.ts'
 * import { taggedName } from './named.ts'
 *
 * taggedName(just(1)) // => 'Maybe'
 * taggedName({ '@@type': 'Logged' }) // => 'Logged'
 * taggedName({ '@@type': 42 }) // => undefined
 * taggedName({}) // => undefined
 * ```
 */
export function taggedName(x: object): string | undefined {
  if ('@@type' in x) {
    const named = (x as { readonly '@@type': unknown })['@@type']
    return typeof named === 'string' ? named : undefined
  }
  const ctor = (x as { readonly constructor?: unknown }).constructor
  if (
    ctor === null || (typeof ctor !== 'function' && typeof ctor !== 'object')
  ) {
    return undefined
  }
  const named = (ctor as { readonly '@@type'?: unknown })['@@type']
  return typeof named === 'string' ? named : undefined
}

/**
 * Checks whether a value carries a string ply type name on itself or on its
 * constructor.
 * @example
 * ```ts
 * import { just } from '../data/maybe.ts'
 * import { hasName } from './named.ts'
 *
 * hasName(just(1)) // => true
 * hasName([1, 2]) // => false
 * hasName({ '@@type': 'Logged' }) // => true
 * ```
 */
export function hasName(
  x: unknown,
): x is
  | { readonly '@@type': string }
  | { readonly constructor: { readonly '@@type': string } } {
  return (typeof x === 'object' || typeof x === 'function') && x !== null &&
    taggedName (x) !== undefined
}
