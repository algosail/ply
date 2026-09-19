/**
 * Types and validation helpers for making custom values work with ply
 * operations.
 * Describe your value with `Shape`, then implement the method interfaces you
 * need.
 *
 * @module
 */

export type { Kind, Shape, Shaped, Widened } from './core/shape.ts'
export type {
  KindOf,
  Satisfies,
  ShapeOf,
  SlotAOf,
  SlotBOf,
} from './core/kind.ts'

export type { AltMethods } from './classes/alt.ts'
export type { ApplicativeTypeRep } from './classes/applicative.ts'
export type { ApplyMethods } from './classes/apply.ts'
export type { BifunctorMethods } from './classes/bifunctor.ts'
export type { CategoryTypeRep } from './classes/category.ts'
export type { ChainMethods } from './classes/chain.ts'
export type { ChainRecTypeRep } from './classes/chainrec.ts'
export type { ComonadMethods } from './classes/comonad.ts'
export type { ContravariantMethods } from './classes/contravariant.ts'
export type { DecidableMethods } from './classes/decidable.ts'
export type { DivisibleMethods } from './classes/divisible.ts'
export type { ExtendMethods } from './classes/extend.ts'
export type { FilterableMethods } from './classes/filterable.ts'
export type { FoldableMethods } from './classes/foldable.ts'
export type { FunctorMethods } from './classes/functor.ts'
export type { GroupMethods } from './classes/group.ts'
export type { MonadTypeRep } from './classes/monad.ts'
export type { MonoidTypeRep } from './classes/monoid.ts'
export type { OrdMethods } from './classes/ord.ts'
export type { PlusTypeRep } from './classes/plus.ts'
export type { ProfunctorMethods } from './classes/profunctor.ts'
export type { SemigroupMethods } from './classes/semigroup.ts'
export type { SemigroupoidMethods } from './classes/semigroupoid.ts'
export type { SetoidMethods } from './classes/setoid.ts'
export type { ShowMethods } from './classes/show.ts'
export type { TraversableMethods } from './classes/traversable.ts'

export { finiteFrom, integer, integerFrom } from './core/domain.ts'
