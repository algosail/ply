import type { AltMethods } from '../classes/alt.ts'
import type { ApplicativeTypeRep } from '../classes/applicative.ts'
import type { Apply, ApplyMethods } from '../classes/apply.ts'
import type { BifunctorMethods } from '../classes/bifunctor.ts'
import type { ChainMethods } from '../classes/chain.ts'
import type { CheckableTypeRep } from '../classes/checkable.ts'
import type { Filterable } from '../classes/filterable.ts'
import type { FoldableMethods } from '../classes/foldable.ts'
import type { FunctorMethods } from '../classes/functor.ts'
import type { OrdMethods } from '../classes/ord.ts'
import type { SemigroupMethods } from '../classes/semigroup.ts'
import type { SetoidMethods } from '../classes/setoid.ts'
import type { ShowMethods } from '../classes/show.ts'
import type { TraversableMethods } from '../classes/traversable.ts'
import type { KindOf, Satisfies, ShapeOf, SlotAOf } from '../core/kind.ts'
import type { Shape, Shaped } from '../core/shape.ts'
import type { Maybe } from './maybe.ts'
import { of } from '../classes/applicative.ts'
import { filter } from '../classes/filterable.ts'
import { map } from '../classes/functor.ts'
import { lte } from '../classes/ord.ts'
import { concat } from '../classes/semigroup.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'
import { just, nothing } from './maybe.ts'

/** A result containing an error of type `E` in `Left`, or a value of type `A` in `Right`. */
export type Either<E, A> = Left<E, A> | Right<E, A>

/** The error or alternative branch of an `Either`. */
export interface Left<E, A> extends EitherMethods<E, A> {
  readonly tag: 'left'
  readonly value: E
}

/** The success branch of an `Either`. */
export interface Right<E, A> extends EitherMethods<E, A> {
  readonly tag: 'right'
  readonly value: A
}

/** The shape for Either. */
export interface EitherShape extends Shape<'Either'> {
  readonly out: Either<this['slotB'], this['slotA']>
}

/** The type of the `Either` representative. */
export type EitherTypeRep = Satisfies<
  EitherStatics & Shaped<EitherShape>,
  & ApplicativeTypeRep<EitherShape, unknown>
  & CheckableTypeRep<EitherShape>
>

/** Static operations provided by the `Either` representative. */
export interface EitherStatics {
  is(value: unknown): value is Either<unknown, unknown>
  left<E, A>(e: E): Either<E, A>
  of<E, A>(a: A): Either<E, A>
}

/** Methods available on `Either` values. */
export interface EitherMethods<E, A>
  extends
    SetoidMethods<Either<E, A>, A, E>,
    OrdMethods<Either<E, A>, A, E>,
    ShowMethods<Either<E, A>, A, E>,
    SemigroupMethods<Either<E, A>, A, E>,
    FunctorMethods<Either<E, A>, A, E>,
    ApplyMethods<Either<E, A>, A, E>,
    ChainMethods<Either<E, A>, A, E>,
    AltMethods<Either<E, A>, A, E>,
    BifunctorMethods<Either<E, A>, A, E>,
    FoldableMethods<Either<E, A>, A, E>,
    TraversableMethods<Either<E, A>, A, E> {
  readonly '@@type': 'Either'
  readonly _shape: EitherShape
  readonly _A?: (_: never) => A
  _B?(_: E): void
  readonly constructor: EitherTypeRep
  match<B>(onLeft: (e: E) => B, onRight: (a: A) => B): B
}

/**
 * The result representative.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.Either.left ('missing') // => Left ("missing")
 * P.of (P.Either) (1) // => Right (1)
 * ```
 */
