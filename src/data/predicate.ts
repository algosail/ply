import type { CheckableTypeRep } from '../classes/checkable.ts'
import type { DecidableMethods } from '../classes/decidable.ts'
import type { DecidableTypeRep } from '../classes/decidable.ts'
import type { DivisibleTypeRep } from '../classes/divisible.ts'
import type { MonoidTypeRep } from '../classes/monoid.ts'
import type { SemigroupMethods } from '../classes/semigroup.ts'
import type { Satisfies } from '../core/kind.ts'
import type { Shape, Shaped } from '../core/shape.ts'
import type { Either } from './either.ts'
import { either } from './either.ts'

/** A callable test that can be adapted with `contramap` and combined with `divide`. */
export interface Predicate<A> extends PredicateMethods<A> {
  (a: A): boolean
}

/** The shape for Predicate. */
export interface PredicateShape extends Shape<'Predicate'> {
  readonly slotBVariance: 'in'
  readonly out: Predicate<this['slotB']>
}

/** The type of the `Predicate` representative. */
export type PredicateTypeRep = Satisfies<
  PredicateStatics & Shaped<PredicateShape>,
  & MonoidTypeRep<PredicateShape, unknown>
  & DivisibleTypeRep<PredicateShape, unknown>
  & DecidableTypeRep<PredicateShape, unknown>
  & CheckableTypeRep<PredicateShape>
>

/** Static operations provided by the `Predicate` representative. */
export interface PredicateStatics {
  is(value: unknown): value is Predicate<unknown>
  empty(): Predicate<unknown>
  conquer(): Predicate<unknown>
  lose<X>(absurd: (x: X) => never): Predicate<X>
}

/** Methods available on `Predicate` values. */
export interface PredicateMethods<A>
  extends
    DecidableMethods<Predicate<A>, boolean, A>,
    SemigroupMethods<Predicate<A>, boolean, A> {
  readonly '@@type': 'Predicate'
  readonly _shape: PredicateShape
  readonly constructor: PredicateTypeRep
  readonly _A?: (_: never) => boolean
  _B?(_: A): void
}

/** The predicate representative. */
export class Predicate<A> implements PredicateMethods<A> {
  declare static readonly _shape: PredicateShape
  static readonly '@@type' = 'Predicate' as const

  static {
    Object.setPrototypeOf (this.prototype, Function.prototype)
  }

  static is(value: unknown): value is Predicate<unknown> {
    return value instanceof Predicate
  }

  static empty(): Predicate<unknown> {
    return predicate<unknown> (() => true)
  }

  static conquer(): Predicate<unknown> {
    return predicate<unknown> (() => true)
  }

  static lose<X>(absurd: (x: X) => never): Predicate<X> {
    return predicate<X> ((x) => absurd (x))
  }

  constructor(run: (a: A) => boolean) {
    const self = (a: A) => run (a)
    return Object.setPrototypeOf (self, new.target.prototype)
  }

  contramap<X>(f: (x: X) => A): Predicate<X> {
    return predicate<X> ((x) => this (f (x)))
  }

  divide<C, X>(
    split: (x: X) => readonly [A, C],
    that: Predicate<C>,
  ): Predicate<X> {
    return predicate<X> ((x) => {
      const [b, c] = split (x)
      return this (b) && that (c)
    })
  }

  choose<C, X>(
    split: (x: X) => Either<A, C>,
    that: Predicate<C>,
  ): Predicate<X> {
    return predicate<X> ((x) =>
      either ((b: A) => this (b)) ((c: C) => that (c)) (split (x)),
    )
  }

  concat(that: Predicate<A>): Predicate<A> {
    return this.divide ((a: A) => [a, a] as const, that)
  }
}

/**
 * Creates a callable predicate that can be adapted and combined with other rules.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate ((s: string) => s.length > 3)
 * long ('hello') // => true
 * ```
 */
export function predicate<A>(run: (a: A) => boolean): Predicate<A> {
  return new Predicate (run)
}

/**
 * Creates a predicate that returns the opposite result.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate ((s: string) => s.length > 3)
 * P.predicateNot (long) ('hi') // => true
 * ```
 */
export function predicateNot<A>(p: Predicate<A>): Predicate<A> {
  return predicate<A> ((a) => !p (a))
}

/**
 * Combines two predicates, passing only when both pass.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate ((s: string) => s.length > 3)
 * const startsA = P.predicate ((s: string) => s.startsWith ('a'))
 * P.predicateAnd (long) (startsA) ('abcd') // => true
 * P.predicateAnd (long) (startsA) ('ab') // => false
 * ```
 */
export function predicateAnd<A>(p: Predicate<A>) {
  return (q: Predicate<A>): Predicate<A> => predicate<A> ((a) => p (a) && q (a))
}

/**
 * Combines two predicates, passing when either one passes.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate ((s: string) => s.length > 3)
 * const startsA = P.predicate ((s: string) => s.startsWith ('a'))
 * P.predicateOr (long) (startsA) ('ax') // => true
 * P.predicateOr (long) (startsA) ('bo') // => false
 * ```
 */
export function predicateOr<A>(p: Predicate<A>) {
  return (q: Predicate<A>): Predicate<A> => predicate<A> ((a) => p (a) || q (a))
}

/**
 * Passes when every predicate in the list passes, and on an empty list, there being nothing to fail.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate ((s: string) => s.length > 3)
 * const startsA = P.predicate ((s: string) => s.startsWith ('a'))
 * P.allPass ([long, startsA]) ('abcd') // => true
 * P.allPass ([long, startsA]) ('bcde') // => false
 * ```
 */
export function allPass<A>(ps: readonly Predicate<A>[]): Predicate<A> {
  return predicate<A> ((a) => ps.every ((p) => p (a)))
}

/**
 * Passes when any predicate in the list passes, and on an empty list not at all, there being nothing to pass.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate ((s: string) => s.length > 3)
 * const startsA = P.predicate ((s: string) => s.startsWith ('a'))
 * P.anyPass ([long, startsA]) ('ax') // => true
 * P.anyPass ([long, startsA]) ('bo') // => false
 * ```
 */
export function anyPass<A>(ps: readonly Predicate<A>[]): Predicate<A> {
  return predicate<A> ((a) => ps.some ((p) => p (a)))
}
