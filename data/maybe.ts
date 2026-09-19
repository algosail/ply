/**
 * Handle values that may be absent with `Just` and `Nothing`.
 * Use `fromNullable` at nullable boundaries, `map` to transform values, and
 * `fromMaybe` to supply a default.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const name = P.map(P.trim)(P.fromNullable(' Ada '))
 * P.fromMaybe('Guest')(name) // => 'Ada'
 * P.fromMaybe('Guest')(P.nothing<string>()) // => 'Guest'
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
import type { ChainMethods } from '../classes/chain.ts'
import type { Filterable, FilterableMethods } from '../classes/filterable.ts'
import type { FoldableMethods } from '../classes/foldable.ts'
import type { FunctorMethods } from '../classes/functor.ts'
import type { OrdMethods } from '../classes/ord.ts'
import type { PlusTypeRep } from '../classes/plus.ts'
import type { SetoidMethods } from '../classes/setoid.ts'
import type { ShowMethods } from '../classes/show.ts'
import type { Either } from './either.ts'
import { of } from '../classes/applicative.ts'
import { filter } from '../classes/filterable.ts'
import { map } from '../classes/functor.ts'
import { lte } from '../classes/ord.ts'
import { equals } from '../classes/setoid.ts'
import { show } from '../classes/show.ts'
import { left, right } from './either.ts'

/**
 * An optional value: `Just<A>` when present, or `Nothing<A>` when absent.
 * Use `map` to transform it and `fromMaybe` to supply a default.
 */
export type Maybe<A> = Just<A> | Nothing<A>

/**
 * A present `Maybe` value. Use `isJust` to narrow a `Maybe` before reading
 * `value`.
 */
export interface Just<A> extends MaybeMethods<A> {
  /** Identifies this branch for narrowing with a tag check. */
  readonly tag: 'just'
  /** The contained value. */
  readonly value: A
}

/** An absent `Maybe` value. Create one with `nothing`. */
export interface Nothing<A> extends MaybeMethods<A> {
  /** Identifies this branch for narrowing with a tag check. */
  readonly tag: 'nothing'
}

/** The shape for Maybe. Use it with `Kind` when declaring generic helpers. */
export interface MaybeShape extends Shape<'Maybe'> {
  /** The value type produced when this shape's type arguments are supplied. */
  readonly out: Maybe<this['slotA']>
}

/**
 * The type of the `Maybe` representative.
 * Use it when accepting or forwarding this representative in a helper.
 */
export type MaybeTypeRep = Satisfies<
  MaybeStatics & Shaped<MaybeShape>,
  & ApplicativeTypeRep<MaybeShape>
  & PlusTypeRep<MaybeShape>
>

/** Static operations provided by the `Maybe` representative. */
export interface MaybeStatics {
  /** Creates a `Just` value. */
  of<A>(a: A): Maybe<A>
  /** Returns an empty alternative of this type. */
  zero<A>(): Maybe<A>
}

/**
 * Methods available on `Maybe` values.
 * Use them directly or through the corresponding standalone functions.
 */
export interface MaybeMethods<A>
  extends
    SetoidMethods<Maybe<A>, A>,
    OrdMethods<Maybe<A>, A>,
    ShowMethods<Maybe<A>, A>,
    FunctorMethods<Maybe<A>, A>,
    ApplyMethods<Maybe<A>, A>,
    ChainMethods<Maybe<A>, A>,
    AltMethods<Maybe<A>, A>,
    FilterableMethods<Maybe<A>, A>,
    FoldableMethods<Maybe<A>, A>,
    TraversableMethods<Maybe<A>, A> {
  /** The name used to recognize this type in ply operations. */
  readonly '@@type': 'Maybe'
  /** The shape used to type generic operations on this value. */
  readonly _shape: MaybeShape
  /** Declares the contained value type for inference; no runtime member is required. */
  readonly _A?: (_: never) => A
  /** The representative used to construct values of this type. */
  readonly constructor: MaybeTypeRep
  /** Calls the handler for the active branch and returns its result. */
  match<B>(onNothing: () => B, onJust: (a: A) => B): B
}

