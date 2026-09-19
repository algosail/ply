/**
 * Read and copy JavaScript maps. Lookups use JavaScript map key equality.
 *
 * @module
 */

import type { Matchable, Shape } from '../core/shape.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { FilterableDict } from '../classes/filterable.ts'
import type { FunctorDict } from '../classes/functor.ts'
import type { ShowDict } from '../classes/show.ts'
import type { Maybe } from '../data/maybe.ts'
import type { Pair } from '../data/pair.ts'
import { show } from '../classes/show.ts'
import { just, nothing } from '../data/maybe.ts'
import { fromTuple, toTuple } from '../data/pair.ts'

/** The shape for maps. Use it with `Kind` when declaring generic helpers. */
export interface MapShape extends Shape<'Map'>, Matchable {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: Map<this['slotB'], this['slotA']>
  /** The accepted input form of this shape, including readonly inputs when supported. */
  readonly like: Map<unknown, this['slotA']>
  /** The contained value type inferred from `val`. */
  readonly readA: this['val'] extends Map<unknown, infer V> ? V : never
  /** The secondary type inferred from `val`, or `never` when unused. */
  readonly readB: this['val'] extends Map<infer K, unknown> ? K : never
}

/**
 * The type of the `Maps` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type MapsDict =
  & NativeTypeRep<MapShape>
  & FilterableDict<MapShape>
  & FunctorDict<MapShape>
  & ShowDict<MapShape>

/**
 * The map representative. Its `map` and `filter` operations act on values and
 * preserve keys.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.Maps.map(new Map([['a', 1]]), (n: number) => n + 1)
 * // => Map ([['a', 2]])
 * ```
 */
export const Maps: MapsDict = {
  '@@type': 'Map' as const,
  _shape: undefined as unknown as MapShape,
  is(x: unknown): x is Map<unknown, unknown> {
    return x instanceof Map
  },
  filter<K, V>(m: Map<K, V>, p: (v: V) => boolean): Map<K, V> {
    return new Map([...m].filter(([, v]) => p(v)))
  },
  map<K, V, B>(m: Map<K, V>, f: (v: V) => B): Map<K, B> {
    return new Map([...m].map(([k, v]) => [k, f(v)]))
  },
  show(m: Map<unknown, unknown>): string {
    return `Map (${show([...m])})`
  },
}

/**
 * Creates a `Map` from ply pairs. Later entries replace earlier values for a
 * key.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mapFromPairs([P.pair('a', 1), P.pair('b', 2)])
 * // => Map ([["a", 1], ["b", 2]])
 * ```
 */
export function mapFromPairs<K, V>(ps: Iterable<Pair<K, V>>): Map<K, V> {
  return new Map([...ps].map(toTuple))
}

/**
 * Looks up a key as `Just`, or returns `Nothing` if the key is absent.
 * Uses JavaScript's usual map key equality, including identity for object
 * keys.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mapLookup('a')(new Map([['a', 1]])) // => Just (1)
 * P.mapLookup('z')(new Map([['a', 1]])) // => Nothing
 * ```
 */
export function mapLookup<K>(k: K): <V>(m: ReadonlyMap<K, V>) => Maybe<V> {
  return <V>(m: ReadonlyMap<K, V>): Maybe<V> =>
    m.has(k) ? just(m.get(k) as V) : nothing()
}

/**
 * Returns the map's keys in insertion order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mapKeys(new Map([['a', 1], ['b', 2]])) // => ['a', 'b']
 * ```
 */
export function mapKeys<K, V>(m: ReadonlyMap<K, V>): K[] {
  return [...m.keys()]
}

/**
 * Returns the map's values in insertion order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mapValues(new Map([['a', 1], ['b', 2]])) // => [1, 2]
 * ```
 */
export function mapValues<K, V>(m: ReadonlyMap<K, V>): V[] {
  return [...m.values()]
}

/**
 * Returns the map's entries as ply pairs in insertion order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mapPairs(new Map([['a', 1], ['b', 2]]))
 * // => [Pair ("a") (1), Pair ("b") (2)]
 * ```
 */
export function mapPairs<K, V>(m: ReadonlyMap<K, V>): Pair<K, V>[] {
  return [...m].map(fromTuple)
}

/**
 * Copies entries from the first map whose keys are absent from the second.
 * Uses JavaScript's usual map key equality.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.mapDifference(new Map([['a', 1], ['b', 2]]), new Map([['a', 0]]))
 * // => Map ([["b", 2]])
 * ```
 */
export function mapDifference<K, V>(
  a: ReadonlyMap<K, V>,
  b: ReadonlyMap<K, unknown>,
): Map<K, V> {
  return new Map([...a].filter(([k]) => !b.has(k)))
}
