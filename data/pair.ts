/**
 * Keep two values together. Transform the second with `map`, or both with
 * `bimap`.
 *
 * @module
 */

import type { Shape, Shaped } from '../core/shape.ts'
import type { KindOf, Satisfies, ShapeOf, SlotAOf } from '../core/kind.ts'
import type { ApplicativeTypeRep } from '../classes/applicative.ts'
import type { Apply, ApplyMethods } from '../classes/apply.ts'
import type { BifunctorMethods } from '../classes/bifunctor.ts'
import type { ChainMethods } from '../classes/chain.ts'
import type { CheckableTypeRep } from '../classes/checkable.ts'
import type { ComonadMethods } from '../classes/comonad.ts'
import type { ExtendMethods } from '../classes/extend.ts'
import type { FoldableMethods } from '../classes/foldable.ts'
import type { FunctorMethods } from '../classes/functor.ts'
import type { SemigroupMethods } from '../classes/semigroup.ts'
import type { SemigroupoidMethods } from '../classes/semigroupoid.ts'
import type { TraversableMethods } from '../classes/traversable.ts'
import type { OrdMethods } from '../classes/ord.ts'
import type { SetoidMethods } from '../classes/setoid.ts'
import type { ShowMethods } from '../classes/show.ts'
import { map } from '../classes/functor.ts'
import { lte } from '../classes/ord.ts'
import { concat } from '../classes/semigroup.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'

/** The shape for Pair. Use it with `Kind` when declaring generic helpers. */
export interface PairShape extends Shape<'Pair'> {
  /** How the secondary type is combined: input, output, or an exact shared type. */
  readonly slotBVariance: 'same'
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: Pair<this['slotB'], this['slotA']>
}

/**
 * The type of the `Pair` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type PairTypeRep = Satisfies<
  PairStatics & Shaped<PairShape>,
  CheckableTypeRep<PairShape>
>

/**
 * Static operations provided by the `Pair` representative.
 */
export interface PairStatics {
  /** Checks whether an unknown value belongs to this type. */
  is(value: unknown): value is Pair<unknown, unknown>
}

/**
 * Methods available on `Pair` values.
 * Use them directly or through the corresponding standalone functions.
 */
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
  /** The name used to recognize this type in ply operations. */
  readonly '@@type': 'Pair'
  /** The shape used to type generic operations on this value. */
  readonly _shape: PairShape
  /** Declares the contained value type for inference; no runtime member is required. */
  readonly _A?: (_: never) => R
  /** Declares the secondary type for inference; no runtime member is required. */
  _B?(_: L): void
  /** The representative used to construct values of this type. */
  readonly constructor: PairTypeRep
}

/**
 * Two values kept together. `map` acts on the second; `bimap` acts on both.
 * `chain` and `ap` combine the first values, which must support `concat`.
 */
export class Pair<L, R> implements PairMethods<L, R> {
  /** The name used by generic ply operations. */
  static readonly '@@type' = 'Pair' as const
  /** The shape used for type inference; no runtime value is required. */
  declare static readonly _shape: PairShape

  static {
    Object.defineProperty(this.prototype, '@@type', { value: 'Pair' })
  }

  /** Checks whether a value was created by this class. */
  static is(value: unknown): value is Pair<unknown, unknown> {
    return value instanceof Pair
  }

  /** The name used by generic ply operations. */
  declare readonly '@@type': 'Pair'
  /** The shape used for type inference; no runtime value is required. */
  declare readonly _shape: PairShape
  /** The contained type used for inference; no runtime member is required. */
  declare readonly _A?: (_: never) => R
  /** The secondary type used for inference; no runtime member is required. */
  declare _B?: PairMethods<L, R>['_B']
  /** The representative used by generic ply operations. */
  declare readonly ['constructor']: PairTypeRep

  /** The first value. */
  readonly fst: L
  /** The second value. */
  readonly snd: R
  /** Keeps two values together. */
  constructor(fst: L, snd: R) {
    this.fst = fst
    this.snd = snd
  }

  /** Transforms the second value. */
  map<B>(f: (a: R) => B): Pair<L, B> {
    return pair(this.fst, f(this.snd))
  }

  /** Applies the supplied pair’s function and combines the first values. */
  ap<B>(ff: Pair<L, (a: R) => B>): Pair<L, B> {
    return pair(
      concat(ff.fst as never)(this.fst as never) as L,
      ff.snd(this.snd),
    )
  }

