/**
 * Representatives for choosing a result type, plus types for accepting them in
 * helpers.
 * For example, pass `Arr` to `of` for arrays or `Maybe` to `traverse` for
 * optional results.
 *
 * @module
 */

// Natives
export { Arr } from './natives/array.ts'
export { Big } from './natives/bigint.ts'
export { Bool } from './natives/boolean.ts'
export { Dates } from './natives/date.ts'
export { Fn } from './natives/function.ts'
export { Maps } from './natives/map.ts'
export { Num } from './natives/number.ts'
export { Re } from './natives/regexp.ts'
export { Sets } from './natives/set.ts'
export { Str } from './natives/string.ts'
export { StrMap } from './natives/strmap.ts'

// DataTypes
export { Maybe } from './data/maybe.ts'
export { Either } from './data/either.ts'
export { Identity } from './data/identity.ts'
export { Pair } from './data/pair.ts'
export { Predicate } from './data/predicate.ts'
export { Equivalence } from './data/equivalence.ts'
export {
  All,
  Any,
  Concat,
  Endo,
  First,
  Last,
  Max,
  Min,
  Product,
  RightUnion,
  Sum,
} from './data/monoid.ts'
