/**
 * Match, replace, and split text using regular expressions.
 * Capture groups use `Maybe` to represent unmatched optional groups.
 *
 * @module
 */

import type { Shape } from '../core/shape.ts'
import type { NativeTypeRep } from '../core/named.ts'
import type { SetoidDict } from '../classes/setoid.ts'
import type { ShowDict } from '../classes/show.ts'
import type { Maybe } from '../data/maybe.ts'
import { just, nothing } from '../data/maybe.ts'

/**
 * The shape for regular expressions. Use it with `Kind` when declaring generic
 * helpers.
 */
export interface ReShape extends Shape<'RegExp'> {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: RegExp
}

/**
 * The type of the `Re` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type ReTypeRep =
  & NativeTypeRep<ReShape>
  & SetoidDict<ReShape>
  & ShowDict<ReShape>

/**
 * The regular expression representative. Compares source and flags, ignoring
 * `lastIndex`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.Re.equals(/hello/i, /hello/i) // => true
 * ```
 */
export const Re: ReTypeRep = {
  '@@type': 'RegExp' as const,
  _shape: undefined as unknown as ReShape,
  is(x: unknown): x is RegExp {
    return x instanceof RegExp
  },
  equals(a: RegExp, b: RegExp): boolean {
    return a.source === b.source && a.flags === b.flags
  },
  show(re: RegExp): string {
    return String(re)
  },
}

/**
 * Checks whether a regular expression matches a string.
 * Uses the pattern's current `lastIndex` and restores it after the check.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.test(/^a/)('abc') // => true
 * P.test(/^a/)('bc') // => false
 * ```
 */
export function test(pattern: RegExp): (s: string) => boolean {
  return (s) => {
    const lastIndex = pattern.lastIndex
    const result = pattern.test(s)
    pattern.lastIndex = lastIndex
    return result
  }
}

/**
 * A regular expression match with its numbered capture groups.
 * An unmatched optional capture is represented by `Nothing`.
 */
export type Matched = {
  /** The full text matched by the regular expression. */
  readonly match: string
  /** Numbered capture groups in order, with `Nothing` for unmatched groups. */
  readonly groups: readonly Maybe<string>[]
}

/**
 * Returns the first match and its capture groups as `Just`, or `Nothing`.
 * Ignores the pattern's global flag and starts from index zero.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.match(/(\d)(\w)?/)('1a')
 * // => Just ({ match: '1a', groups: [Just ('1'), Just ('a')] })
 * P.match(/x(a)?/)('x') // => Just ({ match: 'x', groups: [Nothing] })
 * P.match(/z/)('x') // => Nothing
 * ```
 */
export function match(pattern: RegExp): (s: string) => Maybe<Matched> {
  const flags = pattern.flags.replace('g', '')
  return (s) => {
    const once = new RegExp(pattern.source, flags)
    const found = s.match(once)
    return found === null ? nothing() : just(matched(found))
  }
}

/**
 * Returns all matches and their capture groups, or `[]` when none match.
 * Searches from index zero, with or without the global flag.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.matchAll(/(\d)/)('1 2')
 * // => [{ match: '1', groups: [Just ('1')] },
 * //     { match: '2', groups: [Just ('2')] }]
 * ```
 */
export function matchAll(pattern: RegExp): (s: string) => Matched[] {
  return (s) => {
    const globalPattern = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g',
    )
    const matches: Matched[] = []
    for (;;) {
      const found = globalPattern.exec(s)
      if (found === null) return matches
      matches.push(matched(found))
      if (found[0] === '') {
        globalPattern.lastIndex = nextIndex(
          s,
          globalPattern.lastIndex,
          globalPattern.unicode || globalPattern.unicodeSets,
        )
      }
    }
  }
}

/**
 * Returns the first capture group from each match.
 * A missing or unmatched first group becomes `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.firstCaptures(/(\d)-/)('1- 2-') // => [Just ('1'), Just ('2')]
 * ```
 */
export function firstCaptures(pattern: RegExp): (s: string) => Maybe<string>[] {
  return (s) =>
    matchAll(pattern)(s).map((m: Matched) => m.groups[0] ?? nothing())
}

