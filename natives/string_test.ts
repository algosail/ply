import { assertEquals } from '@std/assert'
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
} from './string.ts'
import { just, nothing } from '../data/maybe.ts'

// Examples

Deno.test('Str: recognizes values and provides the declared operations', () => {
  assertEquals(Str['@@type'], 'String')
  assertEquals(Str.is('a string'), true)
  assertEquals(Str.is(''), true)
  assertEquals(Str.is(42), false)
  assertEquals(Str.is(new String('x')), false)
  assertEquals(Str.empty(), '')
  assertEquals(Str.concat('foo', 'bar'), 'foobar')
  assertEquals(Str.equals('foo', 'foo'), true)
  assertEquals(Str.equals('foo', 'bar'), false)
})

Deno.test('Str: show escapes by the JSON rules', () => {
  assertEquals(Str.show(''), '""')
  assertEquals(Str.show('foo'), '"foo"')
  assertEquals(Str.show('a"b'), '"a\\"b"')
  assertEquals(Str.show('a\nb'), '"a\\nb"')
  assertEquals(Str.show('a\tb'), '"a\\tb"')
  assertEquals(Str.show('a\\b'), '"a\\\\b"')
})

Deno.test('Str: ordering by code units, not by the locale alphabet', () => {
  assertEquals(Str.lte('a', 'b'), true)
  assertEquals(Str.lte('b', 'a'), false)
  assertEquals(Str.lte('a', 'a'), true)
  assertEquals(Str.lte('abc', 'abd'), true)
  assertEquals(Str.lte('', 'a'), true)
  assertEquals(Str.lte('ab', 'abc'), true)
  assertEquals(Str.lte('Z', 'a'), true)
})

Deno.test('Str: supports only the declared classes', () => {
  for (const name of ['map', 'of', 'ap', 'chain', 'reduce', 'zero', 'alt']) {
    assertEquals(name in Str, false, name)
  }
})

Deno.test('startsWith: checks whether a string starts with the supplied prefix', () => {
  assertEquals(startsWith('foo')('foobar'), true)
  assertEquals(startsWith('bar')('foobar'), false)
  assertEquals(startsWith('foobar')('foo'), false)
  assertEquals(startsWith('')('foobar'), true)
  assertEquals(startsWith('')(''), true)
})

Deno.test('endsWith: checks whether a string ends with the supplied suffix', () => {
  assertEquals(endsWith('bar')('foobar'), true)
  assertEquals(endsWith('foo')('foobar'), false)
  assertEquals(endsWith('foobar')('bar'), false)
  assertEquals(endsWith('')('foobar'), true)
  assertEquals(endsWith('')(''), true)
})

Deno.test('stripPrefix: removes a matching prefix and returns the remainder as Just', () => {
  assertEquals(stripPrefix('foo')('foobar'), just('bar'))
  assertEquals(stripPrefix('bar')('foobar'), nothing<string>())
  assertEquals(stripPrefix('abc')('abc'), just(''))
  assertEquals(stripPrefix('')('abc'), just('abc'))
})

Deno.test('stripSuffix: removes a matching suffix and returns the remainder as Just', () => {
  assertEquals(stripSuffix('bar')('foobar'), just('foo'))
  assertEquals(stripSuffix('bc')('abc'), just('a'))
  assertEquals(stripSuffix('x')('abc'), nothing<string>())
  assertEquals(stripSuffix('abc')('abc'), just(''))
  assertEquals(stripSuffix('')('abc'), just('abc'))
})

Deno.test('stripPrefix and stripSuffix answer Just exactly where it starts and ends', () => {
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

    assertEquals(
      stripPrefix(part)(s).tag === 'just',
      startsWith(part)(s),
      label,
    )
    assertEquals(stripSuffix(part)(s).tag === 'just', endsWith(part)(s), label)
    const withoutPrefix = stripPrefix(part)(s)
    if (withoutPrefix.tag === 'just') {
      assertEquals(part + withoutPrefix.value, s, label)
    }
    const withoutSuffix = stripSuffix(part)(s)
    if (withoutSuffix.tag === 'just') {
      assertEquals(withoutSuffix.value + part, s, label)
    }
  }
})

