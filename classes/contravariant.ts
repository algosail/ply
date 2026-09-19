/**
 * Operations and types for adapting inputs with `contramap`.
 *
 * @module
 */

import type { Kind, Shape } from '../core/shape.ts'
import type { KindOf, MatchableIn, SlotAOf, SlotBOf } from '../core/kind.ts'
import type { Instances } from '../core/named.ts'
import type { FnShape } from '../natives/function.ts'
import { dispatch, lazily } from '../core/instance.ts'
import { Fn } from '../natives/function.ts'

/**
 * Implement these methods on a custom value to support adapting inputs with
 * `contramap`.
 */
export interface ContravariantMethods<S, A, B = never> {
  /** Transforms inputs before passing them to this value. */
  contramap<X>(f: (x: X) => B): KindOf<S, A, X>
}

/**
 * Operations for adapting inputs with `contramap` on values described by `S`.
 * Operations on an existing value take that value as their first argument.
 */
export interface ContravariantDict<S extends Shape> {
  /** Transforms inputs before passing them to this value. */
  contramap<A, B, X>(fa: Kind<S, A, B>, f: (x: X) => B): Kind<S, A, X>
}

/** Names of the operations in `ContravariantDict`. */
export type ContravariantKeys = keyof ContravariantDict<Shape> & string

/** Native generic types accepted by the `Contravariant` constraint. */
export interface ContravariantShapes {
  /** The shape used for `Fn` values. */
  readonly Fn: FnShape
}

/** A constraint for values that support adapting inputs with `contramap`. */
export type Contravariant<S, A = SlotAOf<S>, B = SlotBOf<S>> =
  | ContravariantMethods<S, A, B>
  | MatchableIn<ContravariantShapes, A, B>

type ContravariantDicts = <S extends Shape>(s: S) => ContravariantDict<S>

/**
 * Native implementations of this module's operations, keyed by type name.
 *
 * @internal
 */
export const contravariantNatives: Instances<
  ContravariantDicts,
  ContravariantShapes
> = lazily<ContravariantDicts, ContravariantShapes>({
  Fn: () => Fn,
})

/**
 * Adapts a function, predicate, or comparison to a new input type.
 * The supplied function transforms inputs before they are passed on.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const long = P.predicate((s: string) => s.length > 3)
 * P.contramap((u: { name: string }) => u.name)(long)({ name: 'hello' })
 * // => true
 * P.contramap((s: string) => s.length)((n: number) => n > 3)('abcde')
 * // => true
 * ```
 */
export function contramap<B, I>(
  f: (b: B) => I,
): <F extends Contravariant<F, unknown, I> | ((i: I) => unknown)>(
  fa: F,
) => KindOf<F, SlotAOf<F>, B> {
  return <F extends Contravariant<F, unknown, I> | ((i: I) => unknown)>(
    fa: F,
  ) =>
    dispatch(
      'contramap',
      'Contravariant',
      contravariantNatives,
      fa,
      f,
    ) as KindOf<
      F,
      SlotAOf<F>,
      B
    >
}
