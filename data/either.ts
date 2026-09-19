/**
 * Handle success and failure as values with `Right` and `Left`.
 * Use `map` for successes and `either` to handle both outcomes.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const positive = P.eitherFromPredicate(
 *   (n: number) => n > 0,
 *   () => 'Must be positive',
 * )
 * positive(3) // => Right (3)
 * positive(-1) // => Left ("Must be positive")
 * ```
 *
 * @module
 */

import type { Shape, Shaped } from '../core/shape.ts'
import type { KindOf, Satisfies, ShapeOf, SlotAOf } from '../core/kind.ts'
import type { Apply, ApplyMethods } from '../classes/apply.ts'
import type { TraversableMethods } from '../classes/traversable.ts'
import type { AltMethods } from '../classes/alt.ts'
import type { ApplicativeTypeRep } from '../classes/applicative.ts'
import type { BifunctorMethods } from '../classes/bifunctor.ts'
import type { ChainMethods } from '../classes/chain.ts'
import type { Filterable } from '../classes/filterable.ts'
import type { FoldableMethods } from '../classes/foldable.ts'
import type { FunctorMethods } from '../classes/functor.ts'
import type { OrdMethods } from '../classes/ord.ts'
import type { SemigroupMethods } from '../classes/semigroup.ts'
import type { SetoidMethods } from '../classes/setoid.ts'
import type { ShowMethods } from '../classes/show.ts'
import type { Maybe } from './maybe.ts'
import { of } from '../classes/applicative.ts'
import { filter } from '../classes/filterable.ts'
import { map } from '../classes/functor.ts'
import { lte } from '../classes/ord.ts'
import { concat } from '../classes/semigroup.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'
import { just, nothing } from './maybe.ts'

/**
 * A result containing an error of type `E` in `Left`, or a value of type `A`
 * in `Right`.
 * Use `map` for successes and `either` to handle both branches.
 */
export type Either<E, A> = Left<E, A> | Right<E, A>

/** The error or alternative branch of an `Either`. Narrow it with `isLeft`. */
export interface Left<E, A> extends EitherMethods<E, A> {
  /** Identifies this branch for narrowing with a tag check. */
  readonly tag: 'left'
  /** The error value. */
  readonly value: E
}

/** The success branch of an `Either`. Narrow it with `isRight`. */
export interface Right<E, A> extends EitherMethods<E, A> {
  /** Identifies this branch for narrowing with a tag check. */
  readonly tag: 'right'
  /** The contained value. */
  readonly value: A
}

/** The shape for Either. Use it with `Kind` when declaring generic helpers. */
export interface EitherShape extends Shape<'Either'> {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: Either<this['slotB'], this['slotA']>
}

/**
 * The type of the `Either` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type EitherTypeRep = Satisfies<
  EitherStatics & Shaped<EitherShape>,
  ApplicativeTypeRep<EitherShape, unknown>
>

/** Static operations provided by the `Either` representative. */
export interface EitherStatics {
  /** Creates a `Right` value. */
  of<E, A>(a: A): Either<E, A>
}

/**
 * Methods available on `Either` values.
 * Use them directly or through the corresponding standalone functions.
 */
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
  /** The name used to recognize this type in ply operations. */
  readonly '@@type': 'Either'
  /** The shape used to type generic operations on this value. */
  readonly _shape: EitherShape
  /** Declares the contained value type for inference; no runtime member is required. */
  readonly _A?: (_: never) => A
  /** Declares the secondary type for inference; no runtime member is required. */
  _B?(_: E): void
  /** The representative used to construct values of this type. */
  readonly constructor: EitherTypeRep
  /** Calls the handler for the active branch and returns its result. */
  match<B>(onLeft: (e: E) => B, onRight: (a: A) => B): B
}

type EitherProto = Omit<
  EitherMethods<unknown, unknown>,
  '_shape' | '_A' | '_B' | 'constructor'
>

