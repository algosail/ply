import type { ApplicativeTypeRep } from '../classes/applicative.ts'
import type { Apply, ApplyMethods } from '../classes/apply.ts'
import type { BifunctorMethods } from '../classes/bifunctor.ts'
import type { ChainMethods } from '../classes/chain.ts'
import type { CheckableTypeRep } from '../classes/checkable.ts'
import type { ComonadMethods } from '../classes/comonad.ts'
import type { ExtendMethods } from '../classes/extend.ts'
import type { FoldableMethods } from '../classes/foldable.ts'
import type { FunctorMethods } from '../classes/functor.ts'
import type { OrdMethods } from '../classes/ord.ts'
import type { SemigroupMethods } from '../classes/semigroup.ts'
import type { SemigroupoidMethods } from '../classes/semigroupoid.ts'
import type { SetoidMethods } from '../classes/setoid.ts'
import type { ShowMethods } from '../classes/show.ts'
import type { TraversableMethods } from '../classes/traversable.ts'
import type { KindOf, Satisfies, ShapeOf, SlotAOf } from '../core/kind.ts'
import type { Shape, Shaped } from '../core/shape.ts'
import { map } from '../classes/functor.ts'
import { lte } from '../classes/ord.ts'
import { concat } from '../classes/semigroup.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'

/** The shape for Pair. */
export interface PairShape extends Shape<'Pair'> {
  readonly slotBVariance: 'same'
  readonly out: Pair<this['slotB'], this['slotA']>
}

/** The type of the `Pair` representative. */
export type PairTypeRep = Satisfies<
  PairStatics & Shaped<PairShape>,
  CheckableTypeRep<PairShape>
>

/** Static operations provided by the `Pair` representative. */
export interface PairStatics {
  is(value: unknown): value is Pair<unknown, unknown>
}

/** Methods available on `Pair` values. */
export interface PairMethods<L, R>
  extends
    SetoidMethods<Pair<L, R>, R, L>,
    OrdMethods<Pair<L, R>, R, L>,
    ShowMethods<Pair<L, R>, R, L>,
    SemigroupMethods<Pair<L, R>, R, L>,
    SemigroupoidMethods<Pair<L, R>, R, L>,
    FunctorMethods<Pair<L, R>, R, L>,
    ApplyMethods<Pair<L, R>, R, L>,
    ChainMethods<Pair<L, R>, R, L>,
    BifunctorMethods<Pair<L, R>, R, L>,
    FoldableMethods<Pair<L, R>, R, L>,
    TraversableMethods<Pair<L, R>, R, L>,
    ExtendMethods<Pair<L, R>, R, L>,
    ComonadMethods<Pair<L, R>, R, L> {
  readonly '@@type': 'Pair'
  readonly _shape: PairShape
  readonly constructor: PairTypeRep
  readonly _A?: (_: never) => R
  _B?(_: L): void
}

/** Two values kept together. */
export class Pair<L, R> implements PairMethods<L, R> {
  declare static readonly _shape: PairShape
  declare readonly '@@type': 'Pair'
  declare readonly _shape: PairShape
  declare readonly ['constructor']: PairTypeRep
  declare readonly _A?: (_: never) => R
  declare _B?: PairMethods<L, R>['_B']

  static readonly '@@type' = 'Pair' as const

  static is(value: unknown): value is Pair<unknown, unknown> {
    return value instanceof Pair
  }

  readonly fst: L
  readonly snd: R

  constructor(fst: L, snd: R) {
    this.fst = fst
    this.snd = snd
  }

  map<B>(f: (a: R) => B): Pair<L, B> {
    return pair (this.fst, f (this.snd))
  }

  ap<B>(ff: Pair<L, (a: R) => B>): Pair<L, B> {
    return pair (
      concat (ff.fst as never) (this.fst as never) as L,
      ff.snd (this.snd),
    )
  }

