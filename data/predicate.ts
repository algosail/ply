/**
 * Build reusable validation rules, adapt them to properties, and combine them.
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

/**
 * A callable test that can be adapted with `contramap` and combined with
 * `divide`.
 */
export interface Predicate<A> extends PredicateMethods<A> {
  (a: A): boolean
}

/**
 * The shape for Predicate. Use it with `Kind` when declaring generic helpers.
 */
export interface PredicateShape extends Shape<'Predicate'> {
  /** How the secondary type is combined: input, output, or an exact shared type. */
  readonly slotBVariance: 'in'
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: Predicate<this['slotB']>
}

/**
 * The type of the `Predicate` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type PredicateTypeRep = Satisfies<
  PredicateStatics & Shaped<PredicateShape>,
  & MonoidTypeRep<PredicateShape, unknown>
  & DivisibleTypeRep<PredicateShape, unknown>
  & DecidableTypeRep<PredicateShape, unknown>
>

/** Static operations provided by the `Predicate` representative. */
export interface PredicateStatics {
  /** Creates a rule that always returns `true`. */
  empty(): Predicate<unknown>
  /** Creates a rule that always passes. */
  conquer(): Predicate<unknown>
  /** Creates a rule for an unreachable input using a function that cannot return. */
  lose<X>(absurd: (x: X) => never): Predicate<X>
}

/**
 * Methods available on `Predicate` values.
 * Use them directly or through the corresponding standalone functions.
 */
export interface PredicateMethods<A>
  extends
    DecidableMethods<Predicate<A>, boolean, A>,
    SemigroupMethods<Predicate<A>, boolean, A> {
  /** The name used to recognize this type in ply operations. */
  readonly '@@type': 'Predicate'
  /** The shape used to type generic operations on this value. */
  readonly _shape: PredicateShape
  /** Declares the contained value type for inference; no runtime member is required. */
  readonly _A?: (_: never) => boolean
  /** Declares the secondary type for inference; no runtime member is required. */
  _B?(_: A): void
  /** The representative used to construct values of this type. */
  readonly constructor: PredicateTypeRep
}

/**
 * Creates a callable predicate that can be adapted and combined with other
 * rules.
 * Use `contramap` to check a property and `divide` to combine checks.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate((s: string) => s.length > 3)
 * long('hello') // => true
 * ```
 */
export function predicate<A>(run: (a: A) => boolean): Predicate<A> {
  const self = ((a: A) => run(a)) as unknown as Predicate<A>
  return Object.setPrototypeOf(self, proto) as Predicate<A>
}

const proto = Object.assign(Object.create(Function.prototype), {
  '@@type': 'Predicate' as const,
  _shape: undefined as unknown as PredicateShape,

  contramap<A, X>(this: Predicate<A>, f: (x: X) => A): Predicate<X> {
    return predicate<X>((x) => this(f(x)))
  },

  divide<C, X>(
    this: Predicate<unknown>,
    split: (x: X) => readonly [unknown, C],
    that: Predicate<C>,
  ): Predicate<X> {
    return predicate<X>((x) => {
      const [b, c] = split(x)
      return this(b) && that(c)
    })
  },

  choose<C, X>(
    this: Predicate<unknown>,
    split: (x: X) => Either<unknown, C>,
    that: Predicate<C>,
  ): Predicate<X> {
    return predicate<X>((x) =>
      either((b: unknown) => this(b))((c: C) => that(c))(split(x))
    )
  },

  concat<A>(this: Predicate<A>, that: Predicate<A>): Predicate<A> {
    return this.divide((a: A) => [a, a] as const, that)
  },
})

/**
 * The predicate representative. `empty(Predicate)` and `conquer(Predicate)`
 * create rules that always pass.
 */
export const Predicate: PredicateTypeRep = {
  '@@type': 'Predicate' as const,
  _shape: undefined as unknown as PredicateShape,

  empty() {
    return predicate<unknown>(() => true)
  },

  conquer() {
    return predicate<unknown>(() => true)
  },

  lose<X>(absurd: (x: X) => never) {
    return predicate<X>((x) => absurd(x))
  },
}

Object.defineProperty(proto, 'constructor', { value: Predicate })

/**
 * Creates a predicate that returns the opposite result.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate((s: string) => s.length > 3)
 * P.predicateNot(long)('hi') // => true
 * ```
 */
export function predicateNot<A>(p: Predicate<A>): Predicate<A> {
  return predicate<A>((a) => !p(a))
}

/**
 * Combines two predicates, passing when either one passes.
 * The second predicate is called only if the first fails.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate((s: string) => s.length > 3)
 * const startsA = P.predicate((s: string) => s.startsWith('a'))
 * P.predicateOr(long)(startsA)('ax') // => true
 * P.predicateOr(long)(startsA)('bo') // => false
 * ```
 */
export function predicateOr<A>(
  p: Predicate<A>,
): (q: Predicate<A>) => Predicate<A> {
  return (q) => predicate<A>((a) => p(a) || q(a))
}