const proto: EitherProto = {
  '@@type': 'Either' as const,

  match<E, A, B>(
    this: Either<E, A>,
    onLeft: (e: E) => B,
    onRight: (a: A) => B,
  ): B {
    return this.tag === 'left' ? onLeft(this.value) : onRight(this.value)
  },

  map<E, A, B>(this: Either<E, A>, f: (a: A) => B): Either<E, B> {
    return this.match<Either<E, B>>((e) => left(e), (a) => right(f(a)))
  },

  ap<E, A, B>(this: Either<E, A>, ff: Either<E, (a: A) => B>): Either<E, B> {
    return ff.match<Either<E, B>>(
      (e) => left(e),
      (f) => this.match<Either<E, B>>((e) => left(e), (a) => right(f(a))),
    )
  },

  chain<E, A, B>(this: Either<E, A>, f: (a: A) => Either<E, B>): Either<E, B> {
    return this.match<Either<E, B>>((e) => left(e), f)
  },

  alt<E, A>(this: Either<E, A>, that: Either<E, A>): Either<E, A> {
    return this.match<Either<E, A>>(
      () => that,
      () => this as unknown as Either<E, A>,
    )
  },

  bimap<E, A, M, B>(
    this: Either<E, A>,
    f: (e: E) => M,
    g: (a: A) => B,
  ): Either<M, B> {
    return this.match<Either<M, B>>(
      (e) => left(f(e)),
      (a) => right(g(a)),
    )
  },

  reduce<E, A, Acc>(
    this: Either<E, A>,
    f: (acc: Acc, a: A) => Acc,
    init: Acc,
  ): Acc {
    return this.match(() => init, (a) => f(init, a))
  },

  traverse<E, A, G extends Apply<G>>(
    this: Either<E, A>,
    T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: A) => G,
  ): KindOf<G, Either<E, SlotAOf<G>>> {
    return this.match(
      (e) => of(T as never)(left<E, SlotAOf<G>>(e) as Either<E, SlotAOf<G>>),
      (a) =>
        map((b: SlotAOf<G>) => right(b) as Either<E, SlotAOf<G>>)(
          f(a),
        ) as KindOf<G, Either<E, SlotAOf<G>>>,
    ) as KindOf<G, Either<E, SlotAOf<G>>>
  },

  concat<E, A>(this: Either<E, A>, that: Either<E, A>): Either<E, A> {
    return this.match(
      (thisError) =>
        that.match(
          (thatError) =>
            left(concat(thisError as never)(thatError as never) as E),
          () => that,
        ),
      (thisValue) =>
        that.match(
          () => this as unknown as Either<E, A>,
          (thatValue) =>
            right(concat(thisValue as never)(thatValue as never) as A),
        ),
    )
  },

  equals<E, A>(this: Either<E, A>, that: Either<E, A>): boolean {
    return this.match(
      (thisError) =>
        that.match(
          (thatError) => equals(thatError as never)(thisError as never),
          () => false,
        ),
      (thisValue) =>
        that.match(
          () => false,
          (thatValue) => equals(thatValue as never)(thisValue as never),
        ),
    )
  },

  lte<E, A>(this: Either<E, A>, that: Either<E, A>): boolean {
    return this.match(
      (thisError) =>
        that.match(
          (thatError) => lte(thatError as never)(thisError as never),
          () => true,
        ),
      (thisValue) =>
        that.match(
          () => false,
          (thatValue) => lte(thatValue as never)(thisValue as never),
        ),
    )
  },

  show<E, A>(this: Either<E, A>): string {
    return this.match(
      (e) => `Left (${show(e)})`,
      (a) => `Right (${show(a)})`,
    )
  },
}

const make = <E, A>(
  fields: Pick<Either<E, A>, 'tag' | 'value'>,
): Either<E, A> => Object.assign(Object.create(proto) as Either<E, A>, fields)

/**
 * Creates an `Either` containing an error or alternative value.
 * `map` and `chain` leave this branch unchanged.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.left('boom') // => Left ("boom")
 * ```
 */
export function left<E, A>(e: E): Either<E, A> {
  return make<E, A>({ tag: 'left', value: e })
}

/**
 * Creates an `Either` containing a successful value.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.right(1) // => Right (1)
 * ```
 */
export function right<E, A>(a: A): Either<E, A> {
  return make<E, A>({ tag: 'right', value: a })
}

/**
 * The result representative. Use `of(Either)` to create `Right`
 * or `traverse(Either)` to collect results.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.of(P.Either)(1) // => Right (1)
 * ```
 */
export const Either: EitherTypeRep = {
  '@@type': 'Either' as const,
  _shape: undefined as unknown as EitherShape,

  of(a) {
    return right(a)
  },
}

Object.defineProperty(proto, 'constructor', { value: Either })

/**
 * Checks for `Left` and narrows the type to its error value.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isLeft(P.left('boom')) // => true
 * P.isLeft(P.right(1)) // => false
 * ```
 */
export function isLeft<E, A>(e: Either<E, A>): e is Left<E, A> {
  return e.tag === 'left'
}

/**
 * Checks for `Right` and narrows the type to its success value.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isRight(P.right(1)) // => true
 * P.isRight(P.left('boom')) // => false
 * ```
 */
export function isRight<E, A>(e: Either<E, A>): e is Right<E, A> {
  return e.tag === 'right'
}

const branch = (tag: 'left' | 'right') => (fe: unknown): unknown =>
  map((e: Either<unknown, unknown>) => e.value)(
    filter((e: Either<unknown, unknown>) => e.tag === tag)(
      fe as never,
    ) as never,
  )

/**
 * Keeps and unwraps `Left` values, discarding `Right` values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.lefts([P.left('a'), P.right(1), P.left('b')]) // => ['a', 'b']
 * ```
 */
export function lefts<E, A>(fe: readonly Either<E, A>[]): E[]
/** Keeps and unwraps `Left` values, discarding `Right` values. */
export function lefts<F extends Filterable<F>>(fe: F): KindOf<F, unknown>
// deno-lint-ignore no-explicit-any
export function lefts(fe: any): any {
  return branch('left')(fe)
}

/**
 * Keeps and unwraps `Right` values, discarding `Left` values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.rights([P.left('a'), P.right(1), P.left('b')]) // => [1]
 * ```
 */
