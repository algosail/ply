import type { CheckableTypeRep } from '../classes/checkable.ts'
import type { DecidableMethods } from '../classes/decidable.ts'
import type { DecidableTypeRep } from '../classes/decidable.ts'
import type { DivisibleTypeRep } from '../classes/divisible.ts'
import type { MonoidTypeRep } from '../classes/monoid.ts'
import type { SemigroupMethods } from '../classes/semigroup.ts'
import type { Satisfies } from '../core/kind.ts'
import type { Shape, Shaped } from '../core/shape.ts'
import type { Either } from './either.ts'
import { equals } from '../classes/setoid.ts'
import { either } from './either.ts'

/** A callable equality rule for two values, adaptable with `contramap`. */
export interface Equivalence<A> extends EquivalenceMethods<A> {
  (a: A, b: A): boolean
}

/** The shape for Equivalence.  */
export interface EquivalenceShape extends Shape<'Equivalence'> {
  readonly slotBVariance: 'in'
  readonly out: Equivalence<this['slotB']>
}

/** The type of the `Equivalence` representative. */
export type EquivalenceTypeRep = Satisfies<
  EquivalenceStatics & Shaped<EquivalenceShape>,
  & MonoidTypeRep<EquivalenceShape, unknown>
  & DivisibleTypeRep<EquivalenceShape, unknown>
  & DecidableTypeRep<EquivalenceShape, unknown>
  & CheckableTypeRep<EquivalenceShape>
>

/** Static operations provided by the `Equivalence` representative. */
export interface EquivalenceStatics {
  is(value: unknown): value is Equivalence<unknown>
  empty(): Equivalence<unknown>
  conquer(): Equivalence<unknown>
  lose<X>(absurd: (x: X) => never): Equivalence<X>
}

/** Methods available on `Equivalence` values. */
export interface EquivalenceMethods<A>
  extends
    DecidableMethods<Equivalence<A>, boolean, A>,
    SemigroupMethods<Equivalence<A>, boolean, A> {
  readonly '@@type': 'Equivalence'
  readonly _shape: EquivalenceShape
  readonly constructor: EquivalenceTypeRep
  readonly _A?: (_: never) => boolean
  _B?(_: A): void
}

/** The equality-rule representative. */
export class Equivalence<A> implements EquivalenceMethods<A> {
  declare static readonly _shape: EquivalenceShape
  static readonly '@@type' = 'Equivalence' as const

  static {
    Object.setPrototypeOf (this.prototype, Function.prototype)
  }

  static is(value: unknown): value is Equivalence<unknown> {
    return value instanceof Equivalence
  }

  static empty(): Equivalence<unknown> {
    return equivalence<unknown> (() => true)
  }

  static conquer(): Equivalence<unknown> {
    return equivalence<unknown> (() => true)
  }

  static lose<X>(absurd: (x: X) => never): Equivalence<X> {
    return equivalence<X> ((x) => absurd (x))
  }

  constructor(run: (a: A, b: A) => boolean) {
    const self = (a: A, b: A) => run (a, b)
    return Object.setPrototypeOf (self, new.target.prototype)
  }

  contramap<X>(f: (x: X) => A): Equivalence<X> {
    return equivalence<X> ((x, y) => this (f (x), f (y)))
  }

  divide<C, X>(
    split: (x: X) => readonly [A, C],
    that: Equivalence<C>,
  ): Equivalence<X> {
    return equivalence<X> ((x, y) => {
      const [bx, cx] = split (x)
      const [by, cy] = split (y)
      return this (bx, by) && that (cx, cy)
    })
  }

  choose<C, X>(
    split: (x: X) => Either<A, C>,
    that: Equivalence<C>,
  ): Equivalence<X> {
    return equivalence<X> ((x, y) => {
      const ex = split (x)
      const ey = split (y)
      return either ((bx: A) =>
        either ((by: A) => this (bx, by)) (() => false) (ey),
      ) ((cx: C) => either (() => false) ((cy: C) => that (cx, cy)) (ey)) (ex)
    })
  }

  concat(that: Equivalence<A>): Equivalence<A> {
    return this.divide ((a: A) => [a, a] as const, that)
  }
}

/**
 * Creates a callable equality rule for two values.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const sameCents = P.equivalence<number> (
 *   (a, b) => Math.round (a * 100) === Math.round (b * 100),
 * )
 * sameCents (1.004, 1.0041) // => true
 * sameCents (1.004, 1.009) // => false
 * ```
 */
export function equivalence<A>(
  run: (a: A, b: A) => boolean,
): Equivalence<A> {
  return new Equivalence (run)
}

/**
 * Creates an equality rule using ply's `equals`.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 * const sameTags = P.equivalenceByEquals<readonly string[]> ()
 * sameTags (['rush'], ['rush']) // => true
 * ```
 */
export function equivalenceByEquals<A>(): Equivalence<A> {
  return equivalence<A> ((a, b) => equals (b as never) (a as never))
}
