import { assertEquals } from '@std/assert'
import * as kind from './kind.ts'
import type {
  Assert as KindAssert,
  BothB,
  KindLike,
  KindOf,
  MatchableIn,
  MatchableName,
  MatchableShapes,
  MemberOf,
  RepIn,
  ReturnOfSlotA,
  SameTypeAs,
  Satisfies,
  ShapeOf,
  SlotAOf,
  SlotBOf,
  SubclassOf,
  Superclass,
  TypeRepBase,
} from './kind.ts'
import type { Fail, Kind, Shape, Shaped, Slotted, Widened } from './shape.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { FnShape } from '../natives/function.ts'
import type { MapShape } from '../natives/map.ts'
import type { SetShape } from '../natives/set.ts'
import type { StrMapShape } from '../natives/strmap.ts'
import type { StrShape } from '../natives/string.ts'
import type { Either } from '../data/either.ts'
import type { Pair } from '../data/pair.ts'
import { nameOf } from './instance.ts'
import { just } from '../data/maybe.ts'

// Examples

Deno.test('kind: exports types without runtime values', () => {
  assertEquals(Object.keys(kind), [])
})

Deno.test('MatchableName lists exactly the types nameOf recognizes', () => {
  const names: readonly MatchableName[] = [
    'Array',
    'Fn',
    'Set',
    'Map',
    'StrMap',
  ]
  const samples: readonly unknown[] = [
    [1],
    (n: number) => n,
    new Set([1]),
    new Map([['a', 1]]),
    { a: 1 },
  ]
  assertEquals(samples.map(nameOf), names as readonly string[])
})

Deno.test('nameOf: distinguishes a named Maybe from a plain record', () => {
  assertEquals(nameOf(just(1)), 'Maybe')
  assertEquals(nameOf({ tag: 'just', value: 1 }), 'StrMap')
})

// Fixtures and compile-time assertions

type Exact<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false

// Each Assert<Exact<Actual, Expected>> checks a type at compile time.
// A changed inference makes this file fail deno check.
type Assert<T extends true> = T

type Box<A> = { readonly mine: A }

interface MyShape extends Shape<'My'> {
  readonly out: Box<this['slotA']>
}

type My<A> = Shaped<MyShape> & Slotted<A> & Box<A>

export type _ShapeOf = [
  Assert<Exact<ShapeOf<number[]>, ArrayShape>>,
  Assert<Exact<ShapeOf<readonly number[]>, ArrayShape>>,
  Assert<Exact<ShapeOf<Set<number>>, SetShape>>,
  Assert<Exact<ShapeOf<Map<string, number>>, MapShape>>,
  Assert<Exact<ShapeOf<(i: string) => number>, FnShape>>,
  Assert<Exact<ShapeOf<Record<string, number>>, StrMapShape>>,
  Assert<Exact<ShapeOf<My<number>>, MyShape>>,
  Assert<Exact<ShapeOf<string>, never>>,
  Assert<Exact<ShapeOf<number>, never>>,
]

export type _Slots = [
  Assert<Exact<SlotAOf<number[]>, number>>,
  Assert<Exact<SlotBOf<number[]>, never>>,
  Assert<Exact<SlotAOf<Set<number>>, number>>,
  Assert<Exact<SlotBOf<Set<number>>, never>>,
  Assert<Exact<SlotAOf<Record<string, number>>, number>>,
  Assert<Exact<SlotAOf<Map<string, number>>, number>>,
  Assert<Exact<SlotBOf<Map<string, number>>, string>>,
  Assert<Exact<SlotAOf<(i: string) => number>, number>>,
  Assert<Exact<SlotBOf<(i: string) => number>, string>>,
  Assert<Exact<SlotAOf<My<number>>, number>>,
  Assert<Exact<SlotAOf<string>, never>>,
]

export type _KindOf = [
  Assert<Exact<KindOf<number[], string>, string[]>>,
  Assert<Exact<KindOf<Set<number>, string>, Set<string>>>,
  Assert<
    Exact<KindOf<Record<string, number>, boolean>, Record<string, boolean>>
  >,
  Assert<Exact<KindOf<Map<string, number>, boolean>, Map<string, boolean>>>,
  Assert<Exact<KindOf<(i: string) => number, boolean>, (i: string) => boolean>>,
]

interface ThreadingShape extends Shape<'Threading'>, Widened {
  readonly out: (s: this['slotB']) => this['slotA']
  readonly like: (s: never) => this['slotA']
}

export type _MemberOfInInputPosition = [
  Assert<Exact<MemberOf<ThreadingShape>, (s: never) => unknown>>,
  Assert<
    Exact<Kind<ThreadingShape, unknown, unknown>, (s: unknown) => unknown>
  >,
  Assert<
    Exact<
      ((s: number) => string) extends MemberOf<ThreadingShape> ? true
        : false,
      true
    >
  >,
  Assert<
    Exact<
      ((s: number) => string) extends Kind<ThreadingShape, unknown, unknown>
        ? true
        : false,
      false
    >
  >,
]

export type _MemberOf = [
  Assert<Exact<MemberOf<ArrayShape>, readonly unknown[]>>,
  Assert<Exact<MemberOf<SetShape>, Set<unknown>>>,
  Assert<Exact<MemberOf<MapShape>, Map<unknown, unknown>>>,
  Assert<Exact<MemberOf<StrShape>, string>>,
]

