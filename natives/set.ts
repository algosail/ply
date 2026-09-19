/**
 * Create sets and compare membership by value with `setMember` and
 * `setDifference`.
 *
 * @module
 */

import type { Matchable, Shape } from '../core/shape.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { ApplicativeDict } from '../classes/applicative.ts'
import type { ApplyDict } from '../classes/apply.ts'
import type { ChainDict } from '../classes/chain.ts'
import type { FilterableDict } from '../classes/filterable.ts'
import type { FunctorDict } from '../classes/functor.ts'
import type { ShowDict } from '../classes/show.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'

/** The shape for sets. Use it with `Kind` when declaring generic helpers. */
export interface SetShape extends Shape<'Set'>, Matchable {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: Set<this['slotA']>
  /** The accepted input form of this shape, including readonly inputs when supported. */
  readonly like: Set<this['slotA']>
  /** The contained value type inferred from `val`. */
  readonly readA: this['val'] extends Set<infer A> ? A : never
  /** The secondary type inferred from `val`, or `never` when unused. */
  readonly readB: never
}

/**
 * The type of the `Sets` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type SetTypeRep =
  & NativeTypeRep<SetShape>
  & ApplicativeDict<SetShape>
  & ApplyDict<SetShape>
  & ChainDict<SetShape>
  & FilterableDict<SetShape>
  & FunctorDict<SetShape>
  & ShowDict<SetShape>

/**
 * The set representative. Pass it to `of` to create singleton sets.
 * Mapping and chaining use JavaScript set equality to remove duplicates.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.of(P.Sets)(1) // => Set ([1])
 * ```
 */
export const Sets: SetTypeRep = {
  '@@type': 'Set' as const,
  _shape: undefined as unknown as SetShape,
  is(x: unknown): x is Set<unknown> {
    return x instanceof Set
  },
  of<A>(a: A): Set<A> {
    return new Set([a])
  },
  ap<A, B>(s: Set<A>, fs: Set<(a: A) => B>): Set<B> {
    return new Set([...fs].flatMap((f) => [...s].map((x) => f(x))))
  },
  chain<A, B>(s: Set<A>, f: (a: A) => Set<B>): Set<B> {
    return new Set([...s].flatMap((a) => [...f(a)]))
  },
  filter<A>(s: Set<A>, p: (a: A) => boolean): Set<A> {
    return new Set([...s].filter((x) => p(x)))
  },
  map<A, B>(s: Set<A>, f: (a: A) => B): Set<B> {
    return new Set([...s].map((x) => f(x)))
  },
  show(s: Set<unknown>): string {
    return `Set (${show([...s])})`
  },
}

/**
 * Creates a `Set` from an iterable, using JavaScript's usual set equality.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.setFromIterable('aab') // => Set (["a", "b"])
 * P.setFromIterable([1, 1, 2]) // => Set ([1, 2])
 * ```
 */
export function setFromIterable<A>(xs: Iterable<A>): Set<A> {
  return new Set(xs)
}

/**
 * Returns values from the first set that have no equal value in the second.
 * Uses ply's `equals` to compare values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.setDifference(new Set([1, 2, 3]), new Set([2])) // => Set ([1, 3])
 * P.setDifference(new Set([[1], [2]]), new Set([[1]])) // => Set ([[2]])
 * ```
 */
export function setDifference<A>(a: Set<A>, b: Set<A>): Set<A> {
  return new Set([...a].filter((x) => !setMember(x)(b)))
}

/**
 * Checks whether a set contains an equal value using ply's `equals`.
 * Objects are compared by content.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.setMember([1])(new Set([[1]])) // => true
 * new Set([[1]]).has([1]) // => false
 * ```
 */
export function setMember<A>(a: A): (s: Set<A>) => boolean {
  return (s) => [...s].some((x) => equals(a as never)(x as never))
}
