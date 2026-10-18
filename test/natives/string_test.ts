import assert from 'node:assert/strict'
import { test } from 'node:test'
import { just, nothing } from '../../src/data/maybe.ts'
import {
  endsWith,
  includes,
  joinWith,
  lines,
  parseDate,
  parseFloat,
  parseInt,
  parseJson,
  replaceAll,
  splitOn,
  startsWith,
  Str,
  stripPrefix,
  stripSuffix,
  toLower,
  toUpper,
  trim,
  unlines,
  unwords,
  words,
} from '../../src/natives/string.ts'

test ('Str: recognizes values and provides the declared operations', () => {
  assert.deepStrictEqual (Str['@@type'], 'String')
  assert.deepStrictEqual (Str.is ('a string'), true)
  assert.deepStrictEqual (Str.is (''), true)
  assert.deepStrictEqual (Str.is (42), false)
  assert.deepStrictEqual (Str.is (new String ('x')), false)
  assert.deepStrictEqual (Str.empty (), '')
  assert.deepStrictEqual (Str.concat ('foo', 'bar'), 'foobar')
  assert.deepStrictEqual (Str.equals ('foo', 'foo'), true)
  assert.deepStrictEqual (Str.equals ('foo', 'bar'), false)
})

test ('Str: show escapes by the JSON rules', () => {
  assert.deepStrictEqual (Str.show (''), '""')
  assert.deepStrictEqual (Str.show ('foo'), '"foo"')
  assert.deepStrictEqual (Str.show ('a"b'), '"a\\"b"')
  assert.deepStrictEqual (Str.show ('a\nb'), '"a\\nb"')
  assert.deepStrictEqual (Str.show ('a\tb'), '"a\\tb"')
  assert.deepStrictEqual (Str.show ('a\\b'), '"a\\\\b"')
})

test ('Str: ordering by code units, not by the locale alphabet', () => {
  assert.deepStrictEqual (Str.lte ('a', 'b'), true)
  assert.deepStrictEqual (Str.lte ('b', 'a'), false)
  assert.deepStrictEqual (Str.lte ('a', 'a'), true)
  assert.deepStrictEqual (Str.lte ('abc', 'abd'), true)
  assert.deepStrictEqual (Str.lte ('', 'a'), true)
  assert.deepStrictEqual (Str.lte ('ab', 'abc'), true)
  assert.deepStrictEqual (Str.lte ('Z', 'a'), true)
})

test ('Str: supports only the declared classes', () => {
  for (const name of ['map', 'of', 'ap', 'chain', 'reduce', 'zero', 'alt']) {
    assert.deepStrictEqual (name in Str, false, name)
  }
})

test ('startsWith: checks whether a string starts with the supplied prefix', () => {
  assert.deepStrictEqual (startsWith ('foo') ('foobar'), true)
  assert.deepStrictEqual (startsWith ('bar') ('foobar'), false)
  assert.deepStrictEqual (startsWith ('foobar') ('foo'), false)
  assert.deepStrictEqual (startsWith ('') ('foobar'), true)
  assert.deepStrictEqual (startsWith ('') (''), true)
})

test ('endsWith: checks whether a string ends with the supplied suffix', () => {
  assert.deepStrictEqual (endsWith ('bar') ('foobar'), true)
  assert.deepStrictEqual (endsWith ('foo') ('foobar'), false)
  assert.deepStrictEqual (endsWith ('foobar') ('bar'), false)
  assert.deepStrictEqual (endsWith ('') ('foobar'), true)
  assert.deepStrictEqual (endsWith ('') (''), true)
})

test ('stripPrefix: removes a matching prefix and returns the remainder as Just', () => {
  assert.deepStrictEqual (stripPrefix ('foo') ('foobar'), just ('bar'))
  assert.deepStrictEqual (stripPrefix ('bar') ('foobar'), nothing<string> ())
  assert.deepStrictEqual (stripPrefix ('abc') ('abc'), just (''))
  assert.deepStrictEqual (stripPrefix ('') ('abc'), just ('abc'))
})

