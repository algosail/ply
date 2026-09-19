/**
 * Build equality rules and adapt them to compare objects by their properties.
 *
 * @module
 */

import type { Shape, Shaped } from '../core/shape.ts'
import type { Satisfies } from '../core/kind.ts'
import type { DecidableMethods } from '../classes/decidable.ts'
import type { DecidableTypeRep } from '../classes/decidable.ts'
import type { DivisibleTypeRep } from '../classes/divisible.ts'
import type { Either } from './either.ts'
import { either } from './either.ts'
import type { MonoidTypeRep } from '../classes/monoid.ts'
import type { SemigroupMethods } from '../classes/semigroup.ts'
import { equals } from '../classes/setoid.ts'

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
>

/** Static operations provided by the `Equivalence` representative. */
export interface EquivalenceStatics {
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
  const self = ((a: A, b: A) => run(a, b)) as unknown as Equivalence<A>
  return Object.setPrototypeOf(self, proto) as Equivalence<A>
}

const proto = Object.assign(Object.create(Function.prototype), {
  '@@type': 'Equivalence' as const,
  _shape: undefined as unknown as EquivalenceShape,
  contramap<A, X>(this: Equivalence<A>, f: (x: X) => A): Equivalence<X> {
    return equivalence<X>((x, y) => this(f(x), f(y)))
  },

  divide<C, X>(
    this: Equivalence<unknown>,
    split: (x: X) => readonly [unknown, C],
    that: Equivalence<C>,
  ): Equivalence<X> {
    return equivalence<X>((x, y) => {
      const [bx, cx] = split(x)
      const [by, cy] = split(y)
      return this(bx, by) && that(cx, cy)
    })
  },

  choose<C, X>(
    this: Equivalence<unknown>,
    split: (x: X) => Either<unknown, C>,
    that: Equivalence<C>,
  ): Equivalence<X> {
    return equivalence<X>((x, y) => {
      const ex = split(x)
      const ey = split(y)
      return either((bx: unknown) =>
        either((by: unknown) => this(bx, by))(() => false)(ey)
      )((cx: C) => either(() => false)((cy: C) => that(cx, cy))(ey))(ex)
    })
  },

  concat<A>(this: Equivalence<A>, that: Equivalence<A>): Equivalence<A> {
    return this.divide((a: A) => [a, a] as const, that)
  },
})

/**
 * The equality-rule representative. `empty(Equivalence)` and
 * `conquer(Equivalence)` create rules that consider every pair equal.
 */
export const Equivalence: EquivalenceTypeRep = {
  '@@type': 'Equivalence' as const,
  _shape: undefined as unknown as EquivalenceShape,

  empty() {
    return equivalence<unknown>(() => true)
  },

  conquer() {
    return equivalence<unknown>(() => true)
  },

  lose<X>(absurd: (x: X) => never) {
    return equivalence<X>((x) => absurd(x))
  },
}

Object.defineProperty(proto, 'constructor', { value: Equivalence })

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
