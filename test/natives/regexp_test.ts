import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Maybe } from '../../src/data/maybe.ts'
import type { Matched } from '../../src/natives/regexp.ts'
import { lte } from '../../src/classes/ord.ts'
import { just, nothing } from '../../src/data/maybe.ts'
import {
  escape,
  firstCaptures,
  match,
  matchAll,
  test as matches,
  Re,
  regex,
  replace,
  splitOnRegex,
} from '../../src/natives/regexp.ts'
import { toUpper } from '../../src/natives/string.ts'

test ('Re: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (Re['@@type'], 'RegExp')
  assert.deepStrictEqual (Re.is (/a/), true)
  assert.deepStrictEqual (Re.is ('/a/'), false)
  assert.deepStrictEqual (Re.is (null), false)
  assert.deepStrictEqual (Re.show (/a/gi), '/a/gi')
  assert.deepStrictEqual (Re.show (/^$/), '/^$/')
})

test ('Re: equality is by the source and the flags', () => {
  assert.deepStrictEqual (Re.equals (/a/g, /a/g), true)
  assert.deepStrictEqual (Re.equals (/a/g, /a/i), false)
  assert.deepStrictEqual (Re.equals (/a/, /b/), false)
  assert.deepStrictEqual (Re.equals (/a/gi, /a/ig), true)
})

test ('Re: lastIndex is no part of the equality', () => {
  const re = /a/g
  re.lastIndex = 5

  assert.deepStrictEqual (Re.equals (re, /a/g), true)
})

test ('Re: supports only the declared classes', () => {
  for (const name of ['lte', 'concat', 'empty', 'map', 'of']) {
    assert.deepStrictEqual (name in Re, false, name)
  }
})

test ('test: checks whether a regular expression matches a string', () => {
  assert.deepStrictEqual (matches (/^a/) ('abacus'), true)
  assert.deepStrictEqual (matches (/^a/) ('banana'), false)
  assert.deepStrictEqual (matches (/\d+/) ('a1'), true)
  assert.deepStrictEqual (matches (/x/) (''), false)
  assert.deepStrictEqual (matches (/^$/) (''), true)
})

test ('test: a global pattern does not remember the position', () => {
  const re = /a/g

  assert.deepStrictEqual (matches (re) ('a'), true)
  assert.deepStrictEqual (matches (re) ('a'), true)
  assert.deepStrictEqual (matches (re) ('a'), true)
  assert.deepStrictEqual (re.lastIndex, 0)
})

test ("test: someone else's lastIndex stays as it was", () => {
  const re = /a/g
  re.lastIndex = 3
  matches (re) ('aaaa')

  assert.deepStrictEqual (re.lastIndex, 3)
})

test ('match: calls the handler for the active branch', () => {
  assert.deepStrictEqual (
    match (/(good)?bye/) ('goodbye'),
    just ({ match: 'goodbye', groups: [just ('good')] }),
  )
  assert.deepStrictEqual (
    match (/(good)?bye/) ('bye'),
    just ({ match: 'bye', groups: [nothing<string> ()] }),
  )
  assert.deepStrictEqual (match (/x/) ('y'), nothing<Matched> ())
  assert.deepStrictEqual (
    match (/(\d)(\w)/) ('a1b'),
    just ({ match: '1b', groups: [just ('1'), just ('b')] }),
  )
  assert.deepStrictEqual (
    match (/(\d)/) ('1 2 3'),
    just ({ match: '1', groups: [just ('1')] }),
  )
})

test ('match: a pattern without groups gives an empty group list', () => {
  assert.deepStrictEqual (match (/\d+/) ('a12b'), just ({ match: '12', groups: [] }))
  assert.deepStrictEqual (match (/^$/) (''), just ({ match: '', groups: [] }))
  assert.deepStrictEqual (match (/(?:a)(?:b)/) ('ab'), just ({ match: 'ab', groups: [] }))
})