type MaybeProto = Omit<
  MaybeMethods<unknown>,
  '_shape' | '_A' | 'constructor'
>

const proto: MaybeProto = {
  '@@type': 'Maybe' as const,

  match<A, B>(this: Maybe<A>, onNothing: () => B, onJust: (a: A) => B): B {
    return this.tag === 'just' ? onJust(this.value) : onNothing()
  },

  map<A, B>(this: Maybe<A>, f: (a: A) => B): Maybe<B> {
    return this.match<Maybe<B>>(() => nothing<B>(), (a) => just(f(a)))
  },

  ap<A, B>(this: Maybe<A>, ff: Maybe<(a: A) => B>): Maybe<B> {
    return ff.match<Maybe<B>>(
      () => nothing<B>(),
      (f) => this.match<Maybe<B>>(() => nothing<B>(), (a) => just(f(a))),
    )
  },

  chain<A, B>(this: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> {
    return this.match<Maybe<B>>(() => nothing<B>(), f)
  },

  alt<A>(this: Maybe<A>, that: Maybe<A>): Maybe<A> {
    return this.match<Maybe<A>>(() => that, () => this as unknown as Maybe<A>)
  },

  filter<A>(this: Maybe<A>, p: (a: A) => boolean): Maybe<A> {
    return this.match<Maybe<A>>(
      () => nothing<A>(),
      (a) => p(a) ? (this as unknown as Maybe<A>) : nothing<A>(),
    )
  },

  reduce<A, B>(this: Maybe<A>, f: (acc: B, a: A) => B, init: B): B {
    return this.match(() => init, (a) => f(init, a))
  },

  traverse<A, G extends Apply<G>>(
    this: Maybe<A>,
    T: ApplicativeTypeRep<ShapeOf<G>>,
    f: (a: A) => G,
  ): KindOf<G, Maybe<SlotAOf<G>>> {
    return this.match(
      () => of(T as never)(nothing<SlotAOf<G>>() as Maybe<SlotAOf<G>>),
      (a) =>
        map((b: SlotAOf<G>) => just(b) as Maybe<SlotAOf<G>>)(
          f(a),
        ) as KindOf<
          G,
          Maybe<SlotAOf<G>>
        >,
    ) as KindOf<G, Maybe<SlotAOf<G>>>
  },

  equals<A>(this: Maybe<A>, that: Maybe<A>): boolean {
    return this.match(
      () => that.tag === 'nothing',
      (a) => that.match(() => false, (b) => equals(b as never)(a as never)),
    )
  },

  lte<A>(this: Maybe<A>, that: Maybe<A>): boolean {
    return this.match(
      () => true,
      (a) => that.match(() => false, (b) => lte(b as never)(a as never)),
    )
  },

  show<A>(this: Maybe<A>): string {
    return this.match(() => 'Nothing', (a) => `Just (${show(a)})`)
  },
}

const make = <A>(
  fields: { tag: 'just'; value: A } | { tag: 'nothing' },
): Maybe<A> => Object.assign(Object.create(proto) as Maybe<A>, fields)

/**
 * Wraps a present value in `Maybe`, including `null` or `undefined` if
 * supplied.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.just(1) // => Just (1)
 * P.map((n: number) => n + 1)(P.just(1)) // => Just (2)
 * ```
 */
export function just<A>(a: A): Maybe<A> {
  return make<A>({ tag: 'just', value: a })
}

/**
 * Creates a `Maybe` with no value.
 * Specify the value type when needed, for example `nothing<number>()`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.nothing<number>() // => Nothing
 * P.map((n: number) => n + 1)(P.nothing<number>()) // => Nothing
 * ```
 */
export function nothing<A>(): Maybe<A> {
  return make<A>({ tag: 'nothing' })
}

/**
 * The optional-value representative. Use `of(Maybe)` to create `Just`
 * or `zero(Maybe)` to create `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.of(P.Maybe)(1) // => Just (1)
 * P.zero(P.Maybe) // => Nothing
 * ```
 */
export const Maybe: MaybeTypeRep = {
  '@@type': 'Maybe' as const,
  _shape: undefined as unknown as MaybeShape,

  of<A>(a: A): Maybe<A> {
    return just(a)
  },

  zero<A>(): Maybe<A> {
    return nothing<A>()
  },
}

Object.defineProperty(proto, 'constructor', { value: Maybe })

/**
 * Transforms a `Just` value, or calls the fallback function for `Nothing`.
 * Only the selected function is called.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.maybe_(() => 'none')((n: number) => `#${n}`)(P.just(7)) // => '#7'
 * P.maybe_(() => 'none')((n: number) => `#${n}`)(P.nothing<number>()) // => 'none'
 * ```
 *
 * @see {@link maybe}
 */
export function maybe_<B>(
  onNothing: () => B,
): <A>(onJust: (a: A) => B) => (m: Maybe<A>) => B {
  return (onJust) => (m) => m.match(onNothing, onJust)
}

/**
 * Transforms a `Just` value, or returns the supplied default for `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.maybe(0)((s: string) => s.length)(P.just('abc')) // => 3
 * P.maybe(0)((s: string) => s.length)(P.nothing<string>()) // => 0
 * ```
 */
export function maybe<B>(d: B): <A>(onJust: (a: A) => B) => (m: Maybe<A>) => B {
  return (onJust) => (m) => m.match(() => d, onJust)
}

/**
 * Unwraps a `Just`, or returns the supplied default for `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromMaybe(0)(P.just(1)) // => 1
 * P.fromMaybe(0)(P.nothing<number>()) // => 0
 * ```
 *
 * @see {@link fromMaybe_}
 */
export function fromMaybe<A>(d: A): (m: Maybe<A>) => A {
  return (m) => m.match(() => d, (a) => a)
}

/**
 * Unwraps a `Just`, or calls the fallback function for `Nothing`.
 * Use this when the default value needs to be computed.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const displayName = P.fromMaybe_(() => 'Guest')
 *
 * displayName(P.just('Ada')) // => 'Ada'
 * displayName(P.nothing<string>()) // => 'Guest'
 * ```
 *
 * @see {@link fromMaybe}
 */
export function fromMaybe_<A>(d: () => A): (m: Maybe<A>) => A {
  return (m) => m.match(d, (a) => a)
}

/**
 * Wraps a value in `Just`, or returns `Nothing` for `null` and `undefined`.
 * Preserves `0`, `false`, and empty strings.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromNullable(1) // => Just (1)
 * P.fromNullable(0) // => Just (0)
 * P.fromNullable(null) // => Nothing
 * ```
 */
export function fromNullable<A>(a: A | null | undefined): Maybe<A> {
  return a === null || a === undefined ? nothing<A>() : just(a)
}

/**
 * Wraps a value in `Just` if it passes the predicate, or returns `Nothing`.
 * A type guard also narrows the wrapped value's type.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.fromPredicate((n: number) => n > 0)(1) // => Just (1)
 * P.fromPredicate((n: number) => n > 0)(-1) // => Nothing
 * ```
 */
export function fromPredicate<A, B extends A>(
  p: (a: A) => a is B,
): (a: A) => Maybe<B>
/**
 * Wraps a value in `Just` if it passes the predicate, or returns `Nothing`.
 */
export function fromPredicate<A>(p: (a: A) => boolean): (a: A) => Maybe<A>
export function fromPredicate<A>(p: (a: A) => boolean) {
  return (a: A): Maybe<A> => p(a) ? just(a) : nothing<A>()
}

/**
 * Checks the input before applying a function and wrapping its result in
 * `Just`.
 * Returns `Nothing` without calling the function if the predicate fails.
 * Exceptions from the predicate or function are not caught.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const recip = P.safeLift((n: number) => n !== 0, (n: number) => 10 / n)
 * recip(2) // => Just (5)
 * recip(0) // => Nothing
 * ```
 */
export function safeLift<A, B>(
  p: (a: A) => boolean,
  f: (a: A) => B,
): (a: A) => Maybe<B> {
  return (a) => p(a) ? just(f(a)) : nothing<B>()
}

/**
 * Applies a function, then checks its result before wrapping it in `Just`.
 * Returns `Nothing` if the result fails the predicate. Exceptions are not
 * caught.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const num = P.safeAfter((n: number) => !Number.isNaN(n), Number)
 * num('12') // => Just (12)
 * num('x') // => Nothing
 * ```
 */
export function safeAfter<A, B>(
  p: (b: B) => boolean,
  f: (a: A) => B,
): (a: A) => Maybe<B> {
  return (a) => {
    const b = f(a)
    return p(b) ? just(b) : nothing<B>()
  }
}

/**
 * Wraps a function's result in `Just`, or returns `Nothing` if it throws.
 * Only synchronous exceptions are caught; rejected promises are not handled.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * const parse = P.maybeEncase(JSON.parse)
 * parse('[1]') // => Just ([1])
 * parse('{') // => Nothing
 * ```
 */
export function maybeEncase<Args extends unknown[], A>(
  f: (...args: Args) => A,
): (...args: Args) => Maybe<A> {
  return (...args) => {
    try {
      return just(f(...args))
    } catch {
      return nothing<A>()
    }
  }
}

/**
 * Unwraps a `Just`, or returns `null` for `Nothing`.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.maybeToNullable(P.just(1)) // => 1
 * P.maybeToNullable(P.nothing<number>()) // => null
 * ```
 */
export function maybeToNullable<A>(m: Maybe<A>): A | null {
  return m.match<A | null>(() => null, (a) => a)
}

/**
 * Checks for `Just` and narrows the type so its `value` can be read.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isJust(P.just(1)) // => true
 * P.isJust(P.nothing<number>()) // => false
 * ```
 */
export function isJust<A>(m: Maybe<A>): m is Just<A> {
  return m.tag === 'just'
}

/**
 * Checks whether a `Maybe` has no value.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.isNothing(P.nothing<number>()) // => true
 * P.isNothing(P.just(1)) // => false
 * ```
 */
export function isNothing<A>(m: Maybe<A>): m is Nothing<A> {
  return m.tag === 'nothing'
}

/**
 * Keeps and unwraps `Just` values, discarding `Nothing` values.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.justs([P.just(1), P.nothing<number>(), P.just(3)]) // => [1, 3]
 * P.justs([P.nothing<number>(), P.nothing<number>()]) // => []
 * ```
 */
export function justs<A>(fm: readonly Maybe<A>[]): A[]
/** Keeps and unwraps `Just` values, discarding `Nothing` values. */
export function justs<F extends Filterable<F>>(fm: F): KindOf<F, unknown>
// deno-lint-ignore no-explicit-any
export function justs(fm: any): any {
  return map((m: Maybe<unknown>) => (m as { value: unknown }).value)(
    filter((m: Maybe<unknown>) => m.tag === 'just')(fm as never) as never,
  )
}

/**
 * Converts `Just` to `Right`, or `Nothing` to `Left` with the supplied error.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.maybeToEither('missing')(P.just(1)) // => Right (1)
 * P.maybeToEither('missing')(P.nothing<number>()) // => Left ("missing")
 * ```
 */
export function maybeToEither<E>(e: E): <A>(m: Maybe<A>) => Either<E, A> {
  return (m) => m.match(() => left(e), (a) => right(a))
}

/**
 * Converts `Just` to `Right`, or computes a `Left` error for `Nothing`.
 * Calls the error function only when the value is absent.
 *
 * @example
 * ```ts
 * import * as P from '@algosail/ply'
 *
 * P.maybeToEither_(() => 'missing')(P.just(1)) // => Right (1)
 * P.maybeToEither_(() => 'missing')(P.nothing<number>()) // => Left ("missing")
 * ```
 *
 * @see {@link maybeToEither}
 */
export function maybeToEither_<E>(
  onNothing: () => E,
): <A>(m: Maybe<A>) => Either<E, A> {
  return (m) => m.match(() => left(onNothing()), (a) => right(a))
}