  chain<B>(f: (a: R) => Pair<L, B>): Pair<L, B> {
    const that = f (this.snd)
    return pair (
      concat (this.fst as never) (that.fst as never) as L,
      that.snd,
    )
  }

  compose<K>(that: Pair<R, K>): Pair<L, K> {
    return pair (this.fst, that.snd)
  }

  extend<B>(f: (w: Pair<L, R>) => B): Pair<L, B> {
    return pair (this.fst, f (this))
  }

  extract(): R {
    return this.snd
  }

  bimap<M, B>(
    f: (l: L) => M,
    g: (a: R) => B,
  ): Pair<M, B> {
    return pair (f (this.fst), g (this.snd))
  }

  reduce<Acc>(
    f: (acc: Acc, a: R) => Acc,
    init: Acc,
  ): Acc {
    return f (init, this.snd)
  }

  traverse<G extends Apply<G>>(
    _T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: R) => G,
  ): KindOf<G, Pair<L, SlotAOf<G>>> {
    const left = this.fst
    return map ((b: SlotAOf<G>) => pair (left, b)) (f (this.snd)) as KindOf<
      G,
      Pair<L, SlotAOf<G>>
    >
  }

  concat(that: Pair<L, R>): Pair<L, R> {
    return pair (
      concat (this.fst as never) (that.fst as never) as L,
      concat (this.snd as never) (that.snd as never) as R,
    )
  }

  equals(that: Pair<L, R>): boolean {
    return equals (that.fst as never) (this.fst as never) &&
      equals (that.snd as never) (this.snd as never)
  }

  lte(that: Pair<L, R>): boolean {
    return equals (that.fst as never) (this.fst as never)
      ? lte (that.snd as never) (this.snd as never)
      : lte (that.fst as never) (this.fst as never)
  }

  show(): string {
    return `Pair (${show (this.fst)}) (${show (this.snd)})`
  }
}

/**
 * Creates a pair of values.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.pair ('log', 1) // => Pair ("log") (1)
 * ```
 */
export function pair<L, R>(fst: L, snd: R): Pair<L, R> {
  return new Pair (fst, snd)
}

/**
 * Returns the first value of a pair.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fst (P.pair ('log', 1)) // => 'log'
 * ```
 */
export function fst<L, R>(p: Pair<L, R>): L {
  return p.fst
}

/**
 * Returns the second value of a pair.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.snd (P.pair ('log', 1)) // => 1
 * ```
 */
export function snd<L, R>(p: Pair<L, R>): R {
  return p.snd
}

/**
 * Exchanges the first and second values of a pair.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.swap (P.pair ('log', 1)) // => Pair (1) ("log")
 * ```
 */
export function swap<L, R>(p: Pair<L, R>): Pair<R, L> {
  return pair (p.snd, p.fst)
}

/**
 * Creates a pair containing the supplied value in both positions.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.diagonal (2) // => Pair (2) (2)
 * ```
 */
export function diagonal<A>(a: A): Pair<A, A> {
  return pair (a, a)
}

/**
 * Applies a curried two-argument function to the two values of a pair.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.uncurry ((l: number) => (r: number) => l + r) (P.pair (1, 2)) // => 3
 * ```
 */
export function uncurry<L, R, C>(f: (l: L) => (r: R) => C) {
  return (p: Pair<L, R>): C => f (p.fst) (p.snd)
}

/**
 * Converts a two-element tuple into a ply pair.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromTuple (['log', 1] as const) // => Pair ("log") (1)
 * ```
 */
export function fromTuple<L, R>(t: readonly [L, R]): Pair<L, R> {
  return pair (t[0], t[1])
}

/**
 * Converts a ply pair into a two-element tuple.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.toTuple (P.pair ('log', 1)) // => ['log', 1]
 * ```
 */
export function toTuple<L, R>(p: Pair<L, R>): [L, R] {
  return [p.fst, p.snd]
}