test ('match: nested groups come in the order of the opening brackets', () => {
  assert.deepStrictEqual (
    match (/((a)(b))/) ('ab'),
    just ({ match: 'ab', groups: [just ('ab'), just ('a'), just ('b')] }),
  )
  assert.deepStrictEqual (
    match (/((a)?(b))/) ('b'),
    just ({ match: 'b', groups: [just ('b'), nothing<string> (), just ('b')] }),
  )
})

test ('match: named groups arrive as ordinary ones, by number', () => {
  assert.deepStrictEqual (
    match (/(?<d>\d)(?<w>\w)/) ('1a'),
    just ({ match: '1a', groups: [just ('1'), just ('a')] }),
  )
  assert.deepStrictEqual (
    match (/(\d)(?<w>\w)/) ('1a'),
    just ({ match: '1a', groups: [just ('1'), just ('a')] }),
  )
  assert.deepStrictEqual (
    match (/(?<a>a)?b/) ('b'),
    just ({ match: 'b', groups: [nothing<string> ()] }),
  )
})

test ('matchAll: returns all matches and their capture groups, or [] when none match', () => {
  assert.deepStrictEqual (matchAll (/(\w)(\d)?/g) ('a1 b'), [
    { match: 'a1', groups: [just ('a'), just ('1')] },
    { match: 'b', groups: [just ('b'), nothing<string> ()] },
  ])
  assert.deepStrictEqual (matchAll (/\d+/g) ('a12b345'), [
    { match: '12', groups: [] },
    { match: '345', groups: [] },
  ])
  assert.deepStrictEqual (matchAll (/x/g) ('abc'), [])
})

test ('matchAll: named and nested groups, as in match', () => {
  assert.deepStrictEqual (matchAll (/(?<d>\d)/g) ('1 2'), [
    { match: '1', groups: [just ('1')] },
    { match: '2', groups: [just ('2')] },
  ])
  assert.deepStrictEqual (matchAll (/((a)(b)?)/g) ('ab a'), [
    { match: 'ab', groups: [just ('ab'), just ('a'), just ('b')] },
    { match: 'a', groups: [just ('a'), just ('a'), nothing<string> ()] },
  ])
})

test ('firstCaptures: returns the first capture group from each match', () => {
  assert.deepStrictEqual (firstCaptures (/(a)(b)/g) ('abab'), [just ('a'), just ('a')])
  assert.deepStrictEqual (firstCaptures (/(\d+)/g) ('a12b345'), [just ('12'), just ('345')])
  assert.deepStrictEqual (firstCaptures (/(\d)/g) ('abc'), [])
  assert.deepStrictEqual (firstCaptures (/(\w)(\d)/g) ('a1 b2'), [just ('a'), just ('b')])
  assert.deepStrictEqual (firstCaptures (/((a)b)/g) ('ab'), [just ('ab')])
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

      assert.deepStrictEqual (
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

      assert.deepStrictEqual (
        matchAll (pattern) (text).map ((m) => showGroups (m.groups)),
        every,
        msg,
      )
    }
  }
})

test ('capture helpers: handle optional groups consistently', () => {
  assert.deepStrictEqual (
    match (/(\d)(\w)?/) ('1a'),
    just ({ match: '1a', groups: [just ('1'), just ('a')] }),
  )
  assert.deepStrictEqual (
    match (/x(a)?/) ('x'),
    just ({ match: 'x', groups: [nothing<string> ()] }),
  )
  assert.deepStrictEqual (match (/z/) ('x'), nothing<Matched> ())
  assert.deepStrictEqual (matchAll (/(\d)/) ('1 2'), [
    { match: '1', groups: [just ('1')] },
    { match: '2', groups: [just ('2')] },
  ])
  assert.deepStrictEqual (firstCaptures (/(\d)-/) ('1- 2-'), [just ('1'), just ('2')])
  assert.deepStrictEqual (
    match (/x(a)?/) ('x'),
    just ({ match: 'x', groups: [nothing<string> ()] }),
  )
  assert.deepStrictEqual (match (/x(a?)/) ('x'), just ({ match: 'x', groups: [just ('')] }))
})

