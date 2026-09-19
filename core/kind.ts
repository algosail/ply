/**
 * Infer and replace the type arguments of native or custom generic values.
 *
 * @module
 */

import type {
  Fail,
  Kind,
  Matchable,
  Shape,
  Shaped,
  Slotted,
  Widened,
} from './shape.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { FnShape } from '../natives/function.ts'
import type { MapShape } from '../natives/map.ts'
import type { SetShape } from '../natives/set.ts'
import type { StrMapShape } from '../natives/strmap.ts'

interface Matchables {
  readonly Array: ArrayShape
  readonly Fn: FnShape
  readonly Set: SetShape
  readonly Map: MapShape
  readonly StrMap: StrMapShape
}

type Sub<S, Fields, K extends keyof Matchable> = S extends Matchable
  ? (S & Fields)[K]
  : never

/**
 * Builds the accepted input type for a shape, such as a readonly array.
 * Returns `never` for shapes without a `like` property.
 *
 * @example
 * ```ts
 * import type { ArrayShape } from '../natives/array.ts'
 * import type { FnShape } from '../natives/function.ts'
 * import type { StrShape } from '../natives/string.ts'
 * import type { KindLike } from './kind.ts'
 *
 * type Loose = KindLike<ArrayShape, number, never> // => readonly number[]
 * type Arrow = KindLike<FnShape, number, never> // => (i: never) => number
 * type None = KindLike<StrShape, number, never> // => never
 * ```
 */
export type KindLike<S, A, B> = S extends Widened
  ? (S & { readonly slotA: A; readonly slotB: B })['like']
  : never

/**
 * Names of native generic types whose type arguments ply can infer.
 *
 * @example
 * ```ts
 * import type { MatchableName } from './kind.ts'
 *
 * type Names = MatchableName // => 'Array' | 'Fn' | 'Set' | 'Map' | 'StrMap'
 * ```
 */
export type MatchableName = keyof Matchables

/** Shapes of native generic types whose type arguments ply can infer. */
export type MatchableShapes = Matchables[MatchableName]

/**
 * Builds the union of accepted value types from a set of named shapes.
 *
 * @example
 * ```ts
 * import type { ArrayShape } from '../natives/array.ts'
 * import type { SetShape } from '../natives/set.ts'
 * import type { MatchableIn } from './kind.ts'
 *
 * type In = MatchableIn<{ Array: ArrayShape; Set: SetShape }, number>
 * // => readonly number[] | Set<number>
 * ```
 */
export type MatchableIn<Shapes, A, B = never> = {
  [Name in keyof Shapes]: KindLike<Shapes[Name], A, B>
}[keyof Shapes]

type MatchedShape<F> = MatchShape<F, MatchableShapes>
type MatchShape<F, S> = S extends Matchable
  ? unknown extends KindLike<S, unknown, unknown> ? never
  : [F] extends [KindLike<S, unknown, unknown>] ? S
  : never
  : never

/**
 * Finds the shape of a native generic value or a custom shaped value.
 *
 * @example
 * ```ts
 * import type { ShapeOf } from './kind.ts'
 *
 * type OfArray = ShapeOf<number[]> // => ArrayShape
 * type OfMap = ShapeOf<Map<string, number>> // => MapShape
 * type OfString = ShapeOf<string> // => never
 * ```
 */
export type ShapeOf<F> = F extends Shaped<Shape> ? F['_shape'] : MatchedShape<F>

type SlotOf<F, K extends 'readA' | 'readB', P extends '_A' | '_B'> = F extends
  Shaped<Shape> ? PhantomOf<F, P>
  : [MatchedShape<F>] extends [never] ? PhantomOf<F, P>
  : Sub<MatchedShape<F>, { readonly val: F }, K>

type PhantomOf<F, P extends '_A' | '_B'> = P extends '_B'
  ? F extends { [K in P]?: (_: infer B) => void } ? B : never
  : F extends { readonly [K in P]?: (_: never) => infer A } ? A
  : never

/**
 * Extracts the contained value type, or a function's return type.
 *
 * @example
 * ```ts
 * import type { SlotAOf } from './kind.ts'
 *
 * type Value = SlotAOf<Map<string, number>> // => number
 * type Result = SlotAOf<(i: string) => number> // => number
 * ```
 */
export type SlotAOf<F> = SlotOf<F, 'readA', '_A'>

/**
 * Extracts the secondary type, such as a map's key or a function's input.
 * Returns `never` for arrays.
 *
 * @example
 * ```ts
 * import type { SlotBOf } from './kind.ts'
 *
 * type Key = SlotBOf<Map<string, number>> // => string
 * type Arg = SlotBOf<(i: string) => number> // => string
 * type None = SlotBOf<number[]> // => never
 * ```
 */
export type SlotBOf<F> = SlotOf<F, 'readB', '_B'>

