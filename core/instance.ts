/**
 * Look up and call operations on native and custom values.
 *
 * @module
 */

import type { DictsOf, Instances } from './named.ts'
import { Arr } from '../natives/array.ts'
import { Big } from '../natives/bigint.ts'
import { Bool } from '../natives/boolean.ts'
import { Dates } from '../natives/date.ts'
import { Re } from '../natives/regexp.ts'
import { Fn } from '../natives/function.ts'
import { Maps } from '../natives/map.ts'
import { Num } from '../natives/number.ts'
import { Sets } from '../natives/set.ts'
import { Str } from '../natives/string.ts'
import { StrMap } from '../natives/strmap.ts'
import { hasName } from './named.ts'

/** Accepts a table of operations keyed by native type name. */
export type NativeTable = object

/** Extracts the operation names available in a native table. */
export type OpsOf<N extends NativeTable> = Extract<keyof N[keyof N], string>

/**
 * Creates a table whose entries are obtained by calling their supplied
 * getters.
 *
 * @example
 * ```ts
 * import type { ArrayShape } from '../natives/array.ts'
 * import type { FunctorDict } from '../classes/functor.ts'
 * import type { Shape } from './shape.ts'
 * import { Arr } from '../natives/array.ts'
 * import { lazily } from './instance.ts'
 *
 * type Dicts = <S extends Shape>(s: S) => FunctorDict<S>
 *
 * const natives = lazily<Dicts, { Array: ArrayShape }>({ Array: () => Arr })
 * natives.Array.map([1, 2, 3], (n: number) => n + 1) // => [2, 3, 4]
 * ```
 */
export function lazily<D extends DictsOf, Shapes>(
  cells: NoInfer<
    { readonly [U in keyof Shapes]: () => Instances<D, Shapes>[U] }
  >,
): Instances<D, Shapes> {
  const table = {} as Record<string, unknown>
  for (const name of Object.keys(cells)) {
    Object.defineProperty(table, name, {
      get: (cells as Record<string, () => unknown>)[name],
      enumerable: true,
    })
  }
  return table as Instances<D, Shapes>
}

type Known =
  | readonly {
    readonly '@@type': string
    readonly is: (x: unknown) => boolean
  }[]
  | undefined

let known: Known = undefined
const natives = () =>
  known ??= [
    Arr,
    Big,
    Bool,
    Dates,
    Re,
    Fn,
    Maps,
    Num,
    Sets,
    Str,
    StrMap,
  ]

/**
 * Returns a value's ply type name, or `Unknown` for an unrecognized type.
 *
 * @example
 * ```ts
 * import { just } from '../data/maybe.ts'
 * import { nameOf } from './instance.ts'
 *
 * nameOf([1, 2]) // => 'Array'
 * nameOf(just(1)) // => 'Maybe'
 * nameOf({ a: 1 }) // => 'StrMap'
 * nameOf(null) // => 'Null'
 * nameOf(Symbol()) // => 'Unknown'
 * ```
 */
export function nameOf(x: unknown): string {
  if (x === null) return 'Null'
  if (x === undefined) return 'Undefined'
  if (hasName(x)) return x['@@type']
  for (const t of natives()) if (t.is(x)) return t['@@type']
  return 'Unknown'
}

const dictIn = (
  natives: NativeTable,
  name: string,
): Record<string, unknown> | undefined => {
  return (natives as Record<string, Record<string, unknown> | undefined>)[name]
}

/**
 * Finds an operation for a value in a native table or on the value itself.
 * Returns `undefined` if the operation is unavailable.
 *
 * @example
 * ```ts
 * import { functorNatives } from '../classes/functor.ts'
 * import { opIn } from './instance.ts'
 *
 * const inc = ((n: number) => n + 1) as never
 *
 * const mapArray = opIn(functorNatives, [1, 2, 3], 'map')
 * mapArray?.([1, 2, 3] as never, inc) // => [2, 3, 4]
 * opIn(functorNatives, 42, 'map') // => undefined
 * ```
 */
export function opIn(
  natives: NativeTable,
  x: unknown,
  name: string,
): ((...xs: never[]) => unknown) | undefined {
  const row = dictIn(natives, nameOf(x))
  if (row !== undefined) {
    const f = row[name]
    return typeof f === 'function'
      ? f as (...xs: never[]) => unknown
      : undefined
  }
  return hasMethod(x, name)
    ? ((v: never, ...rest: never[]) =>
      (v as unknown as Record<string, (...a: never[]) => unknown>)[name](
        ...rest,
      ))
    : undefined
}

/**
 * Calls an operation for a value, passing the remaining arguments to it.
 *
 * @throws {TypeError} If the value does not support the operation.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import { functorNatives } from '../classes/functor.ts'
 * import { dispatch } from './instance.ts'
 *
 * const inc = (n: number) => n + 1
 *
 * dispatch('map', 'Functor', functorNatives, [1, 2, 3], inc) // => [2, 3, 4]
 * assertThrows(
 *   () => dispatch('map', 'Functor', functorNatives, 42, inc),
 *   TypeError,
 *   'map: Number has no Functor',
 * )
 * ```
 */