test ('escape: escapes text so it can be used literally inside a regular expression', () => {
  for (
    const s of ['.*+?^${}()|[]\\', 'abc 123', '', 'a-b', 'naïve $5', 'señor']
  ) {
    assert.deepStrictEqual (escape (s), RegExp.escape (s), JSON.stringify (s))
  }

  assert.deepStrictEqual (escape (''), '')
})

test ('escape: safe inside a character class too', () => {
  const charClass = (s: string, flags: string) =>
    new RegExp (`[${escape (s)}]`, flags)
  for (const flags of ['', 'u', 'v']) {
    assert.deepStrictEqual (
      charClass ('a-b', flags).test ('-'),
      true,
      `hyphen under '${flags}'`,
    )
    assert.deepStrictEqual (charClass ('a-b', flags).test ('a'), true)
    assert.deepStrictEqual (charClass ('a-b', flags).test ('b'), true)
    assert.deepStrictEqual (
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
    assert.deepStrictEqual (matches (new RegExp (`^${escape (s)}$`)) (s), true, s)
  }

  assert.deepStrictEqual (matches (new RegExp (`^${escape ('a.c')}$`)) ('abc'), false)
  assert.deepStrictEqual (matches (new RegExp (`^${escape ('.*')}$`)) ('anything at all'), false)
})

test ('regex: creates a regular expression from flags supplied first, then a pattern string', () => {
  const re = regex ('g') (':\\d+:')

  assert.deepStrictEqual (re.source, ':\\d+:')
  assert.deepStrictEqual (re.flags, 'g')
  assert.deepStrictEqual (String (re), '/:\\d+:/g')
  assert.deepStrictEqual (regex ('') ('a').flags, '')
  assert.deepStrictEqual (regex ('gi') ('a').flags, 'gi')
})

test ('regex: every call gives a fresh object', () => {
  const build = regex ('g')

  assert.deepStrictEqual (build ('x') === build ('x'), false)
  assert.deepStrictEqual (Re.equals (build ('x'), build ('x')), true)
})

test ('replace: replaces matches using a function of their capture groups', () => {
  function uppercaseFirstGroup([$1]: readonly Maybe<string>[]) {
    return $1.match (() => '', toUpper)
  }

  assert.deepStrictEqual (
    replace (uppercaseFirstGroup) (/(\w)/) ('foo'),
    'Foo',
  )
  assert.deepStrictEqual (
    replace (uppercaseFirstGroup) (/(\w)/g) ('foo'),
    'FOO',
  )
  assert.deepStrictEqual (replace (showGroups) (/(foo)(bar)?/) ('<>'), '<>')
  assert.deepStrictEqual (
    replace (showGroups) (/(foo)(bar)?/) ('<foo>'),
    '<[Just ("foo"), Nothing]>',
  )
  assert.deepStrictEqual (
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

  assert.deepStrictEqual (replace (recordGroups) (/(\d)(\w)/g) ('1a 2b'), 'X X')
  assert.deepStrictEqual (replace (recordGroups) (/\d/g) ('1 2'), 'X X')
  assert.deepStrictEqual (replace (recordGroups) (/(?<d>\d)/g) ('1 2'), 'X X')
  assert.deepStrictEqual (seen, [
    '[Just ("1"), Just ("a")]',
    '[Just ("2"), Just ("b")]',
    '[]',
    '[]',
    '[Just ("1")]',
    '[Just ("2")]',
  ])
})

test ('replace: what the substituter returns is inserted literally', () => {
  assert.deepStrictEqual (replace (() => '$&') (/a/) ('a'), '$&')
  assert.deepStrictEqual (replace (() => '$$') (/a/) ('a'), '$$')
  assert.deepStrictEqual (replace (() => '$1') (/(a)/) ('a'), '$1')
})

test ('replace: a repeated call on the same pattern gives the same', () => {
  const re = /(\w)/g

  function uppercaseFirstGroup([$1]: readonly Maybe<string>[]) {
    return $1.match (() => '', toUpper)
  }

  const shout = replace (uppercaseFirstGroup) (re)

  assert.deepStrictEqual (shout ('foo'), 'FOO')
  assert.deepStrictEqual (shout ('foo'), 'FOO')
  assert.deepStrictEqual (re.lastIndex, 0)
})

test ('splitOnRegex: splits a string on matches without including capture groups in the result', () => {
  assert.deepStrictEqual (splitOnRegex (/[,;][ ]*/g) ('foo, bar, baz'), [
    'foo',
    'bar',
    'baz',
  ])
  assert.deepStrictEqual (splitOnRegex (/[,;][ ]*/g) ('foo;bar;baz'), [
    'foo',
    'bar',
    'baz',
  ])
  assert.deepStrictEqual (splitOnRegex (/,/g) ('abc'), ['abc'])
  assert.deepStrictEqual (splitOnRegex (/,/g) (',a,'), ['', 'a', ''])
  assert.deepStrictEqual (splitOnRegex (/,/g) (''), [''])
})

test ('splitOnRegex: the groups of the pattern do not reach the result', () => {
  assert.deepStrictEqual (splitOnRegex (/(\d)/g) ('a1b2c'), ['a', 'b', 'c'])
})

test ('match leaves no trace on a sticky pattern', () => {
  const re = /a/y
  const m = match (re)
  const first = m ('ab')
  const second = m ('ab')

  assert.deepStrictEqual (first, second)
  assert.deepStrictEqual (m ('ab'), second, 'and on the third time too')
  assert.deepStrictEqual (re.lastIndex, 0)
  assert.deepStrictEqual (re.flags, 'y')
})

test ('match does not move the lastIndex of a global pattern', () => {
  const re = /(\d)/g
  re.lastIndex = 2
  match (re) ('1 2')

  assert.deepStrictEqual (re.lastIndex, 2)
})

test ('Re: regexes have no order, so lte rejects', () => {
  assert.throws (
    () => lte (/a/ as never) (/b/ as never),
    (error: unknown) => error instanceof TypeError && error.message.includes ('has no Ord'),
  )
})

test ('match: an unmatched group and an empty one are different outcomes', () => {
  assert.deepStrictEqual (
    match (/x(a)?/) ('x'),
    just ({ match: 'x', groups: [nothing<string> ()] }),
  )
  assert.deepStrictEqual (match (/x(a?)/) ('x'), just ({ match: 'x', groups: [just ('')] }))
  assert.deepStrictEqual (match (/x(a)?/) ('xa'), just ({ match: 'xa', groups: [just ('a')] }))
  assert.deepStrictEqual (match (/x(a?)/) ('xa'), just ({ match: 'xa', groups: [just ('a')] }))
  assert.deepStrictEqual (match (/x(a)?/) ('y'), nothing<Matched> ())
})

test ('match: the g flag is stripped and does not change the answer', () => {
  assert.deepStrictEqual (match (/(\d)/g) ('1 2'), just ({ match: '1', groups: [just ('1')] }))
  assert.deepStrictEqual (match (/(\d)/g) ('1 2'), match (/(\d)/) ('1 2'))
  assert.deepStrictEqual (match (/(\w)(\d)?/g) ('a1 b'), match (/(\w)(\d)?/) ('a1 b'))
  assert.deepStrictEqual (match (/x(a)?/g) ('x'), match (/x(a)?/) ('x'))
  assert.deepStrictEqual (match (/a/gi) ('A'), just ({ match: 'A', groups: [] }))
  assert.deepStrictEqual (match (/a/g) ('A'), nothing<Matched> ())
  assert.deepStrictEqual (matchAll (/(\d)/g) ('1 2'), [
    { match: '1', groups: [just ('1')] },
    { match: '2', groups: [just ('2')] },
  ])
})

test ('match: the pattern handed in stays untouched', () => {
  const re = /(\d)/g
  re.lastIndex = 2
  const first = match (re)

  assert.deepStrictEqual (first ('1 2'), just ({ match: '1', groups: [just ('1')] }))
  assert.deepStrictEqual (first ('1 2'), just ({ match: '1', groups: [just ('1')] }))
  assert.deepStrictEqual (re.lastIndex, 2)
  assert.deepStrictEqual (re.flags, 'g')
  assert.deepStrictEqual (re.source, '(\\d)')
})

test ('matchAll: an unmatched group and an empty one differ', () => {
  assert.deepStrictEqual (matchAll (/x(a)?/g) ('x xa'), [
    { match: 'x', groups: [nothing<string> ()] },
    { match: 'xa', groups: [just ('a')] },
  ])
  assert.deepStrictEqual (matchAll (/x(a?)/g) ('x xa'), [
    { match: 'x', groups: [just ('')] },
    { match: 'xa', groups: [just ('a')] },
  ])
})

test ('matchAll: the g flag is added and does not change the answer', () => {
  assert.deepStrictEqual (matchAll (/\d/) ('1 2 3'), [
    { match: '1', groups: [] },
    { match: '2', groups: [] },
    { match: '3', groups: [] },
  ])
  assert.deepStrictEqual (matchAll (/\d/) ('1 2 3'), matchAll (/\d/g) ('1 2 3'))
  assert.deepStrictEqual (matchAll (/(\w)(\d)?/) ('a1 b'), matchAll (/(\w)(\d)?/g) ('a1 b'))
  assert.deepStrictEqual (matchAll (/a/i) ('aA'), [
    { match: 'a', groups: [] },
    { match: 'A', groups: [] },
  ])
})

test ('matchAll: an empty match does not loop forever', () => {
  assert.deepStrictEqual (matchAll (/x*/g) ('ab'), [
    { match: '', groups: [] },
    { match: '', groups: [] },
    { match: '', groups: [] },
  ])
  assert.deepStrictEqual (matchAll (/x*/g) (''), [{ match: '', groups: [] }])
})

test ('matchAll: the pattern handed in stays untouched', () => {
  const re = /\d/g

  assert.deepStrictEqual (matchAll (re) ('1 2').length, 2)
  assert.deepStrictEqual (re.lastIndex, 0)
  assert.deepStrictEqual (matchAll (re) ('1 2').length, 2)
})

test ('firstCaptures: an unmatched group and an empty one differ', () => {
  assert.deepStrictEqual (firstCaptures (/x(a)?/g) ('x xa'), [nothing<string> (), just ('a')])
  assert.deepStrictEqual (firstCaptures (/x(a?)/g) ('x xa'), [just (''), just ('a')])
})

test ('firstCaptures: no group at all is a Nothing too', () => {
  assert.deepStrictEqual (firstCaptures (/\d/g) ('abc'), [])
  assert.deepStrictEqual (firstCaptures (/x/g) ('xx'), [
    nothing<string> (),
    nothing<string> (),
  ])
  assert.deepStrictEqual (firstCaptures (/x(a)?/g) ('xx'), [
    nothing<string> (),
    nothing<string> (),
  ])
  assert.deepStrictEqual (firstCaptures (/x/g) ('y'), [])
})

test ('escape: the output is usable under all flags', () => {
  for (const s of ['a-b', 'a,b', 'a#b', 'a b', 'a\tb', '.*+?^${}()|[]\\']) {
    for (const flags of ['', 'u', 'v', 'gi']) {
      const re = new RegExp (escape (s), flags)

      assert.deepStrictEqual (re.test (s), true, `${JSON.stringify (s)} under '${flags}'`)
    }
  }

  assert.throws (() => new RegExp ('\\-', 'u'), SyntaxError)
})

test ('regex: bad flags are rejected immediately, without waiting for a source', () => {
  assert.throws (
    () => regex ('q'),
    (error: unknown) => error instanceof TypeError && error.message.includes ('is not valid RegExp flags'),
  )
  assert.throws (
    () => regex ('gg'),
    (error: unknown) => error instanceof TypeError && error.message.includes ('is not valid RegExp flags'),
  )
  assert.throws (
    () => regex (' g'),
    (error: unknown) => error instanceof TypeError && error.message.includes ('is not valid RegExp flags'),
  )
})

test ('replace: passes capture groups in a single argument', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 'X'
  }

  replace (recordArguments) (/(\d)(\w)/g) ('1a 2b')

  assert.deepStrictEqual (calls, [[[just ('1'), just ('a')]], [[just ('2'), just ('b')]]])
})