/**
 * Replaces the contained value type while preserving the wrapper.
 * Optionally supply a third argument to replace the secondary type too.
 *
 * @example
 * ```ts
 * import type { KindOf } from './kind.ts'
 *
 * type Strings = KindOf<number[], string> // => string[]
 * type Flags = KindOf<Map<string, number>, boolean> // => Map<string, boolean>
 * type Flip = KindOf<(i: string) => number, boolean>
 * // => (i: string) => boolean
 * ```
 */
export type KindOf<F, A, B = SlotBOf<F>> = F extends Shaped<Shape>
  ? Kind<F['_shape'], A, B>
  : AtBy<MatchedShape<F>, A, B>

/**
 * Accepts any value described by a shape, regardless of its type arguments.
 *
 * @example
 * ```ts
 * import type { ArrayShape } from '../natives/array.ts'
 * import type { MapShape } from '../natives/map.ts'
 * import type { StrShape } from '../natives/string.ts'
 * import type { MemberOf } from './kind.ts'
 *
 * type AnyArray = MemberOf<ArrayShape> // => readonly unknown[]
 * type AnyMap = MemberOf<MapShape> // => Map<unknown, unknown>
 * type AnyString = MemberOf<StrShape> // => string
 * ```
 */
export type MemberOf<L extends Shape> = L extends Widened
  ? KindLike<L, unknown, unknown>
  : Kind<L, unknown, unknown>

type AtBy<S, A, B> = [S] extends [never] ? never
  : [S] extends [Shape] ? Kind<S, A, B>
  : never

/**
 * Combines secondary type arguments when combining two wrapped values.
 * Unions carried values, intersects function inputs, and preserves a pair's
 * left type.
 *
 * @example
 * ```ts
 * import type { Pair } from '../data/pair.ts'
 * import type { BothB } from './kind.ts'
 *
 * type Keys = BothB<Map<string, number>, 'x', 'y'> // => 'x' | 'y'
 * type Args = BothB<(i: string) => number, { a: 1 }, { b: 2 }>
 * // => { a: 1 } & { b: 2 }
 * type Log = BothB<Pair<string, number>, 'x', 'y'> // => 'x'
 * ```
 */
export type BothB<F, B1, B2> =
  Exclude<ShapeOf<F>['slotBVariance'], undefined> extends 'in' ? B1 & B2
    : Exclude<ShapeOf<F>['slotBVariance'], undefined> extends 'same' ? B1
    : B1 | B2

/**
 * Constrains two values to use the same wrapper for `ap` or `chain`.
 *
 * @example
 * ```ts
 * import type { SameTypeAs } from './kind.ts'
 *
 * type Ok = SameTypeAs<number[], number[]> // => unknown
 * type No = SameTypeAs<Set<number>, number[]>
 * // => Fail<'ap and chain need one and the same type on both sides:
 * //          Array against Set'>
 * ```
 */
export type SameTypeAs<Other, Anchor> = [ShapeOf<Other>] extends [never]
  ? unknown
  : [ShapeOf<Anchor>] extends [never] ? unknown
  : [ShapeOf<Other>] extends [ShapeOf<Anchor>] ? SameSlotBAs<Other, Anchor>
  : Fail<
    `ap and chain need one and the same type on both sides: ${NameOfShape<
      ShapeOf<Anchor>
    >} against ${NameOfShape<ShapeOf<Other>>}`
  >

type SameSlotBAs<Other, Anchor> =
  Exclude<ShapeOf<Anchor>['slotBVariance'], undefined> extends 'same'
    ? [SlotBOf<Other>] extends [SlotBOf<Anchor>]
      ? [SlotBOf<Anchor>] extends [SlotBOf<Other>] ? unknown
      : Fail<
        `${NameOfShape<
          ShapeOf<Anchor>
        >} uses its second slot rather than carrying it, so both sides must agree`
      >
    : Fail<
      `${NameOfShape<
        ShapeOf<Anchor>
      >} uses its second slot rather than carrying it, so both sides must agree`
    >
    : unknown

/**
 * Checks that two composable values have compatible input and output types.
 *
 * @example
 * ```ts
 * import type { ComposableWith } from './kind.ts'
 *
 * type Ok = ComposableWith<(i: string) => number, (i: number) => boolean>
 * // => unknown
 * type No = ComposableWith<(i: string) => number, (i: boolean) => string>
 * // => Fail<'compose needs the ends to meet: what the first arrow gives is
 * //          not accepted by the second'>
 * ```
 */
export type ComposableWith<First, Second> = [ShapeOf<First>] extends [never]
  ? unknown
  : [ShapeOf<Second>] extends [never] ? unknown
  : [ShapeOf<First>] extends [ShapeOf<Second>] ? JointOf<First, Second>
  : Fail<
    `compose needs both arrows in one category: ${NameOfShape<
      ShapeOf<First>
    >} against ${NameOfShape<ShapeOf<Second>>}`
  >

