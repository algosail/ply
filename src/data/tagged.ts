/**
 * Match tagged union values with a handler for each variant.
 */

/**
 * A handler for every tag in a union.
 */
export type Cases<T extends { readonly tag: string }, B> = {
  readonly [K in T['tag']]: (t: Extract<T, { readonly tag: K }>) => B
}

/**
 * Call the handler matching the value’s tag.
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
  return (t) => (branches[t.tag as T['tag']] as (x: T) => B) (t)
}
