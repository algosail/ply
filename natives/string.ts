/**
 * Transform and split text, and parse values into `Maybe` results.
 *
 * @module
 */

import type { Shape } from '../core/shape.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { MonoidDict } from '../classes/monoid.ts'
import type { OrdDict } from '../classes/ord.ts'
import type { SemigroupDict } from '../classes/semigroup.ts'
import type { SetoidDict } from '../classes/setoid.ts'
import type { ShowDict } from '../classes/show.ts'
import type { Maybe } from '../data/maybe.ts'
import { just, nothing } from '../data/maybe.ts'

/**
 * The shape for strings. Use it with `Kind` when declaring generic helpers.
 */
export interface StrShape extends Shape<'String'> {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: string
}

/**
 * The type of the `Str` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type StrDict =
  & NativeTypeRep<StrShape>
  & MonoidDict<StrShape>
  & OrdDict<StrShape>
  & SemigroupDict<StrShape>
  & SetoidDict<StrShape>
  & ShowDict<StrShape>

/**
 * The string representative. Pass it to `empty` to get an empty string.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.empty(P.Str) // => ''
 * P.Str.is('hello') // => true
 * ```
 */
export const Str: StrDict = {
  '@@type': 'String' as const,
  _shape: undefined as unknown as StrShape,
  is: (x: unknown): x is string => typeof x === 'string',
  empty(): string {
    return ''
  },
  lte(a: string, b: string): boolean {
    return a <= b
  },
  concat(a: string, b: string): string {
    return a + b
  },
  equals(a: string, b: string): boolean {
    return a === b
  },
  show(s: string): string {
    return JSON.stringify(s)
  },
}

/**
 * Checks whether a string starts with the supplied prefix.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.startsWith('ab')('abc') // => true
 * P.startsWith('b')('abc') // => false
 * ```
 */
export function startsWith(prefix: string): (s: string) => boolean {
  return (s) => s.startsWith(prefix)
}

/**
 * Checks whether a string ends with the supplied suffix.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.endsWith('bc')('abc') // => true
 * ```
 */
export function endsWith(suffix: string): (s: string) => boolean {
  return (s) => s.endsWith(suffix)
}

/**
 * Removes a matching prefix and returns the remainder as `Just`.
 * Returns `Nothing` when the prefix does not match.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.stripPrefix('ab')('abc') // => Just ('c')
 * P.stripPrefix('x')('abc') // => Nothing
 * ```
 */
export function stripPrefix(prefix: string): (s: string) => Maybe<string> {
  return (s) => s.startsWith(prefix) ? just(s.slice(prefix.length)) : nothing()
}

/**
 * Removes a matching suffix and returns the remainder as `Just`.
 * Returns `Nothing` when the suffix does not match.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.stripSuffix('.ts')('mod.ts') // => Just ('mod')
 * P.stripSuffix('.js')('mod.ts') // => Nothing
 * ```
 */
export function stripSuffix(suffix: string): (s: string) => Maybe<string> {
  return (s) =>
    s.endsWith(suffix) ? just(s.slice(0, s.length - suffix.length)) : nothing()
}

/**
 * Checks whether a string contains the supplied substring.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.includes('b')('abc') // => true
 * ```
 */
export function includes(part: string): (s: string) => boolean {
  return (s) => s.includes(part)
}

/**
 * Replaces every occurrence of a substring with literal text.
 * Dollar signs in the replacement are treated literally.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.replaceAll('a', 'x')('aa') // => 'xx'
 * P.replaceAll('a', '$&')('a') // => '$&'
 * ```
 */
export function replaceAll(from: string, to: string): (s: string) => string {
  return (s) => s.replaceAll(from, to.replaceAll('$', '$$$$'))
}

/**
 * Splits a string at each occurrence of the supplied separator.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.splitOn(',')('a,b,c') // => ['a', 'b', 'c']
 * P.splitOn(',')('') // => ['']
 * ```
 */
export function splitOn(sep: string): (s: string) => string[] {
  return (s) => s.split(sep)
}

/**
 * Joins strings with the supplied separator between them.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.joinWith('-')(['a', 'b', 'c']) // => 'a-b-c'
 * ```
 */