export const Either: EitherTypeRep = class <E, A, Tag extends 'left' | 'right'>
  implements EitherMethods<E, A> {
  declare static readonly _shape: EitherShape
  declare readonly '@@type': 'Either'
  declare readonly _shape: EitherShape
  declare readonly ['constructor']: EitherTypeRep
  declare readonly _A?: (_: never) => A
  declare _B?: EitherMethods<E, A>['_B']

  static readonly '@@type' = 'Either' as const

  static is = (value: unknown): value is Either<unknown, unknown> =>
    value instanceof this

  static of = <E, A>(value: A): Either<E, A> =>
    new this<E, A, 'right'> ('right', value)

  static left = <E, A>(error: E): Either<E, A> =>
    new this<E, A, 'left'> ('left', error)

  readonly tag: Tag
  readonly value: Tag extends 'left' ? E : A

  constructor(tag: Tag, value: Tag extends 'left' ? E : A) {
    this.tag = tag
    this.value = value
  }

  match<B>(
    onLeft: (e: E) => B,
    onRight: (a: A) => B,
  ): B {
    return this.tag === 'left'
      ? onLeft (this.value as E)
      : onRight (this.value as A)
  }

  map<B>(f: (a: A) => B): Either<E, B> {
    return this.match<Either<E, B>> ((e) => left (e), (a) => right (f (a)))
  }

  ap<B>(ff: Either<E, (a: A) => B>): Either<E, B> {
    return ff.match<Either<E, B>> (
      (e) => left (e),
      (f) => this.match<Either<E, B>> ((e) => left (e), (a) => right (f (a))),
    )
  }

  chain<B>(f: (a: A) => Either<E, B>): Either<E, B> {
    return this.match<Either<E, B>> ((e) => left (e), f)
  }

  alt(that: Either<E, A>): Either<E, A> {
    return this.match<Either<E, A>> (
      () => that,
      () => this as Either<E, A>,
    )
  }

  bimap<M, B>(
    f: (e: E) => M,
    g: (a: A) => B,
  ): Either<M, B> {
    return this.match<Either<M, B>> (
      (e) => left (f (e)),
      (a) => right (g (a)),
    )
  }

  reduce<Acc>(
    f: (acc: Acc, a: A) => Acc,
    init: Acc,
  ): Acc {
    return this.match (() => init, (a) => f (init, a))
  }

  traverse<G extends Apply<G>>(
    T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: A) => G,
  ): KindOf<G, Either<E, SlotAOf<G>>> {
    return this.match (
      (e) => of (T as never) (left<E, SlotAOf<G>> (e) as Either<E, SlotAOf<G>>),
      (a) =>
        map ((b: SlotAOf<G>) => right (b) as Either<E, SlotAOf<G>>) (
          f (a),
        ) as KindOf<G, Either<E, SlotAOf<G>>>,
    ) as KindOf<G, Either<E, SlotAOf<G>>>
  }

  concat(that: Either<E, A>): Either<E, A> {
    return this.match (
      (thisError) =>
        that.match (
          (thatError) =>
            left (concat (thisError as never) (thatError as never) as E),
          () => that,
        ),
      (thisValue) =>
        that.match (
          () => this as Either<E, A>,
          (thatValue) =>
            right (concat (thisValue as never) (thatValue as never) as A),
        ),
    )
  }

  equals(that: Either<E, A>): boolean {
    return this.match (
      (thisError) =>
        that.match (
          (thatError) => equals (thatError as never) (thisError as never),
          () => false,
        ),
      (thisValue) =>
        that.match (
          () => false,
          (thatValue) => equals (thatValue as never) (thisValue as never),
        ),
    )
  }

  lte(that: Either<E, A>): boolean {
    return this.match (
      (thisError) =>
        that.match (
          (thatError) => lte (thatError as never) (thisError as never),
          () => true,
        ),
      (thisValue) =>
        that.match (
          () => false,
          (thatValue) => lte (thatValue as never) (thisValue as never),
        ),
    )
  }

  show(): string {
    return this.match (
      (e) => `Left (${show (e)})`,
      (a) => `Right (${show (a)})`,
    )
  }
} satisfies EitherTypeRep

/**
 * Creates an `Either` containing an error or alternative value.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.left ('boom') // => Left ("boom")
 * ```
 */
export function left<E, A>(e: E): Either<E, A> {
  return Either.left<E, A> (e)
}

/**
 * Creates an `Either` containing a successful value.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.right (1) // => Right (1)
 * ```
 */
export function right<E, A>(a: A): Either<E, A> {
  return Either.of<E, A> (a)
}

/**
 * Checks for `Left` and narrows the type to its error value.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isLeft (P.left ('boom')) // => true
 * P.isLeft (P.right (1)) // => false
 * ```
 */
export function isLeft<E, A>(e: Either<E, A>): e is Left<E, A> {
  return e.tag === 'left'
}

/**
 * Checks for `Right` and narrows the type to its success value.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isRight (P.right (1)) // => true
 * P.isRight (P.left ('boom')) // => false
 * ```
 */
export function isRight<E, A>(e: Either<E, A>): e is Right<E, A> {
  return e.tag === 'right'
}

const branch = (tag: 'left' | 'right') => (fe: unknown): unknown =>
  map ((e: Either<unknown, unknown>) => e.value) (
    filter ((e: Either<unknown, unknown>) => e.tag === tag) (
      fe as never,
    ) as never,
  )

/**
 * Keeps and unwraps `Left` values, discarding `Right` values.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.lefts ([P.left ('a'), P.right (1), P.left ('b')]) // => ['a', 'b']
 * ```
 */
export function lefts<E, A>(fe: readonly Either<E, A>[]): E[]
export function lefts<F extends Filterable<F>>(fe: F): KindOf<F, unknown>
export function lefts(fe: any): any {
  return branch ('left') (fe)
}

