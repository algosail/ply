import { test } from 'node:test'
import { assertEquals, assertThrows } from '../assert.ts'
import {
  escape,
  firstCaptures,
  match,
  matchAll,
  Re,
  regex,
  replace,
  splitOnRegex,
  test as matches,
} from '../../src/natives/regexp.ts'
import type { Matched } from '../../src/natives/regexp.ts'
import type { Maybe } from '../../src/data/maybe.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import { toUpper } from '../../src/natives/string.ts'
import { lte } from '../../src/classes/ord.ts'

test ('Re: recognizes values and provides the declared operations', () => {
  assertEquals (Re['@@type'], 'RegExp')
  assertEquals (Re.is (/a/), true)
  assertEquals (Re.is ('/a/'), false)
  assertEquals (Re.is (null), false)
  assertEquals (Re.show (/a/gi), '/a/gi')
  assertEquals (Re.show (/^$/), '/^$/')
})

test ('Re: equality is by the source and the flags', () => {
  assertEquals (Re.equals (/a/g, /a/g), true)
  assertEquals (Re.equals (/a/g, /a/i), false)
  assertEquals (Re.equals (/a/, /b/), false)
  assertEquals (Re.equals (/a/gi, /a/ig), true)
})

test ('Re: lastIndex is no part of the equality', () => {
  const re = /a/g
  re.lastIndex = 5

  assertEquals (Re.equals (re, /a/g), true)
})

test ('Re: supports only the declared classes', () => {
  for (const name of ['lte', 'concat', 'empty', 'map', 'of']) {
    assertEquals (name in Re, false, name)
  }
})

test ('test: checks whether a regular expression matches a string', () => {
  assertEquals (matches (/^a/) ('abacus'), true)
  assertEquals (matches (/^a/) ('banana'), false)
  assertEquals (matches (/\d+/) ('a1'), true)
  assertEquals (matches (/x/) (''), false)
  assertEquals (matches (/^$/) (''), true)
})

test ('test: a global pattern does not remember the position', () => {
  const re = /a/g

  assertEquals (matches (re) ('a'), true)
  assertEquals (matches (re) ('a'), true)
  assertEquals (matches (re) ('a'), true)
  assertEquals (re.lastIndex, 0)
})

test ("test: someone else's lastIndex stays as it was", () => {
  const re = /a/g
  re.lastIndex = 3
  matches (re) ('aaaa')

  assertEquals (re.lastIndex, 3)
})

test ('match: calls the handler for the active branch', () => {
  assertEquals (
    match (/(good)?bye/) ('goodbye'),
    just ({ match: 'goodbye', groups: [just ('good')] }),
  )
  assertEquals (
    match (/(good)?bye/) ('bye'),
    just ({ match: 'bye', groups: [nothing<string> ()] }),
  )
  assertEquals (match (/x/) ('y'), nothing<Matched> ())
  assertEquals (
    match (/(\d)(\w)/) ('a1b'),
    just ({ match: '1b', groups: [just ('1'), just ('b')] }),
  )
  assertEquals (
    match (/(\d)/) ('1 2 3'),
    just ({ match: '1', groups: [just ('1')] }),
  )
})

test ('match: a pattern without groups gives an empty group list', () => {
  assertEquals (match (/\d+/) ('a12b'), just ({ match: '12', groups: [] }))
  assertEquals (match (/^$/) (''), just ({ match: '', groups: [] }))
  assertEquals (match (/(?:a)(?:b)/) ('ab'), just ({ match: 'ab', groups: [] }))
})

test ('match: nested groups come in the order of the opening brackets', () => {
  assertEquals (
    match (/((a)(b))/) ('ab'),
    just ({ match: 'ab', groups: [just ('ab'), just ('a'), just ('b')] }),
  )
  assertEquals (
    match (/((a)?(b))/) ('b'),
    just ({ match: 'b', groups: [just ('b'), nothing<string> (), just ('b')] }),
  )
})

test ('match: named groups arrive as ordinary ones, by number', () => {
  assertEquals (
    match (/(?<d>\d)(?<w>\w)/) ('1a'),
    just ({ match: '1a', groups: [just ('1'), just ('a')] }),
  )
  assertEquals (
    match (/(\d)(?<w>\w)/) ('1a'),
    just ({ match: '1a', groups: [just ('1'), just ('a')] }),
  )
  assertEquals (
    match (/(?<a>a)?b/) ('b'),
    just ({ match: 'b', groups: [nothing<string> ()] }),
  )
})