export function joinWith(sep: string): (xs: readonly string[]) => string {
  return (xs) => xs.join(sep)
}

/**
 * Converts a string to uppercase.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.toUpper('abc') // => 'ABC'
 * ```
 */
export function toUpper(s: string): string {
  return s.toUpperCase()
}

/**
 * Converts a string to lowercase.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.toLower('ABC') // => 'abc'
 * ```
 */
export function toLower(s: string): string {
  return s.toLowerCase()
}

/**
 * Removes whitespace from both ends of a string.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.trim('  a b  ') // => 'a b'
 * ```
 */
export function trim(s: string): string {
  return s.trim()
}

/**
 * Splits a string on whitespace, discarding empty parts.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.words('  one  two ') // => ['one', 'two']
 * ```
 */
export function words(s: string): string[] {
  return s.split(/\s+/).filter((w) => w !== '')
}

/**
 * Joins strings with a single space between them.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.unwords(['one', 'two']) // => 'one two'
 * ```
 */
export function unwords(xs: readonly string[]): string {
  return xs.join(' ')
}

/**
 * Splits a string on newline characters, ignoring one trailing newline.
 * Returns `[]` for an empty string. Carriage returns are preserved.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.lines('a\nb\n') // => ['a', 'b']
 * P.lines('a\nb') // => ['a', 'b']
 * P.lines('') // => []
 * ```
 */
export function lines(s: string): string[] {
  if (s === '') return []
  return (s.endsWith('\n') ? s.slice(0, -1) : s).split('\n')
}

/**
 * Joins strings with a newline after every item, including the last.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.unlines(['a', 'b']) // => 'a\nb\n'
 * ```
 */
export function unlines(xs: readonly string[]): string {
  return xs.reduce((acc, x) => acc + x + '\n', '')
}

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * Parses a whole string as an integer in the supplied radix, from 2 to 36.
 * Returns `Nothing` for invalid digits or surrounding whitespace.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.parseInt(10)('42') // => Just (42)
 * P.parseInt(10)('4.2') // => Nothing
 * P.parseInt(16)('ff') // => Just (255)
 * ```
 */
export function parseInt(radix: number): (s: string) => Maybe<number> {
  const numeral = radix >= 2 && radix <= 36
    ? new RegExp(`^[+-]?[${DIGITS.slice(0, radix)}]+$`, 'i')
    : undefined
  return (s) => {
    if (numeral === undefined || !numeral.test(s)) return nothing()
    const n = Number.parseInt(s, radix)
    return Number.isNaN(n) ? nothing() : just(n)
  }
}

const FLOAT =
  /^\s*[+-]?(?:Infinity|NaN|(?:[0-9]+|[0-9]+[.][0-9]+|[0-9]+[.]|[.][0-9]+)(?:[Ee][+-]?[0-9]+)?)\s*$/

/**
 * Parses a whole string as a floating-point number, allowing surrounding
 * whitespace.
 * Returns `Nothing` for invalid text; accepts `NaN` and `Infinity`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.parseFloat('1.5e2') // => Just (150)
 * P.parseFloat('1,5') // => Nothing
 * ```
 */
export function parseFloat(s: string): Maybe<number> {
  return FLOAT.test(s) ? just(Number.parseFloat(s)) : nothing()
}

/**
 * Parses a string using JavaScript's date parsing rules.
 * Returns `Nothing` for an invalid date.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.parseDate('2026-09-18') // => Just (Date ('2026-09-18T00:00:00.000Z'))
 * P.parseDate('nope') // => Nothing
 * ```
 */
export function parseDate(s: string): Maybe<Date> {
  const date = new Date(s)
  return Number.isNaN(date.valueOf()) ? nothing() : just(date)
}

/**
 * Parses JSON as `Just`, or returns `Nothing` for invalid JSON.
 * The parsed value has type `unknown`; validate it before use.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.parseJson('{"a": 1}') // => Just ({ a: 1 })
 * P.parseJson('{') // => Nothing
 * ```
 */
export function parseJson(s: string): Maybe<unknown> {
  try {
    return just(JSON.parse(s))
  } catch {
    return nothing()
  }
}
