/**
 * Operations and types for choosing between input rules.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type {
  Assert,
  KindOf,
  MatchableIn,
  RepIn,
  SlotAOf,
  SlotBOf,
  SubclassOf,
  Superclass,
} from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { Either } from '../data/either.ts'
import type {
  DivisibleKeys,
  DivisibleMethods,
  DivisibleShapes,
} from './divisible.ts'
import { dispatch, lazily, nameOf, typeRepIn } from '../core/instance.ts'

/** The static `lose` operation required from a custom type representative. */
export interface LoseSig<S extends Shape, B, M extends string> {
  /** Creates a rule for an unreachable input using a function that cannot return. */
  lose<A, X>(absurd: (x: X) => never): Superclass<S, M, Kind<S, A, X>>
}

/**
 * Implement these methods on a custom value to support choosing between input
 * rules.
 */
export interface DecidableMethods<S, A, B = never>
  extends DivisibleMethods<S, A, B> {
  /** Uses the first rule for `Left` inputs and the second for `Right` inputs. */
  choose<C, X>(
    split: (x: X) => Either<B, C>,
    that: KindOf<S, A, C>,
  ): KindOf<S, A, X>
}

/**
 * Operations for choosing between input rules on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface DecidableDict<S extends Shape> {
  /** Uses the first rule for `Left` inputs and the second for `Right` inputs. */
  choose<A, B, C, X>(
    fb: Kind<S, A, B>,
    split: (x: X) => Either<B, C>,
    fc: Kind<S, A, C>,
  ): Kind<S, A, X>
}

/** Names of the operations in `DecidableDict`. */
export type DecidableKeys = keyof DecidableDict<Shape> & string

/** Native generic types accepted by the `Decidable` constraint. */
// deno-lint-ignore no-empty-interface
export interface DecidableShapes {}

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _DecidableUnderDivisible = Assert<
  SubclassOf<DecidableShapes, DivisibleShapes>
>

/** A constraint for values that support choosing between input rules. */
export type Decidable<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | DecidableMethods<S, A, B>
  | MatchableIn<DecidableShapes, A, B>

/**
 * A type representative accepted by `lose`.
 * Use this to type a helper that accepts the desired result type.
 */
export type DecidableTypeRep<S extends Shape, B = never> = RepIn<
  S,
  B,
  DecidableShapes,
  LoseSig<S, B, DivisibleKeys>
>

type DecidableDicts = <S extends Shape>(s: S) => DecidableDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const decidableNatives: Instances<
  DecidableDicts,
  DecidableShapes
> = lazily<DecidableDicts, DecidableShapes>({})

/**
 * Routes inputs to one of two predicates or comparisons.
 * The splitter returns `Left` for the first rule or `Right` for the second.
 * An `Equivalence` returns `false` when the inputs select different branches.
 *
 * @example
 * ```ts
 * import type { Either } from '@algosail/ply'
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate((s: string) => s.length > 3)
 * const big = P.predicate((n: number) => n > 10)
 * const rule = P.choose((x: number | string): Either<number, string> =>
 *   typeof x === 'number' ? P.left(x) : P.right(x)
 * )(big)(long)
 * rule(20) // => true
 * rule('hello') // => true
 * rule('hi') // => false
 * ```
 */
export function choose<B, C, X>(
  split: (x: X) => Either<B, C>,
): <F extends Decidable<F, SlotAOf<F>, B>>(
  fb: F,
) => (fc: KindOf<F, SlotAOf<F>, C>) => KindOf<F, SlotAOf<F>, X> {
  return <F extends Decidable<F, SlotAOf<F>, B>>(fb: F) =>
  (fc: KindOf<F, SlotAOf<F>, C>) =>
    dispatch(
      'choose',
      'Decidable',
      decidableNatives,
      fb,
      split,
      fc,
    ) as KindOf<F, SlotAOf<F>, X>
}

/**
 * Creates a predicate or comparison for an unreachable input.
 * Use it for a `never` branch when combining rules with `choose`.
 *
 * @example
 * ```ts
 * import type { Either } from '@algosail/ply'
 * import * as P from '@algosail/ply'
 *
 * // Closing a fold over a union after the last real case.
 * const long = P.predicate((s: string) => s.length > 3)
 *
 * P.choose((s: string): Either<string, never> => P.left(s))(long)(
 *   P.lose(P.Predicate)((x: never) => x),
 * )('hello') // => true
 * ```
 */
export function lose<S extends Shape, B, A = never, X = never>(
  T: DecidableTypeRep<S, B>,
): (absurd: (x: X) => never) => Kind<S, A, X>
export function lose(T: unknown): (absurd: unknown) => unknown {
  const f = typeRepIn(decidableNatives, T, 'lose')
  if (f === undefined) {
    throw new TypeError(`lose: ${nameOf(T)} has no Decidable`)
  }
  return (absurd) => (f as (a: unknown) => unknown)(absurd)
}