test ('matchAll: returns all matches and their capture groups, or [] when none match', () => {
  assertEquals (matchAll (/(\w)(\d)?/g) ('a1 b'), [
    { match: 'a1', groups: [just ('a'), just ('1')] },
    { match: 'b', groups: [just ('b'), nothing<string> ()] },
  ])
  assertEquals (matchAll (/\d+/g) ('a12b345'), [
    { match: '12', groups: [] },
    { match: '345', groups: [] },
  ])
  assertEquals (matchAll (/x/g) ('abc'), [])
})

test ('matchAll: named and nested groups, as in match', () => {
  assertEquals (matchAll (/(?<d>\d)/g) ('1 2'), [
    { match: '1', groups: [just ('1')] },
    { match: '2', groups: [just ('2')] },
  ])
  assertEquals (matchAll (/((a)(b)?)/g) ('ab a'), [
    { match: 'ab', groups: [just ('ab'), just ('a'), just ('b')] },
    { match: 'a', groups: [just ('a'), just ('a'), nothing<string> ()] },
  ])
})

test ('firstCaptures: returns the first capture group from each match', () => {
  assertEquals (firstCaptures (/(a)(b)/g) ('abab'), [just ('a'), just ('a')])
  assertEquals (firstCaptures (/(\d+)/g) ('a12b345'), [just ('12'), just ('345')])
  assertEquals (firstCaptures (/(\d)/g) ('abc'), [])
  assertEquals (firstCaptures (/(\w)(\d)/g) ('a1 b2'), [just ('a'), just ('b')])
  assertEquals (firstCaptures (/((a)b)/g) ('ab'), [just ('ab')])
})

test ('match, matchAll and replace mark the groups alike', () => {
  const patterns = [
    /x(a)?(b?)/,
    /(good)?bye/,
    /(\d)(\w)?/,
    /((a)?(b))/,
    /(?<a>a)?b/,
    /x*/,
    /z/,
  ]
  const texts = ['', 'x', 'xa', 'xab', 'goodbye', 'bye', '1', '1a', 'b', 'axb']
  for (const pattern of patterns) {
    for (const text of texts) {
      const msg = `${pattern} on ${JSON.stringify (text)}`

      let once: string | null = null
      const recordFirstGroups = (groups: readonly Maybe<string>[]) => {
        once ??= showGroups (groups)
        return ''
      }

      replace (recordFirstGroups) (pattern) (text)

      assertEquals (
        match (pattern) (text).match (() => null, (m) => showGroups (m.groups)),
        once,
        msg,
      )

      const every: string[] = []
      const recordEachGroups = (groups: readonly Maybe<string>[]) => {
        every.push (showGroups (groups))
        return ''
      }

      replace (recordEachGroups) (
        new RegExp (pattern.source, pattern.flags + 'g'),
      ) (text)

      assertEquals (
        matchAll (pattern) (text).map ((m) => showGroups (m.groups)),
        every,
        msg,
      )
    }
  }
})

test ('capture helpers: handle optional groups consistently', () => {
  assertEquals (
    match (/(\d)(\w)?/) ('1a'),
    just ({ match: '1a', groups: [just ('1'), just ('a')] }),
  )
  assertEquals (
    match (/x(a)?/) ('x'),
    just ({ match: 'x', groups: [nothing<string> ()] }),
  )
  assertEquals (match (/z/) ('x'), nothing<Matched> ())
  assertEquals (matchAll (/(\d)/) ('1 2'), [
    { match: '1', groups: [just ('1')] },
    { match: '2', groups: [just ('2')] },
  ])
  assertEquals (firstCaptures (/(\d)-/) ('1- 2-'), [just ('1'), just ('2')])
  assertEquals (
    match (/x(a)?/) ('x'),
    just ({ match: 'x', groups: [nothing<string> ()] }),
  )
  assertEquals (match (/x(a?)/) ('x'), just ({ match: 'x', groups: [just ('')] }))
})

test ('escape: escapes text so it can be used literally inside a regular expression', () => {
  for (
    const s of ['.*+?^${}()|[]\\', 'abc 123', '', 'a-b', 'naïve $5', 'señor']
  ) {
    assertEquals (escape (s), RegExp.escape (s), JSON.stringify (s))
  }

  assertEquals (escape (''), '')
})