test ('replace: passes an empty group list when there are no captures', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 'X'
  }

  replace (recordArguments) (/\d/g) ('1 2')

  assert.deepStrictEqual (calls, [[[]], [[]]])
})

test ('replace: named captures are passed in the group list', () => {
  const calls: unknown[][] = []

  function recordArguments(...args: unknown[]) {
    calls.push (args)
    return 'X'
  }

  replace (recordArguments) (/(?<d>\d)/g) ('1 2')

  assert.deepStrictEqual (calls, [[[just ('1')]], [[just ('2')]]])
})

test ('replace: with no match the text comes back as it is', () => {
  assert.deepStrictEqual (replace (() => 'X') (/z/g) ('abc'), 'abc')
  assert.deepStrictEqual (replace (() => 'X') (/z/) ('abc'), 'abc')
})

test ('splitOnRegex: an empty match cuts by characters, it does not loop', () => {
  assert.deepStrictEqual (splitOnRegex (/x*/g) ('abc'), ['a', 'b', 'c'])
  assert.deepStrictEqual (splitOnRegex (/x*/g) (''), [])
})

test ('splitOnRegex: a non-global pattern is rejected immediately', () => {
  assert.throws (
    () => splitOnRegex (/,/),
    (error: unknown) => error instanceof TypeError && error.message.includes ('must have the global flag'),
  )
})