type JointOf<First, Second> =
  Exclude<ShapeOf<Second>['slotBVariance'], undefined> extends 'in'
    ? [SlotAOf<First>] extends [SlotBOf<Second>] ? unknown
    : Fail<
      'compose needs the ends to meet: what the first arrow gives is not accepted by the second'
    >
    : [SlotAOf<First>] extends [SlotBOf<Second>]
      ? [SlotBOf<Second>] extends [SlotAOf<First>] ? unknown
      : Fail<
        `${NameOfShape<
          ShapeOf<Second>
        >} does not merely consume the joint, so both ends must agree`
      >
    : Fail<
      `${NameOfShape<
        ShapeOf<Second>
      >} does not merely consume the joint, so both ends must agree`
    >

type NameOfShape<S> = [S] extends [never] ? 'nothing'
  : S extends Shape ? S['name']
  : 'nothing'

/**
 * Extracts the return type of a contained function.
 * Returns `never` if the contained value is not a function.
 *
 * @example
 * ```ts
 * import type { ReturnOfSlotA } from './kind.ts'
 *
 * type Out = ReturnOfSlotA<((a: number) => string)[]> // => string
 * type None = ReturnOfSlotA<number[]> // => never
 * ```
 */
export type ReturnOfSlotA<G> = SlotAOf<G> extends (a: never) => infer B ? B
  : never

/**
 * Describes a named representative for a shape and optional secondary type.
 *
 * @example
 * ```ts
 * import type { ArrayShape } from '../natives/array.ts'
 * import type { TypeRepBase } from './kind.ts'
 *
 * type Name = TypeRepBase<ArrayShape>['@@type'] // => 'Array'
 * ```
 */
export interface TypeRepBase<S extends Shape, B = never>
  extends Shaped<S>, Slotted<never, B> {}

/**
 * Requires custom representatives to provide the supplied static operations.
 * Representatives covered by the native shape table need only their type
 * identity.
 *
 * @example
 * ```ts
 * import type { ArrayShape } from '../natives/array.ts'
 * import type { StrShape } from '../natives/string.ts'
 * import type { RepIn } from './kind.ts'
 *
 * type Listed = RepIn<ArrayShape, never, { Array: ArrayShape }, { of(): void }>
 * // => TypeRepBase<ArrayShape, never>
 * type Outside = RepIn<StrShape, never, { Array: ArrayShape }, { of(): void }>
 * // => TypeRepBase<StrShape, never> & { of(): void }
 * ```
 */
export type RepIn<S extends Shape, B, Shapes, Sig> =
  [Extract<Shapes[keyof Shapes], S>] extends [never] ? TypeRepBase<S, B> & Sig
    : TypeRepBase<S, B>

/**
 * Requires a type-level check to evaluate to `true`.
 *
 * @example
 * ```ts ignore
 * import type { Assert } from './kind.ts'
 *
 * type Ok = Assert<true>
 * type No = Assert<false> // refused
 * ```
 */
export type Assert<T extends true> = T

/**
 * Checks that every child shape is also present in the parent shape set.
 *
 * @example
 * ```ts
 * import type { ArrayShape } from '../natives/array.ts'
 * import type { SetShape } from '../natives/set.ts'
 * import type { SubclassOf } from './kind.ts'
 *
 * type Ok = SubclassOf<
 *   { Array: ArrayShape },
 *   { Array: ArrayShape; Set: SetShape }
 * > // => true
 * type No = SubclassOf<{ Nope: ArrayShape }, { Array: ArrayShape }>
 * // => Fail<'Type without superclass: Nope'>
 * ```
 */
export type SubclassOf<Child, Parent> =
  [Exclude<keyof Child, keyof Parent>] extends [never]
    ? Child extends Pick<Parent, keyof Child & keyof Parent> ? true
    : Fail<'Shape of form type in superclass is different'>
    : Fail<
      `Type without superclass: ${Extract<
        Exclude<keyof Child, keyof Parent>,
        string
      >}`
    >

type Missing<S extends Shape, Method extends string> = Exclude<
  Method,
  keyof Kind<S, unknown, unknown>
>

/**
 * Returns `R` if values of the shape provide every required method.
 * Otherwise produces a type error describing the missing methods.
 *
 * @example
 * ```ts
 * import type { ArrayShape } from '../natives/array.ts'
 * import type { Superclass } from './kind.ts'
 *
 * type Ok = Superclass<ArrayShape, 'map', 'ok'> // => 'ok'
 * type No = Superclass<ArrayShape, 'nope', 'ok'>
 * // => Fail<'Type Array does not implement nope'>
 * ```
 */
export type Superclass<S extends Shape, Method extends string, R> =
  [Missing<S, Method>] extends [never] ? R
    : Fail<`Type ${S['name']} does not implement ${Missing<S, Method>}`>

/**
 * Checks that a type satisfies a constraint while preserving the original
 * type.
 *
 * @example
 * ```ts ignore
 * import type { Satisfies } from './kind.ts'
 *
 * type Ok = Satisfies<'a', string> // => 'a'
 * type No = Satisfies<number, string> // refused
 * ```
 */
export type Satisfies<T extends C, C> = T
