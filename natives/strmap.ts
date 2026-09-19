/**
 * Read and copy records with string keys.
 * Lookups use own properties; sorted helpers return entries in key order.
 *
 * @module
 */

import type { NativeTypeRep } from '../core/named.ts'
import type { Matchable, Shape } from '../core/shape.ts'
import type { AltDict } from '../classes/alt.ts'
import type { FilterableDict } from '../classes/filterable.ts'
import type { FoldableDict } from '../classes/foldable.ts'
import type { FunctorDict } from '../classes/functor.ts'
import type { MonoidDict } from '../classes/monoid.ts'
import type { PlusDict } from '../classes/plus.ts'
import type { SemigroupDict } from '../classes/semigroup.ts'
import type { SetoidDict } from '../classes/setoid.ts'
import type { ShowDict } from '../classes/show.ts'
import type { Maybe } from '../data/maybe.ts'
import type { Pair } from '../data/pair.ts'
import { hasName } from '../core/named.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'
import { just, nothing } from '../data/maybe.ts'
import { pair } from '../data/pair.ts'

/**
 * The shape for records. Use it with `Kind` when declaring generic helpers.
 */
export interface StrMapShape extends Shape<'StrMap'>, Matchable {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: Record<string, this['slotA']>
  /** The accepted input form of this shape, including readonly inputs when supported. */
  readonly like: Record<string, this['slotA']>
  /** The contained value type inferred from `val`. */
  readonly readA: this['val'] extends Record<string, infer A> ? A
    : this['val'] extends Record<string, unknown>
      ? NonNullable<this['val'][keyof this['val']]>
    : never
  /** The secondary type inferred from `val`, or `never` when unused. */
  readonly readB: never
}

/** A record of string keys with values of type `A`. */
export type StrMap<A> = Record<string, A>

/**
 * The type of the `StrMap` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type StrMapDict =
  & NativeTypeRep<StrMapShape>
  & AltDict<StrMapShape>
  & FilterableDict<StrMapShape>
  & FoldableDict<StrMapShape>
  & FunctorDict<StrMapShape>
  & MonoidDict<StrMapShape>
  & PlusDict<StrMapShape>
  & SemigroupDict<StrMapShape>
  & SetoidDict<StrMapShape>
  & ShowDict<StrMapShape>

/**
 * The record representative. Pass it to `empty` or `zero` to get an empty
 * record.
 * Combining records preserves the first value for a duplicate key.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.empty(P.StrMap) // => {}
 * P.StrMap.is({ name: 'Ada' }) // => true
 * ```
 */
export const StrMap: StrMapDict = {
  '@@type': 'StrMap' as const,
  _shape: undefined as unknown as StrMapShape,
  is(x: unknown): x is StrMap<unknown> {
    return isPlainObject(x) && !hasName(x)
  },
  alt<A>(a: StrMap<A>, b: StrMap<A>): StrMap<A> {
    const out: StrMap<A> = { ...a }
    for (const k of Object.keys(b)) {
      if (!Object.hasOwn(out, k)) out[k] = b[k]
    }
    return out
  },
  filter<A>(m: StrMap<A>, p: (a: A) => boolean): StrMap<A> {
    const out: StrMap<A> = {}
    for (const k of Object.keys(m)) if (p(m[k])) out[k] = m[k]
    return out
  },
  reduce<A, Acc>(m: StrMap<A>, f: (acc: Acc, a: A) => Acc, init: Acc): Acc {
    return Object.keys(m).sort().map((k) => m[k]).reduce(
      (acc: Acc, a: A) => f(acc, a),
      init,
    )
  },
  map<A, B>(m: StrMap<A>, f: (a: A) => B): StrMap<B> {
    const out: Record<string, B> = {}
    for (const k of Object.keys(m)) out[k] = f(m[k])
    return out
  },
  empty<A>(): StrMap<A> {
    return {}
  },
  zero<A>(): StrMap<A> {
    return {}
  },
  concat<A>(a: StrMap<A>, b: StrMap<A>): StrMap<A> {
    const out: StrMap<A> = { ...a }
    for (const k of Object.keys(b)) {
      if (!Object.hasOwn(out, k)) out[k] = b[k]
    }
    return out
  },
  equals(a: StrMap<unknown>, b: StrMap<unknown>): boolean {
    const keysA = Object.keys(a).sort()
    return equals(keysA, Object.keys(b).sort()) &&
      keysA.every((k) => equals(a[k], b[k]))
  },
  show(m: StrMap<unknown>): string {
    const body = sortedKeys(m)
      .map((k) => `${JSON.stringify(k)}: ${show(m[k])}`)
      .join(', ')
    return `{${body}}`
  },
}

