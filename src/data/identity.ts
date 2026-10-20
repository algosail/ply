import type { ApplicativeTypeRep } from '../classes/applicative.ts'
import type { Apply, ApplyMethods } from '../classes/apply.ts'
import type { ChainMethods } from '../classes/chain.ts'
import type { CheckableTypeRep } from '../classes/checkable.ts'
import type { ComonadMethods } from '../classes/comonad.ts'
import type { ExtendMethods } from '../classes/extend.ts'
import type { FoldableMethods } from '../classes/foldable.ts'
import type { FunctorMethods } from '../classes/functor.ts'
import type { OrdMethods } from '../classes/ord.ts'
import type { SetoidMethods } from '../classes/setoid.ts'
import type { ShowMethods } from '../classes/show.ts'
import type { TraversableMethods } from '../classes/traversable.ts'
import type { KindOf, Satisfies, ShapeOf, SlotAOf } from '../core/kind.ts'
import type { Shape, Shaped } from '../core/shape.ts'
import { map } from '../classes/functor.ts'
import { lte } from '../classes/ord.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'

/** The shape for Identity. */
export interface IdentityShape extends Shape<'Identity'> {
  readonly out: Identity<this['slotA']>
}

/** The type of the `Identity` representative. */
export type IdentityTypeRep = Satisfies<
  IdentityStatics & Shaped<IdentityShape>,
  & ApplicativeTypeRep<IdentityShape>
  & CheckableTypeRep<IdentityShape>
>

/** Static operations provided by the `Identity` representative. */
export interface IdentityStatics {
  is(value: unknown): value is Identity<unknown>
  of<A>(a: A): Identity<A>
}

/** Methods available on `Identity` values. */
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
  readonly '@@type': 'Identity'
  readonly _shape: IdentityShape
  readonly constructor: IdentityTypeRep
  readonly _A?: (_: never) => A
}

/** A single wrapped value. */
export class Identity<A> implements IdentityMethods<A> {
  declare static readonly _shape: IdentityShape
  declare readonly '@@type': 'Identity'
  declare readonly _shape: IdentityShape
  declare readonly ['constructor']: IdentityTypeRep
  declare readonly _A?: (_: never) => A

  static readonly '@@type' = 'Identity' as const

  static is(value: unknown): value is Identity<unknown> {
    return value instanceof Identity
  }

  static of<A>(value: A): Identity<A> {
    return identity (value)
  }

  readonly value: A

  constructor(value: A) {
    this.value = value
  }

  map<B>(f: (a: A) => B): Identity<B> {
    return identity (f (this.value))
  }

  ap<B>(ff: Identity<(a: A) => B>): Identity<B> {
    return identity (ff.value (this.value))
  }

  chain<B>(f: (a: A) => Identity<B>): Identity<B> {
    return f (this.value)
  }

  extend<B>(f: (w: Identity<A>) => B): Identity<B> {
    return identity (f (this))
  }

  extract(): A {
    return this.value
  }

  reduce<Acc>(f: (acc: Acc, a: A) => Acc, init: Acc): Acc {
    return f (init, this.value)
  }

  traverse<G extends Apply<G>>(
    _T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: A) => G,
  ): KindOf<G, Identity<SlotAOf<G>>> {
    return map ((b: SlotAOf<G>) => identity (b)) (f (this.value)) as KindOf<
      G,
      Identity<SlotAOf<G>>
    >
  }

  equals(that: Identity<A>): boolean {
    return equals (that.value as never) (this.value as never)
  }

  lte(that: Identity<A>): boolean {
    return lte (that.value as never) (this.value as never)
  }

  show(): string {
    return `Identity (${show (this.value)})`
  }
}

/**
 * Wraps a value so it can be used with operations such as `map` and `chain`.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.identity (1) // => Identity (1)
 * P.map ((n: number) => n + 1) (P.identity (1)) // => Identity (2)
 * P.extract (P.identity (1)) // => 1
 * ```
 */
export function identity<A>(value: A): Identity<A> {
  return new Identity (value)
}