test ('splitOnRegex: the pattern handed in stays untouched', () => {
  const re = /[,;][ ]*/g

  assert.deepStrictEqual (splitOnRegex (re) ('foo, bar'), ['foo', 'bar'])
  assert.deepStrictEqual (re.lastIndex, 0)
  assert.deepStrictEqual (splitOnRegex (re) ('foo, bar'), ['foo', 'bar'])
})

test ('the walk over empty matches steps by code points, not by units', () => {
  const smiley = '\u{1F600}'

  assert.deepStrictEqual ([...smiley.matchAll (/(?:)/gu)].map ((m) => m.index), [0, 2])
  assert.deepStrictEqual (matchAll (/(?:)/gu) (smiley).length, 2)
  assert.deepStrictEqual (splitOnRegex (/x*/gu) (smiley).length, 1)

  assert.deepStrictEqual (matchAll (/(?:)/g) (smiley).length, 3)

  assert.deepStrictEqual (matchAll (/x*/g) ('axb').map ((m) => m.match), ['', 'x', '', ''])
  assert.deepStrictEqual (matchAll (/x*/gu) ('axb').map ((m) => m.match), ['', 'x', '', ''])
})

function showGroups(groups: readonly Maybe<string>[]): string {
  function showGroup(group: Maybe<string>): string {
    if (group.tag === 'nothing') return 'Nothing'
    return `Just (${JSON.stringify (group.value)})`
  }

  return '[' + groups.map (showGroup).join (', ') + ']'
}