Deno.test('includes: checks whether a string contains the supplied substring', () => {
  assertEquals(includes('oob')('foobar'), true)
  assertEquals(includes('x')('foobar'), false)
  assertEquals(includes('foobar')('foobar'), true)
  assertEquals(includes('')('foobar'), true)
  assertEquals(includes('foo')(''), false)
})

Deno.test('replaceAll: replaces every occurrence of a substring with literal text', () => {
  assertEquals(replaceAll('a', 'b')('banana'), 'bbnbnb')
  assertEquals(replaceAll('x', 'y')('banana'), 'banana')
  assertEquals(replaceAll('a', '')('banana'), 'bnn')
  assertEquals(replaceAll('aa', 'b')('aaaa'), 'bb')
  assertEquals(replaceAll('aa', 'b')('aaa'), 'ba')
  assertEquals(replaceAll('', '-')('abc'), '-a-b-c-')
})

Deno.test('replaceAll: the pattern is taken literally, not as a regex', () => {
  assertEquals(replaceAll('.', '!')('a.b.c'), 'a!b!c')
  assertEquals(replaceAll('$', 'S')('a$b'), 'aSb')
  assertEquals(replaceAll('.', '!')('abc'), 'abc')
  assertEquals(replaceAll('(x)', 'y')('a(x)b'), 'ayb')
})

Deno.test('replaceAll: a dollar in the replacement is no substitution', () => {
  assertEquals(replaceAll('a', '$$')('a'), '$$')
  assertEquals(replaceAll('a', '$&')('a'), '$&')
  assertEquals(replaceAll('a', '$`')('bab'), 'b$`b')
  assertEquals(replaceAll('a', "$'")('bab'), "b$'b")
  assertEquals(replaceAll('a', '$')('a'), '$')
  assertEquals(replaceAll('a', '100$')('a'), '100$')
  assertEquals(replaceAll('a', '$1')('a'), '$1')
  assertEquals(replaceAll('a', '$&')('aa'), '$&$&')
  assertEquals(replaceAll('a', '$&$&')('a'), '$&$&')
  assertEquals(replaceAll('a', '$&$$')('aa'), '$&$$$&$$')
  assertEquals(replaceAll('a', 'xy')('aa'), 'xyxy')
  assertEquals(replaceAll('a', 'b$c')('a'), 'b$c')
})

Deno.test('replaceAll: replaces every literal occurrence', () => {
  assertEquals(replaceAll('a', 'x')('aa'), 'xx')
  assertEquals(replaceAll('a', '$&')('a'), '$&')
})

Deno.test('splitOn: splits a string at each occurrence of the supplied separator', () => {
  assertEquals(splitOn(':')('foo:bar:baz'), ['foo', 'bar', 'baz'])
  assertEquals(splitOn(':')('foo'), ['foo'])
  assertEquals(splitOn(':')(''), [''])
  assertEquals(splitOn(':')(':'), ['', ''])
  assertEquals(splitOn(':')(':a:'), ['', 'a', ''])
  assertEquals(splitOn('')('abc'), ['a', 'b', 'c'])
})

Deno.test('joinWith: joins strings with the supplied separator between them', () => {
  assertEquals(joinWith(':')(['foo', 'bar', 'baz']), 'foo:bar:baz')
  assertEquals(joinWith(':')(['foo']), 'foo')
  assertEquals(joinWith(':')([]), '')
  assertEquals(joinWith('')(['a', 'b']), 'ab')
  assertEquals(joinWith(':')(['', '']), ':')
})

Deno.test('joinWith inverts splitOn on a non-empty separator', () => {
  const sep = ':'
  for (const s of ['', 'foo', 'foo:bar', ':', 'a::b', 'foo:bar:baz']) {
    assertEquals(joinWith(sep)(splitOn(sep)(s)), s, s)
  }
})

