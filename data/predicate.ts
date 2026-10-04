/**
 * Build reusable validation rules, adapt them to properties, and combine them.
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
import { either } from './either.ts'

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
  & CheckableTypeRep<PredicateShape>
>

/** Static operations provided by the `Predicate` representative. */
export interface PredicateStatics {
  /** Checks whether an unknown value belongs to this type. */
  is(value: unknown): value is Predicate<unknown>
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
  return new Predicate(run)
}

/**
 * The predicate representative. `empty(Predicate)` and `conquer(Predicate)`
 * create rules that always pass.
 */
export class Predicate<A> implements PredicateMethods<A> {
  /** The name used by generic ply operations. */
  static readonly '@@type' = 'Predicate' as const
  /** The shape used for type inference; no runtime value is required. */
  declare static readonly _shape: PredicateShape

  static {
    Object.setPrototypeOf(this.prototype, Function.prototype)
    Object.defineProperty(this.prototype, '@@type', { value: 'Predicate' })
  }

  /** Checks whether a value was created by this class. */
  static is(value: unknown): value is Predicate<unknown> {
    return value instanceof Predicate
  }

  /** Creates a rule that always returns true. */
  static empty(): Predicate<unknown> {
    return predicate<unknown>(() => true)
  }
  /** Creates a rule that always returns true. */
  static conquer(): Predicate<unknown> {
    return predicate<unknown>(() => true)
  }
  /** Creates a rule for an unreachable input using a function that cannot return. */
  static lose<X>(absurd: (x: X) => never): Predicate<X> {
    return predicate<X>((x) => absurd(x))
  }

  /** Creates a callable predicate from a test function. */
  constructor(run: (a: A) => boolean) {
    const self = (a: A) => run(a)
    return Object.setPrototypeOf(self, new.target.prototype)
  }

  /** Transforms the input before testing it. */
  contramap<X>(f: (x: X) => A): Predicate<X> {
    return predicate<X>((x) => this(f(x)))
  }

  /** Splits the input and requires both predicates to pass. */
  divide<C, X>(
    split: (x: X) => readonly [A, C],
    that: Predicate<C>,
  ): Predicate<X> {
    return predicate<X>((x) => {
      const [b, c] = split(x)
      return this(b) && that(c)
    })
  }

  /** Selects a predicate using the Left or Right result of the function. */
  choose<C, X>(
    split: (x: X) => Either<A, C>,
    that: Predicate<C>,
  ): Predicate<X> {
    return predicate<X>((x) =>
      either((b: A) => this(b))((c: C) => that(c))(split(x))
    )
  }

  /** Requires both predicates to pass, stopping at the first failure. */
  concat(that: Predicate<A>): Predicate<A> {
    return this.divide((a: A) => [a, a] as const, that)
  }
}

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
 * Combines two predicates, passing only when both pass.
 * The second predicate is called only if the first passes.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate((s: string) => s.length > 3)
 * const startsA = P.predicate((s: string) => s.startsWith('a'))
 * P.predicateAnd(long)(startsA)('abcd') // => true
 * P.predicateAnd(long)(startsA)('ab') // => false
 * ```
 */
export function predicateAnd<A>(
  p: Predicate<A>,
): (q: Predicate<A>) => Predicate<A> {
  return (q) => predicate<A>((a) => p(a) && q(a))
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

/**
 * Passes when every predicate in the list passes, and on an empty list, there
 * being nothing to fail. Each is called only until one of them says no.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate((s: string) => s.length > 3)
 * const startsA = P.predicate((s: string) => s.startsWith('a'))
 * P.allPass([long, startsA])('abcd') // => true
 * P.allPass([long, startsA])('bcde') // => false
 * ```
 */
export function allPass<A>(ps: readonly Predicate<A>[]): Predicate<A> {
  return predicate<A>((a) => ps.every((p) => p(a)))
}

/**
 * Passes when any predicate in the list passes, and on an empty list not at
 * all, there being nothing to pass. Each is called only until one says yes.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate((s: string) => s.length > 3)
 * const startsA = P.predicate((s: string) => s.startsWith('a'))
 * P.anyPass([long, startsA])('ax') // => true
 * P.anyPass([long, startsA])('bo') // => false
 * ```
 */
export function anyPass<A>(ps: readonly Predicate<A>[]): Predicate<A> {
  return predicate<A>((a) => ps.some((p) => p(a)))
}