/**
 * Keeps and unwraps `Right` values, discarding `Left` values.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.rights ([P.left ('a'), P.right (1), P.left ('b')]) // => [1]
 * ```
 */
export function rights<E, A>(fe: readonly Either<E, A>[]): A[]
export function rights<F extends Filterable<F>>(fe: F): KindOf<F, unknown>
export function rights(fe: any): any {
  return branch ('right') (fe)
}

/**
 * Wraps a function's result in `Right`, or a thrown value in `Left`.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.encase (JSON.parse) ('[1, 2]') // => Right ([1, 2])
 * P.isLeft (P.encase (JSON.parse) ('{')) // => true
 * ```
 */
export function encase<Args extends unknown[], B>(f: (...args: Args) => B) {
  return (...args: Args): Either<unknown, B> => {
    try {
      return right<unknown, B> (f (...args))
    } catch (e) {
      return left<unknown, B> (e)
    }
  }
}

/**
 * Handles either branch with a function and returns its result.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.either ((e: string) => 'err ' + e) ((n: number) => 'n ' + n) (P.right (1))
 * // => 'n 1'
 * ```
 */
export function either<E, B>(onLeft: (e: E) => B) {
  return <A>(onRight: (a: A) => B) => (e: Either<E, A>): B => e.match (onLeft, onRight)
}

/**
 * Unwraps a `Right`, or returns the supplied default for `Left`.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromRight (0) (P.right (1)) // => 1
 * P.fromRight (0) (P.left<string, number> ('boom')) // => 0
 * ```
 */
export function fromRight<A>(d: A) {
  return <E>(e: Either<E, A>): A => e.match (() => d, (a) => a)
}

/**
 * Unwraps a `Left`, or returns the supplied default for `Right`.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromLeft ('none') (P.left ('boom')) // => 'boom'
 * P.fromLeft ('none') (P.right<string, number> (1)) // => 'none'
 * ```
 */
export function fromLeft<E>(d: E) {
  return <A>(e: Either<E, A>): E => e.match ((l) => l, () => d)
}

/**
 * Unwraps either branch when both branches contain the same value type.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromEither (P.left (1)) // => 1
 * P.fromEither (P.right (2)) // => 2
 * ```
 */
export function fromEither<A>(e: Either<A, A>): A {
  return e.match ((l) => l, (a) => a)
}

/**
 * Wraps a value in `Right` if it passes the predicate, or in `Left` otherwise.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.tagBy ((n: number) => n > 0) (1) // => Right (1)
 * P.tagBy ((n: number) => n > 0) (-1) // => Left (-1)
 * ```
 */
export function tagBy<A>(p: (a: A) => boolean) {
  return (a: A): Either<A, A> => p (a) ? right (a) : left (a)
}

/**
 * Wraps a value in `Right`, or computes a `Left` for `null` and `undefined`.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.eitherFromNullable (() => 'missing') (null) // => Left ("missing")
 * P.eitherFromNullable (() => 'missing') (1) // => Right (1)
 * ```
 */
export function eitherFromNullable<E>(onNull: () => E) {
  return <A>(a: A | null | undefined): Either<E, A> =>
    a === null || a === undefined ? left<E, A> (onNull ()) : right<E, A> (a)
}

/**
 * Wraps a value in `Right` if it passes the predicate.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const positive = P.eitherFromPredicate (
 *   (n: number) => n > 0,
 *   (n: number) => n + ' is not positive',
 * )
 * positive (1) // => Right (1)
 * positive (-1) // => Left ("-1 is not positive")
 * ```
 */
export function eitherFromPredicate<E, A>(
  p: (a: A) => boolean,
  onFail: (a: A) => E,
) {
  return (a: A): Either<E, A> => p (a) ? right<E, A> (a) : left<E, A> (onFail (a))
}

/**
 * Switches `Left` to `Right` or `Right` to `Left`, preserving the value.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.eitherSwap (P.left ('boom')) // => Right ("boom")
 * P.eitherSwap (P.right (1)) // => Left (1)
 * ```
 */
export function eitherSwap<E, A>(e: Either<E, A>): Either<A, E> {
  return e.match<Either<A, E>> (
    (l) => right<A, E> (l),
    (r) => left<A, E> (r),
  )
}

/**
 * Converts `Right` to `Just`, or `Left` to `Nothing`, discarding the error.
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.eitherToMaybe (P.right (1)) // => Just (1)
 * P.eitherToMaybe (P.left ('boom')) // => Nothing
 * ```
 */
export function eitherToMaybe<E, A>(e: Either<E, A>): Maybe<A> {
  return e.match<Maybe<A>> (() => nothing (), (a) => just (a))
}
