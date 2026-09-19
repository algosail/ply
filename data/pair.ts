/**
 * Keep two values together. Transform the second with `map`, or both with
 * `bimap`.
 *
 * @module
 */

import type { Shape, Shaped } from '../core/shape.ts'
import type { KindOf, ShapeOf, SlotAOf } from '../core/kind.ts'
import type { Apply, ApplyMethods } from '../classes/apply.ts'
import type { ChainMethods } from '../classes/chain.ts'
import type { SemigroupoidMethods } from '../classes/semigroupoid.ts'
import type { TraversableMethods } from '../classes/traversable.ts'
import type { ApplicativeTypeRep } from '../classes/applicative.ts'
import type { BifunctorMethods } from '../classes/bifunctor.ts'
import type { ExtendMethods } from '../classes/extend.ts'
import type { ComonadMethods } from '../classes/comonad.ts'
import type { FoldableMethods } from '../classes/foldable.ts'
import type { FunctorMethods } from '../classes/functor.ts'
import type { OrdMethods } from '../classes/ord.ts'
import type { SemigroupMethods } from '../classes/semigroup.ts'
import type { SetoidMethods } from '../classes/setoid.ts'
import type { ShowMethods } from '../classes/show.ts'
import { map } from '../classes/functor.ts'
import { lte } from '../classes/ord.ts'
import { concat } from '../classes/semigroup.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'

/**
 * Two values kept together. `map` acts on the second; `bimap` acts on both.
 * `chain` and `ap` combine the first values, which must support `concat`.
 */
export interface Pair<L, R> extends PairMethods<L, R> {
  /** The first value. */
  readonly fst: L
  /** The second value. */
  readonly snd: R
}

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
export type PairTypeRep = PairStatics & Shaped<PairShape>

/**
 * No static constructors are required for `Pair`; create values with `pair`.
 */
// deno-lint-ignore no-empty-interface
export interface PairStatics {}

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

type PairProto = Omit<
  Pair<unknown, unknown>,
  '_shape' | '_A' | '_B' | 'fst' | 'snd' | 'constructor'
>

const proto: PairProto = {
  '@@type': 'Pair' as const,

  map<L, R, B>(this: Pair<L, R>, f: (a: R) => B): Pair<L, B> {
    return pair(this.fst, f(this.snd))
  },

  ap<L, R, B>(this: Pair<L, R>, ff: Pair<L, (a: R) => B>): Pair<L, B> {
    return pair(
      concat(ff.fst as never)(this.fst as never) as L,
      ff.snd(this.snd),
    )
  },

  chain<L, R, B>(this: Pair<L, R>, f: (a: R) => Pair<L, B>): Pair<L, B> {
    const that = f(this.snd)
    return pair(
      concat(this.fst as never)(that.fst as never) as L,
      that.snd,
    )
  },

  compose<L, R, K>(this: Pair<L, R>, that: Pair<R, K>): Pair<L, K> {
    return pair(this.fst, that.snd)
  },

  extend<L, R, B>(this: Pair<L, R>, f: (w: Pair<L, R>) => B): Pair<L, B> {
    return pair(this.fst, f(this))
  },

  extract<L, R>(this: Pair<L, R>): R {
    return this.snd
  },

  bimap<L, R, M, B>(
    this: Pair<L, R>,
    f: (l: L) => M,
    g: (a: R) => B,
  ): Pair<M, B> {
    return pair(f(this.fst), g(this.snd))
  },

  reduce<L, R, Acc>(
    this: Pair<L, R>,
    f: (acc: Acc, a: R) => Acc,
    init: Acc,
  ): Acc {
    return f(init, this.snd)
  },

  traverse<L, R, G extends Apply<G>>(
    this: Pair<L, R>,
    _T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: R) => G,
  ): KindOf<G, Pair<L, SlotAOf<G>>> {
    const left = this.fst
    return map((b: SlotAOf<G>) => pair(left, b))(f(this.snd)) as KindOf<
      G,
      Pair<L, SlotAOf<G>>
    >
  },

  concat<L, R>(this: Pair<L, R>, that: Pair<L, R>): Pair<L, R> {
    return pair(
      concat(this.fst as never)(that.fst as never) as L,
      concat(this.snd as never)(that.snd as never) as R,
    )
  },

  equals<L, R>(this: Pair<L, R>, that: Pair<L, R>): boolean {
    return equals(that.fst as never)(this.fst as never) &&
      equals(that.snd as never)(this.snd as never)
  },

  lte<L, R>(this: Pair<L, R>, that: Pair<L, R>): boolean {
    return equals(that.fst as never)(this.fst as never)
      ? lte(that.snd as never)(this.snd as never)
      : lte(that.fst as never)(this.fst as never)
  },

  show<L, R>(this: Pair<L, R>): string {
    return `Pair (${show(this.fst)}) (${show(this.snd)})`
  },
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
  return Object.assign(Object.create(proto) as Pair<L, R>, { fst, snd })
}

/** The representative identifying ply pairs. Create values with `pair`. */
export const Pair: PairTypeRep = {
  '@@type': 'Pair' as const,
  _shape: undefined as unknown as PairShape,
}

Object.defineProperty(proto, 'constructor', { value: Pair })

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
