/**
 * Describe custom generic types and build value types from their shapes.
 *
 * @module
 */

declare const why: unique symbol
/**
 * Carries a readable error message when a type constraint cannot be satisfied.
 */
export interface Fail<M extends string> {
  readonly [why]: M
}

/**
 * Describes how to build a generic value type.
 * Extend it with a unique name and define `out` using `this['slotA']`
 * and, when needed, `this['slotB']`.
 *
 * @example
 * ```ts
 * import type { Shape, Kind } from './shape.ts'
 *
 * type Box<A> = { readonly value: A }
 *
 * interface BoxShape extends Shape<'Box'> {
 *   readonly out: Box<this['slotA']>
 * }
 *
 * type Boxed = Kind<BoxShape, number, never> // => Box<number>
 * ```
 */
export interface Shape<Name extends string = string> {
  /** The unique name of the type described by this shape. */
  readonly name: Name
  /** The contained value type, or a function's output type. */
  readonly slotA: unknown
  /** The secondary type, such as a map key or function input. */
  readonly slotB: unknown
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: unknown
  /** How the secondary type is combined: input, output, or an exact shared type. */
  readonly slotBVariance?: 'in' | 'out' | 'same'
}

/**
 * Builds a value type from a shape and its two type arguments.
 * For maps, `A` is the value type and `B` is the key type.
 *
 * @example
 * ```ts
 * import type { FnShape } from '../natives/function.ts'
 * import type { MapShape } from '../natives/map.ts'
 * import type { Kind } from './shape.ts'
 *
 * type Keyed = Kind<MapShape, number, string> // => Map<string, number>
 * type Arrow = Kind<FnShape, number, string> // => (i: string) => number
 * ```
 */
export type Kind<S extends Shape, A, B> =
  (S & { readonly slotA: A; readonly slotB: B })['out']

/**
 * Describes a fixed type that does not use either type argument.
 * Use it when declaring a monoid over a concrete type such as `number`.
 *
 * @example
 * ```ts
 * import type { Nullary, Kind } from './shape.ts'
 *
 * type Big = Kind<Nullary<bigint>, string, number> // => bigint
 * ```
 */
export interface Nullary<T> extends Shape {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: T
}

/**
 * Associates a custom type or representative with its named shape.
 *
 * @example
 * ```ts
 * import type { ArrayShape } from '../natives/array.ts'
 * import type { Shape, Shaped } from './shape.ts'
 *
 * type Name = Shaped<ArrayShape>['@@type'] // => 'Array'
 *
 * interface Nameless extends Shape {
 *   readonly out: number
 * }
 *
 * type None = Shaped<Nameless>['@@type']
 * // => Fail<'Shape must name the type'>
 * ```
 */
export interface Shaped<S extends Shape> {
  /** The shape used to type generic operations on this value. */
  readonly _shape: S
  /** The name used to recognize this type in ply operations. */
  readonly '@@type': NameOf<S>
}

/**
 * Declares the value and secondary types of a custom generic value.
 * Use these optional members for type inference; they need no implementation.
 */
export interface Slotted<A, B = never> {
  /** Declares the contained value type for inference; no runtime member is required. */
  readonly _A?: (_: never) => A
  /** Declares the secondary type for inference; no runtime member is required. */
  _B?(_: B): void
}

type NameOf<S extends Shape> = Shape extends S ? string
  : string extends S['name'] ? Fail<'Shape must name the type'>
  : S['name']

/** A named generic value with value type `A` and secondary type `B`. */
export type AnyKind<A = unknown, B = unknown> = Shaped<Shape> & Slotted<A, B>

/**
 * Defines the accepted input form of a shape through its `like` property.
 *
 * @example
 * ```ts
 * import type { FnShape } from '../natives/function.ts'
 *
 * type Loosest = (FnShape & { slotA: number })['like']
 * // => (i: never) => number
 * ```
 */
export interface Widened {
  /** The accepted input form of this shape, including readonly inputs when supported. */
  readonly like: unknown
}

/**
 * Describes how to infer type arguments from an existing value type.
 * Define `like`, `readA`, and `readB` when adding a structurally matched type.
 *
 * @example
 * ```ts
 * import type { MapShape } from '../natives/map.ts'
 *
 * type Value = (MapShape & { val: Map<string, number> })['readA'] // => number
 * type Key = (MapShape & { val: Map<string, number> })['readB'] // => string
 * ```
 */
export interface Matchable extends Widened {
  /** The value type from which to infer the type arguments. */
  readonly val: unknown
  /** The contained value type inferred from `val`. */
  readonly readA: unknown
  /** The secondary type inferred from `val`, or `never` when unused. */
  readonly readB: unknown
}