test ('stripSuffix: removes a matching suffix and returns the remainder as Just', () => {
  assert.deepStrictEqual (stripSuffix ('bar') ('foobar'), just ('foo'))
  assert.deepStrictEqual (stripSuffix ('bc') ('abc'), just ('a'))
  assert.deepStrictEqual (stripSuffix ('x') ('abc'), nothing<string> ())
  assert.deepStrictEqual (stripSuffix ('abc') ('abc'), just (''))
  assert.deepStrictEqual (stripSuffix ('') ('abc'), just ('abc'))
})

test ('stripPrefix and stripSuffix answer Just exactly where it starts and ends', () => {
  const probes: readonly (readonly [string, string])[] = [
    ['', ''],
    ['', 'abc'],
    ['a', 'abc'],
    ['c', 'abc'],
    ['abc', 'abc'],
    ['abcd', 'abc'],
    ['b', 'abc'],
  ]
  for (const [part, s] of probes) {
    const label = `${part}|${s}`

    assert.deepStrictEqual (
      stripPrefix (part) (s).tag === 'just',
      startsWith (part) (s),
      label,
    )
    assert.deepStrictEqual (stripSuffix (part) (s).tag === 'just', endsWith (part) (s), label)
    const withoutPrefix = stripPrefix (part) (s)
    if (withoutPrefix.tag === 'just') {
      assert.deepStrictEqual (part + withoutPrefix.value, s, label)
    }
    const withoutSuffix = stripSuffix (part) (s)
    if (withoutSuffix.tag === 'just') {
      assert.deepStrictEqual (withoutSuffix.value + part, s, label)
    }
  }
})

test ('includes: checks whether a string contains the supplied substring', () => {
  assert.deepStrictEqual (includes ('oob') ('foobar'), true)
  assert.deepStrictEqual (includes ('x') ('foobar'), false)
  assert.deepStrictEqual (includes ('foobar') ('foobar'), true)
  assert.deepStrictEqual (includes ('') ('foobar'), true)
  assert.deepStrictEqual (includes ('foo') (''), false)
})

test ('replaceAll: replaces every occurrence of a substring with literal text', () => {
  assert.deepStrictEqual (replaceAll ('a', 'b') ('banana'), 'bbnbnb')
  assert.deepStrictEqual (replaceAll ('x', 'y') ('banana'), 'banana')
  assert.deepStrictEqual (replaceAll ('a', '') ('banana'), 'bnn')
  assert.deepStrictEqual (replaceAll ('aa', 'b') ('aaaa'), 'bb')
  assert.deepStrictEqual (replaceAll ('aa', 'b') ('aaa'), 'ba')
  assert.deepStrictEqual (replaceAll ('', '-') ('abc'), '-a-b-c-')
})

test ('replaceAll: the pattern is taken literally, not as a regex', () => {
  assert.deepStrictEqual (replaceAll ('.', '!') ('a.b.c'), 'a!b!c')
  assert.deepStrictEqual (replaceAll ('$', 'S') ('a$b'), 'aSb')
  assert.deepStrictEqual (replaceAll ('.', '!') ('abc'), 'abc')
  assert.deepStrictEqual (replaceAll ('(x)', 'y') ('a(x)b'), 'ayb')
})