export type _KindLike = [
  Assert<Exact<KindLike<ArrayShape, number, never>, readonly number[]>>,
  Assert<Exact<KindLike<SetShape, number, never>, Set<number>>>,
  Assert<Exact<KindLike<MapShape, number, string>, Map<unknown, number>>>,
  Assert<Exact<KindLike<FnShape, number, never>, (i: never) => number>>,
  Assert<Exact<KindLike<StrShape, number, never>, never>>,
]

export type _Matchables = [
  Assert<Exact<MatchableName, 'Array' | 'Fn' | 'Set' | 'Map' | 'StrMap'>>,
  Assert<
    Exact<
      MatchableShapes,
      ArrayShape | FnShape | SetShape | MapShape | StrMapShape
    >
  >,
  Assert<
    Exact<
      MatchableIn<
        { readonly Array: ArrayShape; readonly Set: SetShape },
        number
      >,
      readonly number[] | Set<number>
    >
  >,
]

export type _BothB = [
  Assert<
    Exact<BothB<(i: string) => number, { a: 1 }, { b: 2 }>, { a: 1 } & { b: 2 }>
  >,
  Assert<Exact<BothB<Map<string, number>, 'x', 'y'>, 'x' | 'y'>>,
  Assert<Exact<BothB<number[], 'x', 'y'>, 'x' | 'y'>>,
  Assert<Exact<BothB<Pair<string, number>, 'x', 'y'>, 'x'>>,
]

export type _SameTypeAs = [
  Assert<Exact<SameTypeAs<number[], number[]>, unknown>>,
  Assert<Exact<SameTypeAs<Set<number>, Set<string>>, unknown>>,
  Assert<
    Exact<
      SameTypeAs<Either<string, number>, Either<number, string>>,
      unknown
    >
  >,
  Assert<
    Exact<
      SameTypeAs<Set<number>, number[]>,
      Fail<
        'ap and chain need one and the same type on both sides: Array against Set'
      >
    >
  >,
  Assert<
    Exact<SameTypeAs<Pair<string, number>, Pair<string, number>>, unknown>
  >,
  Assert<
    Exact<
      SameTypeAs<Pair<number[], number>, Pair<string, number>>,
      Fail<
        'Pair uses its second slot rather than carrying it, so both sides must agree'
      >
    >
  >,
  Assert<
    Exact<
      SameTypeAs<Pair<'a', number>, Pair<string, number>>,
      Fail<
        'Pair uses its second slot rather than carrying it, so both sides must agree'
      >
    >
  >,
  Assert<
    Exact<
      SameTypeAs<Pair<string, number>, Pair<'a', number>>,
      Fail<
        'Pair uses its second slot rather than carrying it, so both sides must agree'
      >
    >
  >,
  Assert<
    Exact<
      SameTypeAs<Pair<number[], number>, Pair<string | number[], number>>,
      Fail<
        'Pair uses its second slot rather than carrying it, so both sides must agree'
      >
    >
  >,
  Assert<Exact<SameTypeAs<never, number[]>, unknown>>,
  Assert<Exact<SameTypeAs<number[], never>, unknown>>,
  Assert<
    Exact<
      SameTypeAs<number[], Pair<string, number>>,
      Fail<
        'ap and chain need one and the same type on both sides: Pair against Array'
      >
    >
  >,
  Assert<
    Exact<
      SameTypeAs<Either<number[], number>, Either<string, number>>,
      unknown
    >
  >,
]

export type _ReturnOfSlotA = [
  Assert<Exact<ReturnOfSlotA<((a: number) => string)[]>, string>>,
  Assert<Exact<ReturnOfSlotA<Set<(a: number) => boolean>>, boolean>>,
  Assert<Exact<ReturnOfSlotA<number[]>, never>>,
]

export type _SubclassOf = [
  Assert<
    SubclassOf<
      { readonly Array: ArrayShape },
      { readonly Array: ArrayShape; readonly Set: SetShape }
    >
  >,
  Assert<
    Exact<
      SubclassOf<{ readonly Nope: ArrayShape }, { readonly Array: ArrayShape }>,
      Fail<'Type without superclass: Nope'>
    >
  >,
  Assert<
    Exact<
      SubclassOf<{ readonly Array: SetShape }, { readonly Array: ArrayShape }>,
      Fail<'Shape of form type in superclass is different'>
    >
  >,
]

export type _Superclass = [
  Assert<Exact<Superclass<ArrayShape, 'map', 'ok'>, 'ok'>>,
  Assert<Exact<Superclass<StrShape, 'toUpperCase', 'ok'>, 'ok'>>,
  Assert<
    Exact<
      Superclass<ArrayShape, 'nope', 'ok'>,
      Fail<'Type Array does not implement nope'>
    >
  >,
]

export type _RepIn = [
  Assert<
    Exact<
      RepIn<ArrayShape, never, { readonly Array: ArrayShape }, { of(): void }>,
      TypeRepBase<ArrayShape, never>
    >
  >,
  Assert<
    Exact<
      RepIn<StrShape, never, { readonly Array: ArrayShape }, { of(): void }>,
      TypeRepBase<StrShape, never> & { of(): void }
    >
  >,
  Assert<Exact<TypeRepBase<ArrayShape>['@@type'], 'Array'>>,
]

export type _Assert = [KindAssert<true>, Satisfies<'a', string>]

// @ts-expect-error Assert lets only true through
export type _AssertFalse = KindAssert<false>

// @ts-expect-error a number is not a string
export type _SatisfiesWrong = Satisfies<number, string>

// @ts-expect-error map over an array does not hand back a Set
export const _wrongKind: KindOf<number[], string> = new Set(['a'])