export function dispatch<N extends NativeTable>(
  name: OpsOf<N>,
  className: string,
  natives: N,
  fa: unknown,
  ...rest: readonly unknown[]
): unknown {
  const f = opIn(natives, fa, name)
  if (f === undefined) {
    throw new TypeError(
      `${name}: ${nameOf(fa)} has no ${className}` +
        ' (no method on the value, no entry in the instance table)',
    )
  }
  return f(fa as never, ...(rest as never[]))
}

/**
 * Checks whether a value has a callable property with the supplied name.
 *
 * @example
 * ```ts
 * import { just } from '../data/maybe.ts'
 * import { hasMethod } from './instance.ts'
 *
 * hasMethod(just(1), 'map') // => true
 * hasMethod([1, 2], 'map') // => true
 * hasMethod(1, 'map') // => false
 * ```
 */
export function hasMethod<M extends string>(
  x: unknown,
  m: M,
): x is Record<M, (...xs: never[]) => unknown> {
  return x !== null && (typeof x === 'object' || typeof x === 'function') &&
    typeof (x as Record<string, unknown>)[m] === 'function'
}

/**
 * Finds a static operation on a representative or in a native table.
 * Returns `undefined` if the operation is unavailable.
 *
 * @example
 * ```ts
 * import { Maybe } from '../data/maybe.ts'
 * import { Arr } from '../natives/array.ts'
 * import { Str } from '../natives/string.ts'
 * import { applicativeNatives } from '../classes/applicative.ts'
 * import { monoidNatives } from '../classes/monoid.ts'
 * import { typeRepIn } from './instance.ts'
 *
 * typeRepIn(applicativeNatives, Arr, 'of')?.(9 as never) // => [9]
 * typeRepIn(applicativeNatives, Maybe, 'of')?.(9 as never) // => Just (9)
 * typeRepIn(monoidNatives, Str, 'empty')?.() // => ''
 * ```
 */
export function typeRepIn(
  natives: NativeTable,
  T: unknown,
  name: string,
): ((...xs: never[]) => unknown) | undefined {
  const own = (T as Record<string, unknown> | null | undefined)?.[name]
  if (typeof own === 'function') return own as (...xs: never[]) => unknown
  const named = (T as { '@@type'?: unknown } | null | undefined)?.['@@type']
  const row = typeof named === 'string' ? dictIn(natives, named) : undefined
  const f = row?.[name]
  return typeof f === 'function' ? f as (...xs: never[]) => unknown : undefined
}

function staticOf(value: unknown, name: string): unknown {
  const ctor = (value as { constructor?: unknown })?.constructor
  if (
    ctor === null || (typeof ctor !== 'function' && typeof ctor !== 'object')
  ) {
    return undefined
  }
  const rep = ctor as unknown as Record<string, unknown>
  if (rep['@@type'] !== nameOf(value)) return undefined
  return rep[name]
}

/**
 * Finds a function that wraps a value in the same type as the sample.
 *
 * @throws {TypeError} If the sample's type does not support `of`.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import { just } from '../data/maybe.ts'
 * import { applicativeNatives } from '../classes/applicative.ts'
 * import { ofIn } from './instance.ts'
 *
 * ofIn(applicativeNatives, [1, 2])(9) // => [9]
 * ofIn(applicativeNatives, just(1))(9) // => Just (9)
 * assertThrows(
 *   () => ofIn(applicativeNatives, 42)(9),
 *   TypeError,
 *   'of: Number has no Applicative',
 * )
 * ```
 */
export function ofIn(
  natives: NativeTable,
  value: unknown,
): (a: unknown) => unknown {
  const f = dictIn(natives, nameOf(value))?.of ?? staticOf(value, 'of')
  if (typeof f !== 'function') {
    throw new TypeError(`of: ${nameOf(value)} has no Applicative`)
  }
  return f as (a: unknown) => unknown
}

/**
 * Finds a function that creates an empty value of the sample's type.
 *
 * @throws {TypeError} If the sample's type does not support `empty`.
 *
 * @example
 * ```ts
 * import { monoidNatives } from '../classes/monoid.ts'
 * import { emptyIn } from './instance.ts'
 *
 * emptyIn(monoidNatives, [1, 2])() // => []
 * emptyIn(monoidNatives, 'text')() // => ''
 * ```
 */
export function emptyIn(
  natives: NativeTable,
  value: unknown,
): () => unknown {
  const f = dictIn(natives, nameOf(value))?.empty ?? staticOf(value, 'empty')
  if (typeof f !== 'function') {
    throw new TypeError(`empty: ${nameOf(value)} has no Monoid`)
  }
  return f as () => unknown
}