test ('escape: safe inside a character class too', () => {
  const charClass = (s: string, flags: string) =>
    new RegExp (`[${escape (s)}]`, flags)
  for (const flags of ['', 'u', 'v']) {
    assertEquals (
      charClass ('a-b', flags).test ('-'),
      true,
      `hyphen under '${flags}'`,
    )
    assertEquals (charClass ('a-b', flags).test ('a'), true)
    assertEquals (charClass ('a-b', flags).test ('b'), true)
    assertEquals (
      charClass ('a-c', flags).test ('b'),
      false,
      `not a range under '${flags}'`,
    )
  }
})

test ('escape: an escaped string matches itself and only itself', () => {
  const probes = [
    '.',
    'a.c',
    '.*',
    '(x)',
    'a|b',
    '[a-z]',
    '\\d',
    '$^',
    '{2,3}',
    'C++',
    'a?b',
  ]
  for (const s of probes) {
    assertEquals (matches (new RegExp (`^${escape (s)}$`)) (s), true, s)
  }

  assertEquals (matches (new RegExp (`^${escape ('a.c')}$`)) ('abc'), false)
  assertEquals (matches (new RegExp (`^${escape ('.*')}$`)) ('anything at all'), false)
})

test ('regex: creates a regular expression from flags supplied first, then a pattern string', () => {
  const re = regex ('g') (':\\d+:')

  assertEquals (re.source, ':\\d+:')
  assertEquals (re.flags, 'g')
  assertEquals (String (re), '/:\\d+:/g')
  assertEquals (regex ('') ('a').flags, '')
  assertEquals (regex ('gi') ('a').flags, 'gi')
})

test ('regex: every call gives a fresh object', () => {
  const build = regex ('g')

  assertEquals (build ('x') === build ('x'), false)
  assertEquals (Re.equals (build ('x'), build ('x')), true)
})

test ('replace: replaces matches using a function of their capture groups', () => {
  function uppercaseFirstGroup([$1]: readonly Maybe<string>[]) {
    return $1.match (() => '', toUpper)
  }

  assertEquals (
    replace (uppercaseFirstGroup) (/(\w)/) ('foo'),
    'Foo',
  )
  assertEquals (
    replace (uppercaseFirstGroup) (/(\w)/g) ('foo'),
    'FOO',
  )
  assertEquals (replace (showGroups) (/(foo)(bar)?/) ('<>'), '<>')
  assertEquals (
    replace (showGroups) (/(foo)(bar)?/) ('<foo>'),
    '<[Just ("foo"), Nothing]>',
  )
  assertEquals (
    replace (showGroups) (/(foo)(bar)?/) ('<foobar>'),
    '<[Just ("foo"), Just ("bar")]>',
  )
})

test ('replace: the substituter gets groups only, on three patterns', () => {
  const seen: string[] = []

  function recordGroups(groups: readonly Maybe<string>[]): string {
    seen.push (showGroups (groups))
    return 'X'
  }

  assertEquals (replace (recordGroups) (/(\d)(\w)/g) ('1a 2b'), 'X X')
  assertEquals (replace (recordGroups) (/\d/g) ('1 2'), 'X X')
  assertEquals (replace (recordGroups) (/(?<d>\d)/g) ('1 2'), 'X X')
  assertEquals (seen, [
    '[Just ("1"), Just ("a")]',
    '[Just ("2"), Just ("b")]',
    '[]',
    '[]',
    '[Just ("1")]',
    '[Just ("2")]',
  ])
})

test ('replace: what the substituter returns is inserted literally', () => {
  assertEquals (replace (() => '$&') (/a/) ('a'), '$&')
  assertEquals (replace (() => '$$') (/a/) ('a'), '$$')
  assertEquals (replace (() => '$1') (/(a)/) ('a'), '$1')
})

test ('replace: a repeated call on the same pattern gives the same', () => {
  const re = /(\w)/g

  function uppercaseFirstGroup([$1]: readonly Maybe<string>[]) {
    return $1.match (() => '', toUpper)
  }

  const shout = replace (uppercaseFirstGroup) (re)

  assertEquals (shout ('foo'), 'FOO')
  assertEquals (shout ('foo'), 'FOO')
  assertEquals (re.lastIndex, 0)
})

test ('splitOnRegex: splits a string on matches without including capture groups in the result', () => {
  assertEquals (splitOnRegex (/[,;][ ]*/g) ('foo, bar, baz'), [
    'foo',
    'bar',
    'baz',
  ])
  assertEquals (splitOnRegex (/[,;][ ]*/g) ('foo;bar;baz'), [
    'foo',
    'bar',
    'baz',
  ])
  assertEquals (splitOnRegex (/,/g) ('abc'), ['abc'])
  assertEquals (splitOnRegex (/,/g) (',a,'), ['', 'a', ''])
  assertEquals (splitOnRegex (/,/g) (''), [''])
})

