/**
 * Match tagged union values with a handler for each variant.
 *
 * @module
 */

/**
 * A handler for every tag in a union. Each receives the full, narrowed variant.
 * Omitting a variant is a type error.
 */
export type Cases<T extends { readonly tag: string }, B> = {
  readonly [K in T['tag']]: (t: Extract<T, { readonly tag: K }>) => B
}

/**
 * Call the handler matching the value’s tag. The handler receives the full variant.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * type Shape =
 *   | { readonly tag: 'circle'; readonly r: number }
 *   | { readonly tag: 'square'; readonly side: number }
 *
 * const area = P.cases<Shape, number>({
 *   circle: (c) => Math.PI * c.r * c.r,
 *   square: (s) => s.side * s.side,
 * })
 *
 * area({ tag: 'square', side: 3 }) // => 9
 * ```
 */
export function cases<T extends { readonly tag: string }, B>(
  branches: Cases<T, B>,
): (t: T) => B {
  return (t) => (branches[t.tag as T['tag']] as (x: T) => B)(t)
}
