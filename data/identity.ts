/**
 * Wrap a single value for use with `map`, `chain`, and `traverse`.
 * Use `extract` to unwrap it.
 *
 * @module
 */

import type { Shape, Shaped } from '../core/shape.ts'
import type { KindOf, Satisfies, ShapeOf, SlotAOf } from '../core/kind.ts'
import type { ApplicativeTypeRep } from '../classes/applicative.ts'
import type { Apply, ApplyMethods } from '../classes/apply.ts'
import type { ChainMethods } from '../classes/chain.ts'
import type { CheckableTypeRep } from '../classes/checkable.ts'
import type { ComonadMethods } from '../classes/comonad.ts'
import type { ExtendMethods } from '../classes/extend.ts'
import type { FoldableMethods } from '../classes/foldable.ts'
import type { FunctorMethods } from '../classes/functor.ts'
import type { TraversableMethods } from '../classes/traversable.ts'
import type { OrdMethods } from '../classes/ord.ts'
import type { SetoidMethods } from '../classes/setoid.ts'
import type { ShowMethods } from '../classes/show.ts'
import { map } from '../classes/functor.ts'
import { equals } from '../classes/setoid.ts'
import { lte } from '../classes/ord.ts'
import { show } from '../classes/show.ts'

/**
 * The shape for Identity. Use it with `Kind` when declaring generic helpers.
 */
export interface IdentityShape extends Shape<'Identity'> {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: Identity<this['slotA']>
}

/**
 * The type of the `Identity` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type IdentityTypeRep = Satisfies<
  IdentityStatics & Shaped<IdentityShape>,
  & ApplicativeTypeRep<IdentityShape>
  & CheckableTypeRep<IdentityShape>
>

/** Static operations provided by the `Identity` representative. */
export interface IdentityStatics {
  /** Checks whether an unknown value belongs to this type. */
  is(value: unknown): value is Identity<unknown>
  /** Creates an `Identity` value. */
  of<A>(a: A): Identity<A>
}

/**
 * Methods available on `Identity` values.
 * Use them directly or through the corresponding standalone functions.
 */
export interface IdentityMethods<A>
  extends
    SetoidMethods<Identity<A>, A>,
    OrdMethods<Identity<A>, A>,
    ShowMethods<Identity<A>, A>,
    FunctorMethods<Identity<A>, A>,
    ApplyMethods<Identity<A>, A>,
    ChainMethods<Identity<A>, A>,
    FoldableMethods<Identity<A>, A>,
    TraversableMethods<Identity<A>, A>,
    ExtendMethods<Identity<A>, A>,
    ComonadMethods<Identity<A>, A> {
  /** The name used to recognize this type in ply operations. */
  readonly '@@type': 'Identity'
  /** The shape used to type generic operations on this value. */
  readonly _shape: IdentityShape
  /** Declares the contained value type for inference; no runtime member is required. */
  readonly _A?: (_: never) => A
  /** The representative used to construct values of this type. */
  readonly constructor: IdentityTypeRep
}

/**
 * A single wrapped value. Use `map` to transform it and `extract` to unwrap
 * it.
 */
export class Identity<A> implements IdentityMethods<A> {
  /** The name used by generic ply operations. */
  static readonly '@@type' = 'Identity' as const
  /** The shape used for type inference; no runtime value is required. */
  declare static readonly _shape: IdentityShape

  static {
    Object.defineProperty(this.prototype, '@@type', { value: 'Identity' })
  }

  /** Checks whether a value was created by this class. */
  static is(value: unknown): value is Identity<unknown> {
    return value instanceof Identity
  }
  /** Wraps a value in this type. */
  static of<A>(value: A): Identity<A> {
    return identity(value)
  }

  /** The name used by generic ply operations. */
  declare readonly '@@type': 'Identity'
  /** The shape used for type inference; no runtime value is required. */
  declare readonly _shape: IdentityShape
  /** The contained type used for inference; no runtime member is required. */
  declare readonly _A?: (_: never) => A
  /** The representative used by generic ply operations. */
  declare readonly ['constructor']: IdentityTypeRep

  /** The contained value. */
  readonly value: A
  /** Wraps a value for use with map, chain, and traverse. */
  constructor(value: A) {
    this.value = value
  }

  /** Transforms the contained value. */
  map<B>(f: (a: A) => B): Identity<B> {
    return identity(f(this.value))
  }

  /** Applies a wrapped function to the contained value. */
  ap<B>(ff: Identity<(a: A) => B>): Identity<B> {
    return identity(ff.value(this.value))
  }

  /** Continues with the wrapped computation returned by the function. */
  chain<B>(f: (a: A) => Identity<B>): Identity<B> {
    return f(this.value)
  }

  /** Transforms the whole wrapper and wraps the result. */
  extend<B>(f: (w: Identity<A>) => B): Identity<B> {
    return identity(f(this))
  }

  /** Returns the contained value. */
  extract(): A {
    return this.value
  }

  /** Calls the function with the initial accumulator and the contained value. */
  reduce<Acc>(
    f: (acc: Acc, a: A) => Acc,
    init: Acc,
  ): Acc {
    return f(init, this.value)
  }

  /** Transforms the value with a wrapped computation and collects the result. */
  traverse<G extends Apply<G>>(
    _T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: A) => G,
  ): KindOf<G, Identity<SlotAOf<G>>> {
    return map((b: SlotAOf<G>) => identity(b))(f(this.value)) as KindOf<
      G,
      Identity<SlotAOf<G>>
    >
  }

  /** Compares the contained values for equality. */
  equals(that: Identity<A>): boolean {
    return equals(that.value as never)(this.value as never)
  }

  /** Checks whether this value is less than or equal to the other. */
  lte(that: Identity<A>): boolean {
    return lte(that.value as never)(this.value as never)
  }

  /** Returns a readable string representation. */
  show(): string {
    return `Identity (${show(this.value)})`
  }
}

/**
 * Wraps a value so it can be used with operations such as `map` and `chain`.
 * Use `extract` to get the value back.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.identity(1) // => Identity (1)
 * P.map((n: number) => n + 1)(P.identity(1)) // => Identity (2)
 * P.extract(P.identity(1)) // => 1
 * ```
 */
export function identity<A>(value: A): Identity<A> {
  return new Identity(value)
}