test ('splitOnRegex: the groups of the pattern do not reach the result', () => {
  assertEquals (splitOnRegex (/(\d)/g) ('a1b2c'), ['a', 'b', 'c'])
})

test ('match leaves no trace on a sticky pattern', () => {
  const re = /a/y
  const m = match (re)
  const first = m ('ab')
  const second = m ('ab')

  assertEquals (first, second)
  assertEquals (m ('ab'), second, 'and on the third time too')
  assertEquals (re.lastIndex, 0)
  assertEquals (re.flags, 'y')
})

test ('match does not move the lastIndex of a global pattern', () => {
  const re = /(\d)/g
  re.lastIndex = 2
  match (re) ('1 2')

  assertEquals (re.lastIndex, 2)
})

test ('Re: regexes have no order, so lte rejects', () => {
  assertThrows (
    () => lte (/a/ as never) (/b/ as never),
    TypeError,
    'has no Ord',
  )
})

test ('match: an unmatched group and an empty one are different outcomes', () => {
  assertEquals (
    match (/x(a)?/) ('x'),
    just ({ match: 'x', groups: [nothing<string> ()] }),
  )
  assertEquals (match (/x(a?)/) ('x'), just ({ match: 'x', groups: [just ('')] }))
  assertEquals (match (/x(a)?/) ('xa'), just ({ match: 'xa', groups: [just ('a')] }))
  assertEquals (match (/x(a?)/) ('xa'), just ({ match: 'xa', groups: [just ('a')] }))
  assertEquals (match (/x(a)?/) ('y'), nothing<Matched> ())
})

test ('match: the g flag is stripped and does not change the answer', () => {
  assertEquals (match (/(\d)/g) ('1 2'), just ({ match: '1', groups: [just ('1')] }))
  assertEquals (match (/(\d)/g) ('1 2'), match (/(\d)/) ('1 2'))
  assertEquals (match (/(\w)(\d)?/g) ('a1 b'), match (/(\w)(\d)?/) ('a1 b'))
  assertEquals (match (/x(a)?/g) ('x'), match (/x(a)?/) ('x'))
  assertEquals (match (/a/gi) ('A'), just ({ match: 'A', groups: [] }))
  assertEquals (match (/a/g) ('A'), nothing<Matched> ())
  assertEquals (matchAll (/(\d)/g) ('1 2'), [
    { match: '1', groups: [just ('1')] },
    { match: '2', groups: [just ('2')] },
  ])
})

test ('match: the pattern handed in stays untouched', () => {
  const re = /(\d)/g
  re.lastIndex = 2
  const first = match (re)

  assertEquals (first ('1 2'), just ({ match: '1', groups: [just ('1')] }))
  assertEquals (first ('1 2'), just ({ match: '1', groups: [just ('1')] }))
  assertEquals (re.lastIndex, 2)
  assertEquals (re.flags, 'g')
  assertEquals (re.source, '(\\d)')
})

test ('matchAll: an unmatched group and an empty one differ', () => {
  assertEquals (matchAll (/x(a)?/g) ('x xa'), [
    { match: 'x', groups: [nothing<string> ()] },
    { match: 'xa', groups: [just ('a')] },
  ])
  assertEquals (matchAll (/x(a?)/g) ('x xa'), [
    { match: 'x', groups: [just ('')] },
    { match: 'xa', groups: [just ('a')] },
  ])
})

test ('matchAll: the g flag is added and does not change the answer', () => {
  assertEquals (matchAll (/\d/) ('1 2 3'), [
    { match: '1', groups: [] },
    { match: '2', groups: [] },
    { match: '3', groups: [] },
  ])
  assertEquals (matchAll (/\d/) ('1 2 3'), matchAll (/\d/g) ('1 2 3'))
  assertEquals (matchAll (/(\w)(\d)?/) ('a1 b'), matchAll (/(\w)(\d)?/g) ('a1 b'))
  assertEquals (matchAll (/a/i) ('aA'), [
    { match: 'a', groups: [] },
    { match: 'A', groups: [] },
  ])
})

test ('matchAll: an empty match does not loop forever', () => {
  assertEquals (matchAll (/x*/g) ('ab'), [
    { match: '', groups: [] },
    { match: '', groups: [] },
    { match: '', groups: [] },
  ])
  assertEquals (matchAll (/x*/g) (''), [{ match: '', groups: [] }])
})