Deno.test('toUpper: converts a string to uppercase', () => {
  assertEquals(toUpper('ababc'), 'ABABC')
  assertEquals(toUpper('ABC'), 'ABC')
  assertEquals(toUpper('jalapeño'), 'JALAPEÑO')
  assertEquals(toUpper('42!'), '42!')
})

Deno.test('toLower: converts a string to lowercase', () => {
  assertEquals(toLower('ABABC'), 'ababc')
  assertEquals(toLower('abc'), 'abc')
  assertEquals(toLower('JALAPEÑO'), 'jalapeño')
  assertEquals(toLower('42!'), '42!')
})

Deno.test('trim: removes whitespace from both ends of a string', () => {
  assertEquals(trim(' foo '), 'foo')
  assertEquals(trim('foo'), 'foo')
  assertEquals(trim('   '), '')
  assertEquals(trim(''), '')
  assertEquals(trim('\t\n foo \r\n'), 'foo')
  assertEquals(trim(' foo bar '), 'foo bar')
})

Deno.test('words: splits a string on whitespace, discarding empty parts', () => {
  assertEquals(words(' foo bar baz '), ['foo', 'bar', 'baz'])
  assertEquals(words('  a  b '), ['a', 'b'])
  assertEquals(words('foo'), ['foo'])
  assertEquals(words(''), [])
  assertEquals(words('   '), [])
  assertEquals(words('a\tb\nc'), ['a', 'b', 'c'])
})

Deno.test('unwords: joins strings with a single space between them', () => {
  assertEquals(unwords(['foo', 'bar', 'baz']), 'foo bar baz')
  assertEquals(unwords(['foo']), 'foo')
  assertEquals(unwords([]), '')
})

Deno.test('words inverts unwords', () => {
  for (const values of [[], ['foo'], ['foo', 'bar', 'baz'], ['café', 'thé']]) {
    assertEquals(words(unwords(values)), values, unwords(values))
  }
})

Deno.test('lines: splits a string on newline characters, ignoring one trailing newline', () => {
  assertEquals(lines('foo\nbar\nbaz\n'), ['foo', 'bar', 'baz'])
  assertEquals(lines('a'), ['a'])
  assertEquals(lines('a\n'), ['a'])
  assertEquals(lines('a\nb'), ['a', 'b'])
  assertEquals(lines(''), [])
  assertEquals(lines('a\n\n'), ['a', ''])
})

Deno.test('lines: the carriage return stays inside the line', () => {
  assertEquals(lines('a\r\nb'), ['a\r', 'b'])
})

Deno.test('unlines: joins strings with a newline after every item, including the last', () => {
  assertEquals(unlines(['foo', 'bar', 'baz']), 'foo\nbar\nbaz\n')
  assertEquals(unlines(['foo']), 'foo\n')
  assertEquals(unlines([]), '')
  assertEquals(unlines(['']), '\n')
})

Deno.test('lines inverts unlines', () => {
  for (const values of [[], [''], ['a'], ['a', 'b'], ['a', '', 'b']]) {
    assertEquals(lines(unlines(values)), values, JSON.stringify(values))
  }
})

Deno.test("parseDate: parses a string using JavaScript's date parsing rules", () => {
  assertEquals(
    parseDate('2011-01-19T17:40:00Z'),
    just(new Date('2011-01-19T17:40:00Z')),
  )
  assertEquals(parseDate('today'), nothing<Date>())
  assertEquals(parseDate(''), nothing<Date>())
  assertEquals(parseDate('2011-02-30T00:00:60Z'), nothing<Date>())
})

// Laws