/**
 * Escapes text so it can be used literally inside a regular expression.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.escape('a-b') // => '\\x61\\x2db'
 * new RegExp(`[${P.escape('a-b')}]`, 'u') // catches the hyphen, not the range
 * ```
 */
export function escape(s: string): string {
  return RegExp.escape(s)
}

/**
 * Creates a regular expression from flags supplied first, then a pattern
 * string.
 *
 * @throws {TypeError} If the flags are invalid.
 *
 * @throws {SyntaxError} If the pattern string is invalid.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import * as P from '@algosail/ply'
 *
 * P.regex('gi')('ab+c') // => /ab+c/gi
 * assertThrows(
 *   () => P.regex('q'),
 *   TypeError,
 *   'regex: "q" is not valid RegExp flags',
 * )
 * ```
 */
export function regex(flags: string): (source: string) => RegExp {
  try {
    new RegExp('', flags)
  } catch {
    throw new TypeError(
      `regex: ${JSON.stringify(flags)} is not valid RegExp flags`,
    )
  }
  return (source) => new RegExp(source, flags)
}

/**
 * Replaces matches using a function of their capture groups.
 * Unmatched groups are `Nothing`. The pattern's `g` flag controls whether all
 * matches are replaced.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const upperGroup = P.replace(([g]) =>
 *   g.match(() => '', (s: string) => s.toUpperCase())
 * )
 *
 * upperGroup(/-(\w)/g)('a-b-c') // => 'aBC'
 * ```
 */
export function replace(
  substitute: (groups: readonly Maybe<string>[]) => string,
): (pattern: RegExp) => (text: string) => string {
  return (pattern) => (text) =>
    text.replace(pattern, (...args: unknown[]): string => {
      const groups: Maybe<string>[] = []
      for (let idx = 1;; idx += 1) {
        const arg = args[idx]
        if (typeof arg === 'number') break
        groups.push(typeof arg === 'string' ? just(arg) : nothing())
      }
      return substitute(groups)
    })
}

/**
 * Splits a string on matches without including capture groups in the result.
 *
 * @throws {TypeError} If the pattern does not have the global flag.
 *
 * @example
 * ```ts
 * import { assertThrows } from '@std/assert'
 * import * as P from '@algosail/ply'
 *
 * P.splitOnRegex(/,/g)('a,b,c') // => ['a', 'b', 'c']
 * assertThrows(
 *   () => P.splitOnRegex(/,/),
 *   TypeError,
 *   'splitOnRegex: pattern must have the global flag',
 * )
 * ```
 */
export function splitOnRegex(pattern: RegExp): (s: string) => string[] {
  if (!pattern.global) {
    throw new TypeError('splitOnRegex: pattern must have the global flag')
  }
  return (s) => {
    const globalPattern = new RegExp(pattern.source, pattern.flags)
    const parts: string[] = []
    let idx = 0
    for (;;) {
      const found = globalPattern.exec(s)
      if (found === null) {
        parts.push(s.slice(idx))
        return parts
      }
      if (globalPattern.lastIndex === idx && found[0] === '') {
        if (globalPattern.lastIndex === s.length) return parts
        globalPattern.lastIndex = nextIndex(
          s,
          globalPattern.lastIndex,
          globalPattern.unicode || globalPattern.unicodeSets,
        )
        continue
      }
      parts.push(s.slice(idx, found.index))
      idx = found.index + found[0].length
    }
  }
}

function nextIndex(s: string, at: number, unicode: boolean): number {
  if (!unicode || at + 1 >= s.length) return at + 1
  const lead = s.charCodeAt(at)
  if (lead < 0xd800 || lead > 0xdbff) return at + 1
  const trail = s.charCodeAt(at + 1)
  return trail >= 0xdc00 && trail <= 0xdfff ? at + 2 : at + 1
}

function matched(found: RegExpMatchArray): Matched {
  return {
    match: found[0],
    groups: found.slice(1).map((g) => g === undefined ? nothing() : just(g)),
  }
}
