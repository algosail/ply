/**
 * Functions for transforming collections, composing operations, and handling optional values and errors.
 *
 * ## TypeClasses
 *
 * ### Alt
 *
 * {@link module:classes/alt.alt `alt`} `:: Alt f => f a -> f a -> f a`

 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.map (P.mult (2)) ([1, 2, 3]) // => [2, 4, 6]
 * P.fromMaybe ('Guest') (P.fromNullable<string> (null)) // => 'Guest'
 * ```
 */

export { alt } from './classes/alt.ts'
export { of } from './classes/applicative.ts'
export { ap, apFirst, apSecond, lift2, lift3 } from './classes/apply.ts'
export { bimap, mapLeft } from './classes/bifunctor.ts'
export { id } from './classes/category.ts'
export { chain, join } from './classes/chain.ts'
export type { Do } from './classes/monad.ts'
export { fgo, go } from './classes/monad.ts'
export type { Step } from './classes/chainrec.ts'
export { chainRec, done, loop } from './classes/chainrec.ts'
export { is } from './classes/checkable.ts'
export { extract } from './classes/comonad.ts'
export { contramap } from './classes/contravariant.ts'
export { choose, lose } from './classes/decidable.ts'
export { conquer, divide } from './classes/divisible.ts'
export { duplicate, extend } from './classes/extend.ts'
export {
  filter,
  filterMap,
  partition,
  partitionMap,
  reject,
} from './classes/filterable.ts'
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
  isEmpty,
  last,
  none,
  reduce,
  reduce_,
  size,
  toArray,
} from './classes/foldable.ts'
export { flip, map, voided, voidRight } from './classes/functor.ts'
export { invert } from './classes/group.ts'
export type { MonoidDict } from './classes/monoid.ts'
export { empty, mconcat } from './classes/monoid.ts'
export { clamp, gt, gte, lt, lte, max, min } from './classes/ord.ts'
export { altAll, zero } from './classes/plus.ts'
export { promap } from './classes/profunctor.ts'
export { concat } from './classes/semigroup.ts'
export { compose } from './classes/semigroupoid.ts'
export { equals } from './classes/setoid.ts'
export { show } from './classes/show.ts'
export { sequence, traverse } from './classes/traversable.ts'
export { append, prepend } from './classes/_append.ts'
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
export { Big } from './natives/bigint.ts'
export {
  and,
  Bool,
  boolean,
  complement,
  ifElse,
  isFalse,
  isTrue,
  not,
  onlyIf,
  or,
  unless,
  when,
} from './natives/boolean.ts'
export { Dates } from './natives/date.ts'
export type { Nullary } from './core/shape.ts'
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
  once,
  pipe,
  pipeK,
  T,
  tap,
} from './natives/function.ts'
export {
  mapDifference,
  mapFromPairs,
  mapKeys,
  mapLookup,
  mapPairs,
  Maps,
  mapValues,
} from './natives/map.ts'
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
export {
  get,
  gets,
  modify,
  prop,
  props,
  remove,
  set,
} from './natives/record.ts'
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
export {
  setDifference,
  setFromIterable,
  setMember,
  Sets,
} from './natives/set.ts'
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

export type { IdentityMethods, IdentityStatics } from './data/identity.ts'
export { Identity, identity } from './data/identity.ts'
export type { Just, MaybeMethods, MaybeStatics, Nothing } from './data/maybe.ts'
export {
  defaultTo,
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
export type { PredicateMethods, PredicateStatics } from './data/predicate.ts'
export {
  allPass,
  anyPass,
  Predicate,
  predicate,
  predicateAnd,
  predicateNot,
  predicateOr,
} from './data/predicate.ts'
export type { Cases } from './data/tagged.ts'
export { cases } from './data/tagged.ts'
export type { Comparator, EQ, GT, LT } from './data/ordering.ts'
export {
  compare,
  comparing,
  isEQ,
  isGT,
  isLT,
  Ordering,
  sortWith,
} from './data/ordering.ts'
export type {
  EquivalenceMethods,
  EquivalenceStatics,
} from './data/equivalence.ts'
export {
  Equivalence,
  equivalence,
  equivalenceByEquals,
} from './data/equivalence.ts'
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

export {
  isArray,
  isBigInt,
  isBoolean,
  isDate,
  isEither,
  isEquivalence,
  isFunction,
  isIdentity,
  isMap,
  isMaybe,
  isNumber,
  isPair,
  isPredicate,
  isRegexp,
  isSet,
  isString,
  isStrMap,
} from './utils/typepredicate.ts'
