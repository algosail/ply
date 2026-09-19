/**
 * Types for naming custom values and declaring tables of operations.
 *
 * @module
 */

import type { MemberOf } from './kind.ts'
import type { Shape, Shaped } from './shape.ts'

/** Names a type and provides an `is` function to recognize its values. */
export type NamedGuard<A = unknown> = {
  /** The name used to recognize this type in ply operations. */
  readonly '@@type': string
  /** Checks whether an unknown value belongs to this type. */
  readonly is: (x: unknown) => x is A
}

/**
 * Describes a native type representative with a name, shape, and type guard.
 */
export type NativeTypeRep<L extends Shape> = Shaped<L> & NamedGuard<MemberOf<L>>

/** Describes a family of operation dictionaries parameterized by a shape. */
export type DictsOf = (shape: never) => unknown

/** Selects the operation dictionary for a particular shape. */
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

/** Declares the representative available through a value's `constructor`. */
export interface Constructed<R> {
  /** The representative used to construct values of this type. */
  readonly constructor: R
}

/**
 * Checks whether a value declares a string `@@type` name.
 *
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
export function hasName(x: unknown): x is { readonly '@@type': string } {
  return (typeof x === 'object' || typeof x === 'function') && x !== null &&
    '@@type' in x && typeof (x as { '@@type': unknown })['@@type'] === 'string'
}