Deno.test('Str: the monoid laws', () => {
  const probes = ['', 'a', 'one', 'two three']
  for (const s of probes) {
    assertEquals(Str.concat(Str.empty(), s), s, s)
    assertEquals(Str.concat(s, Str.empty()), s, s)
  }
  for (const a of probes) {
    for (const b of probes) {
      for (const c of probes) {
        assertEquals(
          Str.concat(Str.concat(a, b), c),
          Str.concat(a, Str.concat(b, c)),
          `${a}|${b}|${c}`,
        )
      }
    }
  }
})

Deno.test('Str: equals agrees with lte', () => {
  const probes = ['', 'a', 'A', 'ab', 'b', 'é']
  for (const a of probes) {
    for (const b of probes) {
      assertEquals(
        Str.equals(a, b),
        Str.lte(a, b) && Str.lte(b, a),
        `${a}|${b}`,
      )
    }
  }
})

// Edge cases

Deno.test('parseInt: parses a whole string as an integer in the supplied radix, from 2 to 36', () => {
  assertEquals(parseInt(10)('12'), just(12))
  assertEquals(parseInt(10)('-12'), just(-12))
  assertEquals(parseInt(10)('+42'), just(42))
  assertEquals(parseInt(2)('101'), just(5))
  assertEquals(parseInt(2)('-101'), just(-5))
  assertEquals(parseInt(16)('ff'), just(255))
  assertEquals(parseInt(16)('FF'), just(255))
  assertEquals(parseInt(36)('z'), just(35))
  assertEquals(parseInt(10)('12abc'), nothing<number>())
  assertEquals(parseInt(10)('42.0'), nothing<number>())
  assertEquals(parseInt(10)(' 42 '), nothing<number>())
  assertEquals(parseInt(10)(''), nothing<number>())
  assertEquals(parseInt(2)('102'), nothing<number>())
})

Deno.test('parseInt: a radix outside 2..36 rejects on any string', () => {
  assertEquals(parseInt(1)('1'), nothing<number>())
  assertEquals(parseInt(37)('1'), nothing<number>())
  assertEquals(parseInt(99)('12'), nothing<number>())
  assertEquals(parseInt(0)('0'), nothing<number>())
  assertEquals(parseInt(-16)('ff'), nothing<number>())
})

Deno.test('parseInt: the 0x prefix is accepted at no radix at all', () => {
  assertEquals(parseInt(16)('0xFF'), nothing<number>())
  assertEquals(parseInt(10)('0x42'), nothing<number>())
})

Deno.test('parseFloat: parses a whole string as a floating-point number, allowing surrounding whitespace', () => {
  assertEquals(parseFloat('-123.45'), just(-123.45))
  assertEquals(parseFloat('.5'), just(0.5))
  assertEquals(parseFloat('1e3'), just(1000))
  assertEquals(parseFloat('+1.5e-3'), just(0.0015))
  assertEquals(parseFloat('  +1.  '), just(1))
  assertEquals(parseFloat('Infinity'), just(Infinity))
  assertEquals(parseFloat('-Infinity'), just(-Infinity))
  assertEquals(parseFloat('NaN'), just(NaN))
  assertEquals(parseFloat('foo.bar'), nothing<number>())
  assertEquals(parseFloat('1px'), nothing<number>())
  assertEquals(parseFloat(''), nothing<number>())
  assertEquals(parseFloat('.'), nothing<number>())
  assertEquals(parseFloat('1.2.3'), nothing<number>())
  assertEquals(parseFloat('0x10'), nothing<number>())
})

Deno.test('parseJson: parses JSON as Just, or returns Nothing for invalid JSON', () => {
  assertEquals(parseJson('{"a":1}'), just<unknown>({ a: 1 }))
  assertEquals(parseJson('[1,2,3]'), just<unknown>([1, 2, 3]))
  assertEquals(parseJson('"foo"'), just<unknown>('foo'))
  assertEquals(parseJson('1'), just<unknown>(1))
  assertEquals(parseJson('null'), just<unknown>(null))
  assertEquals(parseJson('nope'), nothing<unknown>())
  assertEquals(parseJson(''), nothing<unknown>())
  assertEquals(parseJson('{"a":'), nothing<unknown>())
})
