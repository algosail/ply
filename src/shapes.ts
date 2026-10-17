/**
 * Shape types for declaring helpers that work across multiple value types.
 */

export type { Kind, Shape } from './core/shape.ts'

export type { ArrayShape } from './natives/array.ts'
export type { BigShape } from './natives/bigint.ts'
export type { BoolShape } from './natives/boolean.ts'
export type { DateShape } from './natives/date.ts'
export type { FnShape } from './natives/function.ts'
export type { MapShape } from './natives/map.ts'
export type { NumShape } from './natives/number.ts'
export type { ReShape } from './natives/regexp.ts'
export type { SetShape } from './natives/set.ts'
export type { StrMapShape } from './natives/strmap.ts'
export type { StrShape } from './natives/string.ts'

export type { MaybeShape } from './data/maybe.ts'
export type { EitherShape } from './data/either.ts'
export type { IdentityShape } from './data/identity.ts'
export type { PairShape } from './data/pair.ts'
export type { PredicateShape } from './data/predicate.ts'
export type { EquivalenceShape } from './data/equivalence.ts'
