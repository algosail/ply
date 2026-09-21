/**
 * Functions for transforming collections, composing operations, and handling
 * optional values and errors.
 * Most functions take their configuration first and the value to process last.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.map(P.mult(2))([1, 2, 3]) // => [2, 4, 6]
 * P.fromMaybe('Guest')(P.fromNullable<string>(null)) // => 'Guest'
 * ```
 *
 * @module
 */

// TypeClasses
//// Alt
export { alt } from './classes/alt.ts'
//// Applicative
export { of } from './classes/applicative.ts'
//// Apply
export { ap, apFirst, apSecond, lift2, lift3 } from './classes/apply.ts'
//// Bifunctor
export { bimap, mapLeft } from './classes/bifunctor.ts'
//// Category
export { id } from './classes/category.ts'
//// Chain
export { chain, join } from './classes/chain.ts'
// Monad
export type { Do } from './classes/monad.ts'
export { fgo, go } from './classes/monad.ts'
//// ChainRec
export type { Step } from './classes/chainrec.ts'
export { chainRec, done, loop } from './classes/chainrec.ts'
//// Comonad
export { extract } from './classes/comonad.ts'
//// Contravariant
export { contramap } from './classes/contravariant.ts'
//// Decidable
export { choose, lose } from './classes/decidable.ts'
//// Divisible
export { conquer, divide } from './classes/divisible.ts'
//// Extend
export { duplicate, extend } from './classes/extend.ts'
//// Filterable
export {
  filter,
  filterMap,
  partition,
  partitionMap,
  reject,
} from './classes/filterable.ts'
//// Foldable
export {
  all,
  any,
  elem,
  elem_,
  foldMap,
  foldr,
  forEach,
  head,
  intercalate,
  last,
  none,
  reduce,
  reduce_,
  size,
  toArray,
} from './classes/foldable.ts'
//// Functor
export { flip, map, voided, voidRight } from './classes/functor.ts'
//// Group
export { invert } from './classes/group.ts'
//// Monoid
export { empty, mconcat } from './classes/monoid.ts'
//// Ord
export { clamp, gt, gte, lt, lte, max, min } from './classes/ord.ts'
//// Plus
export { altAll, zero } from './classes/plus.ts'
//// Profunctor
export { promap } from './classes/profunctor.ts'
//// Semigroup
export { concat } from './classes/semigroup.ts'
//// Semigroupoid
export { compose } from './classes/semigroupoid.ts'
//// Setoid
export { equals } from './classes/setoid.ts'
//// Show
export { show } from './classes/show.ts'
//// Traversable
export { sequence, traverse } from './classes/traversable.ts'
////// Append
export { append, prepend } from './classes/_append.ts'
////// Rebuild
export {
  drop,
  dropLast,
  init,
  reverse,
  sort,
  sortBy,
  tail,
  take,
  takeLast,
} from './classes/_rebuild.ts'

// Natives
//// Array
export {
  Arr,
  array,
  chunksOf,
  dropWhile,
  find,
  findIndex,
  findMap,
  fromIterable,
  groupBy,
  index,
  nub,
  nubBy,
  range,
  takeWhile,
  unfold,
  unfoldr,
  zip,
  zipWith,
} from './natives/array.ts'
//// BigInt
export { Big } from './natives/bigint.ts'
//// Boolean
export {
  and,
  Bool,
  boolean,
  complement,
  ifElse,
  not,
  or,
  unless,
  when,
} from './natives/boolean.ts'
//// Date
export { Dates } from './natives/date.ts'
//// Function
export type { AnyFn } from './natives/function.ts'
export {
  curry2,
  curry3,
  curry4,
  curry5,
  Fn,
  I,
  K,
  on,
  pipe,
  pipeK,
  T,
} from './natives/function.ts'
//// Map
export {
  mapDifference,
  mapFromPairs,
  mapKeys,
  mapLookup,
  mapPairs,
  Maps,
  mapValues,
} from './natives/map.ts'
//// Number
export {
  add,
  div,
  even,
  mean,
  mult,
  negate,
  Num,
  odd,
  pow,
  product,
  sub,
  sum,
} from './natives/number.ts'
//// Record
export {
  get,
  gets,
  modify,
  prop,
  props,
  remove,
  set,
} from './natives/record.ts'
//// RegExp
// `Matched` is the type `match` and `matchAll` answer with.
export type { Matched } from './natives/regexp.ts'
export {
  escape,
  firstCaptures,
  match,
  matchAll,
  Re,
  regex,
  replace,
  splitOnRegex,
  test,
} from './natives/regexp.ts'
//// Set
export {
  setDifference,
  setFromIterable,
  setMember,
  Sets,
} from './natives/set.ts'
//// String
export {
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
} from './natives/string.ts'
//// StrMap
export {
  fromPairs,
  getPath,
  has,
  hasPath,
  insert,
  keys,
  lookup,
  pairs,
  singleton,
  sortedKeys,
  sortedPairs,
  sortedValues,
  StrMap,
  values,
} from './natives/strmap.ts'

// DataTypes
//// Identity
export type { IdentityMethods, IdentityStatics } from './data/identity.ts'
export { Identity, identity } from './data/identity.ts'
//// Maybe
// `Just` and `Nothing` are what `isJust`/`isNothing` narrow to.
export type { Just, MaybeMethods, MaybeStatics, Nothing } from './data/maybe.ts'
export {
  fromMaybe,
  fromMaybe_,
  fromNullable,
  fromPredicate,
  isJust,
  isNothing,
  just,
  justs,
  Maybe,
  maybe,
  maybe_,
  maybeEncase,
  maybeToEither,
  maybeToEither_,
  maybeToNullable,
  nothing,
  safeAfter,
  safeLift,
} from './data/maybe.ts'
//// Either
// `Left` and `Right` are what `isLeft`/`isRight` narrow to.
export type {
  EitherMethods,
  EitherStatics,
  Left,
  Right,
} from './data/either.ts'
export {
  Either,
  either,
  eitherFromNullable,
  eitherFromPredicate,
  eitherSwap,
  eitherToMaybe,
  encase,
  fromEither,
  fromLeft,
  fromRight,
  isLeft,
  isRight,
  left,
  lefts,
  right,
  rights,
  tagBy,
} from './data/either.ts'
//// Pair
export type { PairMethods, PairStatics } from './data/pair.ts'
export {
  diagonal,
  fromTuple,
  fst,
  Pair,
  pair,
  snd,
  swap,
  toTuple,
  uncurry,
} from './data/pair.ts'
//// Predicate
export type { PredicateMethods, PredicateStatics } from './data/predicate.ts'
export {
  Predicate,
  predicate,
  predicateNot,
  predicateOr,
} from './data/predicate.ts'
//// Equivalence
export type {
  EquivalenceMethods,
  EquivalenceStatics,
} from './data/equivalence.ts'
export {
  Equivalence,
  equivalence,
  equivalenceByEquals,
} from './data/equivalence.ts'
//// Monoid
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