test ('replaceAll: a dollar in the replacement is no substitution', () => {
  assert.deepStrictEqual (replaceAll ('a', '$$') ('a'), '$$')
  assert.deepStrictEqual (replaceAll ('a', '$&') ('a'), '$&')
  assert.deepStrictEqual (replaceAll ('a', '$`') ('bab'), 'b$`b')
  assert.deepStrictEqual (replaceAll ('a', "$'") ('bab'), "b$'b")
  assert.deepStrictEqual (replaceAll ('a', '$') ('a'), '$')
  assert.deepStrictEqual (replaceAll ('a', '100$') ('a'), '100$')
  assert.deepStrictEqual (replaceAll ('a', '$1') ('a'), '$1')
  assert.deepStrictEqual (replaceAll ('a', '$&') ('aa'), '$&$&')
  assert.deepStrictEqual (replaceAll ('a', '$&$&') ('a'), '$&$&')
  assert.deepStrictEqual (replaceAll ('a', '$&$$') ('aa'), '$&$$$&$$')
  assert.deepStrictEqual (replaceAll ('a', 'xy') ('aa'), 'xyxy')
  assert.deepStrictEqual (replaceAll ('a', 'b$c') ('a'), 'b$c')
})

test ('replaceAll: replaces every literal occurrence', () => {
  assert.deepStrictEqual (replaceAll ('a', 'x') ('aa'), 'xx')
  assert.deepStrictEqual (replaceAll ('a', '$&') ('a'), '$&')
})

test ('splitOn: splits a string at each occurrence of the supplied separator', () => {
  assert.deepStrictEqual (splitOn (':') ('foo:bar:baz'), ['foo', 'bar', 'baz'])
  assert.deepStrictEqual (splitOn (':') ('foo'), ['foo'])
  assert.deepStrictEqual (splitOn (':') (''), [''])
  assert.deepStrictEqual (splitOn (':') (':'), ['', ''])
  assert.deepStrictEqual (splitOn (':') (':a:'), ['', 'a', ''])
  assert.deepStrictEqual (splitOn ('') ('abc'), ['a', 'b', 'c'])
})

test ('joinWith: joins strings with the supplied separator between them', () => {
  assert.deepStrictEqual (joinWith (':') (['foo', 'bar', 'baz']), 'foo:bar:baz')
  assert.deepStrictEqual (joinWith (':') (['foo']), 'foo')
  assert.deepStrictEqual (joinWith (':') ([]), '')
  assert.deepStrictEqual (joinWith ('') (['a', 'b']), 'ab')
  assert.deepStrictEqual (joinWith (':') (['', '']), ':')
})

test ('joinWith inverts splitOn on a non-empty separator', () => {
  const sep = ':'
  for (const s of ['', 'foo', 'foo:bar', ':', 'a::b', 'foo:bar:baz']) {
    assert.deepStrictEqual (joinWith (sep) (splitOn (sep) (s)), s, s)
  }
})

test ('toUpper: converts a string to uppercase', () => {
  assert.deepStrictEqual (toUpper ('ababc'), 'ABABC')
  assert.deepStrictEqual (toUpper ('ABC'), 'ABC')
  assert.deepStrictEqual (toUpper ('jalapeño'), 'JALAPEÑO')
  assert.deepStrictEqual (toUpper ('42!'), '42!')
})

test ('toLower: converts a string to lowercase', () => {
  assert.deepStrictEqual (toLower ('ABABC'), 'ababc')
  assert.deepStrictEqual (toLower ('abc'), 'abc')
  assert.deepStrictEqual (toLower ('JALAPEÑO'), 'jalapeño')
  assert.deepStrictEqual (toLower ('42!'), '42!')
})

test ('trim: removes whitespace from both ends of a string', () => {
  assert.deepStrictEqual (trim (' foo '), 'foo')
  assert.deepStrictEqual (trim ('foo'), 'foo')
  assert.deepStrictEqual (trim ('   '), '')
  assert.deepStrictEqual (trim (''), '')
  assert.deepStrictEqual (trim ('\t\n foo \r\n'), 'foo')
  assert.deepStrictEqual (trim (' foo bar '), 'foo bar')
})

