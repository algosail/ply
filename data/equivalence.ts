/**
 * Build equality rules and adapt them to compare objects by their properties.
 *
 * @module
 */

import type { Shape, Shaped } from '../core/shape.ts'
import type { Satisfies } from '../core/kind.ts'
import type { CheckableTypeRep } from '../classes/checkable.ts'
import type { DecidableMethods } from '../classes/decidable.ts'
import type { DecidableTypeRep } from '../classes/decidable.ts'
import type { DivisibleTypeRep } from '../classes/divisible.ts'
import type { MonoidTypeRep } from '../classes/monoid.ts'
import type { SemigroupMethods } from '../classes/semigroup.ts'
import type { Either } from './either.ts'
import { equals } from '../classes/setoid.ts'
import { either } from './either.ts'

/** A callable equality rule for two values, adaptable with `contramap`. */
export interface Equivalence<A> extends EquivalenceMethods<A> {
  (a: A, b: A): boolean
}

/**
 * The shape for Equivalence. Use it with `Kind` when declaring generic
 * helpers.
 */
export interface EquivalenceShape extends Shape<'Equivalence'> {
  /** How the secondary type is combined: input, output, or an exact shared type. */
  readonly slotBVariance: 'in'
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: Equivalence<this['slotB']>
}

/**
 * The type of the `Equivalence` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type EquivalenceTypeRep = Satisfies<
  EquivalenceStatics & Shaped<EquivalenceShape>,
  & MonoidTypeRep<EquivalenceShape, unknown>
  & DivisibleTypeRep<EquivalenceShape, unknown>
  & DecidableTypeRep<EquivalenceShape, unknown>
  & CheckableTypeRep<EquivalenceShape>
>

/** Static operations provided by the `Equivalence` representative. */
export interface EquivalenceStatics {
  /** Checks whether an unknown value belongs to this type. */
  is(value: unknown): value is Equivalence<unknown>
  /** Creates a rule that always returns `true`. */
  empty(): Equivalence<unknown>
  /** Creates a rule that always passes. */
  conquer(): Equivalence<unknown>
  /** Creates a rule for an unreachable input using a function that cannot return. */
  lose<X>(absurd: (x: X) => never): Equivalence<X>
}

/**
 * Methods available on `Equivalence` values.
 * Use them directly or through the corresponding standalone functions.
 */
export interface EquivalenceMethods<A>
  extends
    DecidableMethods<Equivalence<A>, boolean, A>,
    SemigroupMethods<Equivalence<A>, boolean, A> {
  /** The name used to recognize this type in ply operations. */
  readonly '@@type': 'Equivalence'
  /** The shape used to type generic operations on this value. */
  readonly _shape: EquivalenceShape
  /** Declares the contained value type for inference; no runtime member is required. */
  readonly _A?: (_: never) => boolean
  /** Declares the secondary type for inference; no runtime member is required. */
  _B?(_: A): void
  /** The representative used to construct values of this type. */
  readonly constructor: EquivalenceTypeRep
}

/**
 * Creates a callable equality rule for two values.
 * Use `contramap` to compare objects by a property.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const sameCents = P.equivalence<number>(
 *   (a, b) => Math.round(a * 100) === Math.round(b * 100),
 * )
 * sameCents(1.004, 1.0041) // => true
 * sameCents(1.004, 1.009) // => false
 * ```
 */
export function equivalence<A>(
  run: (a: A, b: A) => boolean,
): Equivalence<A> {
  return new Equivalence(run)
}

/**
 * The equality-rule representative. `empty(Equivalence)` and
 * `conquer(Equivalence)` create rules that consider every pair equal.
 */
export class Equivalence<A> implements EquivalenceMethods<A> {
  /** The name used by generic ply operations. */
  static readonly '@@type' = 'Equivalence' as const
  /** The shape used for type inference; no runtime value is required. */
  declare static readonly _shape: EquivalenceShape

  static {
    Object.setPrototypeOf(this.prototype, Function.prototype)
    Object.defineProperty(this.prototype, '@@type', { value: 'Equivalence' })
  }

  /** Checks whether a value was created by this class. */
  static is(value: unknown): value is Equivalence<unknown> {
    return value instanceof Equivalence
  }

  /** Creates a rule that always returns true. */
  static empty(): Equivalence<unknown> {
    return equivalence<unknown>(() => true)
  }
  /** Creates a rule that always returns true. */
  static conquer(): Equivalence<unknown> {
    return equivalence<unknown>(() => true)
  }
  /** Creates a rule for an unreachable input using a function that cannot return. */
  static lose<X>(absurd: (x: X) => never): Equivalence<X> {
    return equivalence<X>((x) => absurd(x))
  }

  /** Creates a callable equality rule from a comparison function. */
  constructor(run: (a: A, b: A) => boolean) {
    const self = (a: A, b: A) => run(a, b)
    return Object.setPrototypeOf(self, new.target.prototype)
  }

  /** Transforms both inputs before comparing them. */
  contramap<X>(f: (x: X) => A): Equivalence<X> {
    return equivalence<X>((x, y) => this(f(x), f(y)))
  }

  /** Splits both inputs and requires both comparisons to pass. */
  divide<C, X>(
    split: (x: X) => readonly [A, C],
    that: Equivalence<C>,
  ): Equivalence<X> {
    return equivalence<X>((x, y) => {
      const [bx, cx] = split(x)
      const [by, cy] = split(y)
      return this(bx, by) && that(cx, cy)
    })
  }

  /** Compares inputs using the rule for their matching Left or Right branch. */
  choose<C, X>(
    split: (x: X) => Either<A, C>,
    that: Equivalence<C>,
  ): Equivalence<X> {
    return equivalence<X>((x, y) => {
      const ex = split(x)
      const ey = split(y)
      return either((bx: A) =>
        either((by: A) => this(bx, by))(() => false)(ey)
      )((cx: C) => either(() => false)((cy: C) => that(cx, cy))(ey))(ex)
    })
  }

  /** Requires both equality rules to pass, stopping at the first failure. */
  concat(that: Equivalence<A>): Equivalence<A> {
    return this.divide((a: A) => [a, a] as const, that)
  }
}

/**
 * Creates an equality rule using ply's `equals`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const sameTags = P.equivalenceByEquals<readonly string[]>()
 * sameTags(['rush'], ['rush']) // => true
 * ```
 */
export function equivalenceByEquals<A>(): Equivalence<A> {
  return equivalence<A>((a, b) => equals(b as never)(a as never))
}