/**
 * Reads an own property as `Just`, or returns `Nothing` if it is absent.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.lookup('a')({ a: 1 }) // => Just (1)
 * P.lookup('z')({ a: 1 }) // => Nothing
 * ```
 */
export function lookup(k: string): <A>(m: StrMap<A>) => Maybe<A> {
  return (m) => Object.hasOwn(m, k) ? just(m[k]) : nothing()
}

/**
 * Checks whether a record has the specified own property.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.has('a')({ a: 1 }) // => true
 * ```
 */
export function has(k: string): <A>(m: StrMap<A>) => boolean {
  return (m) => Object.hasOwn(m, k)
}

/**
 * Reads a nested own property as `Just`, or returns `Nothing` if the path is
 * missing.
 * An empty path returns the input wrapped in `Just`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.getPath(['a', 'b'])({ a: { b: 1 } }) // => Just (1)
 * P.getPath(['a', 'z'])({ a: { b: 1 } }) // => Nothing
 * ```
 */
export function getPath(
  path: readonly string[],
): (o: StrMap<unknown>) => Maybe<unknown> {
  return (o) => {
    let cur: unknown = o
    for (const k of path) {
      if (cur === null || cur === undefined || typeof cur !== 'object') {
        return nothing()
      }
      if (!Object.hasOwn(cur, k)) return nothing()
      cur = (cur as StrMap<unknown>)[k]
    }
    return just(cur)
  }
}

/**
 * Checks whether every step of an own-property path exists.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.hasPath(['a', 'b'])({ a: { b: 1 } }) // => true
 * ```
 */
export function hasPath(
  path: readonly string[],
): (o: StrMap<unknown>) => boolean {
  return (o) => getPath(path)(o).tag === 'just'
}

/**
 * Returns the record's own enumerable string keys in JavaScript key order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.keys({ b: 2, a: 1 }) // => ['b', 'a']
 * ```
 */
export function keys(m: StrMap<unknown>): string[] {
  return Object.keys(m)
}

/**
 * Returns the record's values in the order given by `keys`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.values({ b: 2, a: 1 }) // => [2, 1]
 * ```
 */
export function values<A>(m: StrMap<A>): A[] {
  return keys(m).map((k) => m[k])
}

/**
 * Returns the record's entries as ply pairs in the order given by `keys`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.pairs({ b: 2, a: 1 }) // => [Pair ('b') (2), Pair ('a') (1)]
 * ```
 */
export function pairs<A>(m: StrMap<A>): Pair<string, A>[] {
  return keys(m).map((k) => pair(k, m[k]))
}

/**
 * Returns the record's own enumerable string keys in ascending string order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.sortedKeys({ b: 2, a: 1 }) // => ['a', 'b']
 * ```
 */
export function sortedKeys(m: StrMap<unknown>): string[] {
  return Object.keys(m).sort()
}

/**
 * Returns the record's values in ascending key order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.sortedValues({ b: 2, a: 1 }) // => [1, 2]
 * ```
 */
export function sortedValues<A>(m: StrMap<A>): A[] {
  return sortedKeys(m).map((k) => m[k])
}

/**
 * Returns the record's entries as ply pairs in ascending key order.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.sortedPairs({ b: 2, a: 1 }) // => [Pair ('a') (1), Pair ('b') (2)]
 * ```
 */
export function sortedPairs<A>(m: StrMap<A>): Pair<string, A>[] {
  return sortedKeys(m).map((k) => pair(k, m[k]))
}

/**
 * Creates a record containing one key and value.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.singleton('a', 1) // => { a: 1 }
 * ```
 */
export function singleton<A>(k: string, a: A): StrMap<A> {
  return { [k]: a }
}

/**
 * Creates a record from ply pairs. The last value for each key wins.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromPairs([P.pair('a', 1), P.pair('b', 2)]) // => { a: 1, b: 2 }
 * ```
 */
export function fromPairs<A>(ps: Iterable<Pair<string, A>>): StrMap<A> {
  const out: StrMap<A> = {}
  for (const entry of ps) out[entry.fst] = entry.snd
  return out
}

/**
 * Copies a record with a key added or replaced.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.insert('b')(2)({ a: 1 }) // => { a: 1, b: 2 }
 * P.insert('a')(9)({ a: 1 }) // => { a: 9 }
 * ```
 */
export function insert(k: string): <A>(v: A) => (m: StrMap<A>) => StrMap<A> {
  return (v) => (m) => ({ ...m, [k]: v })
}

function isPlainObject(x: unknown): x is StrMap<unknown> {
  if (x === null || typeof x !== 'object') return false
  const proto = Object.getPrototypeOf(x)
  return proto === Object.prototype || proto === null
}