test ('words: splits a string on whitespace, discarding empty parts', () => {
  assert.deepStrictEqual (words (' foo bar baz '), ['foo', 'bar', 'baz'])
  assert.deepStrictEqual (words ('  a  b '), ['a', 'b'])
  assert.deepStrictEqual (words ('foo'), ['foo'])
  assert.deepStrictEqual (words (''), [])
  assert.deepStrictEqual (words ('   '), [])
  assert.deepStrictEqual (words ('a\tb\nc'), ['a', 'b', 'c'])
})

test ('unwords: joins strings with a single space between them', () => {
  assert.deepStrictEqual (unwords (['foo', 'bar', 'baz']), 'foo bar baz')
  assert.deepStrictEqual (unwords (['foo']), 'foo')
  assert.deepStrictEqual (unwords ([]), '')
})

test ('words inverts unwords', () => {
  for (const values of [[], ['foo'], ['foo', 'bar', 'baz'], ['café', 'thé']]) {
    assert.deepStrictEqual (words (unwords (values)), values, unwords (values))
  }
})

test ('lines: splits a string on newline characters, ignoring one trailing newline', () => {
  assert.deepStrictEqual (lines ('foo\nbar\nbaz\n'), ['foo', 'bar', 'baz'])
  assert.deepStrictEqual (lines ('a'), ['a'])
  assert.deepStrictEqual (lines ('a\n'), ['a'])
  assert.deepStrictEqual (lines ('a\nb'), ['a', 'b'])
  assert.deepStrictEqual (lines (''), [])
  assert.deepStrictEqual (lines ('a\n\n'), ['a', ''])
})

test ('lines: the carriage return stays inside the line', () => {
  assert.deepStrictEqual (lines ('a\r\nb'), ['a\r', 'b'])
})

test ('unlines: joins strings with a newline after every item, including the last', () => {
  assert.deepStrictEqual (unlines (['foo', 'bar', 'baz']), 'foo\nbar\nbaz\n')
  assert.deepStrictEqual (unlines (['foo']), 'foo\n')
  assert.deepStrictEqual (unlines ([]), '')
  assert.deepStrictEqual (unlines (['']), '\n')
})

test ('lines inverts unlines', () => {
  for (const values of [[], [''], ['a'], ['a', 'b'], ['a', '', 'b']]) {
    assert.deepStrictEqual (lines (unlines (values)), values, JSON.stringify (values))
  }
})

test ("parseDate: parses a string using JavaScript's date parsing rules", () => {
  assert.deepStrictEqual (
    parseDate ('2011-01-19T17:40:00Z'),
    just (new Date ('2011-01-19T17:40:00Z')),
  )
  assert.deepStrictEqual (parseDate ('today'), nothing<Date> ())
  assert.deepStrictEqual (parseDate (''), nothing<Date> ())
  assert.deepStrictEqual (parseDate ('2011-02-30T00:00:60Z'), nothing<Date> ())
})

test ('Str: the monoid laws', () => {
  const probes = ['', 'a', 'one', 'two three']
  for (const s of probes) {
    assert.deepStrictEqual (Str.concat (Str.empty (), s), s, s)
    assert.deepStrictEqual (Str.concat (s, Str.empty ()), s, s)
  }
  for (const a of probes) {
    for (const b of probes) {
      for (const c of probes) {
        assert.deepStrictEqual (
          Str.concat (Str.concat (a, b), c),
          Str.concat (a, Str.concat (b, c)),
          `${a}|${b}|${c}`,
        )
      }
    }
  }
})

test ('Str: equals agrees with lte', () => {
  const probes = ['', 'a', 'A', 'ab', 'b', 'é']
  for (const a of probes) {
    for (const b of probes) {
      assert.deepStrictEqual (
        Str.equals (a, b),
        Str.lte (a, b) && Str.lte (b, a),
        `${a}|${b}`,
      )
    }
  }
})