  /** Continues with a new pair, combining the first values. */
  chain<B>(f: (a: R) => Pair<L, B>): Pair<L, B> {
    const that = f(this.snd)
    return pair(
      concat(this.fst as never)(that.fst as never) as L,
      that.snd,
    )
  }

  /** Keeps this pair’s first value and the other pair’s second value. */
  compose<K>(that: Pair<R, K>): Pair<L, K> {
    return pair(this.fst, that.snd)
  }

  /** Transforms the whole pair, preserving its first value. */
  extend<B>(f: (w: Pair<L, R>) => B): Pair<L, B> {
    return pair(this.fst, f(this))
  }

  /** Returns the second value. */
  extract(): R {
    return this.snd
  }

  /** Transforms both values with their respective functions. */
  bimap<M, B>(
    f: (l: L) => M,
    g: (a: R) => B,
  ): Pair<M, B> {
    return pair(f(this.fst), g(this.snd))
  }

  /** Calls the function with the initial accumulator and the second value. */
  reduce<Acc>(
    f: (acc: Acc, a: R) => Acc,
    init: Acc,
  ): Acc {
    return f(init, this.snd)
  }

  /** Transforms the second value with a wrapped computation and collects the result. */
  traverse<G extends Apply<G>>(
    _T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: R) => G,
  ): KindOf<G, Pair<L, SlotAOf<G>>> {
    const left = this.fst
    return map((b: SlotAOf<G>) => pair(left, b))(f(this.snd)) as KindOf<
      G,
      Pair<L, SlotAOf<G>>
    >
  }

  /** Combines the first values and the second values. */
  concat(that: Pair<L, R>): Pair<L, R> {
    return pair(
      concat(this.fst as never)(that.fst as never) as L,
      concat(this.snd as never)(that.snd as never) as R,
    )
  }

  /** Compares the contained values for equality. */
  equals(that: Pair<L, R>): boolean {
    return equals(that.fst as never)(this.fst as never) &&
      equals(that.snd as never)(this.snd as never)
  }

  /** Checks whether this value is less than or equal to the other. */
  lte(that: Pair<L, R>): boolean {
    return equals(that.fst as never)(this.fst as never)
      ? lte(that.snd as never)(this.snd as never)
      : lte(that.fst as never)(this.fst as never)
  }

  /** Returns a readable string representation. */
  show(): string {
    return `Pair (${show(this.fst)}) (${show(this.snd)})`
  }
}

/**
 * Creates a pair of values. `map` transforms the second value.
 * Use `bimap` to transform both.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.pair('log', 1) // => Pair ("log") (1)
 * ```
 */
export function pair<L, R>(fst: L, snd: R): Pair<L, R> {
  return new Pair(fst, snd)
}

/**
 * Returns the first value of a pair.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fst(P.pair('log', 1)) // => 'log'
 * ```
 */
export function fst<L, R>(p: Pair<L, R>): L {
  return p.fst
}

/**
 * Returns the second value of a pair.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.snd(P.pair('log', 1)) // => 1
 * ```
 */
export function snd<L, R>(p: Pair<L, R>): R {
  return p.snd
}

/**
 * Exchanges the first and second values of a pair.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.swap(P.pair('log', 1)) // => Pair (1) ("log")
 * ```
 */
export function swap<L, R>(p: Pair<L, R>): Pair<R, L> {
  return pair(p.snd, p.fst)
}

/**
 * Creates a pair containing the supplied value in both positions.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.diagonal(2) // => Pair (2) (2)
 * ```
 */
export function diagonal<A>(a: A): Pair<A, A> {
  return pair(a, a)
}

/**
 * Applies a curried two-argument function to the two values of a pair.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.uncurry((l: number) => (r: number) => l + r)(P.pair(1, 2)) // => 3
 * ```
 */
export function uncurry<L, R, C>(
  f: (l: L) => (r: R) => C,
): (p: Pair<L, R>) => C {
  return (p) => f(p.fst)(p.snd)
}

/**
 * Converts a two-element tuple into a ply pair.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromTuple(['log', 1] as const) // => Pair ("log") (1)
 * ```
 */
export function fromTuple<L, R>(t: readonly [L, R]): Pair<L, R> {
  return pair(t[0], t[1])
}

/**
 * Converts a ply pair into a two-element tuple.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.toTuple(P.pair('log', 1)) // => ['log', 1]
 * ```
 */
export function toTuple<L, R>(p: Pair<L, R>): [L, R] {
  return [p.fst, p.snd]
}
