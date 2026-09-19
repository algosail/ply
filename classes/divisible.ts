/**
 * Operations and types for combining rules for separate parts of an input.
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
import type {
  ContravariantKeys,
  ContravariantMethods,
  ContravariantShapes,
} from './contravariant.ts'
import { dispatch, lazily, nameOf, typeRepIn } from '../core/instance.ts'

/**
 * The static `conquer` operation required from a custom type representative.
 */
export interface ConquerSig<S extends Shape, B, M extends string> {
  /** Creates a rule that always passes. */
  conquer<A>(): Superclass<S, M, Kind<S, A, B>>
}

/**
 * Implement these methods on a custom value to support combining rules for
 * separate parts of an input.
 */
export interface DivisibleMethods<S, A, B = never>
  extends ContravariantMethods<S, A, B> {
  /** Splits an input into two parts and combines the rules for those parts. */
  divide<C, X>(
    split: (x: X) => readonly [B, C],
    that: KindOf<S, A, C>,
  ): KindOf<S, A, X>
}

/**
 * Operations for combining rules for separate parts of an input on values
 * described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface DivisibleDict<S extends Shape> {
  /** Splits an input into two parts and combines the rules for those parts. */
  divide<A, B, C, X>(
    fb: Kind<S, A, B>,
    split: (x: X) => readonly [B, C],
    fc: Kind<S, A, C>,
  ): Kind<S, A, X>
}

/** Names of the operations in `DivisibleDict`. */
export type DivisibleKeys = keyof DivisibleDict<Shape> & string

/** Native generic types accepted by the `Divisible` constraint. */
// deno-lint-ignore no-empty-interface
export interface DivisibleShapes {}

/**
 * Checks that the declared native types also satisfy the parent capabilities.
 *
 * @internal
 */
export type _DivisibleUnderContravariant = Assert<
  SubclassOf<DivisibleShapes, ContravariantShapes>
>

/**
 * A constraint for values that support combining rules for separate parts of
 * an input.
 */
export type Divisible<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | DivisibleMethods<S, A, B>
  | MatchableIn<DivisibleShapes, A, B>

/**
 * A type representative accepted by `conquer`.
 * Use this to type a helper that accepts the desired result type.
 */
export type DivisibleTypeRep<S extends Shape, B = never> = RepIn<
  S,
  B,
  DivisibleShapes,
  ConquerSig<S, B, ContravariantKeys>
>

type DivisibleDicts = <S extends Shape>(s: S) => DivisibleDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const divisibleNatives: Instances<
  DivisibleDicts,
  DivisibleShapes
> = lazily<DivisibleDicts, DivisibleShapes>({})

/**
 * Splits each input into two parts and checks each part with its own rule.
 * With `Predicate` and `Equivalence`, both rules must pass.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * type Order = { name: string; total: number }
 *
 * const long = P.predicate((s: string) => s.length > 3)
 * const big = P.predicate((n: number) => n > 10)
 * const ok = P.divide((o: Order) => [o.name, o.total] as const)(long)(big)
 *
 * ok({ name: 'hello', total: 20 }) // => true
 * ok({ name: 'hi', total: 20 }) // => false
 * ```
 */
export function divide<B, C, X>(
  split: (x: X) => readonly [B, C],
): <F extends Divisible<F, SlotAOf<F>, B>>(
  fb: F,
) => (fc: KindOf<F, SlotAOf<F>, C>) => KindOf<F, SlotAOf<F>, X> {
  return <F extends Divisible<F, SlotAOf<F>, B>>(fb: F) =>
  (fc: KindOf<F, SlotAOf<F>, C>) =>
    dispatch(
      'divide',
      'Divisible',
      divisibleNatives,
      fb,
      split,
      fc,
    ) as KindOf<F, SlotAOf<F>, X>
}

/**
 * Creates a predicate or comparison that always returns `true`.
 * Use it as a starting point when combining rules with `divide`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.conquer(P.Predicate)(0) // => true
 * P.conquer(P.Predicate)('anything') // => true
 * ```
 */
export function conquer<S extends Shape, B, A = never>(
  T: DivisibleTypeRep<S, B>,
): Kind<S, A, B>
export function conquer(T: unknown): unknown {
  const f = typeRepIn(divisibleNatives, T, 'conquer')
  if (f === undefined) {
    throw new TypeError(`conquer: ${nameOf(T)} has no Divisible`)
  }
  return f()
}