test ('parseInt: parses a whole string as an integer in the supplied radix, from 2 to 36', () => {
  assert.deepStrictEqual (parseInt (10) ('12'), just (12))
  assert.deepStrictEqual (parseInt (10) ('-12'), just (-12))
  assert.deepStrictEqual (parseInt (10) ('+42'), just (42))
  assert.deepStrictEqual (parseInt (2) ('101'), just (5))
  assert.deepStrictEqual (parseInt (2) ('-101'), just (-5))
  assert.deepStrictEqual (parseInt (16) ('ff'), just (255))
  assert.deepStrictEqual (parseInt (16) ('FF'), just (255))
  assert.deepStrictEqual (parseInt (36) ('z'), just (35))
  assert.deepStrictEqual (parseInt (10) ('12abc'), nothing<number> ())
  assert.deepStrictEqual (parseInt (10) ('42.0'), nothing<number> ())
  assert.deepStrictEqual (parseInt (10) (' 42 '), nothing<number> ())
  assert.deepStrictEqual (parseInt (10) (''), nothing<number> ())
  assert.deepStrictEqual (parseInt (2) ('102'), nothing<number> ())
})

test ('parseInt: a radix outside 2..36 rejects on any string', () => {
  assert.deepStrictEqual (parseInt (1) ('1'), nothing<number> ())
  assert.deepStrictEqual (parseInt (37) ('1'), nothing<number> ())
  assert.deepStrictEqual (parseInt (99) ('12'), nothing<number> ())
  assert.deepStrictEqual (parseInt (0) ('0'), nothing<number> ())
  assert.deepStrictEqual (parseInt (-16) ('ff'), nothing<number> ())
})

test ('parseInt: the 0x prefix is accepted at no radix at all', () => {
  assert.deepStrictEqual (parseInt (16) ('0xFF'), nothing<number> ())
  assert.deepStrictEqual (parseInt (10) ('0x42'), nothing<number> ())
})

test ('parseFloat: parses a whole string as a floating-point number, allowing surrounding whitespace', () => {
  assert.deepStrictEqual (parseFloat ('-123.45'), just (-123.45))
  assert.deepStrictEqual (parseFloat ('.5'), just (0.5))
  assert.deepStrictEqual (parseFloat ('1e3'), just (1000))
  assert.deepStrictEqual (parseFloat ('+1.5e-3'), just (0.0015))
  assert.deepStrictEqual (parseFloat ('  +1.  '), just (1))
  assert.deepStrictEqual (parseFloat ('Infinity'), just (Infinity))
  assert.deepStrictEqual (parseFloat ('-Infinity'), just (-Infinity))
  assert.deepStrictEqual (parseFloat ('NaN'), just (NaN))
  assert.deepStrictEqual (parseFloat ('foo.bar'), nothing<number> ())
  assert.deepStrictEqual (parseFloat ('1px'), nothing<number> ())
  assert.deepStrictEqual (parseFloat (''), nothing<number> ())
  assert.deepStrictEqual (parseFloat ('.'), nothing<number> ())
  assert.deepStrictEqual (parseFloat ('1.2.3'), nothing<number> ())
  assert.deepStrictEqual (parseFloat ('0x10'), nothing<number> ())
})

test ('parseJson: parses JSON as Just, or returns Nothing for invalid JSON', () => {
  assert.deepStrictEqual (parseJson ('{"a":1}'), just<unknown> ({ a: 1 }))
  assert.deepStrictEqual (parseJson ('[1,2,3]'), just<unknown> ([1, 2, 3]))
  assert.deepStrictEqual (parseJson ('"foo"'), just<unknown> ('foo'))
  assert.deepStrictEqual (parseJson ('1'), just<unknown> (1))
  assert.deepStrictEqual (parseJson ('null'), just<unknown> (null))
  assert.deepStrictEqual (parseJson ('nope'), nothing<unknown> ())
  assert.deepStrictEqual (parseJson (''), nothing<unknown> ())
  assert.deepStrictEqual (parseJson ('{"a":'), nothing<unknown> ())
})