test ('matchAll: the pattern handed in stays untouched', () => {
  const re = /\d/g

  assertEquals (matchAll (re) ('1 2').length, 2)
  assertEquals (re.lastIndex, 0)
  assertEquals (matchAll (re) ('1 2').length, 2)
})

test ('firstCaptures: an unmatched group and an empty one differ', () => {
  assertEquals (firstCaptures (/x(a)?/g) ('x xa'), [nothing<string> (), just ('a')])
  assertEquals (firstCaptures (/x(a?)/g) ('x xa'), [just (''), just ('a')])
})

test ('firstCaptures: no group at all is a Nothing too', () => {
  assertEquals (firstCaptures (/\d/g) ('abc'), [])
  assertEquals (firstCaptures (/x/g) ('xx'), [
    nothing<string> (),
    nothing<string> (),
  ])
  assertEquals (firstCaptures (/x(a)?/g) ('xx'), [
    nothing<string> (),
    nothing<string> (),
  ])
  assertEquals (firstCaptures (/x/g) ('y'), [])
})

test ('escape: the output is usable under all flags', () => {
  for (const s of ['a-b', 'a,b', 'a#b', 'a b', 'a\tb', '.*+?^${}()|[]\\']) {
    for (const flags of ['', 'u', 'v', 'gi']) {
      const re = new RegExp (escape (s), flags)

      assertEquals (re.test (s), true, `${JSON.stringify (s)} under '${flags}'`)
    }
  }

  assertThrows (() => new RegExp ('\\-', 'u'), SyntaxError)
})

test ('regex: bad flags are rejected immediately, without waiting for a source', () => {
  assertThrows (() => regex ('q'), TypeError, 'is not valid RegExp flags')
  assertThrows (() => regex ('gg'), TypeError, 'is not valid RegExp flags')
  assertThrows (() => regex (' g'), TypeError, 'is not valid RegExp flags')
})

test ('replace: passes capture groups in a single argument', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 'X'
  }

  replace (recordArguments) (/(\d)(\w)/g) ('1a 2b')

  assertEquals (calls, [[[just ('1'), just ('a')]], [[just ('2'), just ('b')]]])
})

test ('replace: passes an empty group list when there are no captures', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 'X'
  }

  replace (recordArguments) (/\d/g) ('1 2')

  assertEquals (calls, [[[]], [[]]])
})

test ('replace: named captures are passed in the group list', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 'X'
  }

  replace (recordArguments) (/(?<d>\d)/g) ('1 2')

  assertEquals (calls, [[[just ('1')]], [[just ('2')]]])
})

test ('replace: with no match the text comes back as it is', () => {
  assertEquals (replace (() => 'X') (/z/g) ('abc'), 'abc')
  assertEquals (replace (() => 'X') (/z/) ('abc'), 'abc')
})

test ('splitOnRegex: an empty match cuts by characters, it does not loop', () => {
  assertEquals (splitOnRegex (/x*/g) ('abc'), ['a', 'b', 'c'])
  assertEquals (splitOnRegex (/x*/g) (''), [])
})

test ('splitOnRegex: a non-global pattern is rejected immediately', () => {
  assertThrows (
    () => splitOnRegex (/,/),
    TypeError,
    'must have the global flag',
  )
})

test ('splitOnRegex: the pattern handed in stays untouched', () => {
  const re = /[,;][ ]*/g

  assertEquals (splitOnRegex (re) ('foo, bar'), ['foo', 'bar'])
  assertEquals (re.lastIndex, 0)
  assertEquals (splitOnRegex (re) ('foo, bar'), ['foo', 'bar'])
})

test ('the walk over empty matches steps by code points, not by units', () => {
  const smiley = '\u{1F600}'

  assertEquals ([...smiley.matchAll (/(?:)/gu)].map ((m) => m.index), [0, 2])
  assertEquals (matchAll (/(?:)/gu) (smiley).length, 2)
  assertEquals (splitOnRegex (/x*/gu) (smiley).length, 1)

  assertEquals (matchAll (/(?:)/g) (smiley).length, 3)

  assertEquals (matchAll (/x*/g) ('axb').map ((m) => m.match), ['', 'x', '', ''])
  assertEquals (matchAll (/x*/gu) ('axb').map ((m) => m.match), ['', 'x', '', ''])
})

function showGroups(groups: readonly Maybe<string>[]): string {
  function showGroup(group: Maybe<string>): string {
    if (group.tag === 'nothing') return 'Nothing'
    return `Just (${JSON.stringify (group.value)})`
  }

  return '[' + groups.map (showGroup).join (', ') + ']'
}
