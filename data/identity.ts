/**
 * Wrap a single value for use with `map`, `chain`, and `traverse`.
 * Use `extract` to unwrap it.
 *
 * @module
 */

import type { Shape, Shaped } from '../core/shape.ts'
import type { KindOf, Satisfies, ShapeOf, SlotAOf } from '../core/kind.ts'
import type { Apply, ApplyMethods } from '../classes/apply.ts'
import type { TraversableMethods } from '../classes/traversable.ts'
import type { ApplicativeTypeRep } from '../classes/applicative.ts'
import type { ChainMethods } from '../classes/chain.ts'
import type { ExtendMethods } from '../classes/extend.ts'
import type { ComonadMethods } from '../classes/comonad.ts'
import type { FoldableMethods } from '../classes/foldable.ts'
import type { FunctorMethods } from '../classes/functor.ts'
import type { OrdMethods } from '../classes/ord.ts'
import type { SetoidMethods } from '../classes/setoid.ts'
import type { ShowMethods } from '../classes/show.ts'
import { map } from '../classes/functor.ts'
import { equals } from '../classes/setoid.ts'
import { lte } from '../classes/ord.ts'
import { show } from '../classes/show.ts'

/**
 * A single wrapped value. Use `map` to transform it and `extract` to unwrap
 * it.
 */
export interface Identity<A> extends IdentityMethods<A> {
  /** The contained value. */
  readonly value: A
}

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
  ApplicativeTypeRep<IdentityShape>
>

/** Static operations provided by the `Identity` representative. */
export interface IdentityStatics {
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

type IdentityProto = Omit<
  Identity<unknown>,
  '_shape' | '_A' | 'value' | 'constructor'
>

const proto: IdentityProto = {
  '@@type': 'Identity' as const,

  map<A, B>(this: Identity<A>, f: (a: A) => B): Identity<B> {
    return identity(f(this.value))
  },

  ap<A, B>(this: Identity<A>, ff: Identity<(a: A) => B>): Identity<B> {
    return identity(ff.value(this.value))
  },

  chain<A, B>(this: Identity<A>, f: (a: A) => Identity<B>): Identity<B> {
    return f(this.value)
  },

  extend<A, B>(this: Identity<A>, f: (w: Identity<A>) => B): Identity<B> {
    return identity(f(this))
  },

  extract<A>(this: Identity<A>): A {
    return this.value
  },

  reduce<A, Acc>(
    this: Identity<A>,
    f: (acc: Acc, a: A) => Acc,
    init: Acc,
  ): Acc {
    return f(init, this.value)
  },

  traverse<A, G extends Apply<G>>(
    this: Identity<A>,
    _T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: A) => G,
  ): KindOf<G, Identity<SlotAOf<G>>> {
    return map((b: SlotAOf<G>) => identity(b))(f(this.value)) as KindOf<
      G,
      Identity<SlotAOf<G>>
    >
  },

  equals<A>(this: Identity<A>, that: Identity<A>): boolean {
    return equals(that.value as never)(this.value as never)
  },

  lte<A>(this: Identity<A>, that: Identity<A>): boolean {
    return lte(that.value as never)(this.value as never)
  },

  show<A>(this: Identity<A>): string {
    return `Identity (${show(this.value)})`
  },
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
  return Object.assign(Object.create(proto) as Identity<A>, {
    value,
  })
}

/**
 * The single-value representative. Pass it to `of` or `traverse` to choose
 * `Identity`.
 */
export const Identity: IdentityTypeRep = {
  '@@type': 'Identity' as const,
  _shape: undefined as unknown as IdentityShape,
  of: identity,
}

Object.defineProperty(proto, 'constructor', { value: Identity })
