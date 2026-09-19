import { assertEquals } from '@std/assert'
import { hasName } from './named.ts'
import type {
  DictAt,
  DictsOf,
  Instances,
  NamedGuard,
  NativeTypeRep,
} from './named.ts'
import type { Shape, Shaped } from './shape.ts'
import type { MemberOf } from './kind.ts'
import type { SetoidDict, SetoidShapes } from '../classes/setoid.ts'
import type { ArrayShape } from '../natives/array.ts'
import type { StrShape } from '../natives/string.ts'
import { Arr } from '../natives/array.ts'
import { Sets } from '../natives/set.ts'
import { StrMap } from '../natives/strmap.ts'
import { nameOf } from './instance.ts'
import { just } from '../data/maybe.ts'

// Examples

Deno.test('hasName: recognizes values with a string @@type', () => {
  assertEquals(hasName({ '@@type': 'Mine' }), true)
  assertEquals(hasName(just(1)), true)
  assertEquals(hasName(Object.assign(() => {}, { '@@type': 'F' })), true)
  assertEquals(hasName({}), false)
  assertEquals(hasName([]), false)
  assertEquals(hasName(null), false)
  assertEquals(hasName(undefined), false)
  assertEquals(hasName('text'), false)
  assertEquals(hasName(42), false)
})

Deno.test('hasName: the name is looked up along the prototype too', () => {
  assertEquals(hasName(Object.create({ '@@type': 'Parent' })), true)
})

Deno.test('hasName: both the presence of the key and its type are checked', () => {
  assertEquals(hasName({ '@@type': 'Own' }), true)
  assertEquals(hasName({ '@@type': 42 }), false)
  assertEquals(hasName({ '@@type': undefined }), false)
  assertEquals(hasName({}), false)
  assertEquals(hasName(null), false)
  assertEquals(nameOf({ '@@type': 42 } as unknown), 'StrMap')
})

// Fixtures and compile-time assertions

type Exact<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false

// Each Assert<Exact<Actual, Expected>> checks a type at compile time.
// A changed inference makes this file fail deno check.
type Assert<T extends true> = T

type Dicts = <S extends Shape>(s: S) => SetoidDict<S>

type Table = Instances<Dicts, SetoidShapes>

export type _Named = [
  Assert<
    Exact<
      NativeTypeRep<ArrayShape>,
      Shaped<ArrayShape> & NamedGuard<MemberOf<ArrayShape>>
    >
  >,
  Assert<Exact<NativeTypeRep<ArrayShape>['@@type'], 'Array'>>,
  Assert<Exact<NativeTypeRep<StrShape>['@@type'], 'String'>>,
  Assert<Exact<NativeTypeRep<StrShape>['is'], (x: unknown) => x is string>>,
  Assert<Dicts extends DictsOf ? true : false>,
]

export type _DictDoesNotNarrow = [
  Assert<Exact<DictAt<Dicts, ArrayShape>, SetoidDict<Shape>>>,
  Assert<Exact<DictAt<Dicts, StrShape>, SetoidDict<Shape>>>,
  Assert<Exact<DictAt<Dicts, ArrayShape>, DictAt<Dicts, StrShape>>>,
]

export type _Cell = [
  Assert<Exact<Table['Array'], SetoidDict<Shape> & NativeTypeRep<ArrayShape>>>,
  Assert<Exact<Table['Array']['@@type'], 'Array'>>,
  Assert<Exact<Table['StrMap']['@@type'], 'StrMap'>>,
  Assert<Exact<keyof Table, 'Array' | 'StrMap'>>,
]

export const _valid: Table = {
  Array: Arr,
  StrMap: StrMap,
}

export const _foreignInCell: Table = {
  // @ts-expect-error the Set representative does not fit the Array cell
  Array: Sets,
  StrMap: StrMap,
}

export const _impostor: Table = {
  // @ts-expect-error a dictionary without @@type/_shape/is is no representative
  Array: { equals: (a: unknown, b: unknown) => a === b },
  StrMap: StrMap,
}

// @ts-expect-error the StrMap cell is missing: a class must cover every type
export const _incomplete: Table = { Array: Arr }

export const _extra: Table = {
  Array: Arr,
  StrMap: StrMap,
  // @ts-expect-error the class has no type by that name
  Nope: Arr,
}