export function rights<E, A>(fe: readonly Either<E, A>[]): A[]
/** Keeps and unwraps `Right` values, discarding `Left` values. */
export function rights<F extends Filterable<F>>(fe: F): KindOf<F, unknown>
// deno-lint-ignore no-explicit-any
export function rights(fe: any): any {
  return branch('right')(fe)
}

/**
 * Wraps a function's result in `Right`, or a thrown value in `Left`.
 * Only synchronous exceptions are caught; rejected promises are not handled.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.encase(JSON.parse)('[1, 2]') // => Right ([1, 2])
 * P.isLeft(P.encase(JSON.parse)('{')) // => true
 * ```
 */
export function encase<Args extends unknown[], B>(
  f: (...args: Args) => B,
): (...args: Args) => Either<unknown, B> {
  return (...args) => {
    try {
      return right<unknown, B>(f(...args))
    } catch (e) {
      return left<unknown, B>(e)
    }
  }
}

/**
 * Handles either branch with a function and returns its result.
 * Supply the `Left` handler first, then the `Right` handler. Only one is
 * called.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.either((e: string) => 'err ' + e)((n: number) => 'n ' + n)(P.right(1))
 * // => 'n 1'
 * ```
 */
export function either<E, B>(
  onLeft: (e: E) => B,
): <A>(onRight: (a: A) => B) => (e: Either<E, A>) => B {
  return (onRight) => (e) => e.match(onLeft, onRight)
}

/**
 * Unwraps a `Right`, or returns the supplied default for `Left`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromRight(0)(P.right(1)) // => 1
 * P.fromRight(0)(P.left<string, number>('boom')) // => 0
 * ```
 */
export function fromRight<A>(d: A): <E>(e: Either<E, A>) => A {
  return (e) => e.match(() => d, (a) => a)
}

/**
 * Unwraps a `Left`, or returns the supplied default for `Right`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromLeft('none')(P.left('boom')) // => 'boom'
 * P.fromLeft('none')(P.right<string, number>(1)) // => 'none'
 * ```
 */
export function fromLeft<E>(d: E): <A>(e: Either<E, A>) => E {
  return (e) => e.match((l) => l, () => d)
}

/**
 * Unwraps either branch when both branches contain the same value type.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromEither(P.left(1)) // => 1
 * P.fromEither(P.right(2)) // => 2
 * ```
 */
export function fromEither<A>(e: Either<A, A>): A {
  return e.match((l) => l, (a) => a)
}

/**
 * Wraps a value in `Right` if it passes the predicate, or in `Left` otherwise.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.tagBy((n: number) => n > 0)(1) // => Right (1)
 * P.tagBy((n: number) => n > 0)(-1) // => Left (-1)
 * ```
 */
export function tagBy<A>(p: (a: A) => boolean): (a: A) => Either<A, A> {
  return (a) => p(a) ? right(a) : left(a)
}

/**
 * Wraps a value in `Right`, or computes a `Left` for `null` and `undefined`.
 * Calls the error function only when the value is absent.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.eitherFromNullable(() => 'missing')(null) // => Left ("missing")
 * P.eitherFromNullable(() => 'missing')(1) // => Right (1)
 * ```
 */
export function eitherFromNullable<E>(
  onNull: () => E,
): <A>(a: A | null | undefined) => Either<E, A> {
  return <A>(a: A | null | undefined): Either<E, A> =>
    a === null || a === undefined ? left<E, A>(onNull()) : right<E, A>(a)
}

/**
 * Wraps a value in `Right` if it passes the predicate.
 * Otherwise calls `onFail` with that value and wraps the error in `Left`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const positive = P.eitherFromPredicate(
 *   (n: number) => n > 0,
 *   (n: number) => n + ' is not positive',
 * )
 * positive(1) // => Right (1)
 * positive(-1) // => Left ("-1 is not positive")
 * ```
 */
export function eitherFromPredicate<E, A>(
  p: (a: A) => boolean,
  onFail: (a: A) => E,
): (a: A) => Either<E, A> {
  return (a: A): Either<E, A> => p(a) ? right<E, A>(a) : left<E, A>(onFail(a))
}

/**
 * Switches `Left` to `Right` or `Right` to `Left`, preserving the value.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.eitherSwap(P.left('boom')) // => Right ("boom")
 * P.eitherSwap(P.right(1)) // => Left (1)
 * ```
 */
export function eitherSwap<E, A>(e: Either<E, A>): Either<A, E> {
  return e.match<Either<A, E>>(
    (l) => right<A, E>(l),
    (r) => left<A, E>(r),
  )
}

/**
 * Converts `Right` to `Just`, or `Left` to `Nothing`, discarding the error.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.eitherToMaybe(P.right(1)) // => Just (1)
 * P.eitherToMaybe(P.left('boom')) // => Nothing
 * ```
 */
export function eitherToMaybe<E, A>(e: Either<E, A>): Maybe<A> {
  return e.match<Maybe<A>>(() => nothing(), (a) => just(a))
}
